import React, { useState } from 'react';
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
  Calendar,
  Search,
  Edit3,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  checkInDistanceMeters?: number;
  checkInAccuracy?: number;
  notes?: string;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    department?: { name: string };
  };
}

export const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT',
    reason: '',
  });

  const { data: records, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceDaily', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/daily?date=${selectedDate}`);
      return res.data.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof adjustForm }) => {
      return await apiClient.put(`/admin/attendance/${id}/manual-adjust`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceDaily', selectedDate] });
      setIsAdjustModalOpen(false);
      setSelectedRecord(null);
      showToast('Attendance record adjusted and logged to audit trail.');
    },
  });

  const openAdjust = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    const getHHMM = (iso?: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    setAdjustForm({
      checkInTime: getHHMM(record.checkInAt),
      checkOutTime: getHHMM(record.checkOutAt),
      status: record.status,
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  const filtered = records?.filter((r) => {
    const matchesSearch =
      r.employee.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Attendance Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor daily check-ins, verify geofence distance signals, and adjust records with audit reasons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <Card padding="sm" className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 border border-slate-200 dark:border-dark-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name or ID code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs py-2 px-3 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late</option>
          <option value="ABSENT">Absent</option>
          <option value="EARLY_LEAVE">Early Leave</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
        </select>
      </Card>

      {/* Main Table */}
      <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="No records found for this date"
            description="Employees who have not checked in or are not scheduled will not appear as present."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Worked</th>
                    <th className="py-3.5 px-4">GPS Verification</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {filtered.map((r) => {
                    const workedH = Math.floor((r.workedMinutes || 0) / 60);
                    const workedM = (r.workedMinutes || 0) % 60;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{r.employee.displayName}</div>
                          <div className="text-xs text-slate-400">{r.employee.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {r.employee.department?.name || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {r.checkInAt
                            ? new Date(r.checkInAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {r.checkOutAt
                            ? new Date(r.checkOutAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {r.workedMinutes ? `${workedH}h ${workedM}m` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {r.checkInDistanceMeters !== undefined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-brand-500" />
                              {Math.round(r.checkInDistanceMeters)}m (±{Math.round(r.checkInAccuracy || 0)}m)
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={r.status} size="sm" />
                          {r.lateMinutes > 0 && (
                            <span className="ml-1.5 text-[11px] font-bold text-warning-600 dark:text-warning-400">
                              +{r.lateMinutes}m
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <IconButton
                            icon={Edit3}
                            label="Adjust Attendance Record"
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((r) => {
                const workedH = Math.floor((r.workedMinutes || 0) / 60);
                const workedM = (r.workedMinutes || 0) % 60;

                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{r.employee.displayName}</div>
                        <div className="font-mono text-xs text-slate-500">{r.employee.employeeCode}</div>
                      </div>
                      <Badge status={r.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Check-In</span>
                        <span className="font-mono font-medium text-slate-800">
                          {r.checkInAt
                            ? new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Check-Out</span>
                        <span className="font-mono font-medium text-slate-800">
                          {r.checkOutAt
                            ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Worked</span>
                        <span className="font-mono font-medium text-slate-800">
                          {r.workedMinutes ? `${workedH}h ${workedM}m` : '—'}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Edit3}
                      className="w-full"
                      onClick={() => openAdjust(r)}
                    >
                      Adjust Record
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
        title="Manual Attendance Adjustment"
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
          <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-800">
            Adjusting record for <span className="font-bold">{selectedRecord?.employee.displayName}</span> on {selectedRecord?.date}. All edits are logged in the immutable audit trail.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-In Time</label>
              <input
                type="time"
                value={adjustForm.checkInTime}
                onChange={(e) => setAdjustForm({ ...adjustForm, checkInTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-Out Time</label>
              <input
                type="time"
                value={adjustForm.checkOutTime}
                onChange={(e) => setAdjustForm({ ...adjustForm, checkOutTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Override</label>
            <select
              value={adjustForm.status}
              onChange={(e) => setAdjustForm({ ...adjustForm, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EARLY_LEAVE">Early Leave</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Reason / Explanation <span className="text-danger-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Employee forgot phone at home, approved by department head..."
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={adjustMutation.isPending}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
