import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useLocationTracker } from '../hooks/useLocationTracker';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  ShieldCheck,
  MapPin,
  Compass,
  Radio,
  Lock,
  RefreshCw,
  Info,
  Clock,
  Building2,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const LocationPrivacyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: myLocationData, isLoading } = useQuery({
    queryKey: ['myLocationStatus'],
    queryFn: async () => {
      const res = await apiClient.get('/location/me');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const isSharing = myLocationData?.isLocationSharingActive || false;
  const office = myLocationData?.companyOffice;
  const lastLocation = myLocationData?.lastLocation;

  const { permissionState, lastSentAt, isSending, forceSyncLocation } = useLocationTracker(
    isSharing,
    office?.updateIntervalSeconds || 60
  );

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      return await apiClient.post('/location/toggle-sharing', { active });
    },
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ['myLocationStatus'] });
      showToast(
        active
          ? 'Location sharing enabled. Position updates are active while app is open.'
          : 'Location sharing paused.'
      );
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Location & Privacy</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Control your work location sharing preferences and privacy settings
        </p>
      </div>

      {/* Primary Sharing Toggle Card */}
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSharing ? 'bg-success-50 text-success-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Radio className={`w-5 h-5 ${isSharing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Work Location Sharing</h3>
              <p className="text-xs text-slate-500">
                {isSharing ? 'Sharing is Active' : 'Sharing is Paused'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSharing}
              disabled={toggleMutation.isPending}
              onChange={(e) => toggleMutation.mutate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {/* Live Status Details */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Browser GPS Permission:</span>
            <span
              className={`font-semibold capitalize ${
                permissionState === 'granted'
                  ? 'text-success-600'
                  : permissionState === 'denied'
                  ? 'text-danger-600'
                  : 'text-slate-600'
              }`}
            >
              {permissionState}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Last Verified Status:</span>
            <Badge status={lastLocation?.status || 'LOCATION_INACTIVE'} size="sm" />
          </div>

          {lastLocation?.distanceFromOffice !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Distance from Office HQ:</span>
              <span className="font-semibold text-slate-900">
                {lastLocation?.distanceFromOffice}m away
              </span>
            </div>
          )}

          {lastLocation?.accuracy && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">GPS Accuracy:</span>
              <span className="font-semibold text-slate-900">±{lastLocation.accuracy}m</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Last Update Sent:</span>
            <span className="font-mono text-slate-700">
              {lastSentAt
                ? lastSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : lastLocation?.recordedAt
                ? new Date(lastLocation.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'No recent pings'}
            </span>
          </div>
        </div>

        {isSharing && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            icon={RefreshCw}
            isLoading={isSending}
            onClick={() => {
              forceSyncLocation();
              showToast('Syncing GPS coordinates with server...');
            }}
          >
            Sync Current Location Now
          </Button>
        )}
      </Card>

      {/* Transparent Privacy Policy Information */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Our Privacy & Security Guarantees
        </h3>

        <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <p>
              <b>Transparent Notice:</b> Location updates are only captured while this web
              application is open on your device and location sharing is toggled ON.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <p>
              <b>No Background Snooping:</b> Once you close this browser tab or app, location
              tracking immediately ceases. Browser PWAs cannot track your position in the background.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <p>
              <b>Automatic Data Retention:</b> Location history is automatically deleted after 30
              days in accordance with company data retention policy.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <p>
              <b>Access Control:</b> Only authorized company HR administrators have permission to
              view geofence verification maps.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
