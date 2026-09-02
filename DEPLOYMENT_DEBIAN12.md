# 🌐 Galaxy TV4K - Production Deployment Guide (Debian 12 + Cloudflare Tunnel)

This complete step-by-step guide explains how to deploy **Galaxy TV4K HR & Attendance System** on a **Debian 12 (Bookworm)** VPS or local home server using **Docker** and **Cloudflare Tunnel (`cloudflared`)**.

---

## 🎯 Architecture & Domain Mapping

With Cloudflare Tunnel, **you do not need to open any ports on your router or firewall (no port forwarding required)**. All traffic is securely tunneled over encrypted outbound HTTPS connections to Cloudflare edge nodes:

| Domain | Service | Internal Port | Description |
| :--- | :--- | :--- | :--- |
| **`galaxytv.online`** / **`www.galaxytv.online`** | Employee Mobile Web PWA | `http://127.0.0.1:5174` | Mobile attendance, camera scanner, leave requests |
| **`admin.galaxytv.online`** | Admin & HR Portal | `http://127.0.0.1:5173` | Management dashboard, employee directory, live telemetry |
| **`api.galaxytv.online`** | Backend REST API | `http://127.0.0.1:4000` | Node.js Fastify/Express API with PostgreSQL & Prisma |

---

## 📋 STEP 1: Prepare Debian 12 Server

SSH into your Debian 12 server:
```bash
ssh root@YOUR_SERVER_IP
```

Update system packages and install prerequisites:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw lsb-release ca-certificates apt-transport-https gnupg
```

---

## 🐳 STEP 2: Install Docker & Docker Compose on Debian 12

Run the official Docker installation commands for Debian 12:

```bash
# 1. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 2. Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Docker Engine & Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Verify installation
docker --version
docker compose version
```

Enable Docker service on boot:
```bash
sudo systemctl enable --now docker
```

---

## 📥 STEP 3: Clone Repository & Configure Environment

Navigate to `/opt` or your preferred directory:
```bash
cd /opt
sudo git clone https://github.com/lorndavid/GalaxyTV4K-System.git system-hr
cd system-hr
```

Create your production environment file from the template:
```bash
cp .env.production.example .env
```

Generate a secure 64-character JWT secret:
```bash
openssl rand -base64 48
```

Edit `.env` using `nano`:
```bash
nano .env
```

Set your values:
```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrongDatabasePassword2026!
POSTGRES_DB=hr_attendance_db

JWT_SECRET=PASTE_THE_GENERATED_OPENSSL_SECRET_HERE
JWT_EXPIRES_IN=7d

CORS_ORIGINS=https://galaxytv.online,https://www.galaxytv.online,https://admin.galaxytv.online,https://api.galaxytv.online

PORT=4000
NODE_ENV=production
```
*(Press `Ctrl + O` then `Enter` to save, `Ctrl + X` to exit).*

---

## 🚀 STEP 4: Build & Launch Docker Containers

Start all containers in background mode using the production compose file:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Initialize and seed the database (first-time deployment):
```bash
# Push schema
docker compose -f docker-compose.prod.yml exec backend npx prisma db push

# Seed default admin and sample staff data
docker compose -f docker-compose.prod.yml exec backend npm run db:seed
```

Check running container status:
```bash
docker compose -f docker-compose.prod.yml ps
```

You should see 4 healthy containers:
- `system_hr_postgres` (running on 127.0.0.1:5432)
- `system_hr_backend` (running on 127.0.0.1:4000)
- `system_hr_admin` (running on 127.0.0.1:5173)
- `system_hr_web` (running on 127.0.0.1:5174)

---

## ☁️ STEP 5: Install & Configure Cloudflare Tunnel (`cloudflared`)

### Option A: Via Cloudflare Zero Trust Dashboard (Simplest / Recommended)

1. Open [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Go to **Networks** $\rightarrow$ **Tunnels** $\rightarrow$ **Create a Tunnel**.
3. Select **Cloudflared** and name it `galaxytv-production`.
4. Choose **Debian (64-bit)** as the operating system.
5. Cloudflare will give you a single command with your token. Copy and run it on your Debian 12 server:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb &&
   sudo dpkg -i cloudflared.deb &&
   sudo cloudflared service install YOUR_CLOUDFLARE_TOKEN_HERE
   ```
