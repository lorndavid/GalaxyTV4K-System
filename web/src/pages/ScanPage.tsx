import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { queryKeys } from '../lib/queryKeys';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  ArrowLeft,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  Sparkles,
} from 'lucide-react';

type ScanState = 'ACQUIRING_GPS' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR' | 'PERMISSION_DENIED';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [state, setState] = useState<ScanState>('ACQUIRING_GPS');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring high-accuracy GPS...');
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState<number>(0);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'native-qr-reader';

  // 1. On Mount: Request GPS & initialize camera directly
  useEffect(() => {
    let isMounted = true;

    const initializeScanner = async () => {
      // Step A: Acquire GPS
      if (!navigator.geolocation) {
        if (isMounted) {
          setErrorMessage('Geolocation is not supported by your device.');
          setState('ERROR');
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted) return;
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setGeoCoords(coords);
          setLocationStatus(`GPS Verified (±${Math.round(coords.accuracy)}m)`);
          setState('SCANNING');

          // Step B: Start Camera
          await startCamera(coords);
        },
        async (err) => {
          if (!isMounted) return;
          // Fallback: Proceed to camera even if GPS is slow, but alert user
          setLocationStatus('GPS signal weak');
          setState('SCANNING');
          await startCamera(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };

    initializeScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const startCamera = async (coords: any) => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId);
      }

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleScanSuccess(decodedText, coords),
        () => {} // silent on frame scan without QR
      );
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setState('PERMISSION_DENIED');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser.');
      } else {
        setState('ERROR');
        setErrorMessage(err?.message || 'Failed to initialize camera.');
      }
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch {
      // ignore
    }
  };

  const handleScanSuccess = async (decodedText: string, coords: any) => {
    // Vibrate device if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {}
    }

    await stopCamera();
    setState('VERIFYING');

    try {
      let qrToken = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.t) qrToken = parsed.t;
        if (parsed.token) qrToken = parsed.token;
      } catch {
        // Raw token
      }

      const payload = {
        token: qrToken,
        qrToken,
        latitude: coords?.latitude || geoCoords?.latitude,
        longitude: coords?.longitude || geoCoords?.longitude,
        accuracy: coords?.accuracy || geoCoords?.accuracy,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      };

      const res = await apiClient.post('/attendance/scan', payload);
      const record = res.data.data;
      setSuccessRecord(record);
      setState('SUCCESS');

      // Invalidate queries without full-page reload
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

      showToast('Attendance recorded successfully!');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        "Could not verify attendance. Please ensure you are scanning an active office QR code inside the company perimeter.";
      setErrorMessage(errorMsg);
      setState('ERROR');
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2 || !html5QrCodeRef.current) return;
    await stopCamera();
    const nextIndex = (activeCameraIndex + 1) % cameras.length;
    setActiveCameraIndex(nextIndex);

    try {
      await html5QrCodeRef.current.start(
        cameras[nextIndex].id,
        { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decodedText) => handleScanSuccess(decodedText, geoCoords),
        () => {}
      );
    } catch (err: any) {
      setErrorMessage('Failed to switch camera.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none text-white animate-fade-in overflow-hidden">
      {/* Top Native App Bar */}
      <header className="px-4 py-3.5 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onClick={() => {
            stopCamera();
            navigate('/');
          }}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight text-white">
            Office QR Check-In
          </h1>
          <p className="text-[10px] text-slate-300 font-medium flex items-center justify-center gap-1">
            <MapPin className="w-2.5 h-2.5 text-emerald-400" />
            <span>{locationStatus}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
              aria-label="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {/* State 1: Scanning Viewport */}
        {(state === 'SCANNING' || state === 'ACQUIRING_GPS') && (
          <div className="w-full max-w-xs space-y-4 flex flex-col items-center">
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden bg-black/40 border-2 border-brand-500/80 shadow-2xl flex items-center justify-center">
              {/* Native Html5Qrcode video renderer */}
              <div id={containerId} className="w-full h-full object-cover" />

              {/* Viewfinder Target HUD Box */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="relative w-56 h-56 border-2 border-brand-400/90 rounded-2xl">
                  {/* Glowing Laser Scan Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-laser" />

                  {/* Corner Target Accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-400" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-1 max-w-xs">
              <p className="text-xs font-semibold text-white/90">
                Align reception QR code inside the frame
              </p>
              <p className="text-[11px] text-white/60">
                Rotates dynamically for cryptographic attendance proof
              </p>
            </div>
          </div>
        )}

        {/* State 2: Verifying Cryptographic Token */}
        {state === 'VERIFYING' && (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-scale-in">
            <RefreshCw className="w-10 h-10 text-brand-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Verifying QR & GPS...</h3>
              <p className="text-xs text-slate-400">Validating cryptographic token and company geofence perimeter.</p>
            </div>
          </div>
        )}

        {/* State 3: Punch Success Confirmation Card */}
        {state === 'SUCCESS' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-5 shadow-2xl animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Attendance Verified!</h3>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recorded Time:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge status={successRecord?.details?.status || successRecord?.attendance?.status || 'PRESENT'} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Geofence:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Inside Office
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => navigate('/')}
            >
              Return to Home
            </Button>
          </div>
        )}

        {/* State 4: Error or Geofence Mismatch */}
        {state === 'ERROR' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Punch Failed</h3>
              <p className="text-xs text-rose-300 leading-relaxed">{errorMessage}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1 bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => {
                  setErrorMessage('');
                  setState('ACQUIRING_GPS');
                  startCamera(null);
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* State 5: Permission Denied */}
        {state === 'PERMISSION_DENIED' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Camera Permission Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please allow camera access in your browser or device settings to scan the office QR code.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white font-bold"
              onClick={() => {
                setState('ACQUIRING_GPS');
                startCamera(null);
              }}
            >
              Grant Camera Permission
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Footer Tip */}
      <footer className="px-6 py-4 text-center z-20 pb-[max(env(safe-area-inset-bottom),16px)] bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <p className="text-[11px] text-white/50">
          Secured with anti-spoof GPS telemetry and one-time QR rotation
        </p>
      </footer>
    </div>
  );
};
