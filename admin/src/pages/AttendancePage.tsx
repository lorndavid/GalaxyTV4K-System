import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import {
  Clock3,
  Search,
  Edit3,
  MapPin,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Users,
  RefreshCw,
  Clock,
  Building2,
  Sparkles,
  User,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  checkInDistanceMeters?: number | null;
  checkInAccuracy?: number | null;
  notes?: string | null;
  dutyType?: 'WORK' | 'STUDY' | 'LEAVE';
  dutyLabel?: string;
  isStudyDay?: boolean;
  studyDay?: string;
  isVirtual?: boolean;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    khmerName?: string;
    latinName?: string;
    studyDay?: string;
    department?: { name: string };
  };
}

const KHMER_DAYS = [
  'ថ្ងៃអាទិត្យ',
  'ថ្ងៃច័ន្ទ',
  'ថ្ងៃអង្គារ',
  'ថ្ងៃពុធ',
  'ថ្ងៃព្រហស្បតិ៍',
  'ថ្ងៃសុក្រ',
  'ថ្ងៃសៅរ៍',
];

const KHMER_MONTHS = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

const toKhmerNumber = (num: number | string) => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
};

export const AttendancePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [activeTab, setActiveTab] = useState<'WORK' | 'STUDY' | 'ALL'>('WORK');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT',
    reason: '',
  });

  // Query Daily Unified Roster with live auto-refresh
  const {
    data: records,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceDaily', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/daily?date=${selectedDate}`);
      return res.data.data;
    },
    refetchInterval: autoRefresh ? 4000 : false, // Auto-update every 4s when active
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof adjustForm }) => {
      const checkInAt = payload.checkInTime
        ? `${selectedDate}T${payload.checkInTime}:00+07:00`
        : null;
      const checkOutAt = payload.checkOutTime
        ? `${selectedDate}T${payload.checkOutTime}:00+07:00`
        : null;

      return await apiClient.put(`/admin/attendance/${id}/manual-adjust`, {
        employeeId: selectedRecord?.employee.id,
        date: selectedDate,
        checkInAt,
        checkOutAt,
        status: payload.status,
        reason: payload.reason,
        notes: payload.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceDaily', selectedDate] });
      setIsAdjustModalOpen(false);
      setSelectedRecord(null);
      showToast(t('attendance.adjust.success'));
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to adjust attendance.', 'error');
    },
  });

  const openAdjust = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    const getHHMM = (iso?: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    setAdjustForm({
      checkInTime: getHHMM(record.checkInAt),
      checkOutTime: getHHMM(record.checkOutAt),
      status: record.status === 'NOT_CHECKED_IN' ? 'PRESENT' : record.status,
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  // Compute Clean Date Title based on active language
  const formattedDateTitle = useMemo(() => {
    try {
      const parts = selectedDate.split('-').map((p) => parseInt(p, 10));
      const d = new Date(parts[0], parts[1] - 1, parts[2]);

      if (isKhmer) {
        const dayName = KHMER_DAYS[d.getDay()] || '';
        const dayNum = toKhmerNumber(d.getDate().toString().padStart(2, '0'));
        const monthName = KHMER_MONTHS[d.getMonth()] || '';
        const yearNum = toKhmerNumber(d.getFullYear());
        return `${dayName} ទី ${dayNum} ខែ${monthName} ឆ្នាំ ${yearNum}`;
      }

      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate, isKhmer]);

  // Tab & Count Calculations
  const counts = useMemo(() => {
    if (!records) {
      return { total: 0, work: 0, study: 0, checkedIn: 0, pending: 0 };
    }
    const total = records.length;
    const work = records.filter((r) => r.dutyType === 'WORK').length;
    const study = records.filter((r) => r.dutyType === 'STUDY').length;
    const checkedIn = records.filter((r) => !!r.checkInAt).length;
    const pending = records.filter(
      (r) => r.dutyType === 'WORK' && (!r.checkInAt || r.status === 'NOT_CHECKED_IN')
    ).length;

    return { total, work, study, checkedIn, pending };
  }, [records]);

  // Filtering based on active tab, search, and status
  const filteredRecords = useMemo(() => {
    if (!records) return [];

    return records.filter((r) => {
      // Tab filter
      if (activeTab === 'WORK' && r.dutyType !== 'WORK') return false;
      if (activeTab === 'STUDY' && r.dutyType !== 'STUDY') return false;

      // Status filter
      if (statusFilter && r.status !== statusFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const khName = (r.employee.khmerName || '').toLowerCase();
        const latName = (r.employee.latinName || '').toLowerCase();
        const dispName = (r.employee.displayName || '').toLowerCase();
        const dept = (r.employee.department?.name || '').toLowerCase();

        const match =
          khName.includes(query) ||
          latName.includes(query) ||
          dispName.includes(query) ||
          dept.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [records, activeTab, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {t('attendance.title')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t('attendance.liveAutoSync')}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formattedDateTitle}
            </span>{' '}
            • {t('attendance.subtitle')}
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(getTodayStr())}
            className={`font-bold ${
              selectedDate === getTodayStr()
                ? 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-950/30'
                : ''
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-500" />
            {t('attendance.today')}
          </Button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-1.5 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:border-brand-300 transition-colors shadow-2xs"
            title={t('attendance.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-3.5 bg-gradient-to-br from-slate-50 to-white dark:from-dark-elevated dark:to-dark border border-slate-200/80 dark:border-dark-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('attendance.stats.totalStaff')}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {counts.total}
            </span>
            <span className="text-xs text-slate-400">{t('attendance.stats.people')}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {t('attendance.stats.totalDesc')}
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-dark border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {t('attendance.stats.workingToday')}
            </span>
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {counts.work}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {t('attendance.stats.people')}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {t('attendance.stats.workingDesc')}
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/20 dark:to-dark border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
              {t('attendance.stats.studyingToday')}
            </span>
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
              {counts.study}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              {t('attendance.stats.people')}
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            {t('attendance.stats.studyingDesc')}
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-teal-50/70 to-white dark:from-teal-950/20 dark:to-dark border border-teal-200/80 dark:border-teal-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
              {t('attendance.stats.checkedIn')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
              {counts.checkedIn}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400">
              {t('attendance.stats.people')}
            </span>
          </div>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5 block">
            {t('attendance.stats.checkedInDesc')}
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-dark border border-amber-200/80 dark:border-amber-800/60 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {t('attendance.stats.pendingScan')}
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {counts.pending}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {t('attendance.stats.people')}
            </span>
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 block">
            {t('attendance.stats.pendingScanDesc')}
          </span>
        </Card>
      </div>

      {/* Clean Primary Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-dark-border pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab('WORK')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'WORK'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                : 'bg-white dark:bg-dark-elevated text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-border/60 border border-slate-200/80 dark:border-dark-border'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{t('attendance.tabs.workingToday')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'WORK'
                  ? 'bg-emerald-800/80 text-emerald-100'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {counts.work}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUDY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'STUDY'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                : 'bg-white dark:bg-dark-elevated text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-border/60 border border-slate-200/80 dark:border-dark-border'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{t('attendance.tabs.studyingToday')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'STUDY'
                  ? 'bg-indigo-800/80 text-indigo-100'
                  : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
              }`}
            >
              {counts.study}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-dark-elevated text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-border/60 border border-slate-200/80 dark:border-dark-border'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('attendance.tabs.all')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {counts.total}
            </span>
          </button>
        </div>

        {/* Live Auto-Refresh Toggle */}
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-3.5 h-3.5 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <span>{t('attendance.autoUpdateLabel')}</span>
        </label>
      </div>

      {/* Filter and Search Bar */}
      <Card
        padding="sm"
        className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 border border-slate-200/80 dark:border-dark-border rounded-2xl"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('attendance.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs py-2 px-3 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
        >
          <option value="">{t('attendance.filterStatus')}</option>
          <option value="PRESENT">{t('status.PRESENT')}</option>
          <option value="LATE">{t('status.LATE')}</option>
          <option value="NOT_CHECKED_IN">{t('status.NOT_CHECKED_IN')}</option>
          <option value="EARLY_LEAVE">{t('status.EARLY_LEAVE')}</option>
          <option value="ON_LEAVE">{t('status.ON_LEAVE')}</option>
          <option value="ABSENT">{t('status.ABSENT')}</option>
          <option value="MANUAL_ADJUSTMENT">{t('status.MANUAL_ADJUSTMENT')}</option>
        </select>
      </Card>

      {/* Main Table / Roster View */}
      <Card
        padding="none"
        className="overflow-hidden border border-slate-200/80 dark:border-dark-border rounded-2xl shadow-2xs"
      >
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : !filteredRecords || filteredRecords.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title={
              activeTab === 'WORK'
                ? t('attendance.emptyWork')
                : activeTab === 'STUDY'
                ? t('attendance.emptyStudy')
                : t('attendance.emptyGeneral')
            }
            description={t('attendance.emptyDesc')}
          />
        ) : (
          <>
            {/* Desktop Table View - CLEAN, NO EMPLOYEE ID */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">{t('attendance.table.num')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.employee')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.department')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.duty')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.checkIn')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.checkOut')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.worked')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.gps')}</th>
                    <th className="py-3.5 px-4">{t('attendance.table.status')}</th>
                    <th className="py-3.5 px-4 text-right">{t('attendance.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {filteredRecords.map((r, index) => {
                    const workedH = Math.floor((r.workedMinutes || 0) / 60);
                    const workedM = (r.workedMinutes || 0) % 60;
                    const isInside = (r.checkInDistanceMeters || 0) <= 30;

                    // Clean names based on language
                    const primaryName = isKhmer
                      ? r.employee.khmerName || r.employee.displayName
                      : r.employee.latinName || r.employee.displayName;
                    const secondaryName = isKhmer
                      ? r.employee.latinName
                      : r.employee.khmerName;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-elevated/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {index + 1}
                        </td>

                        {/* Employee: Clean Avatar + Name ONLY (NO ID) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/15 to-brand-600/5 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-2xs border border-brand-500/20">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {primaryName}
                              </div>
                              {secondaryName && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {secondaryName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-dark-elevated px-2.5 py-1 rounded-lg">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {r.employee.department?.name || '—'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {r.dutyType === 'WORK' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Briefcase className="w-3 h-3" />
                                {t('attendance.duty.work')}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {r.studyDay && r.studyDay !== 'គ្មាន' && r.studyDay !== 'None'
                                  ? t('attendance.duty.studyDays', { days: r.studyDay })
                                  : t('attendance.duty.fullTime')}
                              </div>
                            </div>
                          ) : r.dutyType === 'STUDY' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <GraduationCap className="w-3 h-3" />
                                {t('attendance.duty.study')}
                              </span>
                              <div className="text-[10px] text-indigo-500/80 mt-0.5">
                                {r.studyDay}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {r.dutyLabel || t('attendance.duty.leave')}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {r.checkInAt ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] border border-emerald-200/60">
                              {new Date(r.checkInAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              — {t('attendance.pending')}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {r.checkOutAt ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-dark-elevated px-2 py-0.5 rounded text-[11px]">
                              {new Date(r.checkOutAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {r.workedMinutes > 0 ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {workedH}h {workedM}m
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {r.checkInDistanceMeters !== null &&
                          r.checkInDistanceMeters !== undefined ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                isInside
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200'
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                              {Math.round(r.checkInDistanceMeters)}m{' '}
                              {isInside ? `(${t('attendance.gps.inside')})` : `(${t('attendance.gps.outside')})`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge status={r.status} size="sm" />
                          {r.lateMinutes > 0 && (
                            <span className="ml-1.5 text-[10px] font-bold text-warning-600 dark:text-warning-400">
                              +{r.lateMinutes}m
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <IconButton
                            icon={Edit3}
                            label={t('common.edit')}
                            variant="primary"
                            onClick={() => openAdjust(r)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View - CLEAN, NO EMPLOYEE ID */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-dark-border">
              {filteredRecords.map((r, index) => {
                const workedH = Math.floor((r.workedMinutes || 0) / 60);
                const workedM = (r.workedMinutes || 0) % 60;
                const isInside = (r.checkInDistanceMeters || 0) <= 30;

                const primaryName = isKhmer
                  ? r.employee.khmerName || r.employee.displayName
                  : r.employee.latinName || r.employee.displayName;
                const secondaryName = isKhmer
                  ? r.employee.latinName
                  : r.employee.khmerName;

                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {primaryName}
                          </div>
                          {secondaryName && (
                            <div className="text-xs text-slate-400 font-medium">
                              {secondaryName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge status={r.status} size="sm" />
                        {r.dutyType === 'WORK' ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            💼 {t('attendance.duty.work')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            🎓 {t('attendance.duty.study')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-dark-elevated p-2.5 rounded-xl border border-slate-100 dark:border-dark-border text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {t('attendance.table.checkIn')}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {r.checkInAt
                            ? new Date(r.checkInAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : `— ${t('attendance.pending')}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {t('attendance.table.checkOut')}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {r.checkOutAt
                            ? new Date(r.checkOutAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {t('attendance.table.worked')}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {r.workedMinutes ? `${workedH}h ${workedM}m` : '—'}
                        </span>
                      </div>
                    </div>

                    {r.checkInDistanceMeters !== null && r.checkInDistanceMeters !== undefined && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-brand-500" />
                          {t('attendance.table.gps')}: {Math.round(r.checkInDistanceMeters)}m
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isInside
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isInside ? `✓ ${t('attendance.gps.inside')}` : `⚠ ${t('attendance.gps.outside')}`}
                        </span>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Edit3}
                      className="w-full"
                      onClick={() => openAdjust(r)}
                    >
                      {t('attendance.table.actions')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Manual Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={t('attendance.adjust.title')}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedRecord) {
              adjustMutation.mutate({
                id: selectedRecord.id,
                payload: adjustForm,
              });
            }
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-xl text-xs text-brand-900 dark:text-brand-300">
            {t('attendance.adjust.notice', {
              name: isKhmer
                ? selectedRecord?.employee.khmerName || selectedRecord?.employee.displayName
                : selectedRecord?.employee.latinName || selectedRecord?.employee.displayName,
              date: selectedDate,
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('attendance.adjust.checkIn')}
              </label>
              <input
                type="time"
                value={adjustForm.checkInTime}
                onChange={(e) => setAdjustForm({ ...adjustForm, checkInTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('attendance.adjust.checkOut')}
              </label>
              <input
                type="time"
                value={adjustForm.checkOutTime}
                onChange={(e) => setAdjustForm({ ...adjustForm, checkOutTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('attendance.adjust.statusOverride')}
            </label>
            <select
              value={adjustForm.status}
              onChange={(e) => setAdjustForm({ ...adjustForm, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="PRESENT">{t('status.PRESENT')}</option>
              <option value="LATE">{t('status.LATE')}</option>
              <option value="EARLY_LEAVE">{t('status.EARLY_LEAVE')}</option>
              <option value="ON_LEAVE">{t('status.ON_LEAVE')}</option>
              <option value="ABSENT">{t('status.ABSENT')}</option>
              <option value="MANUAL_ADJUSTMENT">{t('status.MANUAL_ADJUSTMENT')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('attendance.adjust.reason')} <span className="text-danger-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={t('attendance.adjust.reasonPlaceholder')}
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsAdjustModalOpen(false)}>
              {t('attendance.adjust.cancel')}
            </Button>
            <Button variant="primary" size="md" isLoading={adjustMutation.isPending}>
              {t('attendance.adjust.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
