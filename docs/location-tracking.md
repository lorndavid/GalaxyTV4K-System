# Employee Location Tracking & Geofencing Architecture

## Overview
The System HR platform provides real-time and periodic employee location verification using browser geolocation APIs, authoritative server-side Haversine calculations, geofence hysteresis, and Server-Sent Events (SSE).

---

## 1. Geofence & Haversine Distance Engine

All distance evaluations are computed **authoritatively on the backend**. The frontend submits raw coordinates (`latitude`, `longitude`, `accuracy`, `timestamp`), and the backend verifies the perimeter against company office coordinates.

### Haversine Formula:
$$\Delta\sigma = 2 \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cdot \cos\phi_2 \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
$$d = R \cdot \Delta\sigma \quad (R = 6,371,000\text{ m})$$

### Geofence Hysteresis
To prevent GPS jitter and boundary noise around the perimeter:
- **Configured Radius**: e.g., 100 meters
- **Buffer**: 10 meters
- **Transition to `INSIDE_OFFICE`**: Distance must be $\le \text{radius} - \text{buffer}$ (90m).
- **Transition to `OUTSIDE_OFFICE`**: Distance must be $> \text{radius} + \text{buffer}$ (110m).

---

## 2. Location Statuses & Freshness

### Location Statuses
- `INSIDE_OFFICE`: Verified within company office perimeter.
- `OUTSIDE_OFFICE`: Located outside the geofence boundary.
- `LOCATION_UNRELIABLE`: GPS accuracy exceeds maximum threshold (e.g. >250m).
- `LOCATION_STALE`: No recent GPS pings received (>5 minutes).
- `LOCATION_INACTIVE`: Employee has toggled location sharing OFF in their profile.
- `LOCATION_PERMISSION_DENIED`: Browser GPS permission was denied by the user.

### Freshness Intervals
- **LIVE**: Update received within **0 – 2 minutes**.
- **RECENT**: Update received within **2 – 5 minutes**.
- **STALE**: Last update is older than **5 minutes**.

---

## 3. Server-Sent Events (SSE) Live Stream

The Admin Location Map connects to `/api/location/admin/stream`. When an employee submits a periodic position ping via `POST /api/location/update`, the backend broadcasts a `LOCATION_UPDATED` event to all active admin maps, updating markers instantaneously without full-page reloads.

---

## 4. Browser & PWA Limitations (Explicit Notice)

> [!IMPORTANT]
> **Browser Geolocation Lifecycle Notice**:
> Progressive Web Apps (PWAs) and mobile web browsers can capture periodic location updates **only while the application is active or open on the device**. When the browser process is terminated or put to sleep by the mobile OS, GPS updates will pause until the employee reopens the application. True 24/7 background tracking requires a native iOS/Android binary with continuous background location entitlements.
