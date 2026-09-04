import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import {
  CalendarClock,
  Plus,
  Clock,
  Edit2,
  Globe,
  Sparkles,
  Utensils,
  CheckCircle2,
} from 'lucide-react';

interface ScheduleDay {
  id?: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
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

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const DAY_LABELS_KH: Record<string, string> = {
  MONDAY: 'ច័ន្ទ',
  TUESDAY: 'អង្គារ',
  WEDNESDAY: 'ពុធ',
  THURSDAY: 'ព្រហស្បតិ៍',
  FRIDAY: 'សុក្រ',
  SATURDAY: 'សៅរ៍',
  SUNDAY: 'អាទិត្យ',
};

export const SchedulesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Standard Company Policy: Monday to Sunday, 08:00 to 17:30, Lunch 11:30 to 13:00
  const defaultStandardDays: ScheduleDay[] = DAYS_ORDER.map((day) => ({
    dayOfWeek: day,
    isWorkingDay: true,
    startTime: '08:00',
    endTime: '17:30',
    breakStartTime: '11:30',
    breakEndTime: '13:00',
  }));

  const [form, setForm] = useState({
    name: 'កាលវិភាគស្តង់ដារ (Standard 7-Day Shift)',
    description: 'ម៉ោងធ្វើការរាល់ថ្ងៃ ច័ន្ទ ដល់ អាទិត្យ (8:00 AM - 5:30 PM • បាយថ្ងៃត្រង់ 11:30 AM - 1:00 PM)',
    timezone: 'Asia/Phnom_Penh',
    isDefault: true,
    days: defaultStandardDays,
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
      showToast('កាលវិភាគការងារត្រូវបានរក្សាទុកដោយជោគជ័យ (Work schedule saved successfully).');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to save schedule.', 'error');
    },
  });

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setForm({
      name: 'កាលវិភាគស្តង់ដារ (Standard 7-Day Shift)',
      description: 'ម៉ោងធ្វើការរាល់ថ្ងៃ ច័ន្ទ ដល់ អាទិត្យ (8:00 AM - 5:30 PM • បាយថ្ងៃត្រង់ 11:30 AM - 1:00 PM)',
      timezone: 'Asia/Phnom_Penh',
      isDefault: false,
      days: defaultStandardDays,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sch: Schedule) => {
    setEditingSchedule(sch);

    // Merge existing days with all 7 days to guarantee Monday-Sunday are present
    const existingDaysMap = new Map(sch.days.map((d) => [d.dayOfWeek, d]));
    const mergedDays: ScheduleDay[] = DAYS_ORDER.map((day) => {
      const existing = existingDaysMap.get(day);
      if (existing) {
        return {
          ...existing,
          breakStartTime: existing.breakStartTime || '11:30',
          breakEndTime: existing.breakEndTime || '13:00',
        };
      }
      return {
        dayOfWeek: day,
        isWorkingDay: true,
        startTime: '08:00',
        endTime: '17:30',
        breakStartTime: '11:30',
        breakEndTime: '13:00',
      };
    });

    setForm({
      name: sch.name,
      description: sch.description || '',
      timezone: sch.timezone || 'Asia/Phnom_Penh',
      isDefault: sch.isDefault,
      days: mergedDays,
    });
    setIsModalOpen(true);
  };

  const applyStandardTemplate = () => {
    setForm((prev) => ({
      ...prev,
      days: DAYS_ORDER.map((day) => ({
        dayOfWeek: day,
        isWorkingDay: true,
        startTime: '08:00',
        endTime: '17:30',
        breakStartTime: '11:30',
        breakEndTime: '13:00',
      })),
    }));
    showToast('បានកំណត់ម៉ោងស្តង់ដារ 8:00 AM - 5:30 PM និងបាយថ្ងៃត្រង់ 11:30 - 1:00 PM សម្រាប់គ្រប់ថ្ងៃ!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                កាលវិភាគការងារ (Work Schedules)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                គ្រប់គ្រងម៉ោងធ្វើការ ស្តង់ដារ ច័ន្ទ ដល់ អាទិត្យ (8:00 AM - 5:30 PM) និងម៉ោងបាយថ្ងៃត្រង់ (11:30 AM - 1:00 PM)
              </p>
            </div>
          </div>
        </div>

        <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd} className="shadow-sm">
          បង្កើតកាលវិភាគថ្មី (New Shift)
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block text-sm">
              គោលការណ៍ម៉ោងធ្វើការផ្លូវការ (Official Shift Hours)
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              រៀងរាល់ថ្ងៃ ច័ន្ទ ដល់ អាទិត្យ ពីម៉ោង <strong className="text-brand-600 dark:text-brand-400">08:00 ព្រឹក ដល់ 05:30 ល្ងាច</strong> • សម្រាកបាយថ្ងៃត្រង់ពី <strong className="text-amber-600 dark:text-amber-400">11:30 ព្រឹក ដល់ 01:00 រសៀល</strong> (1.5 ម៉ោង)
            </span>
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))
        ) : !schedules || schedules.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={CalendarClock}
              title="មិនទាន់មានកាលវិភាគការងារ"
              description="សូមចុចប៊ូតុងខាងលើដើម្បីបង្កើតកាលវិភាគការងារស្តង់ដារសម្រាប់បុគ្គលិក។"
            />
          </div>
        ) : (
          schedules.map((sch) => {
            const workingDays = sch.days.filter((d) => d.isWorkingDay);
            const firstWorkingDay = workingDays[0] || sch.days[0];
            const startTime = firstWorkingDay?.startTime || '08:00';
            const endTime = firstWorkingDay?.endTime || '17:30';
            const breakStart = firstWorkingDay?.breakStartTime || '11:30';
            const breakEnd = firstWorkingDay?.breakEndTime || '13:00';

            return (
              <Card
                key={sch.id}
                className="p-5 space-y-4 flex flex-col justify-between border border-slate-200/80 dark:border-dark-border hover:shadow-md transition-all rounded-2xl"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {sch.name}
                        </h3>
                        {sch.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            ស្តង់ដារលំនាំដើម
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {sch.description || 'កាលវិភាគម៉ោងធ្វើការផ្លូវការ'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(sch)}
                      className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-dark-elevated rounded-xl transition-colors border border-transparent hover:border-brand-200"
                      title="កែប្រែម៉ោងធ្វើការ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Shift & Lunch Details Pill */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-dark-elevated/70 p-3 rounded-xl border border-slate-100 dark:border-dark-border text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        ម៉ោងធ្វើការ
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                        {startTime} - {endTime}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-amber-500" />
                        សម្រាកបាយ
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                        {breakStart} - {breakEnd}
                      </span>
                    </div>
                  </div>

                  {/* 7-Days Schedule Badges */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>កាលវិភាគ ៧ ថ្ងៃក្នុងមួយសប្តាហ៍</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {workingDays.length} ថ្ងៃធ្វើការ
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_ORDER.map((day) => {
                        const d = sch.days.find((x) => x.dayOfWeek === day);
                        const isWork = d ? d.isWorkingDay : true;
                        return (
                          <div
                            key={day}
                            className={`text-center py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              isWork
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                                : 'bg-slate-100 dark:bg-dark-elevated text-slate-400 border border-transparent'
                            }`}
                            title={`${DAY_LABELS_KH[day] || day}: ${isWork ? `${d?.startTime || '08:00'} - ${d?.endTime || '17:30'} (បាយ ${d?.breakStartTime || '11:30'}-${d?.breakEndTime || '13:00'})` : 'ឈប់សម្រាក'}`}
                          >
                            {DAY_LABELS_KH[day] || day.slice(0, 2)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>ល្វែងម៉ោង: {sch.timezone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{sch._count?.employees || 0} បុគ្គលិកកំពុងប្រើប្រាស់</span>
                  <button
                    onClick={() => handleOpenEdit(sch)}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
                  >
                    កែប្រែម៉ោង →
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Schedule Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'កែប្រែកាលវិភាគការងារ (Edit Work Schedule)' : 'បង្កើតកាលវិភាគការងារថ្មី (Create Schedule)'}
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          {/* Quick Preset Button */}
          <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-brand-900 dark:text-brand-300 block">
                ⚡ កំណត់រហ័សស្តង់ដារក្រុមហ៊ុន (Mon-Sun 8:00 AM - 5:30 PM)
              </span>
              <span className="text-[11px] text-brand-700 dark:text-brand-400">
                ធ្វើការ ៧ ថ្ងៃក្នុងមួយសប្តាហ៍ ពី 08:00 ដល់ 17:30 និងបាយថ្ងៃត្រង់ពី 11:30 ដល់ 13:00
              </span>
            </div>
            <button
              type="button"
              onClick={applyStandardTemplate}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              កំណត់ស្តង់ដារនេះ
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ឈ្មោះកាលវិភាគ <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ឧ. កាលវិភាគស្តង់ដារ ច័ន្ទ-អាទិត្យ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ការពិពណ៌នា
              </label>
              <input
                type="text"
                placeholder="ឧ. ម៉ោងធ្វើការរាល់ថ្ងៃ 8am ដល់ 5:30pm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                កំណត់ជាកាលវិភាគលំនាំដើម (Default Schedule)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                ប្រព័ន្ធនឹងភ្ជាប់កាលវិភាគនេះទៅបុគ្គលិកថ្មីដោយស្វ័យប្រវត្តិ
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ការកំណត់ម៉ោងធ្វើការ និងម៉ោងបាយថ្ងៃត្រង់រាល់ថ្ងៃ (7 Days Hours & Lunch Break)
              </span>
              <span className="text-[11px] text-slate-400">
                (ម៉ោងចូល 08:00 - ម៉ោងចេញ 17:30 • សម្រាកបាយ 11:30 - 13:00)
              </span>
            </div>

            <div className="border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-dark-border max-h-72 overflow-y-auto">
              {form.days.map((d, index) => (
                <div
                  key={d.dayOfWeek}
                  className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/50 dark:hover:bg-dark-elevated/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 w-32 shrink-0">
                    <input
                      type="checkbox"
                      checked={d.isWorkingDay}
                      onChange={(e) => {
                        const updated = [...form.days];
                        updated[index].isWorkingDay = e.target.checked;
                        setForm({ ...form, days: updated });
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {DAY_LABELS_KH[d.dayOfWeek] || d.dayOfWeek}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {d.dayOfWeek.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {d.isWorkingDay ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Work hours */}
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-dark-elevated px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        <span className="text-[11px] text-slate-500 font-medium">ម៉ោងការងារ:</span>
                        <input
                          type="time"
                          value={d.startTime}
                          onChange={(e) => {
                            const updated = [...form.days];
                            updated[index].startTime = e.target.value;
                            setForm({ ...form, days: updated });
                          }}
                          className="px-2 py-0.5 border border-slate-200 dark:border-dark-border rounded text-xs bg-white dark:bg-dark font-mono font-bold text-slate-800 dark:text-slate-200"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={d.endTime}
                          onChange={(e) => {
                            const updated = [...form.days];
                            updated[index].endTime = e.target.value;
                            setForm({ ...form, days: updated });
                          }}
                          className="px-2 py-0.5 border border-slate-200 dark:border-dark-border rounded text-xs bg-white dark:bg-dark font-mono font-bold text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      {/* Lunch Break */}
                      <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 px-2.5 py-1 rounded-lg">
                        <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">បាយថ្ងៃត្រង់:</span>
                        <input
                          type="time"
                          value={d.breakStartTime || '11:30'}
                          onChange={(e) => {
                            const updated = [...form.days];
                            updated[index].breakStartTime = e.target.value;
                            setForm({ ...form, days: updated });
                          }}
                          className="px-2 py-0.5 border border-amber-200 dark:border-amber-800 rounded text-xs bg-white dark:bg-dark font-mono font-bold text-slate-800 dark:text-slate-200"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={d.breakEndTime || '13:00'}
                          onChange={(e) => {
                            const updated = [...form.days];
                            updated[index].breakEndTime = e.target.value;
                            setForm({ ...form, days: updated });
                          }}
                          className="px-2 py-0.5 border border-amber-200 dark:border-amber-800 rounded text-xs bg-white dark:bg-dark font-mono font-bold text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px] py-1">
                      ឈប់សម្រាក (Rest Day / Non-working)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              បោះបង់ (Cancel)
            </Button>
            <Button variant="primary" size="md" isLoading={saveMutation.isPending}>
              រក្សាទុកកាលវិភាគ (Save Schedule)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
