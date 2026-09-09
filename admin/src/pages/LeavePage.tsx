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
  CalendarOff,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Home,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  leaveType?: string;
  type?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  daysCount: number;
  reason: string;
  status: string;
  isPermission?: boolean;
  permissionType?: string;
  adminComment?: string;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    khmerName?: string;
    department?: { name: string };
  };
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  displayName: string;
  khmerName?: string;
  department?: { name: string };
}

const PERMISSION_PRESETS = [
  { type: 'GO_HOME', label: 'សុំចេញទៅផ្ទះ (Go Home)', icon: '🏠', defaultReason: 'សុំចេញទៅផ្ទះមុនម៉ោង' },
  { type: 'PERSONAL', label: 'ច្បាប់ផ្ទាល់ខ្លួន (Personal)', icon: '👤', defaultReason: 'មានធុរៈផ្ទាល់ខ្លួន' },
  { type: 'SICK', label: 'ច្បាប់ឈឺ (Sick Leave)', icon: '🏥', defaultReason: 'ឈឺ / មិនស្រួលខ្លួន' },
  { type: 'MISSION', label: 'បេសកកម្មការងារ (Mission)', icon: '💼', defaultReason: 'បំពេញបេសកកម្មក្រៅការិយាល័យ' },
  { type: 'OTHER', label: 'ច្បាប់ពិសេស (Special)', icon: '📝', defaultReason: 'ការអនុញ្ញាតពិសេស' },
];

