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
  QrCode,
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

interface LeaveBalanceItem {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
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
  const { data: todayRecord } = useQuery<TodayAttendance>({
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

  // Fetch leave balances (Array of LeaveBalanceItem)
  const { data: leaveBalances } = useQuery<LeaveBalanceItem[]>({
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

  // Live timer tick for active shift
  useEffect(() => {
    const updateTime = () => {
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
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
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

  // Fix NaNd bug: trace through leaveBalances array
  const annualBalanceObj = Array.isArray(leaveBalances)
    ? leaveBalances.find((b) => b.leaveType === 'ANNUAL')
    : null;
  const annualRemaining = annualBalanceObj
    ? Number(annualBalanceObj.remainingDays).toFixed(1)
    : '15.0';

  return (
    <div className="space-y-4 pb-2 animate-fade-in">
      {/* 1. Greeting Header & Location Proximity Pill */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            {t('home.greeting', 'Hello')}, {employeeName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            {todayFormatted}
          </p>
        </div>

        {/* Location Status Pill */}
        <Link to="/location-privacy" className="flex-shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors shadow-xs ${
              isLocationActive
                ? isInside
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLocationActive ? (isInside ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500') : 'bg-slate-400'
              }`}
            />
            <span className="font-medium">
              {isLocationActive
                ? isInside
                  ? `${t('status.INSIDE_OFFICE')} ${distanceMeters ? `(±${distanceMeters}m)` : ''}`
                  : t('status.OUTSIDE_OFFICE')
                : t('status.LOCATION_INACTIVE')}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Today's Attendance Overview Card */}
      <Card className="p-4 sm:p-5 border border-slate-100 dark:border-dark-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Clock3 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('home.todayAttendance', "Today's Attendance")}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                {t('home.shiftHours', 'Shift 08:00 AM – 05:00 PM')}
              </p>
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
            size="sm"
          />
        </div>

        {/* Punch Time Details Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50/80 dark:bg-dark-elevated/60 p-3 rounded-xl border border-slate-100 dark:border-dark-border/60">
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('home.checkInTime', 'Check-In')}
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '— : —'}
            </span>
            {todayRecord?.lateMinutes ? (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block mt-0.5">
                +{todayRecord.lateMinutes}m {t('home.lateLabel', 'Late')}
              </span>
            ) : null}
          </div>

          <div className="bg-slate-50/80 dark:bg-dark-elevated/60 p-3 rounded-xl border border-slate-100 dark:border-dark-border/60">
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('home.checkOutTime', 'Check-Out')}
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {todayRecord?.checkOutAt
                ? new Date(todayRecord.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '— : —'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 font-normal">
              {isCheckedOut
                ? t('home.completed', 'Completed')
                : isCheckedIn
                ? t('home.workingShift', 'Working Shift')
                : t('home.awaitingPunch', 'Awaiting Punch')}
            </span>
          </div>
        </div>

        {/* Live Progress Bar if checked in */}
        {isCheckedIn && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                {t('home.workedDuration', 'Worked Duration')}
              </span>
              <span className="font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                {liveWorkedTime} / 8h
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-dark-elevated h-2 rounded-full overflow-hidden">
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
          className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all"
        >
          <QrCode className="w-4 h-4 stroke-[2.2]" />
          <span>{t('home.scanAttendance', 'Scan Attendance QR')}</span>
        </Link>
      </Card>

      {/* 3. Monthly Metrics & Performance KPI Grid */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('home.monthlyOverview', 'Monthly Overview')}
          </h2>
          <Link to="/attendance" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            {t('common.viewAll', 'View All')}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Days Present */}
          <Card padding="sm" className="p-3.5 border border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {t('home.present', 'Present')}
              </span>
              <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {presentDays} <span className="text-xs font-normal text-slate-400">{t('home.days', 'Days')}</span>
            </p>
          </Card>

          {/* On-Time Rate */}
          <Card padding="sm" className="p-3.5 border border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {t('home.onTime', 'On-Time')}
              </span>
              <div className="p-1 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {onTimeRate}%
            </p>
          </Card>

          {/* Total Worked Hours */}
          <Card padding="sm" className="p-3.5 border border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {t('home.totalHours', 'Total Hours')}
              </span>
              <div className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Hourglass className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalWorkedHours}h
            </p>
          </Card>

          {/* Annual Leave Available (Fixed NaNd bug) */}
          <Card padding="sm" className="p-3.5 border border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {t('home.leaveBalance', 'Leave Balance')}
              </span>
              <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <CalendarDays className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {annualRemaining} <span className="text-xs font-normal text-slate-400">d</span>
            </p>
          </Card>
        </div>
      </div>

      {/* 4. Today's Working Schedule Timeline */}
      <Card className="p-4 border border-slate-100 dark:border-dark-border space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('home.shiftSchedule', "Today's Shift Schedule")}
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-dark-elevated/50 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
              {t('home.morningStart', 'Morning Start')}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5 block">
              08:00 AM
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-dark-elevated/50 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
              {t('home.lunchBreak', 'Lunch Break')}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5 block">
              12:00 – 13:00
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-dark-elevated/50 border border-slate-100 dark:border-dark-border/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
              {t('home.shiftEnd', 'Shift End')}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5 block">
              05:00 PM
            </span>
          </div>
        </div>
      </Card>

      {/* 5. Self-Service Quick Action Portals */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('home.selfService', 'Quick Actions')}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/leave">
            <Card
              padding="sm"
              className="p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-3 border border-slate-100 dark:border-dark-border"
            >
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex-shrink-0">
                <CalendarOff className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                  {t('home.applyLeave', 'Apply Leave')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block truncate">
                  {annualRemaining} {t('home.daysRemaining', 'days left')}
                </span>
              </div>
            </Card>
          </Link>

          <Link to="/out">
            <Card
              padding="sm"
              className="p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-3 border border-slate-100 dark:border-dark-border"
            >
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex-shrink-0">
                <DoorOpen className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                  {t('home.outPermission', 'Out Permission')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block truncate">
                  {t('home.outPermissionDesc', 'Temporary exit')}
                </span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};
