import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Hourglass,
} from 'lucide-react';

interface AttendanceEntry {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  checkInDistanceMeters?: number;
  notes?: string;
}

export const AttendanceCalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<AttendanceEntry | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: records, isLoading } = useQuery<AttendanceEntry[]>({
    queryKey: ['myAttendance', year, month],
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/my-history?year=${year}&month=${month}`);
      const data = res.data.data;
      return Array.isArray(data) ? data : data?.records || [];
    },
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 2, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate summary counters
  const presentCount = records?.filter((r) => r.status === 'PRESENT').length || 0;
  const lateCount = records?.filter((r) => r.status === 'LATE').length || 0;
  const absentCount = records?.filter((r) => r.status === 'ABSENT').length || 0;
  const leaveCount = records?.filter((r) => r.status === 'ON_LEAVE').length || 0;

  return (
    <div className="space-y-4">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Attendance Logs</h1>

        <div className="flex items-center gap-1 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl p-1 shadow-xs">
          <button
            onClick={prevMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-surface rounded-lg transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 px-2 min-w-[110px] text-center font-mono">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-surface rounded-lg transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly KPI Summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <Card padding="sm" className="space-y-0.5 border border-slate-200/80 dark:border-dark-border">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">Present</span>
          <span className="text-base font-bold text-success-600 dark:text-success-400 font-mono">{presentCount}</span>
        </Card>
        <Card padding="sm" className="space-y-0.5 border border-slate-200/80 dark:border-dark-border">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">Late</span>
          <span className="text-base font-bold text-warning-600 dark:text-warning-400 font-mono">{lateCount}</span>
        </Card>
        <Card padding="sm" className="space-y-0.5 border border-slate-200/80 dark:border-dark-border">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">Absent</span>
          <span className="text-base font-bold text-danger-600 dark:text-danger-400 font-mono">{absentCount}</span>
        </Card>
        <Card padding="sm" className="space-y-0.5 border border-slate-200/80 dark:border-dark-border">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">Leave</span>
          <span className="text-base font-bold text-brand-600 dark:text-brand-400 font-mono">{leaveCount}</span>
        </Card>
      </div>

      {/* Attendance History List */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Daily Records
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Attendance Logs"
            description="No punches or records found for this selected month."
          />
        ) : (
          <div className="space-y-2">
            {records.map((entry) => {
              const dateObj = new Date(entry.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <Card
                  key={entry.id || entry.date}
                  padding="sm"
                  className="hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors border border-slate-200/90 dark:border-dark-border"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {formattedDate}
                        </span>
                        <Badge status={entry.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>
                          In: {entry.checkInAt ? new Date(entry.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        <span>•</span>
                        <span>
                          Out: {entry.checkOutAt ? new Date(entry.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 block">
                        {Math.floor((entry.workedMinutes || 0) / 60)}h {(entry.workedMinutes || 0) % 60}m
                      </span>
                      {entry.lateMinutes > 0 && (
                        <span className="text-[10px] text-warning-600 dark:text-warning-400 block font-semibold">
                          +{entry.lateMinutes}m late
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title="Attendance Punch Details"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
              <div>
                <p className="text-[11px] text-slate-400">Date</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Badge status={selectedEntry.status} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-dark-elevated rounded-xl border border-slate-100 dark:border-dark-border">
                <span className="text-slate-400 block mb-0.5">Punch In</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedEntry.checkInAt
                    ? new Date(selectedEntry.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Not recorded'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-dark-elevated rounded-xl border border-slate-100 dark:border-dark-border">
                <span className="text-slate-400 block mb-0.5">Punch Out</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedEntry.checkOutAt
                    ? new Date(selectedEntry.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Not recorded'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Worked:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {Math.floor((selectedEntry.workedMinutes || 0) / 60)}h {(selectedEntry.workedMinutes || 0) % 60}m
                </span>
              </div>

              {selectedEntry.lateMinutes > 0 && (
                <div className="flex items-center justify-between text-warning-600 dark:text-warning-400">
                  <span>Late Arrival:</span>
                  <span className="font-mono font-bold">+{selectedEntry.lateMinutes} minutes</span>
                </div>
              )}

              {selectedEntry.checkInDistanceMeters !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location Accuracy:</span>
                  <span className="font-semibold text-success-600 dark:text-success-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified ({Math.round(selectedEntry.checkInDistanceMeters)}m from HQ)
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
