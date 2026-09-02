import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import {
  CalendarClock,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Globe,
} from 'lucide-react';

interface ScheduleDay {
  id?: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

interface Schedule {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  isDefault: boolean;
  days: ScheduleDay[];
  _count?: {
    employees: number;
  };
}

export const SchedulesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const defaultDays: ScheduleDay[] = [
    { dayOfWeek: 'MONDAY', isWorkingDay: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'TUESDAY', isWorkingDay: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'WEDNESDAY', isWorkingDay: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'THURSDAY', isWorkingDay: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'FRIDAY', isWorkingDay: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'SATURDAY', isWorkingDay: true, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek: 'SUNDAY', isWorkingDay: false, startTime: '08:00', endTime: '17:00' },
  ];

  const [form, setForm] = useState({
    name: '',
    description: '',
    timezone: 'Asia/Phnom_Penh',
    isDefault: false,
    days: defaultDays,
  });

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ['adminSchedules'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/schedules');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingSchedule) {
        return await apiClient.put(`/admin/schedules/${editingSchedule.id}`, payload);
      }
      return await apiClient.post('/admin/schedules', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSchedules'] });
      setIsModalOpen(false);
      setEditingSchedule(null);
      showToast('Work schedule saved successfully.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to save schedule.', 'error');
    },
  });

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setForm({
      name: '',
      description: '',
      timezone: 'Asia/Phnom_Penh',
      isDefault: false,
      days: defaultDays,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sch: Schedule) => {
    setEditingSchedule(sch);
    setForm({
      name: sch.name,
      description: sch.description || '',
      timezone: sch.timezone || 'Asia/Phnom_Penh',
      isDefault: sch.isDefault,
      days: sch.days.length > 0 ? sch.days : defaultDays,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Work Schedules</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company work shifts, working days, working hours, and grace periods
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          Create Shift Schedule
        </Button>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))
        ) : !schedules || schedules.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={CalendarClock}
              title="No work schedules"
              description="Create a work schedule to assign to employees."
            />
          </div>
        ) : (
          schedules.map((sch) => (
            <Card key={sch.id} className="p-5 space-y-4 flex flex-col justify-between border border-slate-200 dark:border-dark-border">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{sch.name}</h3>
                      {sch.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{sch.description || 'No description'}</p>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(sch)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-dark-elevated rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sch.timezone}</span>
                </div>

                {/* Days Pill Preview */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Weekly Schedule
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {sch.days.map((d) => (
                      <div
                        key={d.dayOfWeek}
                        className={`text-center py-1 rounded-md text-[10px] font-bold ${
                          d.isWorkingDay
                            ? 'bg-success-50 dark:bg-success-950/50 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800'
                            : 'bg-slate-100 dark:bg-dark-elevated text-slate-400'
                        }`}
                        title={`${d.dayOfWeek}: ${d.isWorkingDay ? `${d.startTime}-${d.endTime}` : 'Off'}`}
                      >
                        {d.dayOfWeek.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{sch._count?.employees || 0} employees assigned</span>
                <button
                  onClick={() => handleOpenEdit(sch)}
                  className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                >
                  Configure Details →
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Schedule Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Edit Work Schedule' : 'Create Work Schedule'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Schedule Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Standard Mon-Sat Shift"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Standard office working hours 8am to 5pm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Set as Default Schedule</span>
              <span className="text-[11px] text-slate-500 block">
                Automatically assigned to newly onboarded staff
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
          </div>

          {/* Days Configuration Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Day Shift Hours</span>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {form.days.map((d, index) => (
                <div key={d.dayOfWeek} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 w-28">
                    <input
                      type="checkbox"
                      checked={d.isWorkingDay}
                      onChange={(e) => {
                        const updated = [...form.days];
                        updated[index].isWorkingDay = e.target.checked;
                        setForm({ ...form, days: updated });
                      }}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-bold text-slate-800 capitalize">
                      {d.dayOfWeek.toLowerCase()}
                    </span>
                  </div>

                  {d.isWorkingDay ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={d.startTime}
                        onChange={(e) => {
                          const updated = [...form.days];
                          updated[index].startTime = e.target.value;
                          setForm({ ...form, days: updated });
                        }}
                        className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={d.endTime}
                        onChange={(e) => {
                          const updated = [...form.days];
                          updated[index].endTime = e.target.value;
                          setForm({ ...form, days: updated });
                        }}
                        className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Rest Day (Non-working)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={saveMutation.isPending}>
              Save Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
