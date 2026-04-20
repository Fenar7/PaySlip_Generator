CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.slipwise_audit_entry_hash(
  p_sequence_num BIGINT,
  p_org_id TEXT,
  p_actor_id TEXT,
  p_represented_id TEXT,
  p_proxy_grant_id TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_metadata JSONB,
  p_created_at TIMESTAMPTZ,
  p_prev_hash TEXT
) RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      convert_to(
        (
          jsonb_build_object(
            'action', p_action,
            'actorId', p_actor_id,
            'createdAt', to_char(p_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'entityId', p_entity_id,
            'entityType', p_entity_type,
            'metadata', COALESCE(p_metadata, 'null'::jsonb),
            'orgId', p_org_id,
            'prevHash', p_prev_hash,
            'proxyGrantId', p_proxy_grant_id,
            'representedId', p_represented_id,
            'sequenceNum', p_sequence_num
          )::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.slipwise_initialize_audit_chain(
  p_org_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence BIGINT := 0;
  v_prev_hash TEXT := 'GENESIS';
  v_entry RECORD;
  v_proxy_grant_id TEXT;
  v_represented_id TEXT;
  v_entry_hash TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id));
  PERFORM set_config('slipwise.audit_chain_internal', '1', true);

  SELECT
    COALESCE(al."sequenceNum", 0),
    COALESCE(al."entryHash", 'GENESIS')
  INTO v_sequence, v_prev_hash
  FROM "audit_log" al
  WHERE al."orgId" = p_org_id
    AND al."sequenceNum" IS NOT NULL
  ORDER BY al."sequenceNum" DESC
  LIMIT 1;

  IF v_prev_hash IS NULL THEN
    v_prev_hash := 'GENESIS';
  END IF;

  FOR v_entry IN
    SELECT
      al.id,
      al."actorId"::TEXT AS actor_id,
      al."representedId"::TEXT AS represented_id,
      al."proxyGrantId" AS proxy_grant_id,
      al.action,
      al."entityType" AS entity_type,
      al."entityId" AS entity_id,
      al.metadata,
      al."createdAt" AS created_at
    FROM "audit_log" al
    WHERE al."orgId" = p_org_id
      AND al."sequenceNum" IS NULL
    ORDER BY al."createdAt" ASC, al.id ASC
  LOOP
    v_proxy_grant_id := v_entry.proxy_grant_id;
    v_represented_id := v_entry.represented_id;

    IF v_represented_id IS NULL OR v_proxy_grant_id IS NULL THEN
      SELECT
        pg.id,
        pg."representedId"::TEXT
      INTO v_proxy_grant_id, v_represented_id
      FROM "proxy_grant" pg
      WHERE pg."orgId" = p_org_id
        AND pg."actorId"::TEXT = v_entry.actor_id
        AND pg."createdAt" <= v_entry.created_at
        AND pg."expiresAt" > v_entry.created_at
        AND (pg."revokedAt" IS NULL OR pg."revokedAt" > v_entry.created_at)
      ORDER BY pg."createdAt" DESC
      LIMIT 1;
    END IF;

    v_sequence := v_sequence + 1;
    v_entry_hash := public.slipwise_audit_entry_hash(
      v_sequence,
      p_org_id,
      v_entry.actor_id,
      v_represented_id,
      v_proxy_grant_id,
      v_entry.action,
      v_entry.entity_type,
      v_entry.entity_id,
      v_entry.metadata,
      v_entry.created_at,
      v_prev_hash
    );

    UPDATE "audit_log"
    SET
      "sequenceNum" = v_sequence,
      "representedId" = CASE
        WHEN "representedId" IS NULL AND v_represented_id IS NOT NULL
          THEN v_represented_id::UUID
        ELSE "representedId"
      END,
      "proxyGrantId" = COALESCE("proxyGrantId", v_proxy_grant_id),
      "prevHash" = v_prev_hash,
      "entryHash" = v_entry_hash,
      "chainStatus" = 'VALID'
    WHERE id = v_entry.id;

    v_prev_hash := v_entry_hash;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.slipwise_prepare_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_last RECORD;
  v_proxy_grant_id TEXT;
  v_represented_id TEXT;
  v_effective_created_at TIMESTAMPTZ;
BEGIN
  v_effective_created_at := COALESCE(NEW."createdAt", NOW());

  PERFORM public.slipwise_initialize_audit_chain(NEW."orgId");
  PERFORM pg_advisory_xact_lock(hashtext(NEW."orgId"));

  SELECT
    al."sequenceNum",
    al."entryHash"
  INTO v_last
  FROM "audit_log" al
  WHERE al."orgId" = NEW."orgId"
    AND al."sequenceNum" IS NOT NULL
  ORDER BY al."sequenceNum" DESC
  LIMIT 1;

  IF NEW."representedId" IS NULL OR NEW."proxyGrantId" IS NULL THEN
    SELECT
      pg.id,
      pg."representedId"::TEXT
    INTO v_proxy_grant_id, v_represented_id
    FROM "proxy_grant" pg
    WHERE pg."orgId" = NEW."orgId"
      AND pg."actorId" = NEW."actorId"
      AND pg."createdAt" <= v_effective_created_at
      AND pg."expiresAt" > v_effective_created_at
      AND (pg."revokedAt" IS NULL OR pg."revokedAt" > v_effective_created_at)
    ORDER BY pg."createdAt" DESC
    LIMIT 1;

    IF NEW."representedId" IS NULL AND v_represented_id IS NOT NULL THEN
      NEW."representedId" := v_represented_id::UUID;
    END IF;

    IF NEW."proxyGrantId" IS NULL AND v_proxy_grant_id IS NOT NULL THEN
      NEW."proxyGrantId" := v_proxy_grant_id;
    END IF;
  END IF;

  IF NEW."sequenceNum" IS NULL THEN
    NEW."sequenceNum" := COALESCE(v_last."sequenceNum", 0) + 1;
  END IF;

  IF NEW."prevHash" IS NULL THEN
    NEW."prevHash" := COALESCE(v_last."entryHash", 'GENESIS');
  END IF;

  IF NEW."entryHash" IS NULL THEN
    NEW."entryHash" := public.slipwise_audit_entry_hash(
      NEW."sequenceNum",
      NEW."orgId",
      NEW."actorId"::TEXT,
      NEW."representedId"::TEXT,
      NEW."proxyGrantId",
      NEW.action,
      NEW."entityType",
      NEW."entityId",
      NEW.metadata,
      v_effective_created_at,
      NEW."prevHash"
    );
  END IF;

  NEW."chainStatus" := 'VALID';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS slipwise_prepare_audit_log_insert ON "audit_log";
CREATE TRIGGER slipwise_prepare_audit_log_insert
BEFORE INSERT ON "audit_log"
FOR EACH ROW
EXECUTE FUNCTION public.slipwise_prepare_audit_log_insert();

CREATE OR REPLACE FUNCTION public.slipwise_prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('slipwise.audit_chain_internal', true) = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'audit_log rows are immutable once written';
END;
$$;

DROP TRIGGER IF EXISTS slipwise_prevent_audit_log_update ON "audit_log";
CREATE TRIGGER slipwise_prevent_audit_log_update
BEFORE UPDATE ON "audit_log"
FOR EACH ROW
EXECUTE FUNCTION public.slipwise_prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS slipwise_prevent_audit_log_delete ON "audit_log";
CREATE TRIGGER slipwise_prevent_audit_log_delete
BEFORE DELETE ON "audit_log"
FOR EACH ROW
EXECUTE FUNCTION public.slipwise_prevent_audit_log_mutation();
