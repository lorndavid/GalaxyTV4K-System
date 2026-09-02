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
} from 'lucide-react';

interface CompanySettings {
  id: string;
  companyName: string;
  timezone: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  qrExpiresInSeconds: number;
  lateGracePeriodMinutes: number;
  maxGpsAccuracyMeters: number;
}

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});
  const [gpsLocating, setGpsLocating] = useState(false);

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

        {/* Attendance & QR Security Policies */}
        <Card className="space-y-4 border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-dark-border">
            <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Attendance Policies & QR Security</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                required
                value={formData.lateGracePeriodMinutes ?? 15}
                onChange={(e) =>
                  setFormData({ ...formData, lateGracePeriodMinutes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Arrivals within this threshold after shift start will not be flagged as late.
              </p>
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
