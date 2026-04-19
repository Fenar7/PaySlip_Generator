# Business Continuity Plan (BCP) — Slipwise One

**Version:** 1.0  
**Classification:** Internal — Engineering & Operations  
**Last Updated:** 2026-06-01  

---

## 1. Purpose

This document defines the Business Continuity Plan for Slipwise One, ensuring service availability and data integrity during infrastructure failures, natural disasters, or security incidents.

## 2. Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** (Recovery Point Objective) | < 1 hour | Point-in-time recovery from RDS automated backups |
| **RTO** (Recovery Time Objective) | < 4 hours | Full service restoration from any single failure |
| **MTTR** (Mean Time to Recovery) | < 2 hours | For most common failure scenarios |

## 3. Infrastructure Architecture

### Primary Stack
- **Compute:** AWS ECS Fargate (Multi-AZ, auto-scaling)
- **Database:** AWS RDS PostgreSQL (Multi-AZ deployment, automated backups)
- **Storage:** AWS S3 (versioning enabled, cross-region replication)
- **CDN:** AWS CloudFront (global edge locations)
- **DNS:** Route 53 with health checks and failover routing

### Data Residency Regions
| Region | AWS Region | Primary Use |
|--------|-----------|-------------|
| US | us-east-1 | Default for international customers |
| EU | eu-west-1 | GDPR-compliant European data |
| India | ap-south-1 | Indian data residency compliance |

## 4. Failure Scenarios & Recovery Procedures

### 4.1 RDS Database Failure

**Scenario:** Primary database instance becomes unavailable.

**Automatic Recovery:**
- Multi-AZ failover triggers automatically (typically 60-120 seconds)
- Route 53 health checks detect failure and redirect traffic
- No data loss due to synchronous replication

**Manual Recovery (complete region failure):**
```bash
# 1. Identify the latest automated backup
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier slipwise-prod \
  --query 'DBClusterSnapshots | sort_by(@, &SnapshotCreateTime) | [-1]'

# 2. Restore to a new cluster in the DR region
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier slipwise-prod-dr \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --availability-zones eu-west-1a eu-west-1b

# 3. Create instances in the new cluster
aws rds create-db-instance \
  --db-instance-identifier slipwise-prod-dr-1 \
  --db-cluster-identifier slipwise-prod-dr \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-postgresql

# 4. Update application DATABASE_URL in ECS task definition
aws ecs update-service \
  --cluster slipwise-prod \
  --service slipwise-api \
  --force-new-deployment

# 5. Verify connectivity
psql $DR_DATABASE_URL -c "SELECT NOW();"
```

**Validation:**
- Run `SELECT COUNT(*) FROM "Organization"` and compare to last known count
- Verify forensic audit chain integrity: `SELECT * FROM verify_audit_chain()`
- Monitor application error rates for 30 minutes post-recovery

### 4.2 S3 Data Loss

**Scenario:** Objects deleted or corrupted in primary S3 bucket.

**Recovery from Versioning:**
```bash
# List deleted objects (delete markers)
aws s3api list-object-versions \
  --bucket slipwise-prod-documents \
  --prefix "org_" \
  --query 'DeleteMarkers[?IsLatest==`true`]'

# Restore a specific object by removing delete marker
aws s3api delete-object \
  --bucket slipwise-prod-documents \
  --key "org_abc123/invoices/INV-001.pdf" \
  --version-id "<delete-marker-version-id>"

# Bulk restore from cross-region replica
aws s3 sync \
  s3://slipwise-dr-documents/ \
  s3://slipwise-prod-documents/ \
  --source-region eu-west-1
```

**Prevention:**
- S3 Object Lock enabled for compliance documents
- Cross-region replication with 15-minute lag SLA
- MFA Delete required for permanent deletions

### 4.3 ECS Compute Failure

**Scenario:** ECS tasks fail to start or crash repeatedly.

**Diagnosis:**
```bash
# Check stopped task reasons
aws ecs describe-tasks \
  --cluster slipwise-prod \
  --tasks $(aws ecs list-tasks --cluster slipwise-prod --desired-status STOPPED --query 'taskArns[:5]' --output text)

# Check service events
aws ecs describe-services \
  --cluster slipwise-prod \
  --services slipwise-api \
  --query 'services[0].events[:10]'
```

**Recovery:**
```bash
# Force new deployment with previous known-good task definition
aws ecs update-service \
  --cluster slipwise-prod \
  --service slipwise-api \
  --task-definition slipwise-api:<previous-revision> \
  --force-new-deployment

# If image is the issue, rollback ECR tag
aws ecr batch-get-image \
  --repository-name slipwise-api \
  --image-ids imageTag=last-known-good \
  --query 'images[0].imageManifest' --output text | \
  aws ecr put-image \
    --repository-name slipwise-api \
    --image-tag latest \
    --image-manifest file:///dev/stdin
```

### 4.4 API Service Degradation

**Scenario:** Application responding but with high latency or error rates.

**Immediate Actions:**
1. Scale ECS tasks horizontally: `aws ecs update-service --desired-count 10`
2. Enable CloudFront emergency caching for static responses
3. Activate circuit breaker for external services (Stripe, Razorpay)
4. Shed load: return 503 for non-critical endpoints

### 4.5 Complete Region Failure

**Scenario:** Entire AWS region becomes unavailable.

**Failover Sequence:**
1. Route 53 health checks detect failure (30-second intervals)
2. DNS failover routes traffic to DR region
3. ECS service in DR region scales from 0 to N (cold start: ~3 minutes)
4. RDS read replica in DR promoted to primary
5. S3 cross-region replica serves documents
6. Notify all customers via status page

## 5. Backup Schedule

| Resource | Frequency | Retention | Storage |
|----------|-----------|-----------|---------|
| RDS Automated | Every 5 min (continuous) | 35 days | Same region |
| RDS Manual Snapshot | Daily at 02:00 UTC | 90 days | Cross-region |
| S3 Cross-Region Replication | Real-time | Indefinite | DR region |
| Forensic Audit Logs | Continuous | 7 years | S3 Glacier Deep Archive |
| Application Config | On every deployment | 365 days | S3 + Git |

## 6. Communication Plan

| Severity | Channel | SLA |
|----------|---------|-----|
| P1 (Service Down) | Status page + Email + SMS | 15 minutes |
| P2 (Degraded) | Status page + Email | 30 minutes |
| P3 (Component Issue) | Status page | 1 hour |

**Status Page:** status.slipwise.com  
**Escalation:** On-call → Engineering Lead → CTO

## 7. Testing Schedule

- **Monthly:** Automated failover drills (RDS, ECS)
- **Quarterly:** Full DR region activation test
- **Annual:** Complete region-failure simulation with customer notification

## 8. Ownership

| Role | Responsibility |
|------|---------------|
| On-Call Engineer | First response, initial triage |
| Engineering Lead | Escalation decisions, coordinate recovery |
| CTO | Customer communication, business decisions |
| Security Lead | Data integrity verification post-recovery |
