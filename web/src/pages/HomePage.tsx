import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../lib/queryKeys';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Clock3,
  CalendarDays,
  CalendarOff,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Award,
  Calendar,
  Hourglass,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TodayAttendance {
  id?: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: string;
  lateMinutes?: number;
  workedMinutes?: number;
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [liveWorkedTime, setLiveWorkedTime] = useState<string>('0h 0m');
  const [workedPercentage, setWorkedPercentage] = useState<number>(0);

  const employeeName =
    user?.employee?.firstName ||
    user?.employee?.displayName?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Colleague';

  const currentLang = i18n.language || 'km';
  const todayFormatted = new Intl.DateTimeFormat(currentLang === 'km' ? 'km-KH' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Fetch today's attendance record
  const { data: todayRecord, isLoading: isTodayLoading } = useQuery<TodayAttendance>({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await apiClient.get('/attendance/my-today');
      return res.data.data;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // Fetch monthly attendance history to calculate KPI stats
  const { data: historyData } = useQuery({
    queryKey: ['myHistorySummary'],
    queryFn: async () => {
      const now = new Date();
      const res = await apiClient.get(`/attendance/my-history?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      return res.data.data;
    },
    staleTime: 60000,
  });

  // Fetch leave balance
  const { data: leaveBalance } = useQuery({
    queryKey: ['myLeaveBalances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // Fetch location telemetry state
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

  // Calculate live worked time
  useEffect(() => {
    if (!todayRecord?.checkInAt) {
      setLiveWorkedTime('0h 0m');
      setWorkedPercentage(0);
      return;
    }

    const calculateTime = () => {
      const start = new Date(todayRecord.checkInAt!).getTime();
      const end = todayRecord.checkOutAt ? new Date(todayRecord.checkOutAt).getTime() : new Date().getTime();
      const diffMins = Math.max(0, Math.floor((end - start) / 60000));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      setLiveWorkedTime(`${hours}h ${mins}m`);

      // Target shift is 8 hours (480 mins)
      const pct = Math.min(100, Math.round((diffMins / 480) * 100));
      setWorkedPercentage(pct);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  const isCheckedIn = !!todayRecord?.checkInAt;
  const isCheckedOut = !!todayRecord?.checkOutAt;

  // Monthly stats calculations
  const historyList: any[] = historyData?.records || [];
  const presentDays = historyList.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const onTimeDays = historyList.filter((r) => r.status === 'PRESENT').length;
  const onTimeRate = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 100;
  const totalWorkedMins = historyList.reduce((acc, r) => acc + (r.workedMinutes || 0), 0);
  const totalWorkedHours = Math.round(totalWorkedMins / 60);
  const annualRemaining = leaveBalance ? (leaveBalance.annualTotal - leaveBalance.annualUsed).toFixed(1) : '15.0';

  return (
    <div className="space-y-4 pb-2">
      {/* 1. Greeting Header & Location Proximity Pill */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
            {t('home.greeting')}, {employeeName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {todayFormatted}
          </p>
        </div>

        {/* Location Status Pill */}
        <Link to="/location-privacy" className="flex-shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors shadow-xs ${
              isLocationActive
                ? isInside
                  ? 'bg-success-50 dark:bg-success-950/50 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800'
                  : 'bg-warning-50 dark:bg-warning-950/50 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-800'
                : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLocationActive ? (isInside ? 'bg-success-500 animate-pulse' : 'bg-warning-500') : 'bg-slate-400'
              }`}
            />
            <span>
              {isLocationActive
                ? isInside
                  ? `${t('status.INSIDE_OFFICE')} ${distanceMeters ? `(±${distanceMeters}m)` : ''}`
                  : t('status.OUTSIDE_OFFICE')
                : t('status.LOCATION_INACTIVE')}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Executive Today's Attendance Overview Widget */}
      <Card className="p-5 border border-slate-200/90 dark:border-dark-border shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Clock3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Today's Attendance</h2>
              <p className="text-[11px] text-slate-400">Shift 08:00 AM – 05:00 PM</p>
            </div>
          </div>

          <Badge
            status={
              isCheckedOut
                ? todayRecord?.status || 'PRESENT'
                : isCheckedIn
                ? 'PRESENT'
                : 'NOT_RECORDED'
            }
            size="md"
          />
        </div>

        {/* Punch Time Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-2xl border border-slate-100 dark:border-dark-border/80">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
              Check-In Time
            </span>
            <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '— : —'}
            </span>
            {todayRecord?.lateMinutes ? (
              <span className="text-[10px] font-semibold text-warning-600 dark:text-warning-400 block mt-0.5">
                +{todayRecord.lateMinutes}m Late
              </span>
            ) : null}
          </div>

          <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-2xl border border-slate-100 dark:border-dark-border/80">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
              Check-Out Time
            </span>
            <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
              {todayRecord?.checkOutAt
                ? new Date(todayRecord.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '— : —'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isCheckedOut ? 'Completed' : isCheckedIn ? 'Working Shift' : 'Awaiting Punch'}
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        {isCheckedIn && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Worked Duration</span>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{liveWorkedTime} / 8h</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-dark-elevated h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${workedPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Prominent Instant Scan QR Punch Action */}
        <Link
          to="/scan"
          className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all"
        >
          <Clock3 className="w-5 h-5" />
          <span>ស្កេនវត្តមាន (Scan Attendance QR)</span>
        </Link>
      </Card>

      {/* 3. Monthly Metrics & Performance KPI Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Overview
          </h2>
          <Link to="/attendance" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Days Present */}
          <Card padding="sm" className="p-3 border border-slate-200/90 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Present</span>
              <div className="p-1 rounded-md bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{presentDays} Days</p>
          </Card>

          {/* On-Time Rate */}
          <Card padding="sm" className="p-3 border border-slate-200/90 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">On-Time</span>
              <div className="p-1 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{onTimeRate}%</p>
          </Card>

          {/* Total Worked Hours */}
          <Card padding="sm" className="p-3 border border-slate-200/90 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Hours</span>
              <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Hourglass className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{totalWorkedHours}h</p>
          </Card>

          {/* Annual Leave Available */}
          <Card padding="sm" className="p-3 border border-slate-200/90 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Leave Balance</span>
              <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{annualRemaining}d</p>
          </Card>
        </div>
      </div>

      {/* 4. Today's Working Schedule Timeline */}
      <Card className="p-4 border border-slate-200/90 dark:border-dark-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Today's Shift Schedule
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-100 dark:border-dark-border">
            <span className="text-[10px] text-slate-400 block">Morning Start</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">08:00 AM</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-100 dark:border-dark-border">
            <span className="text-[10px] text-slate-400 block">Lunch Break</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">12:00 – 13:00</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-100 dark:border-dark-border">
            <span className="text-[10px] text-slate-400 block">Shift End</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">05:00 PM</span>
          </div>
        </div>
      </Card>

      {/* 5. Self-Service Quick Action Portals */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('home.selfService')}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/leave">
            <Card
              padding="sm"
              className="p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-3 border border-slate-200/90 dark:border-dark-border"
            >
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex-shrink-0">
                <CalendarOff className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {t('home.applyLeave')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {annualRemaining} days left
                </span>
              </div>
            </Card>
          </Link>

          <Link to="/out">
            <Card
              padding="sm"
              className="p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-3 border border-slate-200/90 dark:border-dark-border"
            >
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex-shrink-0">
                <DoorOpen className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {t('home.outPermission')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Temporary exit
                </span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};
