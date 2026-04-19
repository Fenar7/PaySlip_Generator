# Incident Response Runbook — Slipwise One

**Version:** 1.0  
**Classification:** Internal — Engineering & Operations  
**Last Updated:** 2026-06-01  

---

## 1. Incident Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **SEV-1** | Complete service outage | DB down, all APIs returning 5xx | 5 minutes |
| **SEV-2** | Major feature unavailable | Billing broken, SSO failing | 15 minutes |
| **SEV-3** | Degraded performance | High latency, intermittent errors | 30 minutes |
| **SEV-4** | Minor issue | UI glitch, non-critical feature bug | Next business day |

## 2. Incident Response Workflow

### Phase 1: Detection & Alert (0-5 minutes)

**Automated Detection:**
- CloudWatch alarms: 5xx rate > 1%, p99 latency > 5s, ECS task failures
- Uptime monitoring: 30-second health check intervals
- Database: Connection pool exhaustion, replication lag > 30s

**Manual Detection:**
- Customer reports via support channel
- Internal team observation

### Phase 2: Triage (5-15 minutes)

```bash
# Quick health check sequence
curl -sf https://api.slipwise.com/api/health | jq .

# Check ECS service status
aws ecs describe-services \
  --cluster slipwise-prod \
  --services slipwise-api \
  --query 'services[0].{running: runningCount, desired: desiredCount, events: events[:3]}'

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier slipwise-prod \
  --query 'DBInstances[0].{status: DBInstanceStatus, az: AvailabilityZone}'

# Check recent deployments
aws ecs describe-task-definition \
  --task-definition slipwise-api \
  --query 'taskDefinition.{rev: revision, image: containerDefinitions[0].image}'

# Check error logs (last 5 minutes)
aws logs filter-log-events \
  --log-group-name /ecs/slipwise-prod \
  --start-time $(date -d '5 minutes ago' +%s000) \
  --filter-pattern "ERROR" \
  --query 'events[:20].message'
```

**Decision Matrix:**

| Symptom | Likely Cause | First Action |
|---------|-------------|--------------|
| All endpoints 5xx | ECS tasks crashed | Check task definition, rollback |
| Database timeout | RDS overload/failure | Check connections, failover |
| Auth failures only | Supabase outage | Check Supabase status page |
| Slow responses | Resource exhaustion | Scale horizontally |
| Billing webhook failures | Stripe/Razorpay outage | Enable retry queue, check provider status |

### Phase 3: Containment (15-30 minutes)

**Rollback Deployment:**
```bash
# Get previous task definition revision
CURRENT=$(aws ecs describe-services --cluster slipwise-prod --services slipwise-api \
  --query 'services[0].taskDefinition' --output text | grep -oP '\d+$')
PREVIOUS=$((CURRENT - 1))

# Rollback
aws ecs update-service \
  --cluster slipwise-prod \
  --service slipwise-api \
  --task-definition slipwise-api:${PREVIOUS} \
  --force-new-deployment

# Monitor deployment
aws ecs wait services-stable --cluster slipwise-prod --services slipwise-api
```

**Database Emergency:**
```bash
# Kill long-running queries
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND pid != pg_backend_pid();
"

# Check connection count
psql $DATABASE_URL -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

**Traffic Management:**
```bash
# Enable maintenance mode via CloudFront
aws cloudfront update-distribution \
  --id E1234567890 \
  --default-root-object maintenance.html

# Or shed load by reducing desired count to minimum
aws ecs update-service \
  --cluster slipwise-prod \
  --service slipwise-api \
  --desired-count 2
```

### Phase 4: Resolution

**Verify Fix:**
```bash
# Health endpoint
curl -sf https://api.slipwise.com/api/health | jq .

# Synthetic transaction test
curl -sf -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.slipwise.com/api/v1/invoices?limit=1 | jq .status

# Error rate check (should be < 0.1%)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --period 60 --statistics Sum \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

### Phase 5: Post-Incident

**Within 24 hours:**
1. Write blameless post-mortem (template below)
2. Update status page with root cause
3. Notify affected customers with resolution details
4. Create follow-up tickets for preventive measures

## 3. Specific Scenario Playbooks

### 3.1 Billing System Failure

**Symptoms:** Webhook processing failing, subscription states not updating.

