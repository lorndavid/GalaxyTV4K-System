# Telegram Bot Integration & Notification Engine

## Overview
The System HR platform integrates with the official Telegram Bot API to dispatch instant attendance alerts, perimeter breach notifications, daily executive summaries, and system health alerts.

---

## 1. Security Architecture

1. **Bot Token Encryption**:
   - Bot tokens are encrypted at rest in PostgreSQL using **AES-256-GCM**.
   - Tokens are masked in all frontend API responses (e.g. `••••••••••••1234`).
   - Tokens are **never** bundled in frontend source code or exposed to employees.
2. **Transaction Isolation**:
   - Attendance Check-In and Check-Out database transactions commit **independently**.
   - Telegram notifications are dispatched asynchronously after database commit.
   - If Telegram API fails or times out, the attendance record is **never** rolled back.

---

## 2. Notification Types

### 1. Attendance Check-In Alert
```html
📍 Attendance Check-In
━━━━━━━━━━━━━━━━━━
👤 Employee: David (EMP-001)
⏰ Time: 08:03 AM
📊 Status: ✅ Present (On Time)
🏢 Location: 🟢 Inside Office (43m)
🎯 GPS Accuracy: ±12m
```

### 2. Attendance Check-Out Alert
```html
🏁 Attendance Check-Out
━━━━━━━━━━━━━━━━━━
👤 Employee: David (EMP-001)
⏰ Time: 05:03 PM
⏳ Worked Time: 8h 42m
🏢 Location: 🟢 Inside Office (51m)
```

### 3. Perimeter Crossing Event
```html
🟢 Employee Entered Office
━━━━━━━━━━━━━━━━━━
👤 Employee: David (EMP-001)
📏 Distance: 37m from office
⏰ Time: 09:14 AM
```

### 4. Daily Attendance Summary
```html
📊 Daily Attendance Summary
📅 Date: 2026-09-02
━━━━━━━━━━━━━━━━━━
👥 Total Headcount: 20
✅ Present: 18
⚠️ Late: 2
🌴 On Leave: 0
❌ Absent: 0
━━━━━━━━━━━━━━━━━━
🏢 Currently Inside: 18
🌍 Currently Outside: 2
```

---

## 3. Configuration

1. In Admin Portal $\rightarrow$ **Telegram Bot**:
   - Input your Telegram Bot Token from `@BotFather`.
   - Add authorized Chat IDs (e.g., `-100123456789` for HR Groups or `987654321` for personal chats).
   - Click **Test Connection** to verify bot credentials.
   - Toggle desired notification channels.
