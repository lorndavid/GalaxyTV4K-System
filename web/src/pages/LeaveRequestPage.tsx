import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { queryKeys } from '../lib/queryKeys';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { CalendarOff, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Self-Service</h1>
          <p className="text-xs text-slate-500 mt-0.5">View your allowance balances and submit requests</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
        >
          Request Leave
        </Button>
      </div>

      {/* Leave Balances Grid */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Remaining Leave Balances
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {isBalLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm" className="h-20 flex flex-col justify-center">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-10" />
              </Card>
            ))
          ) : !balances || balances.length === 0 ? (
            <Card padding="sm" className="col-span-full text-center text-xs text-slate-500">
              No leave balances assigned.
            </Card>
          ) : (
            balances.map((b) => (
              <Card key={b.leaveType} padding="sm" className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="capitalize">{b.leaveType.toLowerCase()}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900">{b.remainingDays}</span>
                  <span className="text-[11px] text-slate-400">/ {b.totalDays} days</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Request History */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Submitted Request History
        </h2>

        <Card padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {isReqLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="No leave requests"
              description="Your submitted leave applications will appear here."
            />
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {r.leaveType.toLowerCase()} Leave
                    </span>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {r.startDate} → {r.endDate} ({r.daysCount} {r.daysCount === 1 ? 'day' : 'days'})
                    </p>
                  </div>
                  <Badge status={r.status} size="sm" />
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {r.reason}
                </p>

                {r.adminComment && (
                  <div className="text-[11px] text-slate-500 bg-brand-50/50 p-2 rounded-lg border border-brand-100">
                    <span className="font-semibold text-brand-700">Manager comment:</span> {r.adminComment}
                  </div>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Submit Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Leave Request"
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate(form);
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-xs border border-danger-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Leave Category <span className="text-danger-500">*</span>
            </label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="PERSONAL">Personal Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
              <option value="MATERNITY">Maternity Leave</option>
              <option value="PATERNITY">Paternity Leave</option>
              <option value="OTHER">Other Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Absence <span className="text-danger-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="State reason for absence..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={submitMutation.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
