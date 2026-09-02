import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/client';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  X,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: any) => void;
}

type ScanStage = 'PERMISSION' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stage, setStage] = useState<ScanStage>('PERMISSION');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring high-accuracy GPS signal...');
  const [geoCoordinates, setGeoCoordinates] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [successRecord, setSuccessRecord] = useState<any>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';

  useEffect(() => {
    if (isOpen) {
      // Automatically initialize GPS & Camera directly on opening
      requestGpsAndStart();
    } else {
      stopScanner();
      setStage('PERMISSION');
      setGeoCoordinates(null);
      setSuccessRecord(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const requestGpsAndStart = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your device or browser.');
      setStage('ERROR');
      return;
    }

    setLocationStatus('Acquiring location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGeoCoordinates(coords);
        setLocationStatus(`Location acquired (±${Math.round(coords.accuracy)}m)`);
        setStage('SCANNING');
        startCamera();
      },
      (err) => {
        let msg = 'Location permission is required to verify company attendance area.';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (err.code === 2) {
          msg = 'Unable to determine your GPS location. Ensure location services are enabled on your device.';
        }
        setErrorMessage(msg);
        setStage('ERROR');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const startCamera = async () => {
    // Wait for the container to render in DOM
    setTimeout(async () => {
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
        }

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          () => {} // silent on frame without QR
        );
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Could not access the camera. Please ensure camera permissions are granted.'
        );
        setStage('ERROR');
      }
    }, 150);
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch {
      // ignore
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();
    setStage('VERIFYING');

    try {
      let qrToken = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.t) qrToken = parsed.t;
        if (parsed.token) qrToken = parsed.token;
      } catch {
        // Raw token fallback
      }

      const payload = {
        token: qrToken,
        qrToken,
        latitude: geoCoordinates?.latitude,
        longitude: geoCoordinates?.longitude,
        accuracy: geoCoordinates?.accuracy,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      };

      const res = await apiClient.post('/attendance/scan', payload);
      const record = res.data.data;
      setSuccessRecord(record);
      setStage('SUCCESS');
      showToast('Attendance recorded successfully!');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        "We couldn't verify your attendance. Please ensure you are inside the office and scanning the active QR code.";
      setErrorMessage(errorMsg);
      setStage('ERROR');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-white dark:bg-dark-surface rounded-3xl shadow-floating border border-slate-200 dark:border-dark-border overflow-hidden transition-colors duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-elevated/40">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Scan Attendance</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content View */}
        <div className="p-5">
          {/* Stage 1: GPS Permission Explanation */}
          {stage === 'PERMISSION' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-subtle">
                <MapPin className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Location Verification</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  We verify your location to ensure you are within the company attendance perimeter.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-2xl border border-slate-200 dark:border-dark-border text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 text-left">
                <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                <span>GPS coordinates and short-lived QR tokens are validated securely on the server.</span>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full h-12"
                  onClick={requestGpsAndStart}
                >
                  Continue to Camera
                </Button>
              </div>
            </div>
          )}

          {/* Stage 2: Camera Viewport with scanning animation */}
          {stage === 'SCANNING' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-slate-200 dark:border-dark-border">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Viewfinder Overlay Frame */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="relative w-52 h-52 border-2 border-brand-500/80 rounded-2xl">
                    {/* Animated Scanning Laser Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_8px_#3b82f6] animate-scan-laser" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Place the QR code inside the frame
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3 h-3 text-success-600 dark:text-success-400" />
                  <span>{locationStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stage 3: Verifying */}
          {stage === 'VERIFYING' && (
            <div className="py-12 space-y-4 text-center">
              <RefreshCw className="w-10 h-10 text-brand-600 dark:text-brand-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Validating Attendance...</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Verifying cryptographic QR session and GPS signal.</p>
              </div>
            </div>
          )}

          {/* Stage 4: Success Screen */}
          {stage === 'SUCCESS' && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-success-50 dark:bg-success-950/50 border-2 border-success-200 dark:border-success-800 flex items-center justify-center text-success-600 dark:text-success-400 mx-auto animate-slide-up">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Attendance Recorded</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-dark-elevated p-3.5 rounded-2xl border border-slate-200 dark:border-dark-border text-xs space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Punch Time:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <Badge status={successRecord?.details?.status || successRecord?.attendance?.status || 'PRESENT'} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Location Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-success-700 dark:text-success-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Inside Office
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full h-12 font-bold"
                onClick={() => {
                  onSuccess(successRecord);
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          )}

          {/* Stage 5: Error Screen */}
          {stage === 'ERROR' && (
            <div className="py-4 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-danger-50 dark:bg-danger-950/50 text-danger-600 dark:text-danger-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Verification Failed</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">{errorMessage}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setErrorMessage('');
                    requestGpsAndStart();
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
