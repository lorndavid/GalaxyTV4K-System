# Multi-Signal Attendance Verification & Transaction Safety

## Overview

Attendance recording combines **7 independent signals** to ensure integrity:

```
[Authenticated Session] + [Authoritative Server Time] + [Dynamic QR Token]
                        + [Server-Calculated Haversine Distance]
                        + [GPS Accuracy Quality] + [Work Schedule Policy]
                        + [Database State Machine]
                                  │
                                  ▼
                   [Prisma ACID Transaction]
```

---

## 1. Dynamic, Single-Use QR Session Security

- **Cryptographic Tokens**: 256-bit entropy generated using Node.js `crypto.randomBytes(32)`.
- **Hashed Storage**: Only SHA-256 hashes of QR tokens are stored in the database.
- **Short-Lived Expiration**: Configurable TTL (default: 60 seconds).
- **Single Active Session**: Generating a new QR code automatically revokes previous active sessions.

---

## 2. Replay & Idempotency Protection

- **Unique Constraints**: `(employeeId, date)` enforced at PostgreSQL schema level.
- **State Machine Enforcement**:
  - Employee cannot check in twice on the same day.
  - Employee cannot check out without having checked in first.
  - Check-in is blocked if the employee has an active approved leave on the given day.

---

## 3. Database Transaction Isolation

- All attendance creation, leave deductions, and QR session invalidations run inside `prisma.$transaction`.
- If any validation or database step fails, the entire transaction is rolled back cleanly.

---

## 4. Asynchronous Telegram Notifications

- Telegram notifications are dispatched asynchronously after transaction commit.
- Network or API failures in the Telegram bot service **never** block or roll back valid employee attendance.
