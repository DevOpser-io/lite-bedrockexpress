# DevOpser Platform Operations Guide

## Overview

This document outlines operational requirements for the DevOpser platform, including resource lifecycle management, admin panel requirements, and compliance considerations.

---

## Resource Lifecycle Management

### The Destroy Path Principle

**Every feature that provisions a resource MUST have a corresponding destroy path.**

When adding new features that create AWS resources, database records, or external service integrations, developers must implement the complete lifecycle:

```
CREATE → READ → UPDATE → DELETE
```

### Current Resource Lifecycle Matrix

| Resource | Create Path | Destroy Path | Status |
|----------|-------------|--------------|--------|
| Site (DB) | `POST /api/sites` | `DELETE /api/sites/:id` | ✅ Implemented |
| Deployment (DB) | `POST /api/sites/:id/publish` | Cascade delete with site | ✅ Implemented |
| Site Images (DB) | `POST /api/sites/:id/images` | Cascade delete with site | ✅ Implemented |
| Lightsail Container | `lightsailService.createContainerService()` | `lightsailService.deleteContainerService()` | ⏳ Stub |
| ECR Images | GitHub Actions push | `ecrService.deleteImagesForSite()` | ⏳ Stub |
| GitHub Repository | `githubService.createSiteRepo()` | `githubService.deleteSiteRepo()` | ⏳ Stub |
| Subdomain DNS | `route53Service.createSubdomainRecord()` | `route53Service.deleteSubdomainRecord()` | ⏳ Stub |
| Custom Domain DNS | `route53Service.createCustomDomainRecords()` | `route53Service.deleteCustomDomainRecords()` | ⏳ Stub |
| ACM Certificate | `acmService.requestCertificate()` | `acmService.deleteCertificate()` | ⏳ Stub |

### Destroy Sequence Order

Resources must be destroyed in the correct order to avoid orphaned resources and dependency errors:

```
1. Lightsail Container Service    ← Stop billing immediately
2. ECR Images                     ← Clean up storage
3. GitHub Repository              ← Remove code/config
4. Subdomain DNS Record           ← Remove {slug}.devopser.io
5. Custom Domain DNS Records      ← If configured
6. ACM SSL Certificate            ← If custom domain was used
7. Database: Deployments          ← Foreign key dependency
8. Database: Site Images          ← Foreign key dependency
9. Database: Site                 ← Primary record
```

### Adding New Features Checklist

When adding a new feature that provisions resources:

- [ ] Implement the create/provision logic
- [ ] Implement the destroy/cleanup logic
- [ ] Add to the Resource Lifecycle Matrix above
- [ ] Update `DELETE /api/sites/:id` if site-scoped
- [ ] Add cleanup logging for audit trail
- [ ] Test both create AND destroy paths
- [ ] Document any manual cleanup steps if automation fails

### Error Handling in Destroy Paths

```javascript
// Pattern: Log errors but continue cleanup
try {
  await lightsailService.deleteContainerService(site);
} catch (error) {
  console.error(`[Cleanup] Failed to delete Lightsail service: ${error.message}`);
  // Continue with other cleanup - don't throw
  // Log for manual intervention if needed
  await alertOps('lightsail_cleanup_failed', { siteId, error: error.message });
}
```

**Principle:** A failed cleanup step should not prevent other cleanup steps from running. Log failures for manual intervention.

---

## Admin Panel Requirements

### Current State

The admin panel (`/admin`) is currently a stub. It needs to be built out to provide platform-wide visibility and management capabilities.

### Required Views

#### 1. Platform Dashboard

**Route:** `/admin`

