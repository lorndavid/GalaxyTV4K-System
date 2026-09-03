import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  CheckCircle2,
  Building2,
  Clock,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Briefcase,
  UserCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface Employee {
  id: string;
  employeeCode: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  khmerName?: string;
  latinName?: string;
  gender?: string;
  skill?: string;
  studyDay?: string;
  email: string;
  phone?: string;
  position: string;
  status: string;
  department?: { id: string; name: string };
  schedule?: { id: string; name: string };
  user?: { id: string; email: string; status: string };
}

export const EmployeesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Form states with the 8 requested fields
  const [formData, setFormData] = useState({
    khmerName: '',
    latinName: '',
    gender: 'ប្រុស',
    skill: '',
    studyDay: 'ច័ន្ទ - សុក្រ (Mon - Fri)',
    phone: '',
    position: '',
    departmentId: '',
    scheduleId: '',
    employeeCode: '',
    email: '',
    password: 'Employee@123456',
    status: 'ACTIVE',
  });

  // Queries
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/employees');
      return res.data.data;
    },
  });

  const { data: departments } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/departments');
      return res.data.data;
    },
  });

  const { data: schedules } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/schedules');
      return res.data.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return await apiClient.post('/admin/employees', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsAddModalOpen(false);
      resetForm();
      showToast('Employee account created successfully.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to create employee.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<typeof formData> }) => {
      return await apiClient.put(`/admin/employees/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      showToast('Employee details updated successfully.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to update employee.', 'error');
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => {
      const res = await apiClient.post(`/admin/employees/${id}/reset-password`, {
        newPassword: password || undefined,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setResetSuccessMsg(`Password successfully reset to: ${data.temporaryPassword || newPassword}`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showToast('Password reset successfully.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/admin/employees/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setEmployeeToDelete(null);
      showToast(t('employees.deleteSuccess', 'Employee and related records deleted successfully.'));
    },
    onError: (err: any) => {
      showToast(
        err?.response?.data?.error?.message ||
          t('employees.deleteFailed', 'Failed to delete employee.'),
        'error'
      );
    },
  });

  const importOfficialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/admin/employees/seed-official');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      setIsImportModalOpen(false);
      showToast('✓ Successfully imported all 20 official employees with galaxytv@@ passwords!');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to import employees.', 'error');
    },
  });

  const resetForm = () => {
    setFormData({
      khmerName: '',
      latinName: '',
      gender: 'ប្រុស',
      skill: '',
      studyDay: 'ច័ន្ទ - សុក្រ (Mon - Fri)',
      phone: '',
      position: '',
      departmentId: '',
      scheduleId: '',
      employeeCode: '',
      email: '',
      password: 'Employee@123456',
      status: 'ACTIVE',
    });
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      khmerName: emp.khmerName || emp.displayName || '',
      latinName: emp.latinName || '',
      gender: emp.gender || 'ប្រុស',
      skill: emp.skill || '',
      studyDay: emp.studyDay || 'ច័ន្ទ - សុក្រ (Mon - Fri)',
      phone: emp.phone || '',
      position: emp.position || '',
      departmentId: emp.department?.id || '',
      scheduleId: emp.schedule?.id || '',
      employeeCode: emp.employeeCode || '',
      email: emp.email || '',
      password: '',
      status: emp.status || 'ACTIVE',
    });
    setIsEditModalOpen(true);
  };

  const openResetPwd = (emp: Employee) => {
    setSelectedEmployee(emp);
    setNewPassword('');
    setResetSuccessMsg('');
    setIsResetPwdModalOpen(true);
  };

  const filteredEmployees = (employees || []).filter((emp) => {
    const matchesSearch =
      (emp.khmerName && emp.khmerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.latinName && emp.latinName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.skill && emp.skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.phone && emp.phone.includes(searchTerm)) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !departmentFilter || emp.department?.id === departmentFilter;
    const matchesStatus = !statusFilter || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('employees.title', 'Employee Directory')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('employees.subtitle', 'Manage staff profiles, specializations, schedules, and account access')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={Sparkles}
            size="md"
            className="border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 bg-brand-50/70 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 font-semibold"
            onClick={() => setIsImportModalOpen(true)}
          >
            {t('employees.importOfficial', 'Import All 20 Staff (នាំចូលបុគ្គលិកទាំងអស់)')}
          </Button>

          <Button
            variant="primary"
            icon={UserPlus}
            size="md"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            {t('employees.addEmployee', 'Add Employee')}
          </Button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <Card padding="sm" className="flex flex-col md:flex-row items-stretch md:items-center gap-3 border border-slate-200 dark:border-dark-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ឈ្មោះ, ឡាតាំង, ជំនាញ, លេខទូរសព្ទ, Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          >
            <option value="">{t('common.all', 'All')} {t('employees.department', 'Departments')}</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          >
            <option value="">{t('common.all', 'All')} {t('common.status', 'Statuses')}</option>
            <option value="ACTIVE">{t('common.active', 'Active')}</option>
            <option value="INACTIVE">{t('common.inactive', 'Inactive')}</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </Card>

      {/* Main Table & Mobile Cards */}
      <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="No staff profiles match the current filter or search criteria."
            actionLabel={t('employees.addEmployee', 'Add Employee')}
            onAction={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-4">{t('employees.khmerName', 'ឈ្មោះ')}</th>
                  <th className="py-3.5 px-3">{t('employees.latinName', 'ឡាតាំង')}</th>
                  <th className="py-3.5 px-3">{t('employees.gender', 'ភេទ')}</th>
                  <th className="py-3.5 px-3">{t('employees.skill', 'ជំនាញ')}</th>
                  <th className="py-3.5 px-3">{t('employees.studyDay', 'ថ្ងៃរៀន')}</th>
                  <th className="py-3.5 px-3">{t('employees.phone', 'លេខទូរសព្ទ')}</th>
                  <th className="py-3.5 px-3">{t('employees.position', 'តួនាទី')}</th>
                  <th className="py-3.5 px-3">{t('employees.department', 'ផ្នែកការងារ')}</th>
                  <th className="py-3.5 px-3">{t('common.status', 'ស្ថានភាព')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'សកម្មភាព')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border font-medium">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/50 transition-colors"
                  >
                    {/* 1. ឈ្មោះ (Khmer Name) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-brand-200/60 dark:border-brand-800/40">
                          {(emp.khmerName || emp.displayName).charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 font-sans">
                            {emp.khmerName || emp.displayName}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            {emp.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. ឡាតាំង (Latin Name) */}
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                      {emp.latinName || emp.displayName || '—'}
                    </td>

                    {/* 3. ភេទ (Gender) */}
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300">
                        {emp.gender || 'ប្រុស'}
                      </span>
                    </td>

                    {/* 4. ជំនាញ (Skill) */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/40">
                        <GraduationCap className="w-3 h-3" />
                        {emp.skill || 'General'}
                      </span>
                    </td>

                    {/* 5. ថ្ងៃរៀន (Study Day / Shift) */}
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{emp.studyDay || 'Mon - Fri'}</span>
                      </div>
                    </td>

                    {/* 6. លេខទូរសព្ទ (Phone Number) */}
                    <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200 font-mono text-xs">
                      {emp.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 7. តួនាទី (Role / Position) */}
                    <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>{emp.position || 'Staff'}</span>
                      </div>
                    </td>

                    {/* 8. ផ្នែកការងារ (Department) */}
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {emp.department?.name || 'General'}
                      </span>
                    </td>

                    {/* 9. Status */}
                    <td className="py-3.5 px-3">
                      <Badge
                        status={emp.status === 'ACTIVE' ? 'APPROVED' : 'REJECTED'}
                        size="sm"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors"
                          title={t('common.edit', 'Edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResetPwd(emp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                          title={t('employees.resetPassword', 'Reset Password')}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEmployeeToDelete(emp)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title={t('common.delete', 'Delete')}
                          aria-label="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: ADD EMPLOYEE (Clean 8-field responsive layout) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('employees.addEmployee', 'បន្ថែមបុគ្គលិកថ្មី')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4 text-xs"
        >
          {/* Row 1: ឈ្មោះ (Khmer Name) & ឡាតាំង (Latin Name) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.khmerName', 'ឈ្មោះ (Khmer Name)')} *
              </label>
              <input
                type="text"
                required
                value={formData.khmerName}
                onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ឧ. ចាន់ សុខា"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.latinName', 'ឡាតាំង (Latin Name)')} *
              </label>
              <input
                type="text"
                required
                value={formData.latinName}
                onChange={(e) => setFormData({ ...formData, latinName: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Chan Sokha"
              />
            </div>
          </div>

          {/* Row 2: ភេទ (Gender) & ជំនាញ (Skill) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.gender', 'ភេទ (Gender)')}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ប្រុស">ប្រុស (Male)</option>
                <option value="ស្រី">ស្រី (Female)</option>
                <option value="ផ្សេងទៀត">ផ្សេងទៀត (Other)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.skill', 'ជំនាញ (Skill / Specialization)')}
              </label>
              <input
                type="text"
                value={formData.skill}
                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ឧ. Video Editor, Graphic Design, Frontend, HR..."
              />
            </div>
          </div>

          {/* Row 3: ថ្ងៃរៀន (Study Day) & លេខទូរសព្ទ (Phone Number) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.studyDay', 'ថ្ងៃរៀន (Study Days / Shift)')}
              </label>
              <input
                type="text"
                value={formData.studyDay}
                onChange={(e) => setFormData({ ...formData, studyDay: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ឧ. ច័ន្ទ - សុក្រ (Mon - Fri) ឬ វេនព្រឹក"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.phone', 'លេខទូរសព្ទ (Phone Number)')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="012 345 678"
              />
            </div>
          </div>

          {/* Row 4: តួនាទី (Role / Position) & ផ្នែកការងារ (Department) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.position', 'តួនាទី (Role / Position)')} *
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ឧ. Senior Officer, Designer, Specialist..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.department', 'ផ្នែកការងារ (Department)')}
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">ជ្រើសរើសផ្នែក (Select Department)</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Code & Custom Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-dark-border">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('employees.code', 'អត្តលេខ (Auto or Custom)')}
              </label>
              <input
                type="text"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Auto-generated (e.g. EMP-001)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('employees.password', 'ពាក្យសម្ងាត់ដំបូង')}
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              {t('common.cancel', 'បោះបង់')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createMutation.isPending}
            >
              {t('common.create', 'បង្កើតបុគ្គលិក')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT EMPLOYEE */}
      {selectedEmployee && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={t('employees.editEmployee', 'កែប្រែព័ត៌មានបុគ្គលិក')}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: selectedEmployee.id,
                payload: formData,
              });
            }}
            className="space-y-4 text-xs"
          >
            {/* Row 1: ឈ្មោះ & ឡាតាំង */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.khmerName', 'ឈ្មោះ')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.khmerName}
                  onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.latinName', 'ឡាតាំង')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.latinName}
                  onChange={(e) => setFormData({ ...formData, latinName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Row 2: ភេទ & ជំនាញ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.gender', 'ភេទ')}
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ប្រុស">ប្រុស (Male)</option>
                  <option value="ស្រី">ស្រី (Female)</option>
                  <option value="ផ្សេងទៀត">ផ្សេងទៀត (Other)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.skill', 'ជំនាញ')}
                </label>
                <input
                  type="text"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Row 3: ថ្ងៃរៀន & លេខទូរសព្ទ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.studyDay', 'ថ្ងៃរៀន')}
                </label>
                <input
                  type="text"
                  value={formData.studyDay}
                  onChange={(e) => setFormData({ ...formData, studyDay: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.phone', 'លេខទូរសព្ទ')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Row 4: តួនាទី & ផ្នែកការងារ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.position', 'តួនាទី')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.department', 'ផ្នែកការងារ')}
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">ជ្រើសរើសផ្នែក</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 5: ស្ថានភាព (Status) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('common.status', 'ស្ថានភាព')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ACTIVE">{t('common.active', 'Active')}</option>
                <option value="INACTIVE">{t('common.inactive', 'Inactive')}</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t('common.cancel', 'បោះបង់')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={updateMutation.isPending}
              >
                {t('common.save', 'រក្សាទុក')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: RESET PASSWORD */}
      {selectedEmployee && (
        <Modal
          isOpen={isResetPwdModalOpen}
          onClose={() => setIsResetPwdModalOpen(false)}
          title={`Reset Password for ${selectedEmployee.khmerName || selectedEmployee.displayName}`}
        >
          <div className="space-y-4 text-xs">
            {resetSuccessMsg ? (
              <div className="p-4 bg-success-50 dark:bg-success-950/40 border border-success-200 dark:border-success-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-success-700 dark:text-success-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Password Reset Complete</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-mono text-xs select-all">
                  {resetSuccessMsg}
                </p>
                <p className="text-[11px] text-slate-500">
                  Provide this password to the employee to sign in.
                </p>
              </div>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Reset account credentials for <strong>{selectedEmployee.khmerName || selectedEmployee.displayName}</strong> ({selectedEmployee.email}).
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password (Optional - leave blank for auto-generation)
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. Employee@123456"
                    className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-dark-border">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsResetPwdModalOpen(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={resetPwdMutation.isPending}
                    onClick={() =>
                      resetPwdMutation.mutate({
                        id: selectedEmployee.id,
                        password: newPassword,
                      })
                    }
                  >
                    Reset Password
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: DELETE EMPLOYEE CONFIRMATION */}
      {employeeToDelete && (
        <Modal
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          title={t('employees.deleteConfirmTitle', 'Delete Employee Record?')}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  {employeeToDelete.khmerName || employeeToDelete.displayName} ({employeeToDelete.employeeCode})
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {t(
                    'employees.deleteConfirmDesc',
                    'Are you sure you want to permanently delete this employee? All related attendance logs, leave balances, and login credentials will be removed from the database. This action cannot be undone.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-dark-border">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setEmployeeToDelete(null)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="danger"
                size="md"
                icon={Trash2}
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(employeeToDelete.id)}
              >
                {t('common.delete', 'Delete Permanently')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: IMPORT OFFICIAL EMPLOYEES CONFIRMATION */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title={t('employees.importConfirmTitle', 'Import 20 Official Employees?')}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">
                  {t('employees.importNoticeHeader', 'Full 20 Staff Roster Synchronization')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {t(
                    'employees.importNoticeDesc',
                    'This will import all 20 official employees with their exact Khmer names, Latin names, phone numbers, skills, study shifts, and department assignments. User login credentials will be generated with email (lastname@galaxytv4k.com) and default password (galaxytv@@).'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-dark-border">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsImportModalOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Sparkles}
                isLoading={importOfficialMutation.isPending}
                onClick={() => importOfficialMutation.mutate()}
              >
                {t('employees.confirmImport', 'Import Now (នាំចូលឥឡូវនេះ)')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
