/**
 * Security Engine: Anti-VPN, Anti-Proxy & Anti-Fake-GPS Spoofing Detection.
 * Protects attendance verification across both Mobile Data (4G/5G) and Company Wi-Fi.
 */

import { calculateHaversineDistance } from './geo.js';

export interface VpnDetectionResult {
  isVpn: boolean;
  reason?: string;
  country?: string;
}

export interface FakeGpsDetectionResult {
  isFakeGps: boolean;
  reason?: string;
  isSpeedAnomaly?: boolean;
  estimatedSpeedKmh?: number;
}

export interface PreviousLocationPoint {
  latitude: number;
  longitude: number;
  recordedAt: Date;
}

/**
 * Validates request headers for third-party VPNs, open proxies, and foreign IP egress.
 *
 * Legitimate employees in Cambodia using mobile data (Smart, Cellcard, Metfone)
 * or company Wi-Fi connect with cf-ipcountry: 'KH' and are seamlessly permitted.
 */
export function detectVpnOrProxy(headers: Record<string, any> = {}): VpnDetectionResult {
  const rawCountry = headers['cf-ipcountry'] || headers['CF-IPCountry'] || headers['cf_ipcountry'];
  const country = typeof rawCountry === 'string' ? rawCountry.trim().toUpperCase() : undefined;

  // 1. Foreign Country Egress Mismatch (Third-party VPNs like ExpressVPN, NordVPN, TurboVPN, etc.)
  if (country && country.length === 2) {
    // Legitimate local traffic is Cambodia ('KH').
    // 'XX' = unknown/local, 'T1' = Tor/test internal
    const isLocalOrTest = country === 'KH' || country === 'XX' || country === 'T1';
    
    if (!isLocalOrTest) {
      return {
        isVpn: true,
        reason: `ប្រព័ន្ធបានរកឃើញការប្រើប្រាស់ VPN ឬ Proxy (IP ភ្ជាប់មកពីប្រទេស ${country})។ សូមបិទ VPN លើទូរស័ព្ទរបស់អ្នកដើម្បីកត់ត្រាវត្តមាន! (Third-party VPN detected exiting from ${country}. Please disable VPN to check in.)`,
        country,
      };
    }
  }

  // 2. Explicit Proxy Headers
  const viaHeader = headers['via'] || headers['Via'];
  if (typeof viaHeader === 'string' && viaHeader.length > 0) {
    const lowerVia = viaHeader.toLowerCase();
    if (lowerVia.includes('squid') || lowerVia.includes('proxy') || lowerVia.includes('privoxy')) {
      return {
        isVpn: true,
        reason: 'ប្រព័ន្ធបានរកឃើញ Proxy Server។ សូមបិទ Proxy លើទូរស័ព្ទរបស់អ្នក! (Proxy server detected via HTTP headers.)',
        country,
      };
    }
  }

  const proxyId = headers['x-proxy-id'] || headers['X-Proxy-Id'];
  if (proxyId) {
    return {
      isVpn: true,
      reason: 'ប្រព័ន្ធបានរកឃើញ Proxy Server។ សូមបិទ Proxy លើទូរស័ព្ទរបស់អ្នក! (Proxy server detected.)',
      country,
    };
  }

  // 3. Cloudflare Threat Score check (scores > 45 indicate known datacenter proxies or malicious tunnels)
  const threatScore = headers['cf-threat-score'] || headers['CF-Threat-Score'];
  if (threatScore !== undefined) {
    const scoreNum = parseInt(String(threatScore), 10);
    if (!isNaN(scoreNum) && scoreNum > 45) {
      return {
        isVpn: true,
        reason: 'ការតភ្ជាប់របស់អ្នកមិនមានសុវត្ថិភាព ឬកំពុងប្រើប្រាស់ VPN Datacenter។ (Unsafe connection or datacenter VPN detected.)',
        country,
      };
    }
  }

  return { isVpn: false, country };
}

/**
 * Validates GPS coordinates for Fake GPS, Android mock location providers,
 * zero-accuracy signatures, and impossible speed jumps (teleportation).
 */
export function detectFakeGps(params: {
  latitude: number;
  longitude: number;
  accuracy: number;
  isMocked?: boolean;
  prevLocation?: PreviousLocationPoint | null;
  currentTime?: Date;
}): FakeGpsDetectionResult {
  const { latitude, longitude, accuracy, isMocked, prevLocation } = params;
  const now = params.currentTime || new Date();

  // 1. Android Mock Location / Fake GPS Provider Flag
  if (isMocked === true) {
    return {
      isFakeGps: true,
      reason: 'ប្រព័ន្ធបានរកឃើញការប្រើប្រាស់ Fake GPS ឬ Mock Location លើទូរស័ព្ទរបស់អ្នក។ សូមបិទ Fake GPS ជាមុនសិន! (Mock location provider detected on device.)',
    };
  }

  // 2. Physical GPS Hardware Accuracy Signature
  // Real smartphone GNSS chipsets calculating satellite signals from space always have
  // physical ionospheric/atmospheric errors (typical 3m - 45m).
  // Fake GPS software (such as GPS JoyStick, Fake GPS location) defaults to exactly 0.0 or < 1.0 meter.
  if (typeof accuracy === 'number' && accuracy < 1.0) {
    return {
      isFakeGps: true,
      reason: 'កម្រិត GPS Accuracy មិនប្រក្រតី (ទាបជាង 1 ម៉ែត្រ) ដែលជាសញ្ញានៃកម្មវិធី Fake GPS។ សូមប្រើប្រាស់ GPS ពិតប្រាកដ! (Unrealistic sub-meter accuracy detected; characteristic of Fake GPS mock software.)',
    };
  }

  // 3. Impossible Travel / Speed Anomaly (Teleportation)
  if (prevLocation && prevLocation.recordedAt) {
    const timeDeltaSeconds = (now.getTime() - new Date(prevLocation.recordedAt).getTime()) / 1000;

    // Only evaluate for movements within the last 1 hour (3600 seconds) and positive delta
    if (timeDeltaSeconds > 0 && timeDeltaSeconds <= 3600) {
      const distanceMeters = calculateHaversineDistance(
        prevLocation.latitude,
        prevLocation.longitude,
        latitude,
        longitude
      );

      const estimatedSpeedKmh = (distanceMeters / 1000) / (timeDeltaSeconds / 3600);
      const MAX_SPEED_KMH = 150; // Anything over 150 km/h is impossible inside city traffic

      // Only trigger if distance is meaningful (> 500m) to avoid GPS jitter false positives
      if (estimatedSpeedKmh > MAX_SPEED_KMH && distanceMeters > 500) {
        return {
          isFakeGps: true,
          isSpeedAnomaly: true,
          estimatedSpeedKmh: Math.round(estimatedSpeedKmh),
          reason: `ប្រព័ន្ធបានរកឃើញការលោតទីតាំងលឿនខុសប្រក្រតី (${Math.round(estimatedSpeedKmh)} km/h) ក្នុងរយៈពេល ${Math.round(timeDeltaSeconds)} វិនាទី។ (Impossible travel speed: ${Math.round(estimatedSpeedKmh)} km/h over ${Math.round(distanceMeters)}m in ${Math.round(timeDeltaSeconds)}s. Teleportation spoof detected.)`,
        };
      }
    }
  }

  return { isFakeGps: false };
}
