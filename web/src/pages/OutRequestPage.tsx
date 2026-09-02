import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { queryKeys } from '../lib/queryKeys';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { DoorOpen, Plus, Clock, AlertCircle } from 'lucide-react';

interface OutRequest {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
  adminComment?: string;
  createdAt: string;
}

export const OutRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '14:30',
    reason: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const { data: requests, isLoading } = useQuery<OutRequest[]>({
    queryKey: queryKeys.out.myRequests,
    queryFn: async () => {
      const res = await apiClient.get('/out/my-requests');
      return res.data.data;
    },
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await apiClient.post('/out/requests', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.out.myRequests });
      setIsModalOpen(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '13:00',
        endTime: '14:30',
        reason: '',
      });
      setErrorMsg('');
      showToast('Out permission request submitted.');
    },
    onError: (err: any) => {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          'Failed to submit request. Please check your time inputs.'
      );
    },
  });

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Out Permissions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Request temporary departures during work shifts
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
          className="rounded-xl shadow-xs text-xs font-semibold"
        >
          Request Out
        </Button>
      </div>

      {/* History */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          My Permission Requests
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card className="py-8 border border-slate-100 dark:border-dark-border">
            <EmptyState
              icon={DoorOpen}
              title="No Out Requests"
              description="Your temporary departure requests will appear here."
              actionLabel="Request Out Permission"
              onAction={() => {
                setErrorMsg('');
                setIsModalOpen(true);
              }}
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => (
              <Card key={r.id} padding="sm" className="p-4 border border-slate-100 dark:border-dark-border space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Temporary Departure
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{r.date}</span>
                      <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{r.startTime} – {r.endTime}</span>
                    </p>
                  </div>
                  <Badge status={r.status} size="sm" />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-dark-elevated/60 p-2.5 rounded-xl border border-slate-100 dark:border-dark-border/60 leading-relaxed font-normal">
                  {r.reason}
                </p>

                {r.adminComment && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-brand-50/50 dark:bg-brand-950/40 p-2.5 rounded-xl border border-brand-100/60 dark:border-brand-900/40">
                    <span className="font-semibold text-brand-700 dark:text-brand-400">Manager comment:</span> {r.adminComment}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Out Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Out Permission"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.reason.trim()) {
              setErrorMsg('Please specify a reason for departure.');
              return;
            }
            submitMutation.mutate(form);
          }}
          className="space-y-4 text-xs"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Estimated Return Time *
              </label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Reason / Purpose *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g., Client meeting, bank errand, clinic visit..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-medium"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitMutation.isPending}
              className="rounded-xl font-semibold shadow-xs"
            >
              {t('common.submit', 'Submit Request')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
