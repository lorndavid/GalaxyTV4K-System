import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import {
  Settings,
  MapPin,
  Clock,
  ShieldCheck,
  Building,
  Save,
  Navigation,
  CheckCircle2,
  QrCode,
  Sparkles,
  RefreshCw,
  Info,
  Server,
} from 'lucide-react';

interface CompanySettings {
  id: string;
  companyName: string;
  timezone: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  qrExpiresInSeconds: number;
  workStartTime?: string;
  workEndTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  lateGracePeriodMinutes: number;
  earlyLeaveGraceMinutes?: number;
  checkInAllowedBeforeMinutes?: number;
  checkOutAllowedAfterMinutes?: number;
  maxGpsAccuracyMeters: number;
  checkInMethod?: 'BOTH' | 'ZONE_CLICK' | 'QR_SCAN';
}

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});
  const [gpsLocating, setGpsLocating] = useState(false);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [serverVersionInfo, setServerVersionInfo] = useState<{ version: string; buildDate?: string } | null>(null);

  const currentAppVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.2.0';
  const currentBuildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '2026-09-07';

  const handleCheckUpdate = async () => {
    setCheckingVersion(true);
    try {
      const res = await apiClient.get('/version', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        params: { _t: Date.now() },
      });
      if (res.data?.success && res.data?.data) {
        setServerVersionInfo(res.data.data);
        const sVer = res.data.data.version;
        if (sVer !== currentAppVersion) {
          showToast(`New update available: v${sVer}! Reload recommended.`, 'warning');
        } else {
          showToast(`System is up to date with version v${currentAppVersion}.`);
        }
      }
    } catch {
      showToast('Could not reach version service.', 'error');
    } finally {
      setCheckingVersion(false);
    }
  };

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/settings');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<CompanySettings>) => {
      const res = await apiClient.put('/admin/settings', payload);
      return res.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['companySettings'], updated);
      showToast('Attendance geofencing and company settings saved successfully.');
    },
    onError: () => {
      showToast('Failed to save company settings.', 'error');
    },
  });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        }));
        setGpsLocating(false);
        showToast('Acquired current GPS office coordinates.');
      },
      (err) => {
        setGpsLocating(false);
        showToast(`GPS Error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System & Geofence Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure office GPS perimeter, attendance grace periods, and QR code security policies.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Identity */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-dark-border">
            <Building className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Organization Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
              <select
                value={formData.timezone || 'Asia/Phnom_Penh'}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (UTC+07:00)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+07:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+08:00)</option>
                <option value="UTC">UTC (UTC+00:00)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* GPS Geofence Configuration */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Office GPS Geofence</h2>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Navigation}
              isLoading={gpsLocating}
              onClick={handleUseCurrentLocation}
            >
              Use Current Location
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Latitude</label>
              <input
                type="number"
                step="0.0000001"
                required
                value={formData.latitude ?? ''}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Longitude</label>
              <input
                type="number"
                step="0.0000001"
                required
                value={formData.longitude ?? ''}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Allowed Geofence Radius</span>
                <span className="text-brand-600 dark:text-brand-400">{formData.allowedRadiusMeters || 100} meters</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={formData.allowedRadiusMeters || 100}
                onChange={(e) =>
                  setFormData({ ...formData, allowedRadiusMeters: parseInt(e.target.value) })
                }
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum distance from office coordinates allowed for valid check-ins.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Max GPS Accuracy Threshold</span>
                <span className="text-brand-600 dark:text-brand-400">{formData.maxGpsAccuracyMeters || 100} meters</span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={formData.maxGpsAccuracyMeters || 100}
                onChange={(e) =>
                  setFormData({ ...formData, maxGpsAccuracyMeters: parseInt(e.target.value) })
                }
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Rejects degraded or spoofed GPS signals with low location accuracy.
              </p>
            </div>
          </div>
        </Card>

        {/* Attendance Verification & Check-in Mode Policy */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-dark-border">
            <CheckCircle2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Attendance Check-In Mode & Policy (របៀបកត់ត្រាវត្តមាន)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ជ្រើសរើសវិធីសាស្ត្រអនុញ្ញាតឱ្យបុគ្គលិកកត់ត្រាវត្តមាន (1-Click ក្នុងតំបន់ ឬ ស្កេន QR Code)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Option 1: 1-Click Zone Check-In */}
            <div
              onClick={() => setFormData({ ...formData, checkInMethod: 'ZONE_CLICK' })}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                formData.checkInMethod === 'ZONE_CLICK'
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-dark-elevated'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="checkInMethod"
                  checked={formData.checkInMethod === 'ZONE_CLICK'}
                  onChange={() => setFormData({ ...formData, checkInMethod: 'ZONE_CLICK' })}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1-Click ក្នុងតំបន់
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                បុគ្គលិកគ្រាន់តែចុច Check-In ពេលមកដល់ក្នុងរង្វង់ការិយាល័យ (មិនបាច់ស្កេន QR)
              </p>
            </div>

            {/* Option 2: QR Scan In-Zone */}
            <div
              onClick={() => setFormData({ ...formData, checkInMethod: 'QR_SCAN' })}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                formData.checkInMethod === 'QR_SCAN'
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-dark-elevated'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="checkInMethod"
                  checked={formData.checkInMethod === 'QR_SCAN'}
                  onChange={() => setFormData({ ...formData, checkInMethod: 'QR_SCAN' })}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ស្កេន QR Code
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                បុគ្គលិកត្រូវតែស្កេន QR Code ការិយាល័យ និងស្ថិតក្នុងរង្វង់ GPS
              </p>
            </div>

            {/* Option 3: Both Methods */}
            <div
              onClick={() => setFormData({ ...formData, checkInMethod: 'BOTH' })}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                formData.checkInMethod === 'BOTH' || !formData.checkInMethod
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-dark-elevated'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="checkInMethod"
                  checked={formData.checkInMethod === 'BOTH' || !formData.checkInMethod}
                  onChange={() => setFormData({ ...formData, checkInMethod: 'BOTH' })}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                អនុញ្ញាតទាំងពីរជម្រើស
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                បុគ្គលិកអាចជ្រើសរើសចុច Check-in ក្នុងតំបន់ ឬស្កេន QR Code ក៏បាន
              </p>
            </div>
          </div>
        </Card>

        {/* Company Work Shift Schedule Rules */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-dark-border">
            <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Company Working Hours & Shift Rules (ម៉ោងការងារផ្លូវការ)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                កំណត់ម៉ោងបើកឱ្យ Check-In ម៉ោងត្រូវមកដល់ (Must be in) ម៉ោងសម្រាក និងម៉ោងចេញ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Check-In Open Window */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Check-In Opens (Before Shift Start)
              </label>
              <select
                value={formData.checkInAllowedBeforeMinutes ?? 60}
                onChange={(e) =>
                  setFormData({ ...formData, checkInAllowedBeforeMinutes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value={30}>30 minutes before (07:30 AM)</option>
                <option value={60}>60 minutes before (07:00 AM - Recommended)</option>
                <option value={90}>90 minutes before (06:30 AM)</option>
                <option value={120}>120 minutes before (06:00 AM)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Employees cannot punch in before this window opens.
              </p>
            </div>

            {/* 2. Expected Start Time (Must be in) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Must Be In Time (Shift Start / ម៉ោងត្រូវមកដល់)
              </label>
              <input
                type="text"
                required
                placeholder="08:00"
                value={formData.workStartTime || '08:00'}
                onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Expected morning punch-in time (e.g. 08:00 AM).
              </p>
            </div>

            {/* 3. Lunch Break Start & End */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lunch Break (សម្រាកអាហារថ្ងៃត្រង់)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="11:30"
                  value={formData.breakStartTime || '11:30'}
                  onChange={(e) => setFormData({ ...formData, breakStartTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder="13:00"
                  value={formData.breakEndTime || '13:00'}
                  onChange={(e) => setFormData({ ...formData, breakEndTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Lunch break window (11:30 AM to 01:00 PM). Automatically excluded from total work hours.
              </p>
            </div>

            {/* 4. Shift End / Check-Out Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Shift End Time (Check-Out / ម៉ោងចេញពីធ្វើការ)
              </label>
              <input
                type="text"
                required
                placeholder="17:30"
                value={formData.workEndTime || '17:30'}
                onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Expected evening departure time (e.g. 05:30 PM). Leaving earlier is flagged as early departure.
              </p>
            </div>
          </div>
        </Card>

        {/* Attendance Grace & QR Security Policies */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-dark-border">
            <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Late Grace & QR Security Policies (ច្បាប់អនុគ្រោះ និងសុវត្ថិភាព)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Grace Period (ចំនួននាទីអនុគ្រោះយឺត)
              </label>
              <select
                value={formData.lateGracePeriodMinutes ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, lateGracePeriodMinutes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold"
              >
                <option value={0}>0 minutes — 08:01+ is marked LATE (Strict Rule)</option>
                <option value={5}>5 minutes grace (Late after 08:05)</option>
                <option value={10}>10 minutes grace (Late after 08:10)</option>
                <option value={15}>15 minutes grace (Late after 08:15)</option>
              </select>
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {formData.lateGracePeriodMinutes === 0 ? (
                  <span>✓ <strong>ច្បាប់តឹងរឹង</strong>៖ បុគ្គលិកដែលកត់ត្រាវត្តមានចាប់ពីម៉ោង <strong>08:01 AM</strong> ឡើងទៅ នឹងត្រូវកត់ត្រាថា <strong>មកយឺត (LATE)</strong> ដោយស្វ័យប្រវត្តិ។</span>
                ) : (
                  <span>អនុគ្រោះរយៈពេល <strong>{formData.lateGracePeriodMinutes} នាទី</strong> បន្ទាប់ពីម៉ោងចូលធ្វើការ។</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                QR Code Rotation Duration (Seconds)
              </label>
              <select
                value={formData.qrExpiresInSeconds || 60}
                onChange={(e) =>
                  setFormData({ ...formData, qrExpiresInSeconds: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value={30}>30 seconds (High Security)</option>
                <option value={60}>60 seconds (Standard)</option>
                <option value={120}>120 seconds (2 minutes)</option>
                <option value={300}>300 seconds (5 minutes)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Active QR codes automatically regenerate to prevent screenshot sharing.
              </p>
            </div>
          </div>
        </Card>

        {/* System Version & Infrastructure Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  System Version & Updates (ព័ត៌មានជំនាន់ប្រព័ន្ធ)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Galaxy TV4K HR platform deployment version, build timestamp, and live update sync.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              isLoading={checkingVersion}
              onClick={handleCheckUpdate}
            >
              Check for Updates
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Admin Panel Version
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
                  v{currentAppVersion}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800/60">
                  Active
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Backend API Version
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
                  v{serverVersionInfo?.version || currentAppVersion}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Synchronized
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Build Release Date
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {currentBuildDate}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Save}
            isLoading={saveMutation.isPending}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