6. In the Cloudflare Dashboard under **Public Hostnames**, add the 3 routes:
   - **Hostname**: `galaxytv.online` $\rightarrow$ **Type**: `HTTP` $\rightarrow$ **URL**: `127.0.0.1:5174`
   - **Hostname**: `www.galaxytv.online` $\rightarrow$ **Type**: `HTTP` $\rightarrow$ **URL**: `127.0.0.1:5174`
   - **Hostname**: `admin.galaxytv.online` $\rightarrow$ **Type**: `HTTP` $\rightarrow$ **URL**: `127.0.0.1:5173`
   - **Hostname**: `api.galaxytv.online` $\rightarrow$ **Type**: `HTTP` $\rightarrow$ **URL**: `127.0.0.1:4000`
7. Click **Save Tunnel**!

---

### Option B: Via Terminal CLI (`cloudflared`)

If you prefer configuring via Debian CLI:

1. Install `cloudflared`:
   ```bash
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. Login to Cloudflare:
   ```bash
   cloudflared tunnel login
   ```
   *(Open the printed URL in your browser and authorize your `galaxytv.online` domain).*

3. Create the tunnel:
   ```bash
   cloudflared tunnel create galaxytv-prod
   ```
   *(This outputs a Tunnel ID UUID, e.g. `d71a8bc4-1234-5678-9abc-def012345678`).*

4. Create `/etc/cloudflared/config.yml`:
   ```bash
   sudo mkdir -p /etc/cloudflared
   sudo nano /etc/cloudflared/config.yml
   ```

   Paste the configuration:
   ```yaml
   tunnel: YOUR_TUNNEL_UUID
   credentials-file: /root/.cloudflared/YOUR_TUNNEL_UUID.json

   ingress:
     - hostname: galaxytv.online
       service: http://127.0.0.1:5174

     - hostname: www.galaxytv.online
       service: http://127.0.0.1:5174

     - hostname: admin.galaxytv.online
       service: http://127.0.0.1:5173

     - hostname: api.galaxytv.online
       service: http://127.0.0.1:4000

     - service: http_status:404
   ```

5. Route DNS hostnames in Cloudflare:
   ```bash
   cloudflared tunnel route dns galaxytv-prod galaxytv.online
   cloudflared tunnel route dns galaxytv-prod www.galaxytv.online
   cloudflared tunnel route dns galaxytv-prod admin.galaxytv.online
   cloudflared tunnel route dns galaxytv-prod api.galaxytv.online
   ```

6. Install and start as a systemd service:
   ```bash
   sudo cloudflared service install
   sudo systemctl enable --now cloudflared
   sudo systemctl status cloudflared
   ```

---

## 🔒 STEP 6: Configure Cloudflare SSL/TLS & Edge Rules

In your [Cloudflare Dashboard](https://dash.cloudflare.com/) for `galaxytv.online`:
1. Go to **SSL/TLS** $\rightarrow$ Set encryption mode to **Full** (or **Full (strict)**).
2. Go to **SSL/TLS** $\rightarrow$ **Edge Certificates** $\rightarrow$ Enable **Always Use HTTPS**.
3. Enable **Automatic HTTPS Rewrites**.
4. Enable **HTTP/2** and **HTTP/3 (with QUIC)** for lightning-fast mobile PWA loading.
5. In **WebSockets**, ensure WebSockets is **Enabled** (for live telemetry and attendance sync).

---

## 🔄 STEP 7: One-Click Production Updates (`deploy.sh`)

To update your production server whenever you push new changes to GitHub:

Make the deployment script executable:
```bash
chmod +x /opt/system-hr/deploy.sh
```

Run updates with 1 command:
```bash
cd /opt/system-hr && ./deploy.sh
```

---

## 💾 STEP 8: Automated Daily Database Backups (Cron)

Set up automated daily backups for your PostgreSQL database:

Create backup directory:
```bash
sudo mkdir -p /var/backups/system-hr
```

Add a cron job:
```bash
sudo crontab -e
```

Add this line (runs daily at 3:00 AM):
```bash
0 3 * * * docker compose -f /opt/system-hr/docker-compose.prod.yml exec -T postgres pg_dump -U postgres hr_attendance_db | gzip > /var/backups/system-hr/db_backup_$(date +\%F).sql.gz
```

---

## 🎉 Default Super Admin Access

Once deployed, access your admin portal:
- **URL**: `https://admin.galaxytv.online`
- **Email**: `admin@company.com`
- **Password**: `Admin@123456` *(Change immediately in Settings after initial sign in)*

Employee PWA Portal:
- **URL**: `https://galaxytv.online`
- **Email**: `sokha.chan@company.com`
- **Password**: `Employee@123456`
