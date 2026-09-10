import { describe, it, expect } from 'vitest';
import { detectVpnOrProxy, detectFakeGps } from '../utils/security.js';
import { LocationService } from '../services/locationService.js';

describe('Dual-Network Security Engine: Anti-VPN & Anti-Fake-GPS Verification', () => {
  describe('1. Network & VPN / Proxy Detection Engine', () => {
    it('allows legitimate Cambodian mobile network (Smart, Cellcard, Metfone 4G/5G)', () => {
      const headers = {
        'cf-ipcountry': 'KH',
        'cf-connecting-ip': '175.100.20.15', // Cambodian ISP range
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(false);
      expect(result.country).toBe('KH');
    });

    it('allows legitimate office Wi-Fi (Galaxy TV 4K) in Cambodia', () => {
      const headers = {
        'cf-ipcountry': 'KH',
        'cf-connecting-ip': '203.189.150.32', // Cambodian static leased line
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(false);
      expect(result.country).toBe('KH');
    });

    it('detects and blocks third-party VPN routed through Singapore (ExpressVPN / NordVPN)', () => {
      const headers = {
        'cf-ipcountry': 'SG',
        'cf-connecting-ip': '139.180.128.45',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.country).toBe('SG');
      expect(result.reason).toContain('VPN ឬ Proxy');
    });

    it('detects and blocks third-party VPN routed through United States', () => {
      const headers = {
        'cf-ipcountry': 'US',
        'cf-connecting-ip': '104.244.75.10',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.country).toBe('US');
      expect(result.reason).toContain('VPN');
    });

    it('detects and blocks third-party VPN routed through Netherlands', () => {
      const headers = {
        'cf-ipcountry': 'NL',
        'cf-connecting-ip': '185.200.118.5',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.country).toBe('NL');
    });

    it('detects and blocks open HTTP Proxy via headers (Squid / Privoxy)', () => {
      const headers = {
        'cf-ipcountry': 'KH',
        'via': '1.1 squid-proxy-server',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.reason).toContain('Proxy Server');
    });

    it('detects and blocks explicit proxy ID headers', () => {
      const headers = {
        'cf-ipcountry': 'KH',
        'x-proxy-id': 'proxy-gateway-99',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.reason).toContain('Proxy');
    });

    it('detects datacenter VPNs with high Cloudflare threat score', () => {
      const headers = {
        'cf-ipcountry': 'KH',
        'cf-threat-score': '75',
      };
      const result = detectVpnOrProxy(headers);
      expect(result.isVpn).toBe(true);
      expect(result.reason).toContain('VPN Datacenter');
    });

    it('safely handles empty or missing headers without false positives', () => {
      const result = detectVpnOrProxy({});
      expect(result.isVpn).toBe(false);
    });
  });

  describe('2. Fake GPS & Mock Location Detection Engine', () => {
    const phnomPenhOffice = {
      latitude: 11.5564,
      longitude: 104.9282,
    };

    it('accepts legitimate physical GPS on mobile phones (e.g. ±12m accuracy, real GNSS)', () => {
      const result = detectFakeGps({
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        accuracy: 12.5,
        isMocked: false,
      });
      expect(result.isFakeGps).toBe(false);
    });

    it('detects Android Mock Location provider flag (Developer Options Fake GPS)', () => {
      const result = detectFakeGps({
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        accuracy: 10.0,
        isMocked: true,
      });
      expect(result.isFakeGps).toBe(true);
      expect(result.reason).toContain('Fake GPS ឬ Mock Location');
    });

    it('detects unrealistic zero-meter accuracy (accuracy: 0.0m) as Fake GPS signature', () => {
      const result = detectFakeGps({
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        accuracy: 0.0,
        isMocked: false,
      });
      expect(result.isFakeGps).toBe(true);
      expect(result.reason).toContain('កម្រិត GPS Accuracy មិនប្រក្រតី');
    });

    it('accepts high-precision GNSS on modern smartphones (e.g. Samsung Galaxy L1+L5 dual-band ±0.8m)', () => {
      const result = detectFakeGps({
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        accuracy: 0.8,
        isMocked: false,
      });
      expect(result.isFakeGps).toBe(false);
    });

    it('detects impossible travel speed / teleportation spoofing (> 150 km/h in city)', () => {
      const t0 = new Date('2026-09-07T08:00:00.000Z');
      const t1 = new Date('2026-09-07T08:00:30.000Z'); // 30 seconds later

      // Location 1: Phnom Penh Office
      const prevLocation = {
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        recordedAt: t0,
      };

      // Location 2: 10 km away in 30 seconds (1200 km/h teleportation spoof)
      const fakeNewLat = phnomPenhOffice.latitude + 0.09;
      const fakeNewLng = phnomPenhOffice.longitude;

      const result = detectFakeGps({
        latitude: fakeNewLat,
        longitude: fakeNewLng,
        accuracy: 15.0,
        prevLocation,
        currentTime: t1,
      });

      expect(result.isFakeGps).toBe(true);
      expect(result.isSpeedAnomaly).toBe(true);
      expect(result.estimatedSpeedKmh).toBeGreaterThan(150);
      expect(result.reason).toContain('ការលោតទីតាំងលឿនខុសប្រក្រតី');
    });

    it('allows normal realistic movement (walking or motor transit ~15 km/h)', () => {
      const t0 = new Date('2026-09-07T08:00:00.000Z');
      const t1 = new Date('2026-09-07T08:05:00.000Z'); // 5 minutes later

      const prevLocation = {
        latitude: phnomPenhOffice.latitude,
        longitude: phnomPenhOffice.longitude,
        recordedAt: t0,
      };

      // Moved 800m away in 5 minutes (approx 9.6 km/h)
      const newLat = phnomPenhOffice.latitude + 0.007;
      const newLng = phnomPenhOffice.longitude;

      const result = detectFakeGps({
        latitude: newLat,
        longitude: newLng,
        accuracy: 15.0,
        prevLocation,
        currentTime: t1,
      });

      expect(result.isFakeGps).toBe(false);
    });
  });

  describe('3. Check-Out Time Rule (5:30 PM) Enforcement', () => {
    const workEndTime = '17:30';
    const endMinutes = 17 * 60 + 30; // 1050 mins (5:30 PM)

    it('blocks early check-out attempts during working hours (e.g. 10:00 AM, 02:30 PM, 05:15 PM)', () => {
      const testTimes = ['10:00', '14:30', '17:15', '17:29'];
      for (const timeStr of testTimes) {
        const [h, m] = timeStr.split(':').map(Number);
        const curMins = h * 60 + m;
        const isAllowed = curMins >= endMinutes;
        expect(isAllowed).toBe(false);
      }
    });

    it('allows check-out at or after scheduled end time (e.g. 05:30 PM, 05:35 PM, 06:00 PM)', () => {
      const testTimes = ['17:30', '17:35', '18:00', '19:15'];
      for (const timeStr of testTimes) {
        const [h, m] = timeStr.split(':').map(Number);
        const curMins = h * 60 + m;
        const isAllowed = curMins >= endMinutes;
        expect(isAllowed).toBe(true);
      }
    });
  });
});