```
┌─────────────────────────────────────────────────────────────────┐
│ DevOpser Admin Dashboard                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Total    │  │ Draft    │  │ Published│  │ Failed   │       │
│  │ Sites    │  │ Sites    │  │ Sites    │  │ Deploys  │       │
│  │   127    │  │    45    │  │    78    │  │     4    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Total    │  │ Active   │  │ Monthly  │  │ Storage  │       │
│  │ Users    │  │ Today    │  │ Cost Est │  │ Used     │       │
│  │    52    │  │    12    │  │  $892    │  │  45 GB   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  Recent Activity                              [View All →]      │
│  ─────────────────────────────────────────────────────────     │
│  • user@example.com published "My Portfolio" (2 min ago)       │
│  • admin@co.com created new site "Landing Page" (15 min ago)   │
│  • deploy failed for site #45 - container timeout (1 hr ago)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Software Catalogue (All Sites)

**Route:** `/admin/sites`

Required for NIST CSF compliance - complete inventory of all hosted software/sites.

```
┌─────────────────────────────────────────────────────────────────┐
│ Software Catalogue - All Sites                    [Export CSV]  │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All Status ▼] [All Users ▼] [Date Range] [Search...] │
├─────────────────────────────────────────────────────────────────┤
│ ID │ Name         │ Owner        │ Status    │ URL            │ Created    │
│────│──────────────│──────────────│───────────│────────────────│────────────│
│ 1  │ My Portfolio │ john@ex.com  │ Published │ portfolio.dev… │ 2024-01-01 │
│ 2  │ Landing Page │ jane@ex.com  │ Draft     │ landing.dev…   │ 2024-01-02 │
│ 3  │ Shop Site    │ bob@ex.com   │ Failed    │ shop.devops…   │ 2024-01-03 │
│ 4  │ Blog         │ john@ex.com  │ Deploying │ blog.devops…   │ 2024-01-04 │
├─────────────────────────────────────────────────────────────────┤
│ Showing 1-50 of 127 sites                    [← Prev] [Next →] │
└─────────────────────────────────────────────────────────────────┘
```

**Required Fields:**
- Site ID
- Site Name
- Owner (User email)
- Status (draft/deploying/published/failed)
- Public URL
- Custom Domain (if any)
- Created Date
- Last Modified
- Last Deployment Date
- Deployment Count
- GitHub Repo URL
- Lightsail Service Name

**Actions:**
- View site details
- View as owner (impersonate for support)
- Force re-deploy
- Disable site (take offline)
- Delete site (with full cleanup)

#### 3. Site Detail View

**Route:** `/admin/sites/:id`

```
┌─────────────────────────────────────────────────────────────────┐
│ Site: My Portfolio                              [Back to List]  │
├─────────────────────────────────────────────────────────────────┤
│ Status: ● Published                                             │
│                                                                 │
│ General Information                                             │
│ ─────────────────────────────────────────────────────────────  │
│ ID:              1                                              │
│ Slug:            my-portfolio                                   │
│ Owner:           john@example.com (User #12)                    │
│ Created:         2024-01-01 10:30:00                           │
│ Last Modified:   2024-01-15 14:22:00                           │
│                                                                 │
│ URLs                                                            │
│ ─────────────────────────────────────────────────────────────  │
│ Subdomain:       https://my-portfolio.devopser.io              │
│ Custom Domain:   https://johnsmith.com (SSL Valid)             │
│ Preview URL:     https://container-xyz.lightsail.aws/          │
│                                                                 │
│ Infrastructure                                                  │
│ ─────────────────────────────────────────────────────────────  │
│ GitHub Repo:     devopser-sites/site-1-my-portfolio            │
│ Lightsail:       devopser-my-portfolio (nano, 1 instance)      │
│ ECR Images:      3 images (latest: abc123)                     │
│                                                                 │
│ Deployment History                               [View All →]   │
│ ─────────────────────────────────────────────────────────────  │
│ #5  2024-01-15 14:20  Success   Duration: 2m 34s               │
│ #4  2024-01-10 09:15  Success   Duration: 2m 12s               │
│ #3  2024-01-08 11:30  Failed    Error: Container timeout       │
│                                                                 │
│ Actions                                                         │
│ ─────────────────────────────────────────────────────────────  │
│ [View Live Site] [View Config] [Re-deploy] [Disable] [Delete]  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. User Management

**Route:** `/admin/users`

```
┌─────────────────────────────────────────────────────────────────┐
│ User Management                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ID │ Email           │ Sites │ Role  │ MFA │ Last Login        │
│────│─────────────────│───────│───────│─────│───────────────────│
│ 1  │ john@ex.com     │   3   │ user  │ ✓   │ 2024-01-15 10:30 │
│ 2  │ admin@devops.io │   0   │ admin │ ✓   │ 2024-01-15 14:00 │
│ 3  │ jane@ex.com     │   1   │ user  │ ✗   │ 2024-01-14 09:00 │
└─────────────────────────────────────────────────────────────────┘
```

#### 5. Platform Health

**Route:** `/admin/health`

```
┌─────────────────────────────────────────────────────────────────┐
│ Platform Health                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Service              │ Status │ Latency │ Last Check           │
│──────────────────────│────────│─────────│──────────────────────│
│ PostgreSQL           │ ● OK   │ 2ms     │ 2024-01-15 14:30:00 │
│ Redis                │ ● OK   │ 1ms     │ 2024-01-15 14:30:00 │
│ AWS Bedrock          │ ● OK   │ 150ms   │ 2024-01-15 14:30:00 │
│ AWS Lightsail        │ ● OK   │ 45ms    │ 2024-01-15 14:30:00 │
│ AWS ECR              │ ● OK   │ 32ms    │ 2024-01-15 14:30:00 │
│ GitHub API           │ ● OK   │ 89ms    │ 2024-01-15 14:30:00 │
│ Route53              │ ● OK   │ 28ms    │ 2024-01-15 14:30:00 │
└─────────────────────────────────────────────────────────────────┘
```

---

## NIST Cybersecurity Framework (CSF) Compliance

### Relevant NIST CSF Functions

#### IDENTIFY (ID)

**ID.AM - Asset Management**
- Maintain complete inventory of all hosted sites (Software Catalogue)
- Track all infrastructure resources per site
- Document data flows between components

**Required Features:**
- [ ] Software Catalogue view in admin panel
- [ ] Export site inventory to CSV/JSON
- [ ] Track resource dependencies per site
- [ ] Document external integrations

#### PROTECT (PR)

**PR.AC - Access Control**
- Role-based access (user vs admin)
- MFA enforcement
- Session management

**PR.DS - Data Security**
- Encryption at rest (RDS, S3)
- Encryption in transit (HTTPS)
- Secure credential storage (AWS Secrets Manager)

#### DETECT (DE)

**DE.CM - Security Continuous Monitoring**
- Log all admin actions
- Monitor for anomalous activity
- Track failed deployments

**Required Features:**
- [ ] Audit log for all admin actions
- [ ] Alert on multiple failed deployments
- [ ] Monitor for unusual resource usage

#### RESPOND (RS)

**RS.RP - Response Planning**
- Ability to quickly disable compromised sites
- Force re-deployment capability
- Rollback to previous configuration

**Required Features:**
- [ ] "Disable Site" button (takes offline immediately)
- [ ] "Rollback" to previous published config
- [ ] Bulk operations for incident response

#### RECOVER (RC)

**RC.RP - Recovery Planning**
- Backup and restore procedures
- Disaster recovery documentation

**Required Features:**
- [ ] Database backup/restore procedures
- [ ] Site config export/import
- [ ] Infrastructure-as-code for platform recovery

---

## API Endpoints for Admin Panel

### Platform Stats

```
GET /api/admin/stats
Response:
{
  "sites": {
    "total": 127,
    "draft": 45,
    "deploying": 4,
    "published": 78,
    "failed": 0
  },
  "users": {
    "total": 52,
    "activeToday": 12,
    "withMfa": 48
  },
  "deployments": {
    "today": 15,
    "thisWeek": 67,
    "successRate": 0.94
  },
  "infrastructure": {
    "estimatedMonthlyCost": 892.50,
    "storageUsedGb": 45.2
  }
}
```

### Site Listing (Admin)

```
GET /api/admin/sites?status=all&page=1&limit=50&search=
Response:
{
  "sites": [...],
  "pagination": {
    "total": 127,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

### Site Detail (Admin)

```
GET /api/admin/sites/:id
Response:
{
  "site": {
    "id": 1,
    "name": "My Portfolio",
    "slug": "my-portfolio",
    "owner": {
      "id": 12,
      "email": "john@example.com"
    },
    "status": "published",
    "infrastructure": {
      "githubRepoUrl": "...",
      "lightsailServiceName": "...",
      "ecrImages": [...]
    },
    "deployments": [...],
    "config": {...}
  }
}
```

### Admin Actions

```
POST /api/admin/sites/:id/disable    # Take site offline
POST /api/admin/sites/:id/enable     # Bring site back online
POST /api/admin/sites/:id/redeploy   # Force re-deployment
POST /api/admin/sites/:id/rollback   # Rollback to previous config
DELETE /api/admin/sites/:id          # Delete with full cleanup
```

---

## Implementation Priority

### Phase 1: Core Admin Views
1. Platform dashboard with basic stats
2. Software catalogue (all sites list)
3. Site detail view with actions

### Phase 2: User Management
1. User listing
2. User detail with site ownership
3. Impersonation for support

### Phase 3: Monitoring & Compliance
1. Audit logging
2. Platform health dashboard
3. Export capabilities for compliance

### Phase 4: Advanced Operations
1. Bulk operations
2. Alerting integration
3. Cost tracking per user/site

---

## Database Schema Additions

For admin panel features, consider adding:

```sql
-- Audit log for admin actions
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),  -- 'site', 'user', 'deployment'
  target_id INTEGER,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Platform metrics (for dashboard)
