# End-to-End & Automated Test Suite Guide

## Running Tests

Execute the automated test suite with the following npm commands:

```bash
# Run all unit, integration, and security tests
npm run test

# Run unit tests
npm run test:unit

# Run security & authorization test suite
npm --prefix backend run test src/tests/security.test.ts

# Run GPS anti-spoofing and anomaly tests
npm --prefix backend run test src/tests/gpsAnomaly.test.ts

# Run attendance transaction tests
npm --prefix backend run test src/tests/attendanceTransaction.test.ts
```

---

## Test Suites Overview

| Suite | File | Tests | Coverage |
| :--- | :--- | :--- | :--- |
| **GPS Anomaly & Anti-Spoofing** | [`gpsAnomaly.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/gpsAnomaly.test.ts) | 11 tests | Speed anomaly, boundary checks, quality scoring, hysteresis |
| **Security & IDOR Enforcement** | [`security.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/security.test.ts) | 7 tests | RBAC, `requireSelfOrAdmin`, privilege escalation defense |
| **Attendance Transactions** | [`attendanceTransaction.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/attendanceTransaction.test.ts) | 4 tests | Multi-signal verification, QR token hashing, accuracy bounds |
| **Geofencing Maths** | [`geo.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/geo.test.ts) | 5 tests | Haversine distance accuracy, perimeter calculation |
| **Location Telemetry** | [`location.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/location.test.ts) | 6 tests | Freshness calculation, hysteresis thresholds |
| **QR Generation & Lifecycle** | [`qr.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/qr.test.ts) | 2 tests | Token entropy, SHA-256 integrity |
| **Timezone Calculations** | [`time.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/time.test.ts) | 10 tests | `Asia/Phnom_Penh` timezone, late minutes, early leave |
| **Authentication & JWT** | [`auth.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/auth.test.ts) | 2 tests | JWT signature, claims encoding |
| **Telegram Formatting** | [`telegram.test.ts`](file:///d:/Project/System%20HR/backend/src/tests/telegram.test.ts) | 2 tests | Notification payload formatting |
