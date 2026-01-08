# DevOpser Lite Database Setup Guide

This document explains how to set up the PostgreSQL database for DevOpser Lite.

## Prerequisites

- PostgreSQL installed and running locally
- `sudo` access (for initial database creation)

## Database Configuration

DevOpser Lite uses PostgreSQL with Sequelize ORM. The database configuration is managed through environment variables in the `.env` file.

### Environment Variables

Add the following to your `.env` file:

```bash
# PostgreSQL Configuration for DevOpser Lite
POSTGRES_DB=devopser_lite
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
```

**Note**: For local development with peer authentication, you may leave `POSTGRES_PASSWORD` empty if connecting as the postgres system user.

## Setup Steps

### 1. Create the Database

```bash
# Connect as the postgres system user and create the database
sudo -u postgres psql -c "CREATE DATABASE devopser_lite;"
```

### 2. Create a Database User (Optional but Recommended)

For better security, create a dedicated user instead of using `postgres`:

```bash
sudo -u postgres psql -c "CREATE USER devopser_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE devopser_lite TO devopser_user;"
sudo -u postgres psql -d devopser_lite -c "GRANT ALL ON SCHEMA public TO devopser_user;"
```

Then update `.env`:
```bash
POSTGRES_USER=devopser_user
POSTGRES_PASSWORD=your_secure_password
```

### 3. Configure PostgreSQL Authentication (if needed)

If you encounter authentication errors, you may need to update `pg_hba.conf`:

```bash
# Find pg_hba.conf location
sudo -u postgres psql -c "SHOW hba_file;"

# Edit the file (location varies by OS)
sudo nano /var/lib/pgsql/data/pg_hba.conf
# OR
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add or modify this line for local connections:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   devopser_lite   all                                     md5
host    devopser_lite   all             127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4. Run Database Migrations

From the `backend/` directory:

```bash
cd /home/ec2-user/lite-bedrockexpress/backend

# Run all pending migrations
npx sequelize-cli db:migrate --config config/database.js

# Or using npm script (if available)
npm run migrate
```

### 5. Verify Setup

```bash
# Connect to the database
sudo -u postgres psql -d devopser_lite

# List all tables
\dt

# You should see:
#  Schema |     Name      | Type  |  Owner
# --------+---------------+-------+----------
#  public | SequelizeMeta | table | postgres
#  public | Users         | table | postgres
#  public | conversations | table | postgres
#  public | deployments   | table | postgres
#  public | site_images   | table | postgres
#  public | sites         | table | postgres

# Exit psql
\q
```

## Database Tables

DevOpser Lite creates the following tables:

| Table | Description |
|-------|-------------|
| `Users` | User accounts with authentication info |
| `conversations` | Chat conversation history |
| `sites` | Customer websites with draft/published configs |
| `deployments` | Deployment history for sites |
| `site_images` | AI-generated images for sites |

## Common Issues

### "Peer authentication failed"

This means PostgreSQL is using peer authentication (matching system user to DB user). Solutions:

1. **Run as postgres user**: `sudo -u postgres psql`
2. **Use password auth**: Update `pg_hba.conf` to use `md5` instead of `peer`
3. **Set PGPASSWORD**: `export PGPASSWORD=your_password`

### "Database does not exist"

Create it first:
```bash
sudo -u postgres psql -c "CREATE DATABASE devopser_lite;"
```

### "Permission denied"

Grant privileges to your user:
```bash
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE devopser_lite TO your_user;"
```

### "relation does not exist"

Run the migrations:
```bash
npx sequelize-cli db:migrate --config config/database.js
```

## Rollback Migrations

To undo the last migration:
```bash
npx sequelize-cli db:migrate:undo --config config/database.js
```

To undo all migrations:
```bash
npx sequelize-cli db:migrate:undo:all --config config/database.js
```

## Reset Database (Development Only)

**WARNING**: This will delete all data!

```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS devopser_lite;"
sudo -u postgres psql -c "CREATE DATABASE devopser_lite;"

# Re-run migrations
npx sequelize-cli db:migrate --config config/database.js
```

## Production Setup

For production deployments:

1. Use AWS Secrets Manager for credentials (configured in `config/database.js`)
2. Set `NODE_ENV=production`
3. Enable SSL: `DB_REQUIRE_SSL=true`
4. Use AWS RDS instead of local PostgreSQL

Required secrets in AWS Secrets Manager:
- `DB_USER_SECRET_NAME`
- `DB_PASSWORD_SECRET_NAME`
- `DB_NAME_SECRET_NAME`
- `DB_HOST_SECRET_NAME`
- `DB_PORT_SECRET_NAME`