CREATE TABLE platform_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Site status history (for compliance)
CREATE TABLE site_status_history (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## User Footprint Visualization

### User Detail View

**Route:** `/admin/users/:id`

Each user should have a comprehensive view showing their entire footprint across the platform and AWS.

```
┌─────────────────────────────────────────────────────────────────┐
│ User: john@example.com                          [Back to List]  │
├─────────────────────────────────────────────────────────────────┤
│ Account Information                                             │
│ ─────────────────────────────────────────────────────────────  │
│ User ID:         12                                             │
│ Email:           john@example.com                               │
│ Role:            user                                           │
│ MFA:             ✓ Enabled                                      │
│ Created:         2024-01-01                                     │
│ Last Login:      2024-01-15 10:30:00                           │
│ AWS Account ID:  123456789012 (tenant-john-example)            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ RESOURCE FOOTPRINT                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              USER FOOTPRINT GRAPH                        │   │
│  │                                                          │   │
│  │     ┌──────────┐                                        │   │
│  │     │  USER    │                                        │   │
│  │     │ john@... │                                        │   │
│  │     └────┬─────┘                                        │   │
│  │          │                                              │   │
│  │    ┌─────┴─────┬─────────────┐                         │   │
│  │    ▼           ▼             ▼                         │   │
│  │ ┌──────┐  ┌──────┐     ┌──────┐                       │   │
│  │ │Site 1│  │Site 2│     │Site 3│                       │   │
│  │ │Portfolio│ │Blog │     │Shop  │                       │   │
│  │ └───┬──┘  └───┬──┘     └───┬──┘                       │   │
│  │     │         │            │                           │   │
│  │     ▼         ▼            ▼                           │   │
│  │  ┌─────────────────────────────────────────┐          │   │
│  │  │         AWS RESOURCES                    │          │   │
│  │  ├─────────────────────────────────────────┤          │   │
│  │  │ Lightsail Containers: 3                  │          │   │
│  │  │ ECR Images: 12                           │          │   │
│  │  │ Route53 Records: 5                       │          │   │
│  │  │ ACM Certificates: 1                      │          │   │
│  │  │ GitHub Repos: 3                          │          │   │
│  │  └─────────────────────────────────────────┘          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Sites (3)                                                       │
│ ─────────────────────────────────────────────────────────────  │
│ Name          │ Status    │ GitHub Repo                    │ AWS │
│───────────────│───────────│────────────────────────────────│─────│
│ My Portfolio  │ Published │ [devopser/site-1-portfolio] ↗  │ [$7]│
│ Blog          │ Draft     │ [devopser/site-2-blog] ↗       │ [$0]│
│ Shop          │ Published │ [devopser/site-3-shop] ↗       │ [$7]│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ AWS Resource Summary                                            │
│ ─────────────────────────────────────────────────────────────  │
│ Resource Type        │ Count │ Monthly Cost                    │
│──────────────────────│───────│─────────────────────────────────│
│ Lightsail Containers │   2   │ $14.00                          │
│ ECR Images           │  12   │ $0.12                           │
│ Route53 Records      │   5   │ $0.00                           │
│ ACM Certificates     │   1   │ $0.00                           │
│ S3 Storage           │ 250MB │ $0.01                           │
│──────────────────────│───────│─────────────────────────────────│
│ TOTAL                │       │ $14.13/month                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ GitHub Repositories                                             │
│ ─────────────────────────────────────────────────────────────  │
│ • devopser-sites/site-1-portfolio  [View ↗] [Commits] [Actions]│
│ • devopser-sites/site-2-blog       [View ↗] [Commits] [Actions]│
│ • devopser-sites/site-3-shop       [View ↗] [Commits] [Actions]│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Actions                                                         │
│ ─────────────────────────────────────────────────────────────  │
│ [View All Sites] [Export Data] [Suspend User] [Delete User]    │
└─────────────────────────────────────────────────────────────────┘
```

### Site GitHub Integration

Each site in the admin panel should display:

```
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Repository                                               │
│ ─────────────────────────────────────────────────────────────  │
│ Repository:    devopser-sites/site-1-my-portfolio              │
│ URL:           https://github.com/devopser-sites/site-1-...    │
│                                                                 │
│ Quick Links:                                                    │
│ [View Repo ↗] [Commits ↗] [Actions ↗] [Pull Requests ↗]       │
│                                                                 │
│ Recent Commits:                                                 │
│ • abc1234 - Update site configuration (2 hours ago)            │
│ • def5678 - Initial site setup (3 days ago)                    │
│                                                                 │
│ Latest Workflow Run:                                            │
│ ✓ Deploy to Lightsail - Success (2 hours ago) [View ↗]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## AWS Multi-Account Strategy

### Why Separate AWS Accounts?

For enterprise customers and better isolation, consider using **AWS Organizations** to create separate AWS accounts per tenant:

**Benefits:**
- **Security Isolation**: Complete blast radius containment
- **Cost Attribution**: Clear billing per customer
- **Compliance**: Easier to meet data residency requirements
- **Resource Limits**: Each account has its own service limits
- **Access Control**: Simpler IAM policies

### Account Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS ORGANIZATION                             │
│                    (Management Account)                         │
│                    org-devopser-prod                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Platform    │  │ Shared      │  │ Security    │            │
│  │ Account     │  │ Services    │  │ Account     │            │
│  │             │  │             │  │             │            │
│  │ - App Server│  │ - ECR Repos │  │ - CloudTrail│            │
│  │ - Database  │  │ - Route53   │  │ - GuardDuty │            │
│  │ - Redis     │  │ - ACM       │  │ - Config    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TENANT ACCOUNTS (per customer)              │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ tenant-     │  │ tenant-     │  │ tenant-     │     │   │
│  │  │ customer-1  │  │ customer-2  │  │ customer-3  │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ - Lightsail │  │ - Lightsail │  │ - Lightsail │     │   │
│  │  │ - S3 Bucket │  │ - S3 Bucket │  │ - S3 Bucket │     │   │
│  │  │ - CloudFront│  │ - CloudFront│  │ - CloudFront│     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                          │   │
│  │  ... (one account per paying customer/enterprise)        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Account Provisioning Flow

```
1. User upgrades to Enterprise tier
   ↓
2. Platform creates new AWS account via Organizations API
   ↓
3. Apply baseline CloudFormation StackSet (security, logging)
   ↓
4. Store account ID in user record
   ↓
5. Future deployments go to tenant's account
   ↓
6. Billing consolidated to management account
```

### Database Schema for Multi-Account

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN aws_account_id VARCHAR(12);
ALTER TABLE users ADD COLUMN aws_account_name VARCHAR(100);
ALTER TABLE users ADD COLUMN account_tier VARCHAR(20) DEFAULT 'free';
-- 'free' = shared account, 'pro' = shared account, 'enterprise' = dedicated account

-- Track AWS accounts
CREATE TABLE aws_tenant_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  aws_account_id VARCHAR(12) NOT NULL UNIQUE,
  aws_account_name VARCHAR(100),
  aws_account_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, pending_deletion
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Track resources per account for billing
CREATE TABLE aws_resource_inventory (
  id SERIAL PRIMARY KEY,
  aws_account_id VARCHAR(12) REFERENCES aws_tenant_accounts(aws_account_id),
  resource_type VARCHAR(50),  -- 'lightsail', 'ecr', 's3', etc.
  resource_id VARCHAR(255),
  resource_arn VARCHAR(500),
  site_id INTEGER REFERENCES sites(id),
  monthly_cost_estimate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Account Cleanup on User Deletion

When an enterprise user is deleted:

```javascript
async function deleteEnterpriseUser(userId) {
  const user = await db.User.findByPk(userId);

  if (user.awsAccountId) {
    // 1. Delete all sites (triggers resource cleanup)
    const sites = await db.Site.findAll({ where: { userId } });
    for (const site of sites) {
      await deleteSite(site.id);  // Uses existing cleanup logic
    }

    // 2. Close the AWS account
    await organizations.closeAccount({
      AccountId: user.awsAccountId
    });

    // 3. Mark account as deleted
    await db.AwsTenantAccount.update(
      { status: 'deleted', deletedAt: new Date() },
      { where: { awsAccountId: user.awsAccountId } }
    );
  }

  // 4. Delete user record
  await user.destroy();
}
```

### Cost Tracking Per Account

```
GET /api/admin/users/:id/aws-costs

Response:
{
  "userId": 12,
  "awsAccountId": "123456789012",
  "period": "2024-01",
  "costs": {
    "lightsail": 14.00,
    "ecr": 0.12,
    "s3": 0.01,
    "dataTransfer": 2.50,
    "route53": 0.50,
    "total": 17.13
  },
  "breakdown": [
    { "siteId": 1, "siteName": "Portfolio", "cost": 7.50 },
    { "siteId": 3, "siteName": "Shop", "cost": 9.63 }
  ]
}
```

---

## Summary

1. **Destroy paths are mandatory** - Every provisioned resource needs a cleanup path
2. **Admin panel is critical** - Platform visibility is required for operations and compliance
3. **NIST CSF alignment** - Build with compliance in mind from the start
4. **Audit everything** - Log admin actions for accountability
5. **Think in lifecycles** - CREATE, READ, UPDATE, DELETE for every resource
