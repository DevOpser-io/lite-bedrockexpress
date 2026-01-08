# Migration Merge Strategy

## Overview
All migrations in this project are designed to be idempotent, allowing safe deployment across staging and production branches without risk of split heads or duplicate operations.

## Key Principles

### 1. Idempotency
Every migration checks for existence before creating/modifying database objects:
- Tables: Check with `queryInterface.showAllTables()` before `createTable`
- Columns: Check with `queryInterface.describeTable()` before `addColumn`
- Indexes: Wrap in try-catch to handle "already exists" errors gracefully

### 2. Migration Timestamps
- Format: `YYYYMMDDHHMMSS-descriptive-name.js`
- Example: `20260108120000-add-sites-tables.js`
- Sequelize tracks executed migrations by filename in `SequelizeMeta` table

### 3. Merge Strategy

#### When merging branches:
1. **No conflicts in migration files**: Migrations from different branches will run in timestamp order
2. **Same timestamp conflict**: Extremely rare, but if it occurs:
   - Rename one migration with a later timestamp
   - Update `SequelizeMeta` if already deployed

#### Safe deployment process:
1. Migrations run automatically on K8s deployment
2. If deployment fails mid-migration, next deployment will resume from last successful migration
3. Multiple pods can safely run migrations simultaneously due to idempotency

## Current Migration Structure

### DevOpser Lite Tables

| Table | Description |
|-------|-------------|
| `Users` | User accounts (from initial schema) |
| `conversations` | Chat history (from initial schema) |
| `sites` | Customer websites with draft/published configs |
| `deployments` | Deployment history for sites |
| `site_images` | AI-generated images for sites |

### Migration Files:
1. `20251222115645-initial-schema.js` - Users and conversations tables
2. `20260108120000-add-sites-tables.js` - DevOpser Lite sites, deployments, site_images

## Testing Idempotency

```bash
# Test full idempotency
npx sequelize-cli db:migrate:undo:all --config config/database.js
npx sequelize-cli db:migrate --config config/database.js
npx sequelize-cli db:migrate --config config/database.js  # Should report "No migrations were executed"

# Test partial state recovery
npx sequelize-cli db:migrate:undo --name 20260108120000-add-sites-tables.js --config config/database.js
npx sequelize-cli db:migrate --config config/database.js  # Should only run the undone migration
```

## Best Practices

1. **Always test migrations locally** before pushing
2. **Include rollback logic** in `down` method with existence checks
3. **Use descriptive migration names** for easy tracking
4. **Never modify existing migrations** that have been deployed
5. **Add new migrations** for schema changes

## Troubleshooting

### Migration stuck or failed
1. Check `SequelizeMeta` table for migration status
2. Manually verify database state
3. Run migrations again (safe due to idempotency)

### Duplicate migration names
1. Check `SELECT * FROM "SequelizeMeta"`
2. Rename conflicting migration file
3. Update `SequelizeMeta` if needed

### Permission errors
Ensure database user has proper permissions:
```sql
GRANT ALL ON SCHEMA public TO devuser;
GRANT ALL ON ALL TABLES IN SCHEMA public TO devuser;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO devuser;
```

### Password authentication errors
For local PostgreSQL with peer authentication:
```bash
# Option 1: Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_password';"

# Option 2: Update pg_hba.conf for local connections
# Change 'peer' to 'trust' or 'md5' for local connections
```
