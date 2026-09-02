# Production PWA Auto-Update & Version Notification System

This document explains the architecture, lifecycle, and operational guide for the Progressive Web Application (PWA) update system in **Galaxy TV4K HR System** (`/web`).

---

## 1. Overview & Architecture

The employee-facing application runs as an installed or browser-based PWA on iOS (Safari/Add to Home Screen), Android (Chrome PWA), and Desktop browsers.

### Lifecycle Architecture

```
Developer pushes to main
         ↓
Deploy script runs on Debian VPS (`./deploy.sh`)
         ↓
Docker builds new hashed frontend assets & updates `sw.js` and `version.json`
         ↓
PWA background update check detects byte-difference in `sw.js`
         ↓
New Service Worker downloads and installs in background
         ↓
New Service Worker enters WAITING state (`waiting`)
         ↓
`PwaUpdateContext` receives `onNeedRefresh` event
         ↓
Floating update banner (`PwaUpdateNotification`) appears above bottom navigation
         ↓
Employee clicks "Update now"
         ↓
App posts `SKIP_WAITING` message to waiting Service Worker
         ↓
New Service Worker activates (`controllerchange` event)
         ↓
Controlled single reload runs (with 5s loop guard)
         ↓
New version is running with zero manual cache clearing required!
```

---

## 2. Key Components

1. **`web/vite.config.ts`**:
   - `registerType: 'prompt'`: Configures Workbox not to abruptly force-reload the app while users are active.
   - `globIgnores: ['**/version.json']`: Ensures `version.json` is never precached and always retrieved fresh from the network.
   - Defines `__APP_VERSION__` and `__BUILD_DATE__` at build time.

2. **`web/public/version.json`**:
   - Public version metadata containing current version, build timestamp, release date, and optional release notes.
   - Used for quick version checks and Settings display.

3. **`web/src/contexts/PwaUpdateContext.tsx`**:
   - Centralized update provider.
   - Manages state: `updateAvailable`, `isUpdating`, `updateStage`, `currentVersion`, `newVersion`, `releaseNotes`.
   - Listens for:
     - Initial mount / startup check.
     - Foreground return / tab focus (`visibilitychange` & `focus` events).
     - Periodic check (every 30 minutes).
     - Online/Offline reconnection.
     - `controllerchange` with 5-second reload loop protection.
   - Provides `checkForPwaUpdate()` and `performUpdate()` actions.

4. **`web/src/components/pwa/PwaUpdateNotification.tsx`**:
   - Floating native-style banner positioned above the bottom navigation bar (`bottom-[calc(max(env(safe-area-inset-bottom),12px)+72px)]`).
   - **QR Scanner Safety**: Automatically suppresses itself when the user is on `/scan` or `/attendance/scan` to prevent camera interruptions.
   - Displays real-time progress (`Downloading...`, `Installing...`, `Finishing...`).
   - Disables buttons while updating to prevent duplicate clicks.

5. **`web/src/pages/SettingsPage.tsx`**:
   - Section "About" displays current version (`v1.1.0`) and provides an interactive **"Check for updates"** button with instant feedback.

---

## 3. Safety Rules & Protections

### A. Non-Disruptive UX
The system will **never** unexpectedly reload the page while an employee is:
- Scanning an attendance QR code
- Submitting a leave or out request
- Editing personal preferences or forms

If an update is waiting, the prompt remains available non-intrusively until the employee chooses **"Update now"**.

### B. Reload Loop Protection
In `PwaUpdateContext.tsx`, `controllerchange` records a timestamp in `sessionStorage`:
```ts
const lastReload = sessionStorage.getItem('pwa_reload_timestamp');
const now = Date.now();
if (lastReload && now - parseInt(lastReload, 10) < 5000) {
  console.warn('[PWA] Suppressing rapid reload loop.');
  return;
}
sessionStorage.setItem('pwa_reload_timestamp', String(now));
window.location.reload();
```
This prevents infinite reload loops in multi-tab scenarios or when cache headers are misconfigured.

---

## 4. Production Cache Headers (Nginx & Cloudflare)

To ensure clients immediately receive new Service Worker scripts and HTML without getting trapped by aggressive CDN caching:

### Nginx Configuration (`docker/web.Dockerfile`)

```nginx
# 1. PWA Service Worker, Manifest, and Version Metadata - Never cache
location ~* (sw\.js|registerSW\.js|manifest\.webmanifest|version\.json)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# 2. HTML App Shell - Always revalidate
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# 3. Hashed Static Assets - 1 year immutable cache
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Cloudflare CDN Rules
In the Cloudflare Dashboard for `galaxytv4k.online`:
- **Cache Rules**: Ensure `/sw.js`, `/registerSW.js`, `/manifest.webmanifest`, and `/version.json` bypass cache (`Cache Level: Bypass` or `No Cache`).
- **Speed Brain / Web Analytics**: Keep Speed Brain disabled to prevent third-party RUM script interference with the camera scanner.

---

## 5. Testing Updates Locally & in Production

### How to Test in Development / Preview
1. Build the production bundle:
   ```bash
   npm --prefix web run build
   ```
2. Preview using Vite:
   ```bash
   npm --prefix web run preview -- --port 5174
   ```
3. Open `http://localhost:5174` in your browser.
4. Modify `version.json` (e.g. bump version to `"1.2.0"`).
5. In another terminal, re-run `npm --prefix web run build`.
6. Return to browser tab: within seconds or upon clicking **Settings $\rightarrow$ Check for updates**, the update banner appears.
7. Click **"Update now"**: the app transitions smoothly through updating states, reloads once, and displays the new version!

---

## 6. Mobile Platform Notes

### iOS Safari & Installed PWA (Add to Home Screen)
- iOS PWA runs in standalone WebKit mode.
- Service Workers on iOS check for updates when the app is launched or resumed from background.
- Safe area insets (`env(safe-area-inset-bottom)`) ensure the floating update card never collides with the iPhone home indicator bar.

### Android Chrome PWA
- Background checks occur automatically every time the app returns to foreground.
- Web push notification and app badge APIs are fully compatible.
