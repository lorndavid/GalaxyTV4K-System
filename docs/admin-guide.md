# HR Administrator Manual & Operating Guide

## 1. Initial Setup & Default Credentials

Upon running `npm run db:seed`, the system is initialized with default administration credentials:
- **Admin Portal URL**: `http://localhost:5173`
- **Super Administrator Email**: `admin@company.com`
- **Initial Password**: `Admin@123456`

---

## 2. Day-to-Day Operations

### Launching the QR Attendance Station
1. Log into the Admin Portal and navigate to **QR Attendance Station** (`/qr-station`).
2. Mount or display this screen at the company entrance tablet or reception desk.
3. Select whether the station is in **CHECK-IN & CHECK-OUT** mode or dedicated mode.
4. If a QR session needs to be cycled immediately, click **Regenerate QR** (this revokes all prior tokens).

### Managing Employees & Onboarding
1. Navigate to **Employees** (`/employees`).
2. Click **Add Employee** and fill in employee code, name, department, position, and work schedule.
3. The system generates an account with default login credentials for the employee.
4. If an employee forgets their password, use the **Reset Password** key icon to issue a new password.

### Manual Attendance Correction & Audits
1. If an employee forgot their phone or experienced a hardware issue, navigate to **Attendance Records** (`/attendance`).
2. Locate the employee's date entry and click **Adjust**.
3. Set the corrected Check-In/Out times and enter a required explanation reason.
4. The system logs the change in the **Immutable Audit Trail** (`/audit-logs`).

### Reviewing Leave & Permission Requests
1. Navigate to **Leave Requests** (`/leave`) or **Out Requests** (`/out-requests`).
2. Review pending requests, date ranges, and stated reasons.
3. Click **Approve** or **Reject** with optional reviewer comments. Approved leave automatically updates balance counters and prevents false absent markings.
