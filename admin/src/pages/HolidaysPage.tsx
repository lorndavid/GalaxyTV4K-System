import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { Calendar, Plus, Trash2, Edit2, Sparkles, AlertCircle } from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  description?: string;
}

export const HolidaysPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [form, setForm] = useState({
    name: '',
    date: '',
    isRecurring: false,
    description: '',
  });

  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ['adminHolidays'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/holidays');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingHoliday) {
        return await apiClient.put(`/admin/holidays/${editingHoliday.id}`, payload);
      }
      return await apiClient.post('/admin/holidays', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHolidays'] });
      setIsModalOpen(false);
      setEditingHoliday(null);
      showToast('Public holiday saved.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to save holiday.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/admin/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHolidays'] });
      showToast('Holiday deleted.');
    },
  });

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setForm({
      name: '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setForm({
      name: h.name,
      date: h.date,
      isRecurring: h.isRecurring,
      description: h.description || '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Public Holidays</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company holidays and non-working calendar days
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          Add Public Holiday
        </Button>
      </div>

      {/* Holiday Table */}
      <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden border border-slate-200 dark:border-dark-border">
        <div className="p-3 bg-slate-50/70 dark:bg-dark-elevated border-b border-slate-100 dark:border-dark-border grid grid-cols-12 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span className="col-span-3">Date</span>
          <span className="col-span-4">Holiday Name</span>
          <span className="col-span-3">Description</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !holidays || holidays.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No public holidays"
            description="Add official holidays (e.g. Khmer New Year, Pchum Ben)."
          />
        ) : (
          holidays.map((h) => (
            <div
              key={h.id}
              className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors"
            >
              <div className="col-span-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{h.date}</span>
                {h.isRecurring && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                    Annual
                  </span>
                )}
              </div>

              <div className="col-span-4 font-bold text-slate-900 dark:text-slate-100">{h.name}</div>

              <div className="col-span-3 text-slate-500 dark:text-slate-400 truncate">
                {h.description || 'Public holiday'}
              </div>

              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(h)}
                  className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-dark-elevated rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(h.id)}
                  className="p-1.5 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Holiday Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHoliday ? 'Edit Holiday' : 'Add Public Holiday'}
        maxWidth="sm"
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
              Holiday Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Khmer New Year"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date <span className="text-danger-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Traditional national celebration"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Recurring annual holiday (repeats each calendar year)</span>
          </label>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={saveMutation.isPending}>
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
