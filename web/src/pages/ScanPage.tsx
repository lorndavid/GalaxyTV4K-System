import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
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
  Zap,
  ZapOff,
  Clock,
  Building,
  Navigation,
} from 'lucide-react';

export type CameraState =
  | 'INITIALIZING'
  | 'REQUESTING_PERMISSION'
  | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'SCANNING'
  | 'QR_DETECTED'
  | 'VALIDATING'
  | 'SUCCESS'
  | 'ERROR';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [state, setState] = useState<CameraState>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring high-accuracy GPS...');
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // 1. Geolocation Acquisition with High Accuracy
  useEffect(() => {
    let isMounted = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setGeoCoords(coords);
          setLocationStatus(
            t('attendance.gpsVerified', `GPS Verified (±${Math.round(pos.coords.accuracy)}m)`)
          );
        },
        () => {
          if (!isMounted) return;
          setLocationStatus(t('attendance.gpsReady', 'GPS ready'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => {
      isMounted = false;
    };
  }, [t]);

  // 2. Camera Stream Cleanup
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // 3. Scan Loop with Debounce / Processing Lock
  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || isProcessingRef.current) {
        if (!isProcessingRef.current) {
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
        return;
      }

      // Check readyState and video dimensions to avoid iOS/Android crashes
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0, width, height);

          let decodedData: string | null = null;

          // Native BarcodeDetector (Chrome Android + iOS Safari 17+)
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(canvas);
              if (barcodes && barcodes.length > 0) {
                decodedData = barcodes[0].rawValue;
              }
            } catch {}
          }

          // Fallback jsQR
          if (!decodedData) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data) {
              decodedData = code.data;
            }
          }

          if (decodedData && decodedData.trim().length > 0) {
            // Immediate processing lock to prevent multiple submissions
            isProcessingRef.current = true;
            setIsProcessing(true);
            onQrDetected(decodedData.trim());
            return;
          }
        } catch (e) {
          // Frame read exception safeguard
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  // 4. Camera Acquisition (Android & iOS Safari)
  const startCamera = useCallback(
    async (currentFacing: 'environment' | 'user') => {
      stopCameraStream();
      setState('REQUESTING_PERMISSION');
      setErrorMessage('');
      isProcessingRef.current = false;
      setIsProcessing(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState('CAMERA_UNAVAILABLE');
        setErrorMessage(
          t(
            'attendance.cameraUnsupported',
            'Camera is not supported on this browser. Please use Chrome or Safari.'
          )
        );
        return;
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: currentFacing } },
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: currentFacing },
          });
        } catch (e2) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } catch (e3: any) {
            console.error('All camera strategies failed:', e3);
            if (e3.name === 'NotAllowedError' || String(e3).includes('Permission')) {
              setState('PERMISSION_DENIED');
              setErrorMessage(
                t(
                  'attendance.permissionDenied',
                  'Camera access is required to scan attendance QR codes. Please enable camera access in your browser or phone settings.'
                )
              );
            } else {
              setState('CAMERA_UNAVAILABLE');
              setErrorMessage(
                t(
                  'attendance.cameraUnavailable',
                  'Unable to access device camera. Please verify camera permissions and try again.'
                )
              );
            }
            return;
          }
        }
      }

      if (!stream) {
        setState('CAMERA_UNAVAILABLE');
        return;
      }

      streamRef.current = stream;

      // Check flashlight (torch) capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      }

      const video = videoRef.current;
      if (video) {
        video.muted = true;
        (video as any).playsInline = true;
        (video as any).webkitPlaysInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.srcObject = stream;

        try {
          await video.play();
          setIsCameraActive(true);
          setState('SCANNING');
          startScanLoop();
        } catch (playErr: any) {
          console.warn('Autoplay blocked by browser policy:', playErr);
          setState('CAMERA_UNAVAILABLE');
        }
      }
    },
    [stopCameraStream, startScanLoop, t]
  );

  // 5. Flashlight / Torch Toggle
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch (err) {
        console.warn('Torch toggle not supported:', err);
      }
    }
  };

  // 6. Handle QR Detection
  const onQrDetected = async (decodedText: string) => {
    setState('QR_DETECTED');

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([60, 30, 60]);
      } catch {}
    }

    stopCameraStream();
    setState('VALIDATING');

    try {
      let qrToken = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.t) qrToken = parsed.t;
        if (parsed.token) qrToken = parsed.token;
      } catch {}

      // Check GPS availability
      let lat = geoCoords?.latitude;
      let lng = geoCoords?.longitude;
      let acc = geoCoords?.accuracy;

      if (!lat || !lng) {
        // One fast synchronous attempt
        await new Promise<void>((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
                acc = pos.coords.accuracy;
                resolve();
              },
              () => resolve(),
              { enableHighAccuracy: true, timeout: 3500 }
            );
          } else {
            resolve();
          }
        });
      }

      if (lat === undefined || lng === undefined) {
        throw {
          response: {
            data: {
              error: {
                message: t(
                  'attendance.gpsUnavailable',
                  "We couldn't determine your location. Please turn on GPS/Location and try again."
                ),
              },
            },
          },
        };
      }

      const payload = {
        token: qrToken,
        qrToken,
        latitude: lat,
        longitude: lng,
        accuracy: acc || 10,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      };

      const res = await apiClient.post('/attendance/scan', payload);
      const record = res.data.data;
      setSuccessRecord(record);
      setState('SUCCESS');

      // Seamless query cache invalidation without page reload
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

      showToast(
        t('attendance.recordSuccessToast', '✓ Attendance recorded successfully')
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        t(
          'attendance.scanFailed',
          'Unable to record attendance right now. Please scan an active office QR code inside the office.'
        );
      setErrorMessage(errorMsg);
      setState('ERROR');
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // 7. Lifecycle: Mount & Cleanup
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCameraStream();
    };
  }, [facingMode, startCamera, stopCameraStream]);

  // 8. Toggle Front/Rear Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // 9. Photo Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            isProcessingRef.current = true;
            setIsProcessing(true);
            onQrDetected(code.data);
          } else {
            setState('ERROR');
            setErrorMessage(
              t(
                'attendance.qrNotFoundInPhoto',
                'Could not find a valid QR code in the uploaded image.'
              )
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* 1. Header HUD: ← Scan Attendance */}
      <header className="relative z-20 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <button
          onClick={() => {
            stopCameraStream();
            navigate(-1);
          }}
          className="min-h-[44px] min-w-[44px] rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight text-white">
            {t('attendance.scanAttendance', 'Scan Attendance')}
          </h1>
          <p className="text-[10px] text-slate-300 font-medium flex items-center justify-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-emerald-400" />
            <span>{locationStatus}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Flashlight toggle where supported */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`min-h-[44px] min-w-[44px] rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 ${
                isTorchOn
                  ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/50'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
              aria-label="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleFacingMode}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
            title="Switch Camera"
            aria-label="Switch Camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Camera Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div
          className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden bg-black/90 border-2 border-brand-500/80 shadow-2xl flex items-center justify-center ${
            state === 'SUCCESS' ||
            state === 'ERROR' ||
            state === 'PERMISSION_DENIED' ||
            state === 'CAMERA_UNAVAILABLE'
              ? 'hidden'
              : 'block'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Clean Scanning Frame Target with Laser Animation */}
          {state === 'SCANNING' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              <div className="relative w-56 h-56 border-2 border-brand-400/90 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-laser" />
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-400" />
              </div>
            </div>
          )}
        </div>

        {/* State: Camera Unavailable / Permissions */}
        {(state === 'CAMERA_UNAVAILABLE' || state === 'REQUESTING_PERMISSION') && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-brand-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {state === 'REQUESTING_PERMISSION' ? 'Requesting Permission...' : 'Camera Access'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {errorMessage || 'Tap below to activate camera permissions.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold bg-brand-600 hover:bg-brand-700 h-12 text-sm"
              onClick={() => startCamera(facingMode)}
            >
              {t('attendance.startCamera', 'Start Camera (បើកកាមេរ៉ា)')}
            </Button>
          </div>
        )}

        {/* State: Scanning Instruction Prompt */}
        {state === 'SCANNING' && isCameraActive && (
          <div className="text-center space-y-1 mt-4 max-w-xs animate-fade-in">
            <p className="text-xs font-bold text-white">
              {t('attendance.scanInstruction', 'Scan the attendance QR code')}
            </p>
            <p className="text-[11px] text-slate-400">
              {t('attendance.autoDetected', 'Align inside frame • Scans automatically')}
            </p>
          </div>
        )}

        {/* State: Validating */}
        {(state === 'VALIDATING' || state === 'QR_DETECTED') && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-scale-in">
            <RefreshCw className="w-10 h-10 text-brand-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {t('attendance.validating', 'Recording Attendance...')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('attendance.verifyingPerimeter', 'Validating server time & GPS geofence')}
              </p>
            </div>
          </div>
        )}

        {/* State: Success Screen */}
        {state === 'SUCCESS' && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-5 shadow-2xl animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {t('attendance.recordedTitle', 'Attendance Recorded')}
              </h3>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Attendance Details Card */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs space-y-2.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Time:
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Office:
                </span>
                <span className="font-semibold text-slate-200">
                  {successRecord?.attendance?.officeName || 'Main Office'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  Location:
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Inside Office
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                <span className="text-slate-400">Status:</span>
                <Badge
                  status={
                    successRecord?.details?.status ||
                    successRecord?.attendance?.status ||
                    'PRESENT'
                  }
                  size="sm"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95"
              onClick={() => {
                stopCameraStream();
                navigate('/');
              }}
            >
              {t('common.done', 'Done & Return Home')}
            </Button>
          </div>
        )}

        {/* State: Error & Permission Prompts */}
        {(state === 'ERROR' || state === 'PERMISSION_DENIED') && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 p-6 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {state === 'PERMISSION_DENIED'
                  ? t('attendance.permissionDeniedTitle', 'Camera Access Required')
                  : t('attendance.scanFailedTitle', 'Attendance Rejected')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => startCamera(facingMode)}
              >
                {t('common.retry', 'Try Again')}
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="w-full bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                icon={UploadCloud}
                onClick={() => fileInputRef.current?.click()}
              >
                {t('attendance.uploadQrPhoto', 'Upload QR Photo')}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer HUD */}
      <footer className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex items-center justify-center gap-4 bg-gradient-to-t from-black/90 to-transparent">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] text-xs text-slate-300 hover:text-white flex items-center gap-1.5 py-2 px-4 rounded-full bg-white/10 backdrop-blur-md active:scale-95 transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('attendance.uploadPhoto', 'Upload Photo')}</span>
        </button>
      </footer>
    </div>
  );
};
