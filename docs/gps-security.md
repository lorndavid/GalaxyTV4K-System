# GPS Security, Anti-Spoofing & Risk Detection Architecture

## Realistic Security Model for Browser-Based GPS

> [!IMPORTANT]
> Browser-based Geolocation APIs rely on the operating system and client browser. It is mathematically impossible to guarantee that a compromised client device cannot mock raw GPS coordinates.
> 
> Therefore, this system implements **Risk-Based Anomaly Detection, Multi-Signal Verification, and Independent Server-Side Geofencing**.

---

## 1. Server-Side Coordinate & Distance Calculation

The frontend client is never trusted to report `isInsideOffice` or `distanceFromOffice`.

- **Haversine Distance**: Computed authoritatively by [`LocationService.calculateHaversineDistance`](file:///d:/Project/System%20HR/backend/src/services/locationService.ts) using the company's configured office coordinates (`latitude`, `longitude`, `allowedRadiusMeters`).
- **Mathematical Bounds**:
  - `-90 <= latitude <= 90`
  - `-180 <= longitude <= 180`
  - `accuracy >= 0`

---

## 2. Impossible Travel & Speed Anomaly Detection

To detect spoofed coordinates and sudden teleportation:

1. The server examines the employee's previous valid coordinate timestamp within the past 1 hour.
2. Computes the displacement distance ($\Delta d$ in meters) and time elapsed ($\Delta t$ in seconds).
3. Derives the estimated transit speed:
   $$\text{Speed (km/h)} = \frac{\Delta d / 1000}{\Delta t / 3600}$$
4. If $\text{Speed} > \text{MAX\_REASONABLE\_SPEED\_KMH}$ ($120\text{ km/h}$) and $\Delta d > 300\text{m}$, the reading is flagged as a `LOCATION_ANOMALY`.
5. The anomaly is automatically recorded in:
   - `LocationEvent` table (`type: LOCATION_ANOMALY`).
   - `AuditLog` table with forensic speed and coordinate metadata.
   - Asynchronous Telegram alert to administrators.

---

## 3. Geofence Hysteresis Buffer

To prevent rapid oscillation (flapping) between `INSIDE_OFFICE` and `OUTSIDE_OFFICE` caused by natural GPS jitter near the perimeter edge:

- **Inside-to-Outside Transition**: Requires distance $> \text{allowedRadius} + \text{buffer}$ (e.g. $100\text{m} + 10\text{m} = 110\text{m}$).
- **Outside-to-Inside Transition**: Requires distance $\le \max(\text{allowedRadius} - \text{buffer}, 10\text{m})$ (e.g. $100\text{m} - 10\text{m} = 90\text{m}$).

---

## 4. GPS Accuracy Quality Scoring

- If the client's GPS accuracy exceeds the threshold limit ($\text{accuracy} > 150\text{m}$ or $> 3 \times \text{configuredThreshold}$):
  - Location status is classified as `LOCATION_UNRELIABLE`.
  - Attendance scanning requests with degraded accuracy are rejected with a clear user message advising high-accuracy GPS mode.
