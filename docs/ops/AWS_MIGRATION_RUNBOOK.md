# AWS Migration Runbook — Slipwise One

**Version:** 1.0  
**Status:** Draft  
**Audience:** Platform Engineering, DevOps  

---

## 1. Current State (Vercel + Supabase + Upstash)

| Layer | Provider | Notes |
|---|---|---|
| Frontend / API routes | Vercel (serverless) | Next.js App Router, ISR |
| Database | Supabase (managed Postgres) | Row-level security on auth tables |
| Auth | Supabase Auth | JWT, magic-link, SSO callbacks |
| File Storage | Vercel Blob / S3-compatible | `BLOB_READ_WRITE_TOKEN` |
| Redis / Rate-limiting | Upstash Redis REST | Serverless-safe, HTTP-based |
| Cron jobs | Vercel Cron (`vercel.json`) | 5 jobs: overdue, dunning, usage-snapshot, portal-signals, gst-filing-status |
| Email | Resend | Transactional emails |
| AI / OCR | OpenAI API | Document extraction, salary insights, payment risk |

---

## 2. Target AWS Architecture

```
Internet
   │
   ▼
Route 53 (DNS)
   │
   ▼
CloudFront (CDN + WAF)
   │
   ▼
Application Load Balancer
   │
   ├─► ECS Fargate cluster (Next.js standalone Docker image)
   │       - Task definition: 2 vCPU / 4 GB RAM (baseline)
   │       - Auto-scaling: target 60% CPU, min 2 / max 10 tasks
   │       - Rolling deployment with health check
   │
   ├─► Aurora Serverless v2 (Postgres 16 compatible)
   │       - Primary + 1 read replica
   │       - Automated snapshots every 6 hours
   │       - VPC-private, no public endpoint
   │
   ├─► ElastiCache for Redis (Valkey 8 or Redis 7)
   │       - cluster mode disabled (single-shard, multi-AZ)
   │       - TLS + auth token
   │
   ├─► S3 (document storage, Pixel outputs, print PDFs)
   │       - Versioned bucket per environment
   │       - Pre-signed URL generation in Next.js API routes
   │
   ├─► SES (transactional email → replaces Resend)
   │       - DKIM + DMARC configured per domain
   │
   ├─► EventBridge Scheduler (replaces Vercel Cron)
   │       - Invokes ALB health endpoints or SQS queues
   │
   └─► CloudWatch Logs + Metrics + Alarms
           - Sentry for application errors (dual sink)
```

---

## 3. Per-Service Migration Steps

### 3.1 Database (Supabase → Aurora Serverless v2)

1. **Schema export:** `pg_dump --schema-only` from Supabase.
2. **Migrate schema** to Aurora, including Prisma migrations: `prisma migrate deploy`.
3. **Data migration:** Use `pgcopy` or AWS DMS for full table replication.
4. **Validation:** Row count checksums across all tables.
5. **Cut-over:** Update `DATABASE_URL` in ECS task definition secrets (SSM Parameter Store).
6. **Auth:** Supabase Auth can remain as-is (stateless JWT); or migrate to Cognito User Pools.

### 3.2 Application (Vercel → ECS Fargate)

1. **Docker image:** `next build` → `output: "standalone"` already configured.  
   Dockerfile exists at repo root — validate it builds cleanly.
2. **ECR:** Push image to ECR repository.
3. **ECS Task:** Create task definition referencing ECR image + SSM secrets.
4. **ALB Target Group:** Register ECS service. Health check: `GET /api/health` → `200`.
5. **CloudFront:** Point distribution to ALB origin; configure cache behaviours for static assets.

### 3.3 Redis (Upstash → ElastiCache)

1. Set `REDIS_URL=rediss://:${AUTH_TOKEN}@${CLUSTER_ENDPOINT}:6380` in SSM.
2. The existing `redis-client.ts` will prefer ioredis (REDIS_URL) over Upstash automatically.
3. Validate rate-limit and portal-auth flows under load.

### 3.4 File Storage (Vercel Blob → S3)

1. Create versioned S3 bucket: `slipwise-docs-{env}`.
2. Replace `@vercel/blob` SDK calls with `@aws-sdk/client-s3` pre-signed URL generation.
3. Migrate existing files: `aws s3 sync`.
4. Update `BLOB_READ_WRITE_TOKEN` references to `AWS_S3_BUCKET` / `AWS_REGION`.

### 3.5 Cron Jobs (Vercel Cron → EventBridge Scheduler)

| Job | Schedule | Target |
|---|---|---|
| `mark-overdue` | `0 1 * * *` (01:00 UTC) | ALB: `POST /api/cron/overdue` |
| `dunning-run` | `0 8 * * *` | ALB: `POST /api/cron/dunning-run` |
| `usage-snapshot` | `0 0 * * *` | ALB: `POST /api/cron/usage-snapshot` |
| `portal-signals` | `0 */6 * * *` | ALB: `POST /api/cron/portal-signals` |

All cron routes validate `CRON_SECRET` header — set this in EventBridge HTTP target headers.

### 3.6 Email (Resend → SES)

1. Verify domain in SES, configure DKIM.
2. Update `RESEND_API_KEY` → `AWS_SES_REGION` + `AWS_SES_FROM_ADDRESS`.
3. Replace `resend.emails.send()` calls with `@aws-sdk/client-ses` `SendEmail`.

---

## 4. Environment Variables Delta

