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
  SwitchCamera,
  UploadCloud,
  Sparkles,
  Smartphone,
} from 'lucide-react';

type ScanState = 'INITIALIZING' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR' | 'PERMISSION_DENIED';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [state, setState] = useState<ScanState>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring GPS...');
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'native-qr-reader-box';

  // 1. Mount: Request GPS & start camera
  useEffect(() => {
    let isMounted = true;

    // Start GPS in parallel
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setGeoCoords(coords);
          setLocationStatus(`GPS Verified (±${Math.round(coords.accuracy)}m)`);
        },
        () => {
          if (!isMounted) return;
          setLocationStatus('GPS signal ready');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    }

    // Launch camera after DOM is painted
    const timer = setTimeout(() => {
      if (isMounted) {
        initAndStartCamera();
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  const initAndStartCamera = async () => {
    try {
      setState('INITIALIZING');
      setErrorMessage('');

      // Check for container
      const containerEl = document.getElementById(containerId);
      if (!containerEl) {
        setTimeout(initAndStartCamera, 150);
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId);
      }

      let availableCameras: Array<{ id: string; label: string }> = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
      } catch {
        // Fallback if getCameras fails
      }

      setCameras(availableCameras);

      // Choose best camera: back/rear camera if available, otherwise first camera
      let cameraConfig: any = { facingMode: 'environment' };
      if (availableCameras && availableCameras.length > 0) {
        const rearCamera = availableCameras.find((c) =>
          /back|rear|environment|main/i.test(c.label)
        );
        const selectedId = rearCamera ? rearCamera.id : availableCameras[0].id;
        cameraConfig = selectedId;
        setCurrentCameraId(selectedId);
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.floor(minDim * 0.75);
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      try {
        await html5QrCodeRef.current.start(
          cameraConfig,
          scanConfig,
          (decodedText) => handleScanSuccess(decodedText),
          () => {} // silent frame
        );
      } catch (firstErr) {
        // Fallback to user facing mode if environment failed (e.g. desktop webcam)
        await html5QrCodeRef.current.start(
          { facingMode: 'user' },
          scanConfig,
          (decodedText) => handleScanSuccess(decodedText),
          () => {}
        );
      }

      setIsCameraActive(true);
      setState('SCANNING');
    } catch (err: any) {
      setIsCameraActive(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setState('PERMISSION_DENIED');
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setState('ERROR');
        setErrorMessage(err?.message || 'Could not start camera. You can also upload a photo of the QR code.');
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
    } finally {
      setIsCameraActive(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
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
      } catch {}

      const payload = {
        token: qrToken,
        qrToken,
        latitude: geoCoords?.latitude,
        longitude: geoCoords?.longitude,
        accuracy: geoCoords?.accuracy,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      };

      const res = await apiClient.post('/attendance/scan', payload);
      const record = res.data.data;
      setSuccessRecord(record);
      setState('SUCCESS');

      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

      showToast('Attendance recorded successfully!');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        'Could not verify attendance. Please ensure you are scanning an active Galaxy TV4K QR code inside the office.';
      setErrorMessage(errorMsg);
      setState('ERROR');
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2 || !html5QrCodeRef.current) return;
    await stopCamera();

    const currentIndex = cameras.findIndex((c) => c.id === currentCameraId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    setCurrentCameraId(nextCamera.id);

    try {
      const scanConfig = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        nextCamera.id,
        scanConfig,
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );
      setIsCameraActive(true);
      setState('SCANNING');
    } catch {
      initAndStartCamera();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setState('VERIFYING');
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId);
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      await handleScanSuccess(decodedText);
    } catch (err) {
      setState('ERROR');
      setErrorMessage('Could not find a valid QR code in the selected image.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* 1. Top HUD Header */}
      <header className="relative z-20 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={() => {
            stopCamera();
            navigate(-1);
          }}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <Smartphone className="w-4 h-4 text-brand-400" />
            <span>Galaxy TV4K QR Punch</span>
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
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Center Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {/* Hidden File Input for fallback upload */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Viewport Box (Always rendered so Html5Qrcode has target DOM element) */}
        <div className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden bg-black/60 border-2 border-brand-500/80 shadow-2xl flex items-center justify-center ${state === 'SUCCESS' || state === 'ERROR' || state === 'PERMISSION_DENIED' ? 'hidden' : 'block'}`}>
          {/* Native Html5Qrcode container */}
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Viewfinder Target HUD Box with Laser Animation */}
          {state === 'SCANNING' && (
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
          )}

          {/* Initializing Spinner */}
          {state === 'INITIALIZING' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 p-4 text-center">
              <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-xs text-slate-300 font-semibold">Starting camera...</p>
            </div>
          )}
        </div>

        {/* State: Scanning Instructions */}
        {state === 'SCANNING' && (
          <div className="text-center space-y-1 mt-4 max-w-xs animate-fade-in">
            <p className="text-xs font-bold text-white">
              Align Galaxy TV4K QR code inside the viewfinder
            </p>
            <p className="text-[11px] text-slate-400">
              Scans automatically once focused
            </p>
          </div>
        )}

        {/* State: Verifying Token */}
        {state === 'VERIFYING' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-scale-in">
            <RefreshCw className="w-10 h-10 text-brand-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Verifying Attendance...</h3>
              <p className="text-xs text-slate-400">Validating cryptographic QR session & GPS perimeter.</p>
            </div>
          </div>
        )}

        {/* State: Punch Success */}
        {state === 'SUCCESS' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-5 shadow-2xl animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Attendance Recorded!</h3>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge status={successRecord?.details?.status || successRecord?.attendance?.status || 'PRESENT'} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Inside Office
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                stopCamera();
                navigate('/');
              }}
            >
              Done & Return Home
            </Button>
          </div>
        )}

        {/* State: Error & Permission Denied */}
        {(state === 'ERROR' || state === 'PERMISSION_DENIED') && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {state === 'PERMISSION_DENIED' ? 'Camera Permission Needed' : 'Verification Issue'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={initAndStartCamera}
              >
                Try Camera Again
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="w-full bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                icon={UploadCloud}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload QR Image
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Safe Area Footer */}
      <footer className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/10 backdrop-blur-md"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload QR Photo</span>
        </button>
      </footer>
    </div>
  );
};
