import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../lib/queryKeys';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Clock3,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Fingerprint,
  LogIn,
  LogOut,
  Building2,
  Navigation,
  Palmtree,
  Calendar,
} from 'lucide-react';

interface TodayAttendance {
  id?: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: string;
  lateMinutes?: number;
  workedMinutes?: number;
}

interface LeaveBalanceItem {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

// Helper to extract the given/last name of the employee
function getLastName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1];
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');

  // Live ticking clock for Cambodia timezone
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Cambodia hour (0-23)
  const cambodiaHour = useMemo(() => {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        hour: 'numeric',
        hour12: false,
      }).format(liveDate);
      return parseInt(hourStr, 10);
    } catch {
      return liveDate.getHours();
    }
  }, [liveDate]);

  // Context-aware dynamic greeting with customized vibrant time-of-day styling (no emojis or icons)
  const { greetingText, greetingColor } = useMemo(() => {
    if (cambodiaHour >= 5 && cambodiaHour < 12) {
      // Morning (05:00 - 11:59): Warm Amber / Golden Sunrise
      return {
        greetingText: t('home.goodMorning', 'អរុណសួស្តី'),
        greetingColor: 'text-amber-500 dark:text-amber-400',
      };
    } else if (cambodiaHour >= 12 && cambodiaHour < 18) {
      // Afternoon (12:00 - 17:59): Vibrant Sky Blue / Cyan
      return {
        greetingText: t('home.goodAfternoon', 'ទិវាសួស្តី'),
        greetingColor: 'text-sky-500 dark:text-sky-400',
      };
    } else if (cambodiaHour >= 18 && cambodiaHour < 22) {
      // Evening (18:00 - 21:59): Twilight Indigo
      return {
        greetingText: t('home.goodEvening', 'សាយណ្ហសួស្តី'),
        greetingColor: 'text-indigo-500 dark:text-indigo-400',
      };
    } else {
      // Night (22:00 - 04:59): Cozy Violet / Purple
      return {
        greetingText: t('home.goodNight', 'រាត្រីសួស្តី'),
        greetingColor: 'text-purple-500 dark:text-purple-400',
      };
    }
  }, [cambodiaHour, t]);

  // Short name: exclusively the last username (given name)
  const shortEmployeeName = useMemo(() => {
    if (isKhmer) {
      const khmerFull =
        user?.employee?.khmerName ||
        user?.employee?.displayName ||
        user?.email?.split('@')[0] ||
        'បុគ្គលិក';
      return getLastName(khmerFull) || 'បុគ្គលិក';
    } else {
      const latinFull =
        user?.employee?.latinName ||
        user?.employee?.displayName ||
        user?.employee?.firstName ||
        user?.email?.split('@')[0] ||
        'Colleague';
      return getLastName(latinFull) || 'Colleague';
    }
  }, [isKhmer, user]);

  // Localized date header
  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(isKhmer ? 'km-KH' : 'en-US', {
        timeZone: 'Asia/Phnom_Penh',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(liveDate);
    } catch {
      return liveDate.toLocaleDateString();
    }
  }, [isKhmer, liveDate]);

  // Live Digital Time String
  const digitalTimeStr = useMemo(() => {
    try {
      return liveDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return liveDate.toLocaleTimeString();
    }
  }, [liveDate]);

  // 1. Fetch today's attendance record
  const { data: todayRecord } = useQuery<TodayAttendance>({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await apiClient.get('/attendance/my-today');
      return res.data.data;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // 2. Fetch leave balances (for compact highlight pill)
  const { data: leaveBalances } = useQuery<LeaveBalanceItem[]>({
    queryKey: ['myLeaveBalances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // 3. Fetch location telemetry state
  const { data: locData } = useQuery({
    queryKey: ['myLocationStatus'],
    queryFn: async () => {
      const res = await apiClient.get('/location/me');
      return res.data.data;
    },
    staleTime: 30000,
  });

  const isLocationActive = locData?.isLocationSharingActive || false;
  const isInside = locData?.lastLocation?.status === 'INSIDE_OFFICE';
  const distanceMeters = locData?.lastLocation?.distanceFromOffice;

  // Live worked duration calculation
  const [liveWorkedTime, setLiveWorkedTime] = useState<string>('0h 0m');
  const [workedPercentage, setWorkedPercentage] = useState<number>(0);

  useEffect(() => {
    if (todayRecord?.checkInAt && !todayRecord?.checkOutAt) {
      const checkInTime = new Date(todayRecord.checkInAt).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.max(0, Math.floor((now - checkInTime) / 60000));
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      setLiveWorkedTime(`${hours}h ${mins}m`);
      setWorkedPercentage(Math.min(100, Math.round((diffMinutes / 480) * 100)));
    } else if (todayRecord?.workedMinutes) {
      const hours = Math.floor(todayRecord.workedMinutes / 60);
      const mins = todayRecord.workedMinutes % 60;
      setLiveWorkedTime(`${hours}h ${mins}m`);
      setWorkedPercentage(Math.min(100, Math.round((todayRecord.workedMinutes / 480) * 100)));
    } else {
      setLiveWorkedTime('0h 0m');
      setWorkedPercentage(0);
    }
  }, [todayRecord, liveDate]);

  const isCheckedIn = Boolean(todayRecord?.checkInAt);
  const isCheckedOut = Boolean(todayRecord?.checkOutAt);
  const isCompletedToday = isCheckedIn && isCheckedOut;

  // Annual Leave Remaining
  const annualBalanceObj = Array.isArray(leaveBalances)
    ? leaveBalances.find((b) => b.leaveType === 'ANNUAL')
    : null;
  const annualRemaining = annualBalanceObj
    ? Number(annualBalanceObj.remainingDays).toFixed(1)
    : '15.0';

  return (
    <div className="space-y-4 pb-4 animate-fade-in max-w-lg mx-auto select-none">
      {/* 1. Senior Executive Greeting Header (Clean, iconless small single-line layout) */}
      <div className="flex items-center justify-between gap-3 pt-1 px-0.5">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate">
            <span className={`${greetingColor}`}>{greetingText}, </span>
            <span className="text-slate-900 dark:text-slate-100 font-extrabold">{shortEmployeeName}</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5 truncate">
            {todayFormatted}
          </p>
        </div>

        {/* Office Proximity Pill */}
        <Link to="/location-privacy" className="flex-shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 shadow-2xs ${
              isLocationActive
                ? isInside
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLocationActive
                  ? isInside
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {isLocationActive
                ? isInside
                  ? `${t('status.INSIDE_OFFICE', 'ក្នុងតំបន់')} ${distanceMeters ? `(±${distanceMeters}m)` : ''}`
                  : t('status.OUTSIDE_OFFICE', 'ក្រៅតំបន់')
                : t('status.LOCATION_INACTIVE', 'GPS អសកម្ម')}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Premium Hero Attendance & Punch Station Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-white to-slate-50/70 dark:from-dark-surface dark:via-dark-surface dark:to-dark-elevated border border-slate-200/80 dark:border-dark-border shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:shadow-none p-5 sm:p-6 space-y-4">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Live Cambodia Clock + Attendance Status Badge */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>{t('home.todayAttendance', 'វត្តមានថ្ងៃនេះ')}</span>
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {digitalTimeStr}
            </div>
          </div>

          <Badge
            status={
              isCompletedToday
                ? todayRecord?.status || 'PRESENT'
                : isCheckedIn
                ? 'PRESENT'
                : 'NOT_RECORDED'
            }
            size="md"
          />
        </div>

        {/* Dual Punch Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Check-In Metric */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-100 dark:border-dark-border/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t('home.checkInTime', 'ម៉ោងស្កេនចូល')}
              </span>
              <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '— : —'}
            </div>
            {todayRecord?.lateMinutes ? (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                +{todayRecord.lateMinutes}m {t('home.lateLabel', 'មកយឺត')}
              </span>
            ) : null}
          </div>

          {/* Check-Out Metric */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-100 dark:border-dark-border/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t('home.checkOutTime', 'ម៉ោងស្កេនចេញ')}
              </span>
              <LogOut className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {todayRecord?.checkOutAt
                ? new Date(todayRecord.checkOutAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '— : —'}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-1">
              {isCompletedToday
                ? t('home.completed', 'បានបញ្ចប់')
                : isCheckedIn
                ? t('home.workingShift', 'កំពុងធ្វើការ')
                : t('home.awaitingPunch', 'រង់ចាំការស្កេន')}
            </span>
          </div>
        </div>

        {/* Live Work Progress Bar (Active during shift) */}
        {isCheckedIn && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t('home.workedDuration', 'ម៉ោងធ្វើការសរុប')}
              </span>
              <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">
                {liveWorkedTime} / 8h
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-dark-elevated h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-brand-600 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${workedPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Primary Instant Check-In / Check-Out Call to Action */}
        <Link
          to="/scan"
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] shadow-md ${
            isCompletedToday
              ? 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              : isCheckedIn
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/25'
              : 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white shadow-brand-500/30 ring-2 ring-brand-500/20'
          }`}
        >
          {isCompletedToday ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{t('attendance.alreadyCompleted', 'បានបំពេញវត្តមានថ្ងៃនេះរួចរាល់')}</span>
            </>
          ) : isCheckedIn ? (
            <>
              <Fingerprint className="w-5 h-5 animate-pulse" />
              <span>{t('attendance.punchOutBtn', 'ចុច Check-Out ចេញពីធ្វើការ')}</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5 animate-pulse" />
              <span>{t('attendance.punchInBtn', 'ចុច Check-In ចូលធ្វើការ')}</span>
            </>
          )}
        </Link>
      </div>

      {/* 3. Daily Shift Schedule Timeline Card (8:00 AM - 5:30 PM & Lunch 11:30 - 1:00 PM) */}
      <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-dark-border rounded-3xl space-y-3.5 bg-white dark:bg-dark-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('home.shiftSchedule', 'កាលវិភាគការងារថ្ងៃនេះ')}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-800/40">
            08:00 – 17:30
          </span>
        </div>

        {/* 3-Step Workday Visual Timeline */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Step 1: Morning Start */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
              {t('home.morningStart', 'ចូលពេលព្រឹក')}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
              08:00 AM
            </span>
          </div>

          {/* Step 2: Lunch Break */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
              {t('home.lunchBreak', 'សម្រាកថ្ងៃត្រង់')}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
              11:30 – 13:00
            </span>
          </div>

          {/* Step 3: Shift End */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
              {t('home.shiftEnd', 'ចេញពេលល្ងាច')}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
              05:30 PM
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Compact Clean Leave Balance Highlight Bar */}
      <Link to="/leave" className="block">
        <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-50/70 via-white to-purple-50/70 dark:from-dark-elevated dark:via-dark-surface dark:to-dark-elevated border border-slate-200/80 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700 transition-all shadow-2xs group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Palmtree className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t('home.leaveBalance', 'ច្បាប់ប្រចាំឆ្នាំនៅសល់')}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {t('home.daysRemaining', 'សិទ្ធិឈប់សម្រាកដែលអាចប្រើបាន')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-black text-brand-600 dark:text-brand-400 font-mono">
              {annualRemaining} <span className="text-xs font-normal text-slate-400">{t('home.days', 'ថ្ងៃ')}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
};
