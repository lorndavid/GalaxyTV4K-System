import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Building2,
  Navigation,
  Check,
  Calendar,
  Fingerprint,
  QrCode,
  Radio,
  Sparkles,
  Lock,
  MapPinOff,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

export type ScannerState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'REQUESTING_PERMISSION'
  | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'SCANNING'
  | 'VALIDATING'
  | 'SUCCESS'
  | 'ERROR';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const isGeolocationNative = (): boolean => {
  try {
    const fnStr = Function.prototype.toString.call(navigator.geolocation?.getCurrentPosition);
    return fnStr.includes('[native code]');
  } catch {
    return true;
  }
};

const parseTimeToMinutes = (timeStr?: string | null): number => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const cleaned = str.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':');
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  } else if (!isPM && !isAM && hours >= 1 && hours <= 6) {
    hours += 12;
  }

  return hours * 60 + minutes;
};

const acquireBestCoordinates = async (
  coordsRef: React.MutableRefObject<any>
): Promise<{ latitude: number; longitude: number; accuracy: number; isMocked: boolean } | null> => {
  const isApiTampered = !isGeolocationNative();

  // If already locked and valid (< 30s old), return immediately with 0ms delay
  if (coordsRef.current && typeof coordsRef.current.latitude === 'number') {
    return {
      latitude: coordsRef.current.latitude,
      longitude: coordsRef.current.longitude,
      accuracy: coordsRef.current.accuracy,
      isMocked: Boolean(coordsRef.current.isMocked || isApiTampered),
    };
  }

  if (!navigator.geolocation) return null;

  // Stage 1: High Accuracy GPS (10-second window for satellite fix)
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      });
    });

    const isMock = Boolean(
      (pos.coords as any).isMocked ||
      (pos as any).mocked ||
      (pos.coords as any).mocked ||
      isApiTampered ||
      pos.coords.accuracy <= 0.0
    );

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      isMocked: isMock,
    };
  } catch {
    // Stage 2: Cellular Network / Google Fused Location fallback (indoor Samsung acquisition)
    try {
      const fallbackPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        });
      });

      const isMock = Boolean(
        (fallbackPos.coords as any).isMocked ||
        (fallbackPos as any).mocked ||
        (fallbackPos.coords as any).mocked ||
        isApiTampered ||
        fallbackPos.coords.accuracy <= 0.0
      );

      return {
        latitude: fallbackPos.coords.latitude,
        longitude: fallbackPos.coords.longitude,
        accuracy: fallbackPos.coords.accuracy,
        isMocked: isMock,
      };
    } catch {
      return null;
    }
  }
};

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const isKhmer = !i18n.language?.startsWith('en');

  // 1. Fetch Company Settings to determine checkInMethod and geofence
  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data.data;
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // 2. Fetch Today's Attendance to know Punch-In vs Punch-Out state
  const { data: todayRecord } = useQuery({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await apiClient.get('/attendance/my-today');
      return res.data.data;
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const checkInMethod: 'ZONE_CLICK' | 'QR_SCAN' | 'BOTH' =
    companySettings?.checkInMethod || 'BOTH';

  // Active tab state: 'ZONE_CLICK' or 'QR_SCAN'
  const [activeTab, setActiveTab] = useState<'ZONE_CLICK' | 'QR_SCAN'>('ZONE_CLICK');

  useEffect(() => {
    if (checkInMethod === 'QR_SCAN') {
      setActiveTab('QR_SCAN');
    } else if (checkInMethod === 'ZONE_CLICK') {
      setActiveTab('ZONE_CLICK');
    }
  }, [checkInMethod]);

  const [state, setState] = useState<ScannerState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring GPS...');
  const [isGpsReady, setIsGpsReady] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(2);

  // Live Digital Cambodia Clock
  const [nowTime, setNowTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hardware & scanning refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isProcessingRef = useRef<boolean>(false);
  const scanCompletedRef = useRef<boolean>(false);

  const geoCoordsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesized audio chime on success
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  // Continuous GPS Geolocation Acquisition
  useEffect(() => {
    let isMounted = true;

    if (navigator.geolocation) {
      const handlePositionSuccess = (pos: GeolocationPosition) => {
        if (!isMounted) return;
        const isMock = Boolean(
          (pos.coords as any).isMocked ||
          (pos as any).mocked ||
          (pos.coords as any).mocked ||
          !isGeolocationNative() ||
          pos.coords.accuracy <= 0.0
        );
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isMocked: isMock,
        };
        geoCoordsRef.current = coords;
        setCurrentCoords(coords);
        setIsGpsReady(true);
        setLocationStatus(
          t('attendance.gpsVerified', `GPS Verified (±${Math.round(pos.coords.accuracy)}m)`)
        );
      };

      // 1. Tier 1: Fast fused location acquisition for Samsung/Android (200ms - 1s)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePositionSuccess(pos);
          // 2. Tier 2: Immediately attempt high-accuracy GPS upgrade
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            () => {
              // High accuracy timeout; keep existing Tier 1 coordinates
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        },
        () => {
          // If low-latency failed, attempt high-accuracy directly
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            () => {
              if (!isMounted) return;
              setLocationStatus(t('attendance.gpsReady', 'GPS ready'));
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );

      // 3. Continuous resilient position watcher
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    }

    return () => {
      isMounted = false;
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
      if (autoCloseTimerRef.current) {
        clearInterval(autoCloseTimerRef.current);
      }
    };
  }, [t]);

  // Office Location & Geofence metrics
  const officeLat = companySettings?.latitude ?? 11.5564;
  const officeLng = companySettings?.longitude ?? 104.9282;
  const allowedRadius = companySettings?.allowedRadiusMeters ?? 100;
  const officeName = companySettings?.companyName || 'Galaxy TV4K Main Office';

  // Working Shift Rules
  const isCustomShift = todayRecord?.duty?.shiftType === 'CUSTOM';
  const isAfternoonShift = todayRecord?.duty?.shiftType === 'AFTERNOON';

  const workStartTime = isAfternoonShift
    ? (todayRecord?.duty?.checkInStartTime || '12:00')
    : (isCustomShift && todayRecord?.duty?.checkInStartTime
        ? todayRecord.duty.checkInStartTime
        : (companySettings?.workStartTime || todayRecord?.duty?.checkInStartTime || '07:30'));

  const workEndTime = (isCustomShift && todayRecord?.duty?.workEndTime)
    ? todayRecord.duty.workEndTime
    : (companySettings?.workEndTime || todayRecord?.duty?.workEndTime || '17:30');
  const breakStartTime = companySettings?.breakStartTime || '11:30';
  const breakEndTime = companySettings?.breakEndTime || '13:00';
  const allowedBefore = companySettings?.checkInAllowedBeforeMinutes ?? 30;
  const lateGrace = companySettings?.lateGracePeriodMinutes ?? 0;

  const startMinutes = useMemo(() => {
    return parseTimeToMinutes(workStartTime || '07:30');
  }, [workStartTime]);

  const openMinutes = useMemo(() => {
    return Math.max(0, startMinutes - allowedBefore);
  }, [startMinutes, allowedBefore]);

  const openTimeStr = useMemo(() => {
    const h = Math.floor(openMinutes / 60).toString().padStart(2, '0');
    const m = (openMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [openMinutes]);

  const currentMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
  const isOpenForCheckIn = currentMinutes >= openMinutes;
  const isLateNow = currentMinutes > (startMinutes + lateGrace);
  const lateMinutesNow = Math.max(0, currentMinutes - startMinutes);

  const endMinutes = useMemo(() => {
    return parseTimeToMinutes(workEndTime || '17:30');
  }, [workEndTime]);

  const earlyLeaveGrace = companySettings?.earlyLeaveGraceMinutes ?? 0;
  const earliestCheckOutMinutes = Math.max(0, endMinutes - earlyLeaveGrace);
  const isCheckOutAllowedNow = currentMinutes >= earliestCheckOutMinutes;

  const formattedEndTime = useMemo(() => {
    const totalMin = parseTimeToMinutes(workEndTime || '17:30');
    const endH = Math.floor(totalMin / 60);
    const endM = (totalMin % 60).toString().padStart(2, '0');
    const period = endH >= 12 ? 'PM' : 'AM';
    const h12 = (endH % 12 || 12).toString().padStart(2, '0');
    return `${h12}:${endM} ${period}`;
  }, [workEndTime]);

  const distanceToOffice = useMemo(() => {
    if (!currentCoords) return null;
    return calculateDistanceMeters(
      currentCoords.latitude,
      currentCoords.longitude,
      officeLat,
      officeLng
    );
  }, [currentCoords, officeLat, officeLng]);

  const isInsideOffice = distanceToOffice !== null ? distanceToOffice <= allowedRadius : false;

  const hasCheckedIn = Boolean(todayRecord?.checkInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkOutAt);
  const isCompletedToday = hasCheckedIn && hasCheckedOut;
  const dutyInfo = (todayRecord as any)?.duty;
  const canCheckIn = dutyInfo ? dutyInfo.canCheckIn : true;

  const remainingCheckOutMinutes = useMemo(() => {
    if (!hasCheckedIn || hasCheckedOut || isCheckOutAllowedNow) return 0;
    return Math.max(0, earliestCheckOutMinutes - currentMinutes);
  }, [hasCheckedIn, hasCheckedOut, isCheckOutAllowedNow, earliestCheckOutMinutes, currentMinutes]);

  const remainingCheckOutText = useMemo(() => {
    if (remainingCheckOutMinutes <= 0) return '';
    const h = Math.floor(remainingCheckOutMinutes / 60);
    const m = remainingCheckOutMinutes % 60;
    if (h > 0) {
      return isKhmer ? `នៅសល់ ${h} ម៉ោង ${m} នាទី` : `${h}h ${m}m remaining`;
    }
    return isKhmer ? `នៅសល់ ${m} នាទី` : `${m}m remaining`;
  }, [remainingCheckOutMinutes, isKhmer]);

  // Manual GPS Permission / Activation Trigger
  const requestLocationAccess = () => {
    if (!navigator.geolocation) {
      showToast('ឧបករណ៍របស់អ្នកមិនគាំទ្រ Geolocation/GPS ទេ។', 'error');
      return;
    }
    setLocationStatus('កំពុងស្នើសុំបើក GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const isMock = Boolean(
          (pos.coords as any).isMocked ||
          (pos as any).mocked ||
          (pos.coords as any).mocked ||
          !isGeolocationNative() ||
          pos.coords.accuracy < 1.0
        );
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isMocked: isMock,
        };
        geoCoordsRef.current = coords;
        setCurrentCoords(coords);
        setIsGpsReady(true);
        showToast(`✓ បានភ្ជាប់ GPS ជោគជ័យ (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        let msg = 'សូមបើក Location / GPS លើទូរស័ព្ទដៃរបស់អ្នក និងចុច Allow Permission ដើម្បីកត់ត្រាវត្តមាន។';
        if (err.code === 1) {
          msg = 'អ្នកបានបដិសេធ Location Permission។ សូមបើក Permission ក្នុង Browser Settings។';
        }
        showToast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Camera stream cleanup
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
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // 1-Click Zone Check-In Handler
  const handleZoneCheckIn = async () => {
    if (isProcessingRef.current) return;

    if (!currentCoords && !geoCoordsRef.current) {
      requestLocationAccess();
      showToast('📍 សូមបើក Location / GPS នៅលើទូរស័ព្ទដៃរបស់អ្នកជាមុនសិន!', 'warning');
      return;
    }

    if (!hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn) {
      showToast(dutyInfo.dutyMessage || 'ថ្ងៃនេះជាថ្ងៃសិក្សារបស់អ្នក មិនតម្រូវឱ្យស្កេនវត្តមានឡើយ។', 'warning');
      return;
    }

    if (hasCheckedIn && !hasCheckedOut && !isCheckOutAllowedNow) {
      showToast(
        `មិនទាន់ដល់ម៉ោងចេញពីធ្វើការនៅឡើយទេ (ម៉ោងចេញគឺ ${formattedEndTime})!`,
        'warning'
      );
      return;
    }

    isProcessingRef.current = true;
    setState('VALIDATING');

    try {
      const coords = await acquireBestCoordinates(geoCoordsRef);

      if (!coords) {
        throw {
          response: {
            data: {
              error: {
                message: t(
                  'attendance.gpsUnavailable',
                  "មិនអាចកំណត់ទីតាំង GPS បានទេ។ សូមពិនិត្យមើល Location / GPS និងការភ្ជាប់អ៊ីនធឺណិត (4G/5G ឬ Wi-Fi)។ (Could not acquire GPS location. Please turn on GPS/Location and try again)."
                ),
              },
            },
          },
        };
      }

      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
        isMocked: coords.isMocked || false,
      };

      const res = await apiClient.post('/attendance/zone-checkin', payload);
      const record = res.data.data;
      setSuccessRecord(record);
      setState('SUCCESS');
      playSuccessChime();

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([50, 40, 90]);
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

      showToast(t('attendance.recordSuccessToast', '✓ Attendance recorded successfully'));

      setCountdown(2);
      autoCloseTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 800);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        t('attendance.scanFailed', 'Unable to record attendance right now.');
      setErrorMessage(errorMsg);
      setState('ERROR');
      isProcessingRef.current = false;
      scanCompletedRef.current = false;
    }
  };

  // QR Code Attendance Submission
  const processAttendanceScan = useCallback(
    async (decodedText: string) => {
      playSuccessChime();
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 25, 40]);
        } catch {}
      }

      stopCameraStream();

      if (!currentCoords && !geoCoordsRef.current) {
        setState('ERROR');
        setErrorMessage('📍 សូមបើក Location / GPS នៅលើទូរស័ព្ទដៃរបស់អ្នកជាមុនសិន។');
        isProcessingRef.current = false;
        scanCompletedRef.current = false;
        return;
      }

      if (!hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn) {
        setState('ERROR');
        setErrorMessage(dutyInfo.dutyMessage || 'ថ្ងៃនេះជាថ្ងៃសិក្សារបស់អ្នក មិនតម្រូវឱ្យស្កេនវត្តមានឡើយ។');
        isProcessingRef.current = false;
        scanCompletedRef.current = false;
        return;
      }

      if (hasCheckedIn && !hasCheckedOut && !isCheckOutAllowedNow) {
        setState('ERROR');
        setErrorMessage(
          `មិនទាន់ដល់ម៉ោងចេញពីធ្វើការនៅឡើយទេ។ ម៉ោងចេញកំណត់ចាប់ពីម៉ោង ${formattedEndTime} (${workEndTime}) តទៅ! (Check-out opens at ${formattedEndTime}).`
        );
        isProcessingRef.current = false;
        scanCompletedRef.current = false;
        return;
      }

      setState('VALIDATING');

      try {
        let qrToken = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.t) qrToken = parsed.t;
          if (parsed.token) qrToken = parsed.token;
        } catch {}

        const coords = await acquireBestCoordinates(geoCoordsRef);

        if (!coords) {
          throw {
            response: {
              data: {
                error: {
                  message: t(
                    'attendance.gpsUnavailable',
                    "មិនអាចកំណត់ទីតាំង GPS បានទេ។ សូមពិនិត្យមើល Location / GPS និងការភ្ជាប់អ៊ីនធឺណិត (4G/5G ឬ Wi-Fi)។ (Could not acquire GPS location. Please turn on GPS/Location and try again)."
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
          isMocked: coords.isMocked || false,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        };

        const res = await apiClient.post('/attendance/scan', payload);
        const record = res.data.data;
        setSuccessRecord(record);
        setState('SUCCESS');

        if ('vibrate' in navigator) {
          try {
            navigator.vibrate([50, 40, 90]);
          } catch {}
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['myHistorySummary'] });

        showToast(t('attendance.recordSuccessToast', '✓ Attendance recorded successfully'));

        setCountdown(2);
        autoCloseTimerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
              stopCameraStream();
              navigate('/');
              return 0;
            }
            return prev - 1;
          });
        }, 800);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.error?.message ||
          t('attendance.scanFailed', 'Unable to record attendance right now.');
        setErrorMessage(errorMsg);
        setState('ERROR');
        isProcessingRef.current = false;
        scanCompletedRef.current = false;
      }
    },
    [stopCameraStream, playSuccessChime, t, queryClient, showToast, navigate]
  );

  // Scan frame loop for QR
  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      if (isProcessingRef.current || scanCompletedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && !isProcessingRef.current) {
        isProcessingRef.current = true;
        scanCompletedRef.current = true;
        await processAttendanceScan(code.data.trim());
        return;
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processAttendanceScan]);

  // Start Camera Stream
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCameraStream();
      isProcessingRef.current = false;
      scanCompletedRef.current = false;
      setState('REQUESTING_PERMISSION');

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setState('CAMERA_UNAVAILABLE');
          setErrorMessage(t('attendance.cameraUnsupported'));
          return;
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities: any =
              typeof videoTrack.getCapabilities === 'function'
                ? videoTrack.getCapabilities()
                : {};
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          }

          setState('SCANNING');
          startScanLoop();
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setState('PERMISSION_DENIED');
          setErrorMessage(t('attendance.permissionDenied'));
        } else {
          setState('CAMERA_UNAVAILABLE');
          setErrorMessage(t('attendance.cameraUnavailable'));
        }
      }
    },
    [stopCameraStream, startScanLoop, t]
  );

  // Manage camera based on activeTab
  useEffect(() => {
    if (activeTab === 'QR_SCAN' && state !== 'SUCCESS' && state !== 'VALIDATING') {
      startCamera(facingMode);
    } else {
      stopCameraStream();
      if (state !== 'SUCCESS' && state !== 'VALIDATING' && state !== 'ERROR') {
        setState('IDLE');
      }
    }

    return () => {
      stopCameraStream();
    };
  }, [activeTab, facingMode, startCamera, stopCameraStream]);

  // Toggle Front/Rear Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Torch Toggle
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch {}
    }
  };

  // Photo Upload Fallback
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

  const handleRetry = () => {
    if (autoCloseTimerRef.current) {
      clearInterval(autoCloseTimerRef.current);
    }
    isProcessingRef.current = false;
    scanCompletedRef.current = false;
    if (activeTab === 'QR_SCAN') {
      startCamera(facingMode);
    } else {
      setState('IDLE');
    }
  };

  // Cambodia Clock formatting
  const digitalTimeStr = nowTime.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const cambodiaDateStr = nowTime.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
    timeZone: 'Asia/Phnom_Penh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

      {/* 1. Header HUD Bar */}
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
            {activeTab === 'ZONE_CLICK' ? (
              <>
                <Fingerprint className="w-4 h-4 text-brand-400" />
                <span>{t('attendance.oneClickCheckIn', 'ចុចកត់ត្រាវត្តមាន')}</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>{t('attendance.scanAttendance', 'Scan Attendance')}</span>
              </>
            )}
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

        {/* Action icons on header right */}
        <div className="flex items-center gap-2">
          {activeTab === 'QR_SCAN' ? (
            <>
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`min-h-[44px] min-w-[44px] rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-95 shadow-md ${
                    isTorchOn
                      ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-amber-400/50'
                      : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }`}
                  aria-label="Toggle Flashlight"
                >
                  {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white transition-all shadow-md"
                aria-label="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-11 h-11 flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isInsideOffice ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isInsideOffice ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Top Segmented Mode Tabs (Only if BOTH allowed by Admin) */}
      {checkInMethod === 'BOTH' && state !== 'SUCCESS' && state !== 'VALIDATING' && (
        <div className="px-4 py-1 relative z-20 flex justify-center">
          <div className="inline-flex p-1 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('ZONE_CLICK')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ZONE_CLICK'
                  ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>
                {hasCheckedIn && !hasCheckedOut
                  ? (isCheckOutAllowedNow ? t('attendance.oneClickCheckOut', 'ចុច Check-Out') : `ចេញម៉ោង ${formattedEndTime}`)
                  : t('attendance.oneClickCheckIn', 'ចុច Check-In')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('QR_SCAN')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'QR_SCAN'
                  ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('attendance.qrScanTab', 'ស្កេន QR')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Center Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative z-10 w-full max-w-sm mx-auto overflow-y-auto">
        {/* ===================== VIEW 1: ONE-CLICK IN-ZONE CHECK-IN ===================== */}
        {activeTab === 'ZONE_CLICK' && state !== 'VALIDATING' && state !== 'SUCCESS' && state !== 'ERROR' && (
          <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
            {/* Live Cambodia Digital Clock Card */}
            <div className="w-full bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 text-center shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span>{t('attendance.clockTitle', 'ម៉ោងកម្ពុជាបច្ចុប្បន្ន')}</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider text-glow-brand">
                {digitalTimeStr}
              </div>
              <div className="text-xs font-medium text-slate-300 mt-1">
                {cambodiaDateStr}
              </div>
            </div>

            {/* Study Day / Non-Working Alert Notice */}
            {dutyInfo && !dutyInfo.canCheckIn && !hasCheckedIn && (
              <div className="w-full bg-gradient-to-br from-indigo-950/80 via-purple-950/70 to-slate-950/90 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl p-5 text-center space-y-3 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {dutyInfo.dutyTitle}
                </h3>
                <p className="text-xs text-indigo-200/90 leading-relaxed px-2">
                  {dutyInfo.dutyMessage}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md mt-1 cursor-pointer"
                >
                  ត្រឡប់ទៅទំព័រដើម (Back to Home)
                </button>
              </div>
            )}

            {/* Location Off Warning Alert Banner */}
            {!currentCoords && (
              <div className="w-full bg-amber-950/50 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPinOff className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-amber-200">
                      សូមបើក Location / GPS នៅលើទូរស័ព្ទដៃ
                    </h3>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed mt-1">
                      ប្រព័ន្ធតម្រូវឱ្យបើក GPS និងស្ថិតក្នុងបរិវេណការិយាល័យជាចាំបាច់ មុនពេលអាចកត់ត្រាវត្តមានបាន។
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestLocationAccess}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MapPin className="w-4 h-4" />
                  <span>ចុចបើកដំណើរការ GPS (Turn on GPS)</span>
                </button>
              </div>
            )}

            {/* Geofence Radar Status Card */}
            <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isInsideOffice ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white truncate max-w-[170px]">{officeName}</h2>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {t('attendance.officeZonePerimeter', { radius: allowedRadius, defaultValue: `Perimeter: ${allowedRadius}m` })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isInsideOffice
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isInsideOffice ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {isInsideOffice
                      ? t('attendance.insideOfficeZone', 'ក្នុងតំបន់')
                      : t('attendance.outsideOfficeZone', 'ក្រៅតំបន់')}
                  </span>
                </div>
              </div>

              {/* Distance Meter Bar */}
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-brand-400" />
                  <span>
                    {distanceToOffice !== null
                      ? t('attendance.distanceFromOffice', { meters: distanceToOffice, defaultValue: `${distanceToOffice}m from office` })
                      : 'កំពុងកំណត់ចម្ងាយ...'}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {currentCoords ? `GPS ±${Math.round(currentCoords.accuracy)}m` : '—'}
                </span>
              </div>
            </div>

            {/* Official Work Shift Rules & Real-Time Status Card */}
            <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span>កាលវិភាគការងារ</span>
                </span>

                {/* Dynamic Status Preview Badge */}
                {hasCheckedIn ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ បានស្កេនចូលរួច
                  </span>
                ) : !isOpenForCheckIn ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    បើកម៉ោង {openTimeStr}
                  </span>
                ) : isLateNow ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    មកយឺត (+{lateMinutesNow}m)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ទាន់ពេល (On-Time)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1 border-t border-slate-800/80">
                <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block">ចូលព្រឹក</span>
                  <span className="font-bold text-white font-mono mt-0.5 block">{workStartTime}</span>
                </div>
                <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block">សម្រាក</span>
                  <span className="font-bold text-white font-mono mt-0.5 block">{breakStartTime}–{breakEndTime}</span>
                </div>
                <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block">ចេញល្ងាច</span>
                  <span className="font-bold text-white font-mono mt-0.5 block">{workEndTime}</span>
                </div>
              </div>
            </div>

            {/* Big Biometric Check-In / Check-Out Punch Action Button */}
            {isCompletedToday ? (
              <div className="w-full bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {t('attendance.alreadyCompleted', 'បានបំពេញវត្តមានថ្ងៃនេះរួចរាល់')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ចូល: {todayRecord?.checkInAt ? new Date(todayRecord.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} • ចេញ: {todayRecord?.checkOutAt ? new Date(todayRecord.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full bg-slate-800 text-slate-200 border-slate-700"
                  onClick={() => navigate('/')}
                >
                  {t('common.done', 'ត្រឡប់ទៅទំព័រដើម')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 space-y-3 w-full">
                {/* Glowing Biometric Circular Button */}
                <div className="relative flex items-center justify-center">
                  {/* Outer Pulsing Radar Rings when inside office */}
                  {isInsideOffice && (
                    <>
                      <span className="absolute w-44 h-44 rounded-full bg-emerald-500/20 animate-ping opacity-60 pointer-events-none" />
                      <span className="absolute w-52 h-52 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={
                      !hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn
                        ? () => showToast(dutyInfo.dutyMessage || 'ថ្ងៃនេះជាថ្ងៃសិក្សារបស់អ្នក មិនតម្រូវឱ្យស្កេនវត្តមានឡើយ។', 'warning')
                        : !currentCoords
                        ? requestLocationAccess
                        : hasCheckedIn && !hasCheckedOut && !isCheckOutAllowedNow
                        ? () =>
                            showToast(
                              `មិនទាន់ដល់ម៉ោងចេញពីធ្វើការនៅឡើយទេ (${remainingCheckOutText})! ម៉ោងអនុញ្ញាតឱ្យចេញគឺចាប់ពីម៉ោង ${formattedEndTime} តទៅ។`,
                              'warning'
                            )
                        : handleZoneCheckIn
                    }
                    disabled={
                      Boolean(
                        (!hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn) ||
                        (currentCoords &&
                          (!isInsideOffice ||
                            (!hasCheckedIn && !isOpenForCheckIn)))
                      )
                    }
                    className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-2xl focus:outline-none ${
                      !hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn
                        ? 'bg-slate-800 text-slate-500 border-2 border-indigo-500/40 cursor-not-allowed opacity-90'
                        : !currentCoords
                        ? 'bg-amber-950/60 text-amber-400 border-2 border-amber-500/50 hover:bg-amber-900/60 ring-4 ring-amber-500/20 cursor-pointer'
                        : !isInsideOffice
                        ? 'bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed opacity-80'
                        : !hasCheckedIn && !isOpenForCheckIn
                        ? 'bg-slate-800 text-slate-400 border-2 border-slate-700 cursor-not-allowed'
                        : hasCheckedIn && !isCheckOutAllowedNow
                        ? 'bg-slate-900 text-amber-400 border-2 border-amber-500/40 hover:bg-slate-850 ring-4 ring-amber-500/20 cursor-pointer'
                        : hasCheckedIn
                        ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 text-white shadow-orange-500/40 hover:shadow-orange-500/60 ring-4 ring-orange-400/30'
                        : isLateNow
                        ? 'bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 text-white shadow-yellow-500/40 hover:shadow-yellow-500/60 ring-4 ring-amber-400/30'
                        : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60 ring-4 ring-emerald-400/30'
                    }`}
                  >
                    {!hasCheckedIn && dutyInfo && !dutyInfo.canCheckIn ? (
                      <>
                        <BookOpen className="w-14 h-14 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-center px-2 text-indigo-300">
                          ម៉ោងសិក្សា
                        </span>
                      </>
                    ) : !currentCoords ? (
                      <>
                        <MapPinOff className="w-14 h-14 text-amber-400 animate-bounce" />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-center px-2">
                          បើក GPS សិន
                        </span>
                      </>
                    ) : hasCheckedIn && !isCheckOutAllowedNow ? (
                      <>
                        <Lock className="w-10 h-10 text-amber-400 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider mt-1 text-center px-2 text-amber-300 font-mono">
                          {remainingCheckOutText || `ចេញម៉ោង ${formattedEndTime}`}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono">
                          គោលដៅ: {formattedEndTime}
                        </span>
                      </>
                    ) : (
                      <>
                        <Fingerprint
                          className={`w-16 h-16 transition-transform duration-300 ${
                            isInsideOffice ? 'animate-pulse text-white' : 'text-slate-500'
                          }`}
                        />
                        <span className="text-[11px] font-black uppercase tracking-wider mt-1">
                          {hasCheckedIn
                            ? 'PUNCH OUT'
                            : !isOpenForCheckIn
                            ? `OPENS ${openTimeStr}`
                            : isLateNow
                            ? `LATE +${lateMinutesNow}M`
                            : 'PUNCH IN'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtitle instructions (clean, concise, and professional) */}
                <div className="text-center px-2 space-y-1">
                  <p className="text-sm font-bold text-white">
                    {!currentCoords
                      ? '⚠️ សូមបើក Location / GPS ដើម្បីកត់ត្រាវត្តមាន'
                      : hasCheckedIn && !isCheckOutAllowedNow
                      ? `🔒 មិនទាន់ដល់ម៉ោងចេញទេ (${remainingCheckOutText} • ម៉ោងចេញគឺ ${formattedEndTime})`
                      : hasCheckedIn
                      ? t('attendance.punchOutBtn', 'ចុច Check-Out ចេញពីធ្វើការ')
                      : !isOpenForCheckIn
                      ? `ការកត់ត្រាវត្តមាននឹងបើកនៅម៉ោង ${openTimeStr} ព្រឹក`
                      : isLateNow
                      ? `ចុច Check-In ចូលធ្វើការ (មកយឺត ${lateMinutesNow} នាទី)`
                      : t('attendance.punchInBtn', 'ចុច Check-In ចូលធ្វើការ')}
                  </p>
                  {(!hasCheckedIn || isCheckOutAllowedNow || !currentCoords) && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {!currentCoords
                        ? 'ប្រព័ន្ធតម្រូវឱ្យបើក GPS លើទូរស័ព្ទដៃជាចាំបាច់។ សូមចុចប៊ូតុងខាងលើដើម្បីភ្ជាប់ GPS។'
                        : isInsideOffice
                        ? t(
                            'attendance.clickToRecordDesc',
                            'អ្នកស្ថិតនៅក្នុងបរិវេណការិយាល័យរួចរាល់ហើយ សូមចុចប៊ូតុងខាងលើដើម្បីកត់ត្រាវត្តមាន។'
                          )
                        : t(
                            'attendance.approachOfficeNotice',
                            'សូមចូលទៅជិតបរិវេណការិយាល័យ ដើម្បីអាចកត់ត្រាវត្តមានបាន។'
                          )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 2: CAMERA QR CODE SCANNER ===================== */}
        {activeTab === 'QR_SCAN' && (
          <div
            className={`flex flex-col items-center justify-center space-y-4 w-full transition-all duration-300 ${
              state === 'SCANNING' || state === 'INITIALIZING' || state === 'REQUESTING_PERMISSION'
                ? 'opacity-100 scale-100'
                : 'hidden pointer-events-none'
            }`}
          >
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden bg-black border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {state === 'SCANNING' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="relative w-60 h-60 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scan-laser" />
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-cyan-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-cyan-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-cyan-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-cyan-400 rounded-br" />
                  </div>
                </div>
              )}

              {(state === 'INITIALIZING' || state === 'REQUESTING_PERMISSION') && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center space-y-3.5 z-20 animate-fade-in">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
                    <div className="w-14 h-14 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin flex items-center justify-center">
                      <Camera className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center px-4 space-y-1">
                    <p className="text-sm font-bold text-white tracking-wide">
                      {t('attendance.startingCamera', 'Starting Camera...')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t('attendance.connectingSensor', 'Initializing camera sensor')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {hasCheckedIn && !hasCheckedOut && !isCheckOutAllowedNow ? (
              <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 text-center flex items-center justify-center gap-2 text-xs font-semibold text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                <span>
                  មិនទាន់ដល់ម៉ោងចេញទេ ({remainingCheckOutText} • ម៉ោងចេញកំណត់គឺ {formattedEndTime})
                </span>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white tracking-wide">
                  {hasCheckedIn
                    ? t('attendance.scanInstructionOut', 'ស្កេន QR Code ដើម្បីកត់ត្រាចេញពីធ្វើការ (Check-Out)')
                    : t('attendance.scanInstruction', 'Scan the attendance QR code')}
                </p>
                <p className="text-xs text-slate-400">
                  {t('attendance.autoDetected', 'Align inside frame • Scans automatically')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 3: VALIDATING STATE ===================== */}
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

        {/* ===================== VIEW 4: SUCCESS STATE ===================== */}
        {state === 'SUCCESS' && (
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/40 p-6 sm:p-7 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-[0_25px_60px_rgba(16,185,129,0.25)] animate-slide-up">
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
                  {new Date().toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
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
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Office:
                </span>
                <span className="font-semibold text-slate-200">
                  {successRecord?.attendance?.officeName || officeName}
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

            {/* Action button & Auto-close progress */}
            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="lg"
                className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-600/30 text-sm transition-all"
                onClick={() => {
                  if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
                  stopCameraStream();
                  navigate('/');
                }}
              >
                {t('common.done', 'Done & Return Home')}
              </Button>

              <p className="text-[11px] text-slate-400 animate-pulse font-mono">
                {t('attendance.redirectingHome', {
                  defaultValue: `Closing in ${countdown}s...`,
                  seconds: countdown,
                })}
              </p>
            </div>
          </div>
        )}

        {/* ===================== VIEW 5: ERROR / NOTICE STATE ===================== */}
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

              {activeTab === 'QR_SCAN' && (
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full h-11 bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700"
                  icon={UploadCloud}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('attendance.uploadQrPhoto', 'Upload QR Photo')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ===================== VIEW 6: PERMISSION DENIED OR CAMERA UNAVAILABLE ===================== */}
        {activeTab === 'QR_SCAN' &&
          (state === 'PERMISSION_DENIED' || state === 'CAMERA_UNAVAILABLE') && (
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-brand-500/40 p-6 sm:p-7 rounded-3xl max-w-xs w-full text-center space-y-4 shadow-2xl animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  {state === 'PERMISSION_DENIED'
                    ? t('attendance.permissionDeniedTitle', 'Camera Access Required')
                    : 'Camera Access'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {errorMessage ||
                    'Please enable camera permissions in your browser settings to scan attendance.'}
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

      {/* 4. Bottom Footer HUD */}
      <footer className="relative z-30 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex items-center justify-center gap-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        {activeTab === 'QR_SCAN' ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 py-2 px-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 active:scale-95 transition-all shadow-md"
          >
            <UploadCloud className="w-4 h-4 text-brand-400" />
            <span>{t('attendance.uploadPhoto', 'Upload Photo')}</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>Galaxy TV4K • Automated Geofence Attendance System</span>
          </div>
        )}
      </footer>
    </div>
  );
};
