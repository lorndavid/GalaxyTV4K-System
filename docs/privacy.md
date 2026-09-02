# Employee Location Privacy & Data Governance

## Principles of Employee Location Privacy

1. **Explicit Opt-In & Transparent UI**:
   - Location sharing is completely consent-based.
   - The Employee PWA shows a visible indicator:
     - `● Active` (Sharing enabled)
     - `○ Inactive` (Sharing disabled)
   - Employees can toggle location sharing on/off at any time from their profile settings.

2. **Purpose Limitation**:
   - Location telemetry is collected solely for geofenced attendance verification and real-time team presence within working hours.

3. **Restricted Access & Role Separation**:
   - Employees can only view their own location records.
   - Only authorized HR administrators can access the organization location dashboard.
   - Location data is never exposed in public APIs, URLs, or client localStorage.

4. **Data Retention & Automated Purging**:
   - Location historical points are retained for a configurable period (default: 30 days via `locationRetentionDays`).
   - Old location breadcrumbs are automatically purged by [`LocationService.cleanupOldLocations`](file:///d:/Project/System%20HR/backend/src/services/locationService.ts).
   - Core attendance records (check-in/out timestamps and summary statuses) are preserved permanently regardless of location history cleanup.