| Variable | Vercel Value | AWS Value |
|---|---|---|
| `DATABASE_URL` | `postgres://...supabase.co/...` | `postgres://...rds.amazonaws.com/slipwise` |
| `REDIS_URL` | *(not set — uses UPSTASH_*)* | `rediss://:token@cluster.cache.amazonaws.com:6380` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | *(removed)* |
| `AWS_S3_BUCKET` | *(not set)* | `slipwise-docs-prod` |
| `AWS_REGION` | *(not set)* | `ap-south-1` |
| `SENTRY_DSN` | optional | set in production |
| `SENTRY_AUTH_TOKEN` | optional | set in CI |
| `CRON_SECRET` | set | same — store in SSM |

---

## 5. Go / No-Go Checklist

- [ ] All Prisma migrations applied to Aurora and row counts verified
- [ ] ECS task starts, passes ALB health check `/api/health`
- [ ] Smoke test: create invoice → PDF export → email send
- [ ] Redis rate-limiting confirmed working (OCR extract returns 429 after limit)
- [ ] Cron jobs fire and create `job_log` rows
- [ ] Sentry receives a test error event
- [ ] CloudFront caches static assets (check `x-cache: Hit from cloudfront`)
- [ ] Custom domain SSL certificate issued and attached to CloudFront
- [ ] Supabase Auth JWT verified against same `NEXTAUTH_SECRET` / JWK endpoint

---

## 6. Rollback Plan

1. **DNS:** Repoint Route 53 CNAME back to Vercel project domain (< 5 min TTL recommended during cutover).
2. **Database:** Aurora DMS reverse replication keeps Supabase in sync for 24 h post-cutover.
3. **Code:** No code changes required — `DATABASE_URL` env variable swap is sufficient.

**RTO target:** < 15 minutes (DNS TTL propagation).  
**RPO target:** < 30 seconds (Aurora continuous backup + Supabase streaming replication during migration).

---

## 7. Cost Estimate Template

| Service | Config | Monthly Estimate (USD) |
|---|---|---|
| ECS Fargate | 2 tasks × 2vCPU/4GB, 720h | ~$120 |
| Aurora Serverless v2 | 0.5–4 ACU auto-scale, 20 GB storage | ~$80 |
| ElastiCache (cache.t4g.small) | multi-AZ | ~$35 |
| S3 | 50 GB + requests | ~$5 |
| CloudFront | 10 TB transfer | ~$80 |
| SES | 100k emails/mo | ~$10 |
| Route 53 | 1 hosted zone | ~$1 |
| CloudWatch | logs + metrics | ~$15 |
| **Total** | | **~$346/mo** |

*Vercel Pro reference cost: $20–$150/mo depending on usage. AWS cost is higher but provides SLA guarantees, VPC isolation, and no cold-start constraints.*

---

## 8. Production Cutover CLI Sequence

### 8.1 Initialize Terraform State Backend

```bash
aws s3api create-bucket --bucket slipwise-terraform-state --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-bucket-versioning --bucket slipwise-terraform-state \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name slipwise-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
```

### 8.2 Deploy Infrastructure (Staging → Production)

```bash
cd infra/terraform/environments/staging
terraform init && terraform plan -out=staging.tfplan && terraform apply staging.tfplan

cd ../production
terraform init && terraform plan -out=production.tfplan && terraform apply production.tfplan
```

### 8.3 Database Migration

```bash
# Export from Supabase
pg_dump --format=custom --no-owner --no-privileges \
  --exclude-table='auth.*' --exclude-table='storage.*' $SUPABASE_DB_URL > backup.dump

# Import to RDS
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
pg_restore --host=$RDS_ENDPOINT --port=5432 --username=slipwise_admin \
  --dbname=slipwise --no-owner --jobs=4 backup.dump

# Apply migrations
DATABASE_URL="postgresql://slipwise_admin:$DB_PASS@$RDS_ENDPOINT:5432/slipwise" npx prisma migrate deploy
```

### 8.4 Build & Deploy Docker Image

```bash
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
docker build --platform linux/amd64 -t $ECR_URL:$(git rev-parse --short HEAD) -t $ECR_URL:latest .
docker push $ECR_URL --all-tags
aws ecs update-service --cluster slipwise-production --service slipwise-production --force-new-deployment
aws ecs wait services-stable --cluster slipwise-production --services slipwise-production
```

### 8.5 DNS Cutover

```bash
CF_DOMAIN=$(terraform output -raw cloudfront_domain)
# Update DNS: app.slipwise.in → CNAME → $CF_DOMAIN
# Verify: dig +short app.slipwise.in
```

### 8.6 Rollback (if needed)

```bash
# DNS rollback: revert CNAME to cname.vercel-dns.com
# ECS rollback: aws ecs update-service --task-definition <previous-revision>
```

---

## 9. Disaster Recovery

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single AZ failure | 0 min (Multi-AZ) | 0 |
| Region failure | < 1 hour | < 5 min |
| Data corruption | < 30 min | Point-in-time |
| Full infrastructure loss | < 4 hours | Last backup |

---

## 10. References

- [Prisma migrate deploy docs](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
- [Next.js standalone Docker guide](https://nextjs.org/docs/pages/building-your-application/deploying#docker-image)
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Aurora Serverless v2 pricing](https://aws.amazon.com/rds/aurora/pricing/)
- [ElastiCache Valkey](https://aws.amazon.com/elasticache/valkey/)