export const LeavePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminComment, setAdminComment] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Manual Permission Modal state
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [permForm, setPermForm] = useState({
    employeeId: '',
    permissionType: 'GO_HOME',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '17:30',
    reason: 'សុំចេញទៅផ្ទះមុនម៉ោង (Go Home)',
    adminComment: 'អនុញ្ញាតដោយ Admin (Granted by Admin)',
  });

  // Query leave requests
  const { data: requests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['adminLeaves', statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/admin/leave-requests?status=${statusFilter}`
        : '/admin/leave-requests';
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  // Query employees for permission granting dropdown
  const { data: employees } = useQuery<EmployeeOption[]>({
    queryKey: ['adminEmployeesDropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/employees');
      return res.data.data;
    },
  });

  // Review (Approve/Reject) Leave Mutation
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
      return await apiClient.put(`/admin/leave-requests/${id}/review`, {
        status,
        adminComment: comment,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setAdminComment('');
      showToast(
        variables.status === 'APPROVED'
          ? 'បានអនុម័តសំណើសុំច្បាប់ជោគជ័យ (Leave approved).'
          : 'បានបដិសេធសំណើសុំច្បាប់ (Leave rejected).'
      );
    },
  });

  // Grant Manual Permission Mutation
  const grantPermMutation = useMutation({
    mutationFn: async (payload: typeof permForm) => {
      return await apiClient.post('/admin/leave-requests/grant-permission', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setIsPermModalOpen(false);
      showToast('បានផ្តល់ច្បាប់អនុញ្ញាត និងផ្ញើទៅកាន់ Telegram ដោយស្វ័យប្រវត្តិ (Permission granted & notified)!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'បរាជ័យក្នុងការផ្តល់ច្បាប់អនុញ្ញាត', 'error');
    },
  });

  // Update Permission Mutation
  const updatePermMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof permForm }) => {
      return await apiClient.put(`/admin/leave-requests/${id}/permission`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setIsPermModalOpen(false);
      setEditingPermId(null);
      showToast('បានកែប្រែច្បាប់អនុញ្ញាតជោគជ័យ (Permission updated)!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'បរាជ័យក្នុងការកែប្រែ', 'error');
    },
  });

  // Delete Permission Mutation
  const deletePermMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/admin/leave-requests/${id}/permission`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      showToast('បានលុបច្បាប់អនុញ្ញាតជោគជ័យ (Permission deleted)!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'បរាជ័យក្នុងការលុប', 'error');
    },
  });

  const openReview = (req: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setAdminComment('');
    setIsReviewModalOpen(true);
  };

  const openGrantPermissionModal = () => {
    setEditingPermId(null);
    setPermForm({
      employeeId: employees?.[0]?.id || '',
      permissionType: 'GO_HOME',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '17:30',
      reason: 'សុំចេញទៅផ្ទះមុនម៉ោង (Go Home)',
      adminComment: 'អនុញ្ញាតដោយ Admin (Granted by Admin)',
    });
    setIsPermModalOpen(true);
  };

  const openEditPermissionModal = (req: LeaveRequest) => {
    setEditingPermId(req.id);
    setPermForm({
      employeeId: req.employee.id,
      permissionType: req.permissionType || 'GO_HOME',
      startDate: req.startDate,
      endDate: req.endDate || req.startDate,
      startTime: req.startTime || '14:00',
      endTime: req.endTime || '17:30',
      reason: req.reason,
      adminComment: req.adminComment || 'អនុញ្ញាតដោយ Admin',
    });
    setIsPermModalOpen(true);
  };

  const handlePermPresetChange = (preset: typeof PERMISSION_PRESETS[0]) => {
    setPermForm((prev) => ({
      ...prev,
      permissionType: preset.type,
      reason: preset.defaultReason,
    }));
  };

  const getPermissionLabel = (type?: string) => {
    switch (type) {
      case 'GO_HOME':
        return 'សុំចេញទៅផ្ទះ (Go Home)';
      case 'PERSONAL':
        return 'ច្បាប់ផ្ទាល់ខ្លួន (Personal)';
      case 'SICK':
        return 'ច្បាប់ឈឺ (Sick)';
      case 'MISSION':
        return 'បេសកកម្មក្រៅ (Mission)';
      default:
        return 'ច្បាប់អនុញ្ញាត (Permission)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            គ្រប់គ្រងច្បាប់ & ការអនុញ្ញាត (Leave & Permission)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ផ្តល់ច្បាប់ដោយផ្ទាល់ពី Admin (Go Home, ផ្ទាល់ខ្លួន, ឈឺ...), ពិនិត្យសំណើ និងធ្វើបច្ចុប្បន្នភាពស្វ័យប្រវត្តទៅ Telegram Bot។
          </p>
        </div>

        {/* Action Button: Grant Manual Permission */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={openGrantPermissionModal}
            className="shadow-sm shadow-brand-500/20"
          >
            ផ្តល់ច្បាប់អនុញ្ញាត (Grant Permission)
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-elevated p-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === ''
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            ទាំងអស់ (All Requests)
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            រង់ចាំអនុម័ត (Pending)
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            បានអនុម័ត (Approved)
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            បានបដិសេធ (Rejected)
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          សរុប: <b>{requests?.length || 0}</b> ច្បាប់
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
            icon={CalendarOff}
            title="មិនមានសំណើសុំច្បាប់ទេ"
            description="មិនទាន់មានទិន្នន័យច្បាប់ ឬការអនុញ្ញាតណាមួយក្នុងប្រព័ន្ធនៅឡើយទេ។"
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">បុគ្គលិក (Employee)</th>
                    <th className="py-3.5 px-4">ប្រភេទច្បាប់ (Type)</th>
                    <th className="py-3.5 px-4">កាលបរិច្ឆេទ & ម៉ោង (Date & Time)</th>
                    <th className="py-3.5 px-4">មូលហេតុ (Reason)</th>
                    <th className="py-3.5 px-4">ស្ថានភាព (Status)</th>
                    <th className="py-3.5 px-4 text-right">សកម្មភាព (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {requests.map((req) => {
                    const empName = req.employee.khmerName || req.employee.displayName;
                    const isHourly = req.isPermission && req.startTime && req.endTime;
                    const typeLabel = req.isPermission
                      ? getPermissionLabel(req.permissionType)
                      : (req.type || req.leaveType || 'LEAVE');

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{empName}</div>
                          <div className="text-xs text-slate-400">{req.employee.department?.name || 'ទូទៅ'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {req.isPermission ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {typeLabel}
                            </span>
                          ) : (
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 capitalize">
                              {typeLabel.toLowerCase()}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <div>{req.startDate}{req.endDate && req.endDate !== req.startDate ? ` ដល់ ${req.endDate}` : ''}</div>
                          {isHourly ? (
                            <div className="text-brand-600 dark:text-brand-400 font-bold font-sans mt-0.5">
                              ម៉ោង {req.startTime} - {req.endTime}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-sans text-[11px]">{req.daysCount} ថ្ងៃ</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={req.reason}>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{req.reason}</div>
                          {req.adminComment && (
                            <div className="text-[11px] text-slate-400 italic">កំណត់ចំណាំ: {req.adminComment}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge status={req.status} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {req.isPermission ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit2}
                                onClick={() => openEditPermissionModal(req)}
                                title="កែប្រែច្បាប់អនុញ្ញាត"
                              >
                                កែប្រែ
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/40"
                                onClick={() => {
                                  if (confirm(`តើអ្នកពិតជាចង់លុបច្បាប់អនុញ្ញាតរបស់ ${empName} មែនទេ?`)) {
                                    deletePermMutation.mutate(req.id);
                                  }
                                }}
                                title="លុបច្បាប់"
                              >
                                លុប
                              </Button>
                            </div>
                          ) : req.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => openReview(req, 'APPROVED')}
                              >
                                អនុម័ត
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={XCircle}
                                className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/40"
                                onClick={() => openReview(req, 'REJECTED')}
                              >
                                បដិសេធ
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">បានត្រួតពិនិត្យ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-dark-border">
              {requests.map((req) => {
                const empName = req.employee.khmerName || req.employee.displayName;
                const isHourly = req.isPermission && req.startTime && req.endTime;
                const typeLabel = req.isPermission
                  ? getPermissionLabel(req.permissionType)
                  : (req.type || req.leaveType || 'LEAVE');

                return (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{empName}</div>
                        <div className="text-xs text-slate-400">{req.employee.department?.name || 'ទូទៅ'}</div>
                      </div>
                      <Badge status={req.status} size="sm" />
                    </div>

                    <div className="bg-slate-50 dark:bg-dark-elevated p-2.5 rounded-xl border border-slate-100 dark:border-dark-border text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ប្រភេទច្បាប់:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{typeLabel}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400 font-sans">កាលបរិច្ឆេទ:</span>
                        <span>{req.startDate}{req.endDate && req.endDate !== req.startDate ? ` → ${req.endDate}` : ''}</span>
                      </div>
                      {isHourly && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">ម៉ោងអនុញ្ញាត:</span>
                          <span className="font-bold text-brand-600 dark:text-brand-400">ម៉ោង {req.startTime} - {req.endTime}</span>
                        </div>
                      )}
                      <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-dark-border">
                        <b>មូលហេតុ:</b> {req.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {req.isPermission ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Edit2}
                            className="flex-1"
                            onClick={() => openEditPermissionModal(req)}
                          >
                            កែប្រែ
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="flex-1 text-danger-600 dark:text-danger-400"
                            onClick={() => {
                              if (confirm(`តើអ្នកពិតជាចង់លុបច្បាប់អនុញ្ញាតរបស់ ${empName} មែនទេ?`)) {
                                deletePermMutation.mutate(req.id);
                              }
                            }}
                          >
                            លុប
                          </Button>
                        </>
                      ) : req.status === 'PENDING' ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={CheckCircle2}
                            className="flex-1"
                            onClick={() => openReview(req, 'APPROVED')}
                          >
                            អនុម័ត
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            className="flex-1 text-danger-600"
                            onClick={() => openReview(req, 'REJECTED')}
                          >
                            បដិសេធ
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* MODAL 1: GRANT / EDIT MANUAL PERMISSION */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={editingPermId ? 'កែប្រែច្បាប់អនុញ្ញាត (Edit Permission)' : 'ផ្តល់ច្បាប់អនុញ្ញាតដោយ Admin (Grant Permission)'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingPermId) {
              updatePermMutation.mutate({ id: editingPermId, payload: permForm });
            } else {
              grantPermMutation.mutate(permForm);
            }
          }}
          className="space-y-4 text-xs"
        >
          {/* Employee Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              ជ្រើសរើសបុគ្គលិក (Employee) *
            </label>
            <select
              required
              disabled={Boolean(editingPermId)}
              value={permForm.employeeId}
              onChange={(e) => setPermForm({ ...permForm, employeeId: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- សូមជ្រើសរើសបុគ្គលិក --</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.khmerName || emp.displayName} ({emp.department?.name || 'ទូទៅ'})
                </option>
              ))}
            </select>
          </div>

          {/* Permission Type Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ប្រភេទច្បាប់អនុញ្ញាត (Permission Type) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_PRESETS.map((preset) => {
                const isSelected = permForm.permissionType === preset.type;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handlePermPresetChange(preset)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500 font-bold'
                        : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span className="text-xs">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Range */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200 dark:border-dark-border space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                កាលបរិច្ឆេទ (Date) *
              </label>
              <input
                type="date"
                required
                value={permForm.startDate}
                onChange={(e) =>
                  setPermForm({ ...permForm, startDate: e.target.value, endDate: e.target.value })
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ម៉ោងចាប់ផ្តើម (Start Time)
                </label>
                <input
                  type="time"
                  value={permForm.startTime}
                  onChange={(e) => setPermForm({ ...permForm, startTime: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ម៉ោងបញ្ចប់ (End Time)
                </label>
                <input
                  type="time"
                  value={permForm.endTime}
                  onChange={(e) => setPermForm({ ...permForm, endTime: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              មូលហេតុ (Reason) *
            </label>
            <input
              type="text"
              required
              value={permForm.reason}
              onChange={(e) => setPermForm({ ...permForm, reason: e.target.value })}
              placeholder="ឧ. សុំចេញទៅផ្ទះមុនម៉ោង, ឈឺធ្មេញ..."
              className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Admin Comment */}
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
              កំណត់ចំណាំអ្នកអនុញ្ញាត (Admin Comment)
            </label>
            <input
              type="text"
              value={permForm.adminComment}
              onChange={(e) => setPermForm({ ...permForm, adminComment: e.target.value })}
              placeholder="ឧ. អនុញ្ញាតដោយ Admin"
              className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsPermModalOpen(false)}
            >
              បោះបង់
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={grantPermMutation.isPending || updatePermMutation.isPending}
            >
              {editingPermId ? 'រក្សាទុកការកែប្រែ' : 'ផ្តល់ការអនុញ្ញាត & ផ្ញើ Telegram'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: REVIEW LEAVE REQUEST */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`${reviewAction === 'APPROVED' ? 'អនុម័តសំណើសុំច្បាប់' : 'បដិសេធសំណើសុំច្បាប់'}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {reviewAction === 'APPROVED'
              ? `បញ្ជាក់ការអនុម័តច្បាប់សម្រាប់ ${selectedRequest?.employee.displayName} (${selectedRequest?.daysCount} ថ្ងៃ)។`
              : `បញ្ជាក់ការបដិសេធសំណើសុំច្បាប់របស់ ${selectedRequest?.employee.displayName}។`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              កំណត់ចំណាំ Admin
            </label>
            <textarea
              rows={3}
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="ឧ. បានអនុម័តតាមកាលវិភាគ..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={() => setIsReviewModalOpen(false)}>
              បោះបង់
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
              {reviewAction === 'APPROVED' ? 'បញ្ជាក់ការអនុម័ត' : 'បញ្ជាក់ការបដិសេធ'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
