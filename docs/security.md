# Production Security Architecture & Defense in Depth

## Overview

The Employee Attendance Management System employs **defense in depth** across all architectural layers. The client (both the Admin React application and the Employee PWA) is treated as an untrusted environment. All security-sensitive calculations, authorizations, validations, and time recordings are performed authoritatively by the backend.

---

## 1. Authentication & Token Security

- **Password Hashing**: Passwords are securely hashed using `bcrypt` (with standard high salt rounds).
- **JWT Authentication**:
  - Validates signature, expiration, and user status on every request.
  - Active user check: Verifies `user.status === ACTIVE` against the PostgreSQL database.
  - Revocation & Inactive Accounts: Deactivated or suspended accounts are rejected with `403 ACCOUNT_INACTIVE`.
- **Credential Storage**: Passwords, password hashes, Telegram bot tokens, and database credentials are never stored in client localStorage or returned in API responses.

---

## 2. Strict Role-Based Access Control (RBAC) & IDOR Protection

- **Roles**:
  - `ADMIN`: Full administrative capabilities (organization settings, schedule configuration, employee directory, audit trails, and reporting).
  - `EMPLOYEE`: Access strictly restricted to the authenticated employee's own profile, attendance history, leave balances, and out requests.
- **IDOR Defense (`requireSelfOrAdmin`)**:
  - Server-side middleware verifies that employees can only query or mutate their own `employeeId`.
  - Attempts by an employee to access another employee's records (`/api/attendance/employee/:id`, `/api/location/admin/history/:id`) are blocked with `403 FORBIDDEN_ACCESS_DENIED`.

---

## 3. Layered Rate Limiting

The backend implements granular, endpoint-specific rate limiters using `express-rate-limit`:

| Endpoint / Scope | Rate Limit | Purpose |
| :--- | :--- | :--- |
| **Global API** (`/api/*`) | 500 requests / 15 mins | DoS and abuse mitigation |
| **Authentication** (`/api/auth/login`) | 10 attempts / 15 mins | Credential stuffing & brute-force defense |
| **Attendance Scan** (`/api/attendance/scan`) | 30 requests / 1 min | Replay & rapid submit prevention |
| **Location Update** (`/api/location/update`) | 60 requests / 1 min | High-frequency telemetry throttling |
| **QR Generation** (`/api/admin/qr/generate`) | 60 requests / 1 min | Token exhaustion mitigation |
| **Telegram Test** (`/api/admin/telegram/test`) | 10 requests / 10 mins | Telegram Bot API rate limit compliance |

---

## 4. Security Headers & Permissions-Policy

Configured via `helmet`:
- **Content-Security-Policy (CSP)**: Restricts script, style, font, and image sources.
- **Permissions-Policy**: `geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), accelerometer=(), gyroscope=()`
  - Explicitly grants `geolocation` and `camera` to the PWA origin for QR scanning and GPS verification.
  - Disables all unused device sensors and capabilities.
- **MIME Sniffing & Framing**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`.

---

## 5. Input Validation & Error Handling

- **Validation Engine**: Universal Zod schemas for request body, URL parameters, and query parameters.
- **Payload Limits**: Strict 2MB request body parsing limits.
- **Information Leakage Prevention**: Stack traces, SQL errors, and Prisma internals are stripped in production responses.
