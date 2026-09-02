# Production Deployment & Infrastructure Guide

## 1. Docker Compose Deployment

The system is configured with multi-stage Docker builds for PostgreSQL, the Node.js backend, the React Admin Portal (Nginx), and the React Employee Portal (Nginx).

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2+

### Step-by-Step Deployment
1. Clone the repository and configure environment variables:
   ```bash
   cp .env.example .env
   ```
2. Set secure production secrets in `.env`:
   - `JWT_SECRET`: Generate a secure 64-character random string.
   - `POSTGRES_PASSWORD`: Strong database password.
3. Build and launch all containerized services:
   ```bash
   docker compose up -d --build
   ```
4. Run database migrations and seed default credentials:
   ```bash
   docker compose exec backend npm run db:migrate
   docker compose exec backend npm run db:seed
   ```
5. Verify service health:
   ```bash
   docker compose ps
   ```

---

## 2. Automated Database Backup & Recovery

### Automated Backup Script (Cron)
```bash
#!/bin/bash
# /opt/scripts/backup-db.sh
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/system_hr"
mkdir -p $BACKUP_DIR

docker exec system_hr_postgres pg_dump -U postgres hr_attendance_db | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
```

### Restore Procedure
```bash
gunzip < /var/backups/system_hr/backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i system_hr_postgres psql -U postgres -d hr_attendance_db
```

---

## 3. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Backend API port |
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_URL` | `postgresql://...` | Connection URI for PostgreSQL |
| `JWT_SECRET` | *(Must change in prod)* | JWT token signing key |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins (comma-separated) |
| `DEFAULT_TIMEZONE` | `Asia/Phnom_Penh` | Default company timezone |
