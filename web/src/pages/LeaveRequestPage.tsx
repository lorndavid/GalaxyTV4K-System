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
import { CalendarOff, Plus, Calendar, AlertCircle } from 'lucide-react';

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: string;
  adminComment?: string;
  createdAt: string;
}

export const LeaveRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const { data: balances, isLoading: isBalLoading } = useQuery<LeaveBalance[]>({
    queryKey: queryKeys.leave.balances,
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return res.data.data;
    },
    staleTime: 60000,
  });

  const { data: requests, isLoading: isReqLoading } = useQuery<LeaveRequest[]>({
    queryKey: queryKeys.leave.myRequests,
    queryFn: async () => {
      const res = await apiClient.get('/leave/my-requests');
      return res.data.data;
    },
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await apiClient.post('/leave/requests', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.myRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.balances });
      setIsModalOpen(false);
      setForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      setErrorMsg('');
      showToast('Leave request submitted successfully.');
    },
    onError: (err: any) => {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          'Failed to submit leave request. Please check dates and balance.'
      );
    },
  });

  const getLeaveTypeLabel = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ANNUAL':
        return t('leave.annual', 'Annual Leave');
      case 'SICK':
        return t('leave.sick', 'Sick Leave');
      case 'PERSONAL':
        return t('leave.personal', 'Personal Leave');
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('leave.title', 'Leave Management')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            {t('leave.subtitle', 'Track balances, submit requests, and check approval status')}
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
          {t('leave.newRequest', 'Request Leave')}
        </Button>
      </div>

      {/* Leave Balances Grid (3 modern elevated cards with clear weight hierarchy) */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('home.leaveBalance', 'Leave Balances')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {isBalLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm" className="h-20 flex flex-col justify-center border border-slate-100 dark:border-dark-border">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
              </Card>
            ))
          ) : !balances || balances.length === 0 ? (
            <Card padding="sm" className="col-span-full text-center text-xs text-slate-400 py-4 border border-slate-100 dark:border-dark-border">
              No leave balances assigned.
            </Card>
          ) : (
            balances.map((b) => (
              <Card key={b.leaveType} padding="sm" className="p-3.5 border border-slate-100 dark:border-dark-border space-y-1">
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block truncate">
                  {getLeaveTypeLabel(b.leaveType)}
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {b.remainingDays}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    / {b.totalDays} {t('home.days', 'days')}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Request History */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('leave.myRequests', 'Submitted Requests')}
        </h2>

        {isReqLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card className="py-8 border border-slate-100 dark:border-dark-border">
            <EmptyState
              icon={CalendarOff}
              title={t('leave.noRequests', 'No Leave Requests')}
              description={t('leave.noRequestsDesc', 'You have not submitted any leave requests yet.')}
              actionLabel={t('leave.applyFirst', 'Request Your First Leave')}
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
                      {getLeaveTypeLabel(r.leaveType)}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{r.startDate}</span>
                      <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{r.endDate}</span>
                      <span className="ml-1.5 text-slate-400">({r.daysCount} {t('home.days', 'days')})</span>
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

      {/* New Leave Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('leave.newRequest', 'Request Leave')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.startDate || !form.endDate || !form.reason.trim()) {
              setErrorMsg('Please complete all required fields.');
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
              Leave Category *
            </label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
            >
              <option value="ANNUAL">Annual Leave (ច្បាប់ប្រចាំឆ្នាំ)</option>
              <option value="SICK">Sick Leave (ច្បាប់ឈឺ)</option>
              <option value="PERSONAL">Personal Leave (ច្បាប់ផ្ទាល់ខ្លួន)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-normal"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Reason / Explanation *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Provide context for your manager..."
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
