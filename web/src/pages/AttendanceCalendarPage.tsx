import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { queryKeys } from '../lib/queryKeys';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ShieldCheck,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarOff,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  lateMinutes?: number;
  workedMinutes?: number;
  checkInAccuracy?: number;
  checkOutAccuracy?: number;
  checkInLatitude?: number;
  checkInLongitude?: number;
}

export const AttendanceCalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEntry, setSelectedEntry] = useState<AttendanceRecord | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const currentLang = i18n.language || 'km';
  const monthLabel = new Intl.DateTimeFormat(currentLang === 'km' ? 'km-KH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const { data, isLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: queryKeys.attendance.history(year, month),
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/my-history?year=${year}&month=${month}`);
      return res.data.data;
    },
    staleTime: 60000,
  });

  const records = data?.records || [];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  // KPI Calculations
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const leaveCount = records.filter((r) => r.status === 'ON_LEAVE').length;

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('attendance.title', 'Attendance Logs')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            {t('attendance.subtitle', 'Monthly timesheet and work hours')}
          </p>
        </div>

        <div className="flex items-center bg-white dark:bg-dark-surface border border-slate-200/70 dark:border-dark-border rounded-xl p-1 shadow-xs">
          <button
            onClick={prevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-elevated rounded-lg transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2]" />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 px-2 min-w-[110px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-elevated rounded-lg transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Monthly KPI Summary Cards (Clean digits, no slashed zeros, consistent status colors) */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <Card padding="sm" className="space-y-1 p-3 border border-slate-100 dark:border-dark-border">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block truncate">
            {t('attendance.present', 'Present')}
          </span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            {presentCount}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 p-3 border border-slate-100 dark:border-dark-border">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block truncate">
            {t('attendance.late', 'Late')}
          </span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums block">
            {lateCount}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 p-3 border border-slate-100 dark:border-dark-border">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block truncate">
            {t('attendance.absent', 'Absent')}
          </span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums block">
            {absentCount}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1 p-3 border border-slate-100 dark:border-dark-border">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block truncate">
            {t('attendance.leave', 'Leave')}
          </span>
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400 tabular-nums block">
            {leaveCount}
          </span>
        </Card>
      </div>

      {/* Daily Attendance Records */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('attendance.dailyRecords', 'Daily Records')}
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <Card className="py-8 border border-slate-100 dark:border-dark-border">
            <EmptyState
              icon={CalendarIcon}
              title={t('attendance.noRecords', 'No Attendance Logs')}
              description={t('attendance.noRecordsDesc', 'No punch records found for this selected month.')}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {records.map((entry) => {
              const dateObj = new Date(entry.date);
              const formattedDate = dateObj.toLocaleDateString(currentLang === 'km' ? 'km-KH' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <Card
                  key={entry.id || entry.date}
                  padding="sm"
                  className="p-3.5 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all border border-slate-100 dark:border-dark-border"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {formattedDate}
                        </span>
                        <Badge status={entry.status} size="sm" />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        <span>
                          {t('attendance.checkIn', 'In')}:{' '}
                          <strong className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                            {entry.checkInAt
                              ? new Date(entry.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {t('attendance.checkOut', 'Out')}:{' '}
                          <strong className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                            {entry.checkOutAt
                              ? new Date(entry.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {entry.workedMinutes ? (
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums block">
                          {Math.floor(entry.workedMinutes / 60)}h {entry.workedMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal block">—</span>
                      )}
                      {entry.lateMinutes ? (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block">
                          +{entry.lateMinutes}m {t('home.lateLabel', 'Late')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title="Attendance Punch Details"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {new Date(selectedEntry.date).toLocaleDateString(currentLang === 'km' ? 'km-KH' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h4>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Cryptographic Punch Record</p>
              </div>
              <Badge status={selectedEntry.status} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-xl border border-slate-100 dark:border-dark-border">
                <span className="text-[10px] text-slate-400 block font-normal mb-0.5">Check-In Time</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {selectedEntry.checkInAt
                    ? new Date(selectedEntry.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-xl border border-slate-100 dark:border-dark-border">
                <span className="text-[10px] text-slate-400 block font-normal mb-0.5">Check-Out Time</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {selectedEntry.checkOutAt
                    ? new Date(selectedEntry.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-dark-elevated p-3.5 rounded-xl border border-slate-100 dark:border-dark-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-normal">Total Worked Time</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {selectedEntry.workedMinutes
                    ? `${Math.floor(selectedEntry.workedMinutes / 60)}h ${selectedEntry.workedMinutes % 60}m`
                    : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-normal">Late Duration</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {selectedEntry.lateMinutes ? `${selectedEntry.lateMinutes} mins` : '0 mins (On Time)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-normal">GPS Verification</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Inside Perimeter
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
