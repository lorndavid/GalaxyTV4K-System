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
  Check,
  Calendar,
} from 'lucide-react';

export type CameraState =
  | 'INITIALIZING'
  | 'REQUESTING_PERMISSION'
  | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'SCANNING'
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
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring GPS...');
  const [isGpsReady, setIsGpsReady] = useState<boolean>(false);
  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);

  // Hardware & scanning refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Locks to prevent ANY duplicate scanning or parallel requests
  const isProcessingRef = useRef<boolean>(false);
  const scanCompletedRef = useRef<boolean>(false);

  // Real-time GPS coordinate ref (always fresh, zero stale closure)
  const geoCoordsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Continuous High-Accuracy Geolocation Acquisition
  useEffect(() => {
    let isMounted = true;

    if (navigator.geolocation) {
      // Immediate single acquisition
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          geoCoordsRef.current = coords;
          setIsGpsReady(true);
          setLocationStatus(
            t('attendance.gpsVerified', `GPS Verified (±${Math.round(pos.coords.accuracy)}m)`)
          );
        },
        () => {
          if (!isMounted) return;
          setLocationStatus(t('attendance.gpsReady', 'GPS ready'));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );

      // Continuous watch to keep coordinates fresh without latency
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          geoCoordsRef.current = coords;
          setIsGpsReady(true);
          setLocationStatus(
            t('attendance.gpsVerified', `GPS Verified (±${Math.round(pos.coords.accuracy)}m)`)
          );
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      isMounted = false;
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
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

  // 3. Process Attendance Scan (Single execution per scan)
  const processAttendanceScan = useCallback(
    async (decodedText: string) => {
      // 1. Immediately turn off camera tracks and animation to prevent background work
      stopCameraStream();
      setState('VALIDATING');

      // Subtle haptic feedback
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 25, 40]);
        } catch {}
      }

      try {
        let qrToken = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.t) qrToken = parsed.t;
          if (parsed.token) qrToken = parsed.token;
        } catch {}

        // Retrieve GPS coordinates from continuous ref
        let coords = geoCoordsRef.current;

        // Fast 1.5s fallback if coords are not ready yet
        if (!coords) {
          coords = await new Promise((resolve) => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                  });
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 1500 }
              );
            } else {
              resolve(null);
            }
          });
        }

        if (!coords) {
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
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy || 10,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        };

        const res = await apiClient.post('/attendance/scan', payload);
        const record = res.data.data;
        setSuccessRecord(record);
        setState('SUCCESS');

        // Stronger success haptic
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate([50, 40, 90]);
          } catch {}
        }

        // Seamless query cache invalidation without page reload
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

        showToast(
          t('attendance.recordSuccessToast', '✓ Attendance recorded successfully')
        );

        // Auto-redirect countdown to return home smoothly in 3s
        setCountdown(3);
        countdownTimerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              navigate('/');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err: any) {
        const errCode = err?.response?.data?.error?.code;
        const errorMsg =
          err?.response?.data?.error?.message ||
          t(
            'attendance.scanFailed',
            'Unable to record attendance right now. Please scan an active office QR code inside the office.'
          );

        setErrorMessage(errorMsg);
        setState('ERROR');

        // Allow retry after error
        isProcessingRef.current = false;
        scanCompletedRef.current = false;
      }
    },
    [stopCameraStream, t, queryClient, showToast, navigate]
  );

  // 4. Scan Frame Loop with Hardware Decoupling
  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      // If already processed or completed, terminate scan loop immediately
      if (isProcessingRef.current || scanCompletedRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
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
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                decodedData = barcodes[0].rawValue;
              }
            } catch {}
          }

          // Robust fallback with jsQR
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
            // Immediate lock - absolutely prevents any duplicate scan
            if (!scanCompletedRef.current && !isProcessingRef.current) {
              scanCompletedRef.current = true;
              isProcessingRef.current = true;
              processAttendanceScan(decodedData.trim());
              return;
            }
          }
        } catch {
          // Frame read exception safeguard
        }
      }

      if (!isProcessingRef.current && !scanCompletedRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processAttendanceScan]);

  // 5. Camera Initializer (Android & iOS Safari)
  const startCamera = useCallback(
    async (currentFacing: 'environment' | 'user') => {
      stopCameraStream();
      setState('REQUESTING_PERMISSION');
      setErrorMessage('');
      isProcessingRef.current = false;
      scanCompletedRef.current = false;

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
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: currentFacing },
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } catch (e3: any) {
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
        } catch {
          setState('CAMERA_UNAVAILABLE');
        }
      }
    },
    [stopCameraStream, startScanLoop, t]
  );

  // 6. Flashlight / Torch Toggle
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

  // 7. Lifecycle: Mount & Cleanup (Only triggered by explicit facingMode changes)
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCameraStream();
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
            scanCompletedRef.current = true;
            processAttendanceScan(code.data.trim());
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

  // Reset scanner to try again without page reload
  const handleRetry = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    isProcessingRef.current = false;
    scanCompletedRef.current = false;
    startCamera(facingMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* 1. Top HUD Bar */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent">
        <button
          onClick={() => {
            stopCameraStream();
            navigate(-1);
          }}
          className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white transition-all shadow-md"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            {t('attendance.scanAttendance', 'Scan Attendance')}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isGpsReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-[11px] text-slate-300 font-medium tracking-tight">
              {locationStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flashlight toggle */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`min-h-[44px] min-w-[44px] rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-95 shadow-md ${
                isTorchOn
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-amber-400/50'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
              title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
              aria-label="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Switch Camera */}
          <button
            type="button"
            onClick={toggleFacingMode}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white transition-all shadow-md"
            title="Switch Camera"
            aria-label="Switch Camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Viewport Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        {/* CAMERA SCANNER VIEWPORT */}
        {state === 'SCANNING' && (
          <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in w-full max-w-sm">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden bg-black border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Laser scan target frame */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-60 h-60 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  {/* Scanning laser line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scan-laser" />

                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-cyan-400 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-cyan-400 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-cyan-400 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-cyan-400 rounded-br" />
                </div>
              </div>
            </div>

            {/* Instruction Prompt */}
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-white tracking-wide">
                {t('attendance.scanInstruction', 'Scan the attendance QR code')}
              </p>
              <p className="text-xs text-slate-400">
                {t('attendance.autoDetected', 'Align inside frame • Scans automatically')}
              </p>
            </div>
          </div>
        )}

        {/* VALIDATING STATE (Fast, smooth transition with neon radar ring) */}
        {state === 'VALIDATING' && (
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-cyan-500/40 p-8 rounded-3xl max-w-xs w-full text-center space-y-5 shadow-[0_20px_50px_rgba(6,182,212,0.25)] animate-slide-up">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t('attendance.validating', 'Verifying Attendance...')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('attendance.verifyingPerimeter', 'Checking office geofence & server time')}
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS STATE (Stunning Glassmorphic Transformation) */}
        {state === 'SUCCESS' && (
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/40 p-6 sm:p-7 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-[0_25px_60px_rgba(16,185,129,0.25)] animate-slide-up">
            {/* Animated Emerald Checkmark */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-emerald-400 flex items-center justify-center text-white shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {t('attendance.attendanceConfirmed', 'Attendance Confirmed!')}
              </h3>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>

            {/* Attendance Details Card */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs space-y-3 text-left shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Recorded Time:
                </span>
                <span className="font-mono font-bold text-white text-base">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <Building className="w-4 h-4 text-slate-400" />
                  Office:
                </span>
                <span className="font-semibold text-slate-200">
                  {successRecord?.attendance?.officeName || 'Main Office'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  Geofence:
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  {t('attendance.insideOffice', 'Inside Office')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 font-medium">Punch Status:</span>
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

            {/* Action buttons & Countdown */}
            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="lg"
                className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-600/30 text-sm transition-all"
                onClick={() => {
                  stopCameraStream();
                  navigate('/');
                }}
              >
                {t('common.done', 'Done & Return Home')}
              </Button>

              <p className="text-[11px] text-slate-400 animate-pulse font-mono">
                {t('attendance.redirectingHome', {
                  defaultValue: `Returning to home in ${countdown}s...`,
                  seconds: countdown,
                })}
              </p>
            </div>
          </div>
        )}

        {/* ERROR / NOTICE STATE */}
        {state === 'ERROR' && (
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-rose-500/40 p-6 sm:p-7 rounded-3xl max-w-xs w-full text-center space-y-5 shadow-[0_25px_60px_rgba(244,63,94,0.25)] animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white tracking-tight">
                {t('attendance.scanFailedTitle', 'Attendance Notice')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="md"
                className="w-full h-11 font-semibold bg-brand-600 hover:bg-brand-500"
                onClick={handleRetry}
              >
                {t('common.retry', 'Try Again')}
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="w-full h-11 bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700"
                icon={UploadCloud}
                onClick={() => fileInputRef.current?.click()}
              >
                {t('attendance.uploadQrPhoto', 'Upload QR Photo')}
              </Button>
            </div>
          </div>
        )}

        {/* CAMERA ACCESS / PERMISSION PROMPT */}
        {(state === 'CAMERA_UNAVAILABLE' ||
          state === 'REQUESTING_PERMISSION' ||
          state === 'PERMISSION_DENIED') && (
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-brand-500/40 p-6 sm:p-7 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                {state === 'PERMISSION_DENIED'
                  ? t('attendance.permissionDeniedTitle', 'Camera Access Required')
                  : state === 'REQUESTING_PERMISSION'
                  ? 'Requesting Camera...'
                  : 'Camera Access'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {errorMessage || 'Tap below to activate camera permissions.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold bg-brand-600 hover:bg-brand-500 h-12 text-sm shadow-lg shadow-brand-600/30"
              onClick={handleRetry}
            >
              {t('attendance.startCamera', 'Start Camera (បើកកាមេរ៉ា)')}
            </Button>
          </div>
        )}
      </main>

      {/* 3. Bottom Footer HUD */}
      <footer className="relative z-30 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex items-center justify-center gap-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 py-2 px-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 active:scale-95 transition-all shadow-md"
        >
          <UploadCloud className="w-4 h-4 text-brand-400" />
          <span>{t('attendance.uploadPhoto', 'Upload Photo')}</span>
        </button>
      </footer>
    </div>
  );
};
