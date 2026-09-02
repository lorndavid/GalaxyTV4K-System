# Public Holiday Management

## Overview
Company administrators can configure annual recurring and date-specific public holidays (such as Khmer New Year, Pchum Ben, International New Year, etc.).

### Endpoints:
- `GET /api/admin/holidays`: List all configured holidays.
- `POST /api/admin/holidays`: Add a holiday with `name`, `date` (`YYYY-MM-DD`), `isRecurring`, and `description`.
- `PUT /api/admin/holidays/:id`: Modify holiday details.
- `DELETE /api/admin/holidays/:id`: Delete a holiday.
