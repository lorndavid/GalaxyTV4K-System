import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Building2, Plus, Calendar, Users, MapPin } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: { employees: number };
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isPaid: boolean;
}

export const DepartmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const { data: departments, isLoading: isDeptLoading } = useQuery<Department[]>({
    queryKey: ['departmentsFull'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/departments');
      return res.data.data;
    },
  });

  const { data: holidays, isLoading: isHolidaysLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/holidays');
      return res.data.data;
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (payload: typeof deptForm) => {
      return await apiClient.post('/admin/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentsFull'] });
      setIsAddDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
    },
  });

  return (
    <div className="space-y-8">
      {/* Departments Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Departments</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Organize company teams and divisional assignments.
            </p>
          </div>

          <Button
            variant="primary"
            icon={Plus}
            size="md"
            onClick={() => setIsAddDeptModalOpen(true)}
          >
            Add Department
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isDeptLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-32 flex flex-col justify-center">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </Card>
            ))
          ) : !departments || departments.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Building2}
                title="No departments found"
                description="Add your first company department to categorize employees."
              />
            </div>
          ) : (
            departments.map((dept) => (
              <Card key={dept.id} className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors border border-slate-200 dark:border-dark-border">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                      {dept.code}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {dept._count?.employees || 0} Staff
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pt-1">{dept.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{dept.description || 'General department team'}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Public Holidays Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-dark-border">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Public Holidays & Paid Observances</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official company paid non-working days. Employees are not marked absent on these days.
          </p>
        </div>

        <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
          {isHolidaysLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !holidays || holidays.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No holidays configured"
              description="Holidays added to the system will be automatically respected by the attendance engine."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Holiday Name</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{h.date}</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-slate-900 dark:text-slate-100">{h.name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">{h.description || 'National observance'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-success-50 dark:bg-success-950/50 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800 rounded-full">
                          Paid Holiday
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={isAddDeptModalOpen}
        onClose={() => setIsAddDeptModalOpen(false)}
        title="Add Department"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDeptMutation.mutate(deptForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Finance & Accounting"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Code <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. FIN"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="e.g. Manages payroll, accounting, and financial reports..."
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsAddDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={createDeptMutation.isPending}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
