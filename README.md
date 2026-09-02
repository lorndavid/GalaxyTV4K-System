# Galaxy TV4K — Employee Attendance & HR Management System

A production-ready, full-stack Employee Attendance & HR Management System designed for **Galaxy TV4K**. Engineered with zero-trust security architecture, mobile-first PWA camera scanning, live location tracking, Telegram bot notifications, multi-shift schedule management, and standard A4 printable QR export.

---

## 🚀 Key Features

### 1. Mobile-First Employee PWA (`/web`)
- **Instant Camera QR Attendance**: Direct-launch camera scanning with parallel GPS acquisition, animated laser scanline HUD, front/rear camera switcher, and haptic feedback (`navigator.vibrate`).
- **Floating Bottom Navigation**: Elevated center QR punch button (`bg-gradient-to-tr from-brand-600 to-blue-500`), glassmorphism backdrop blur, and `safe-area-inset-bottom` support for iOS & Android.
- **Executive Dashboard**: Live office geofence radar pill, today's punch status with dynamic 8-hour progress bar, monthly KPI cards, and shift timeline.
- **Self-Service Portals**: Apply for leave, request out-of-office permissions, and view attendance history calendar.
- **Bilingual & Theme Support**: Full English and Khmer localization (`Koh Santepheap`, `Suwannaphum`, `Inter`) with smooth Dark/Light mode switching.

### 2. Admin Portal & QR Management (`/admin`)
- **Attendance QR Management**:
  - **One-Day & Custom QR Codes**: Configure Name, Effective Date, Valid Hours (e.g. 07:00–18:00), Office Location, and Description.
  - **A4 PDF & Print Export**: Dedicated $210\text{mm} \times 297\text{mm}$ standard A4 printable sheet with official Galaxy TV4K branding, high-resolution QR code, validity hours, and employee scanning instructions.
  - **Live Kiosk Station**: 60-second auto-regenerating high-security QR screen with digital clock for reception tablets.
- **Live Location Dashboard**: Real-time GPS geofence radar map with Server-Sent Events (SSE) streaming and anti-spoofing velocity verification.
- **Telegram Bot Integration**: Instant check-in/out notifications, employee movement alerts, and automated daily attendance summaries.
- **Comprehensive HR Tools**: Employee CRUD, shift schedules, company holidays, leave request approvals, attendance analytics, and payroll CSV exports.

### 3. Authoritative Backend & Security (`/backend`)
- **Zero-Trust Security**: Server-side spherical Haversine geofence calculation ($\le 50\text{m}$ radius), timestamp window enforcement, and Argon2/bcrypt password hashing.
- **ACID Transactions**: Atomic PostgreSQL transactions prevent race conditions and duplicate punches.
- **Immutable Audit Logging**: Every administrative action, QR generation, and manual punch edit is recorded with IP and user agent metadata.

---

## 📁 Repository Structure

```
├── backend/            # Express.js REST API with Prisma ORM & PostgreSQL
│   ├── prisma/         # Prisma schema and database migrations
│   └── src/            # Controllers, Services, Middlewares, Routes, Tests
├── admin/              # Admin Portal (React + Vite + Tailwind CSS)
├── web/                # Mobile-First Employee Web PWA (React + Vite)
├── docker/             # Production Dockerfiles for backend, admin, and web
├── docker-compose.yml  # Multi-container orchestration (Postgres, Backend, Admin, Web)
└── README.md
```

---

## ⚡ Quick Start (Docker Orchestration)

The fastest way to run the entire Galaxy TV4K suite is via Docker Compose:

```bash
# Build and start all services (PostgreSQL, Backend API, Admin, Web PWA)
docker compose up -d --build
```

- **Employee Portal (PWA)**: [http://localhost:5174](http://localhost:5174)
- **Admin Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## 🛠️ Local Development Setup

### 1. Install Dependencies
```bash
npm --prefix backend install
npm --prefix admin install
npm --prefix web install
```

### 2. Configure Database
```bash
# Start PostgreSQL container
docker run --name system_hr_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hr_attendance_db -p 5432:5432 -d postgres:15-alpine

# Run Prisma migrations & seed demo data
npm --prefix backend run prisma:generate
npm --prefix backend run db:seed
```

### 3. Start Development Servers
```bash
# Terminal 1: Backend API (Port 4000)
npm --prefix backend run dev

# Terminal 2: Admin Portal (Port 5173)
npm --prefix admin run dev

# Terminal 3: Employee PWA (Port 5174)
npm --prefix web run dev
```

---

## 🔑 Default Credentials

| Portal | URL | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | `http://localhost:5173` | `admin@company.com` | `Admin@123456` |
| **Employee Portal (1)** | `http://localhost:5174` | `sokha.chan@company.com` | `Employee@123456` |
| **Employee Portal (2)** | `http://localhost:5174` | `dara.vong@company.com` | `Employee@123456` |

---

## 🧪 Testing & Production Build

### Run Backend Unit & Integration Tests (Vitest)
```bash
npm --prefix backend test
```

### Full Monorepo Build
```bash
npm run build
```
