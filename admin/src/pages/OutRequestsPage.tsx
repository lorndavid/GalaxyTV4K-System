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
import { DoorOpen, CheckCircle2, XCircle } from 'lucide-react';

interface OutRequest {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
  adminComment?: string;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
  };
}

export const OutRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<OutRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminComment, setAdminComment] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { data: requests, isLoading } = useQuery<OutRequest[]>({
    queryKey: ['adminOutRequests', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/out-requests?status=${statusFilter}`);
      return res.data.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      comment: string;
    }) => {
      return await apiClient.put(`/admin/out-requests/${id}/review`, {
        status,
        adminComment: comment,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminOutRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      showToast(
        variables.status === 'APPROVED'
          ? 'Out permission request approved.'
          : 'Out permission request rejected.'
      );
    },
  });

  const openReview = (req: OutRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setAdminComment('');
    setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Out & Permission Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review short temporary permissions for employees leaving company premises during shifts.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-elevated p-1">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === ''
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Main Table */}
      <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No out requests found"
            description={`There are currently no ${statusFilter.toLowerCase() || ''} out requests to review.`}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Time Window</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{req.employee.displayName}</div>
                        <div className="text-xs text-slate-400">{req.employee.employeeCode}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{req.date}</td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {req.startTime} — {req.endTime}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => openReview(req, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={XCircle}
                              className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/40"
                              onClick={() => openReview(req, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {requests.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{req.employee.displayName}</div>
                      <div className="font-mono text-xs text-slate-500">{req.employee.employeeCode}</div>
                    </div>
                    <Badge status={req.status} size="sm" />
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400 font-sans">Time:</span>
                      <span className="font-semibold text-slate-900">{req.date} ({req.startTime} - {req.endTime})</span>
                    </div>
                    <p className="text-slate-600 pt-1 border-t border-slate-200/60">{req.reason}</p>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={CheckCircle2}
                        className="flex-1"
                        onClick={() => openReview(req, 'APPROVED')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={XCircle}
                        className="flex-1 text-danger-600 hover:bg-danger-50"
                        onClick={() => openReview(req, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Out Request`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {reviewAction === 'APPROVED'
              ? `Approve temporary departure for ${selectedRequest?.employee.displayName} on ${selectedRequest?.date} (${selectedRequest?.startTime} - ${selectedRequest?.endTime}).`
              : `Reject temporary departure for ${selectedRequest?.employee.displayName}.`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Comments (Optional)
            </label>
            <textarea
              rows={3}
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="e.g. Approved for official company errands..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'APPROVED' ? 'primary' : 'danger'}
              size="md"
              isLoading={reviewMutation.isPending}
              onClick={() => {
                if (selectedRequest) {
                  reviewMutation.mutate({
                    id: selectedRequest.id,
                    status: reviewAction,
                    comment: adminComment,
                  });
                }
              }}
            >
              {reviewAction === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