```bash
# Check webhook delivery queue
psql $DATABASE_URL -c "
  SELECT status, count(*)
  FROM \"ApiWebhookDelivery\"
  WHERE \"createdAt\" > NOW() - INTERVAL '1 hour'
  GROUP BY status;
"

# Check dead letter queue
psql $DATABASE_URL -c "
  SELECT \"eventType\", count(*), max(\"failedAt\")
  FROM \"WebhookDeadLetter\"
  WHERE \"resolvedAt\" IS NULL
  GROUP BY \"eventType\";
"

# Manual retry of failed billing webhooks
curl -X POST https://api.slipwise.com/api/cron/webhook-retry \
  -H "Authorization: Bearer $CRON_SECRET"
```

**If Stripe is down:**
1. Queue all incoming webhook events to dead letter table
2. Billing portal shows "Payment processing delayed" banner
3. Do NOT cancel any subscriptions during outage
4. When Stripe recovers, replay events in chronological order

### 3.2 SSO/Authentication Failure

**Symptoms:** Users cannot log in via SSO, SAML assertions failing.

```bash
# Check Supabase auth status
curl -sf https://<project-ref>.supabase.co/auth/v1/health

# Check SSO config validity
psql $DATABASE_URL -c "
  SELECT \"orgId\", protocol, \"idpEntityId\", \"lastHealthCheck\", \"healthStatus\"
  FROM \"SsoConfig\"
  WHERE enabled = true
  ORDER BY \"lastHealthCheck\" DESC;
"
```

**Break-Glass Procedure:**
1. Admin uses email/password login (SSO bypass always available for owners)
2. Navigate to Settings → Security → SSO
3. Toggle "Enforce SSO" off to allow password login for all members
4. Diagnose and fix the IdP configuration
5. Re-enable enforcement once verified

### 3.3 Data Integrity Alert

**Symptoms:** Forensic audit chain verification detects tampering.

```bash
# Run chain verification
psql $DATABASE_URL -c "
  SELECT fa.id, fa.\"entryHash\", fa.\"previousEntryHash\"
  FROM \"ForensicAuditEntry\" fa
  ORDER BY fa.\"sequence\" DESC
  LIMIT 50;
"

# Identify broken links
# Compare computed hash vs stored hash for each entry
```

**Response:**
1. **DO NOT modify or delete any records** — preserve evidence
2. Immediately disable write access to the audit log
3. Export the full chain for offline forensic analysis
4. Notify Security Lead and Legal
5. Determine if breach disclosure is required

## 4. Communication Templates

### Status Page Update (SEV-1)
```
Title: Service Disruption - [Component]
Status: Investigating

We are currently experiencing issues with [component]. 
Our engineering team is actively investigating.
We will provide updates every 15 minutes.

Last updated: [timestamp]
```

### Customer Notification (Resolution)
```
Subject: Resolved: [Brief Description]

We experienced a service disruption affecting [component] 
from [start time] to [end time] UTC.

Impact: [description of user-facing impact]
Root Cause: [brief, non-technical explanation]
Resolution: [what was done to fix it]
Prevention: [what we're doing to prevent recurrence]

We apologize for any inconvenience.
```

## 5. Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Severity:** SEV-X
**Duration:** X hours Y minutes
**Impact:** [number of affected users/orgs]

## Timeline
- HH:MM — [Event]
- HH:MM — [Event]

## Root Cause
[Technical explanation]

## Resolution
[What fixed it]

## What Went Well
- [Item]

## What Went Wrong
- [Item]

## Action Items
| Item | Owner | Due Date |
|------|-------|----------|
| [Prevention measure] | [Name] | [Date] |
```

## 6. Escalation Path

```
On-Call Engineer (5 min)
    ↓ (if not resolved in 15 min)
Engineering Lead
    ↓ (if SEV-1 or customer-facing > 30 min)
CTO + Product Lead
    ↓ (if data breach or legal implications)
Legal + External Communications
```

## 7. Tool Access

| Tool | URL | Purpose |
|------|-----|---------|
| AWS Console | console.aws.amazon.com | Infrastructure management |
| CloudWatch | cloudwatch.aws.amazon.com | Logs and metrics |
| Supabase Dashboard | app.supabase.com | Auth and database |
| Stripe Dashboard | dashboard.stripe.com | Billing and payments |
| Status Page | admin.statuspage.io | Customer communication |
| PagerDuty | slipwise.pagerduty.com | On-call management |
