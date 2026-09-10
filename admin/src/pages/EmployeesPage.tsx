import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
  Phone,
  GraduationCap,
  Briefcase,
  Trash2,
  Sparkles,
  ArrowUpDown,
  Filter,
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
  profilePhoto?: string | null;
  email: string;
  phone?: string;
  position: string;
  status: string;
  shiftType?: string;
  checkInStartTime?: string;
  checkInDeadline?: string;
  workEndTime?: string;
  studyClassInfo?: string;
  department?: { id: string; name: string };
  schedule?: { id: string; name: string };
  user?: { id: string; email: string; status: string };
}

// 7-day structure for Khmer week
const KHMER_WEEK_DAYS = [
  { key: 'ចន្ទ', en: 'Mon', index: 1 },
  { key: 'អង្គារ', en: 'Tue', index: 2 },
  { key: 'ពុធ', en: 'Wed', index: 3 },
  { key: 'ព្រហ', en: 'Thu', index: 4 },
  { key: 'សុក្រ', en: 'Fri', index: 5 },
  { key: 'សៅរ៍', en: 'Sat', index: 6 },
  { key: 'អាទិត្យ', en: 'Sun', index: 0 },
];

const STUDY_PRESETS = [
  { label: 'សុក្រ - សៅរ៍ - អាទិត្យ (Fri - Sun)', value: 'សុក្រ-សៅរ៍-អាទិត្យ' },
  { label: 'ព្រហ - សុក្រ (Thu - Fri)', value: 'ព្រហ-សុក្រ' },
  { label: 'ចន្ទ - អង្គារ (Mon - Tue)', value: 'ចន្ទ-អង្គារ' },
  { label: 'សៅរ៍ - អាទិត្យ (Sat - Sun)', value: 'សៅរ៍-អាទិត្យ' },
  { label: 'គ្មាន / ធ្វើការពេញម៉ោង (Full Work)', value: 'គ្មាន' },
];

function computeWorkDays(studyDay?: string | null): string {
  if (!studyDay || !studyDay.trim() || studyDay.includes('គ្មាន') || studyDay.includes('None')) {
    return 'ចន្ទ - សៅរ៍ (ពេញម៉ោង)';
  }
  const s = studyDay.trim();
  const workDays = KHMER_WEEK_DAYS.filter((d) => !s.includes(d.key));
  if (workDays.length === 0) return 'គ្មាន';
  return workDays.map((d) => d.key).join(' - ');
}

function isStudyDayToday(studyDay?: string | null): boolean {
  if (!studyDay) return false;
  const s = studyDay.trim();
  const todayIndex = new Date().getDay(); // 0: Sun, 1: Mon, ...
  if (todayIndex === 0 && s.includes('អាទិត្យ')) return true;
  if (todayIndex === 1 && s.includes('ចន្ទ')) return true;
  if (todayIndex === 2 && s.includes('អង្គារ')) return true;
  if (todayIndex === 3 && s.includes('ពុធ')) return true;
  if (todayIndex === 4 && (s.includes('ព្រហ') || s.includes('ព្រហស្បតិ៍'))) return true;
  if (todayIndex === 5 && s.includes('សុក្រ')) return true;
  if (todayIndex === 6 && s.includes('សៅរ៍')) return true;
  return false;
}

interface ScheduleDaySelectorProps {
  value: string;
  onChange: (val: string) => void;
}

const ScheduleDaySelector: React.FC<ScheduleDaySelectorProps> = ({ value, onChange }) => {
  const currentDays = useMemo(() => {
    if (!value || value.includes('គ្មាន')) return [];
    return KHMER_WEEK_DAYS.filter((d) => value.includes(d.key)).map((d) => d.key);
  }, [value]);

  const toggleDay = (key: string) => {
    let next: string[];
    if (currentDays.includes(key)) {
      next = currentDays.filter((k) => k !== key);
    } else {
      next = [...currentDays, key];
    }
    if (next.length === 0) {
      onChange('គ្មាន');
    } else {
      const ordered = KHMER_WEEK_DAYS.filter((d) => next.includes(d.key)).map((d) => d.key);
      onChange(ordered.join('-'));
    }
  };

  const workDaysText = useMemo(() => computeWorkDays(value), [value]);

  return (
    <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200 dark:border-dark-border">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          កាលវិភាគថ្ងៃរៀន & ថ្ងៃធ្វើការ (Work & Study Schedule)
        </label>
        <span className="text-[10px] text-slate-400 font-medium">ចុចលើថ្ងៃដើម្បីជ្រើសរើស</span>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5">
        {STUDY_PRESETS.map((preset) => {
          const isSelected =
            value === preset.value ||
            (preset.value === 'គ្មាន' && (!value || value.includes('គ្មាន')));
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* 7 Days Toggle Pills */}
      <div className="grid grid-cols-7 gap-1 pt-1">
        {KHMER_WEEK_DAYS.map((day) => {
          const isStudy = currentDays.includes(day.key);
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center ${
                isStudy
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300 dark:ring-indigo-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
              }`}
            >
              <span className="text-[11px] font-bold leading-tight">{day.key}</span>
              <span className="text-[9px] opacity-80 uppercase tracking-tighter">{day.en}</span>
              <span className="text-[8px] font-semibold mt-0.5 px-1 py-0.2 rounded bg-black/10 dark:bg-white/10">
                {isStudy ? 'រៀន' : 'ធ្វើការ'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary live badges */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200/60 dark:border-dark-border text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-medium">🎓 ថ្ងៃរៀន:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {value && !value.includes('គ្មាន') ? value : 'គ្មាន (ពេញម៉ោង)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-medium">🛠 ថ្ងៃធ្វើការ:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{workDaysText}</span>
        </div>
      </div>
    </div>
  );
};

export const EmployeesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dutyFilter, setDutyFilter] = useState<'ALL' | 'WORK_TODAY' | 'STUDY_TODAY'>('ALL');
  const [studyPresetFilter, setStudyPresetFilter] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'dept' | 'study' | 'status'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Form states with the requested fields
  const [formData, setFormData] = useState({
    khmerName: '',
    latinName: '',
    gender: 'ប្រុស',
    skill: '',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '',
    position: '',
    departmentId: '',
    scheduleId: '',
    employeeCode: '',
    email: '',
    password: 'Employee@123456',
    status: 'ACTIVE',
    shiftType: 'STANDARD',
    checkInStartTime: '07:30',
    checkInDeadline: '07:30',
    workEndTime: '17:30',
    studyClassInfo: '',
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await apiClient.post('/admin/employees', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsAddModalOpen(false);
      resetForm();
      showToast('បុគ្គលិកថ្មីត្រូវបានបង្កើតដោយជោគជ័យ (Employee created successfully)');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to create employee.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof formData }) => {
      const res = await apiClient.put(`/admin/employees/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      showToast('ព័ត៌មានបុគ្គលិក និងកាលវិភាគត្រូវបានកែប្រែ (Employee & schedule updated successfully)');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to update employee.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/admin/employees/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEmployeeToDelete(null);
      showToast('បុគ្គលិកត្រូវបានលុបចេញពីប្រព័ន្ធ (Employee deleted successfully)');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to delete employee.', 'error');
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => {
      const res = await apiClient.post(`/admin/employees/${id}/reset-password`, { password });
      return res.data.data;
    },
    onSuccess: (data) => {
      setResetSuccessMsg(`New Password: ${data.temporaryPassword}`);
      showToast('ពាក្យសម្ងាត់ត្រូវបានប្តូរដោយជោគជ័យ (Password reset successfully)');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to reset password.', 'error');
    },
  });

  const importOfficialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/admin/seed-employees');
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsImportModalOpen(false);
      showToast(
        `នាំចូលជោគជ័យ! បុគ្គលិកចំនួន ${data?.totalImported || 20} នាក់ត្រូវបានធ្វើបច្ចុប្បន្នភាព។`
      );
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
      studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
      phone: '',
      position: '',
      departmentId: '',
      scheduleId: '',
      employeeCode: '',
      email: '',
      password: 'Employee@123456',
      status: 'ACTIVE',
      shiftType: 'STANDARD',
      checkInStartTime: '07:30',
      checkInDeadline: '07:30',
      workEndTime: '17:30',
      studyClassInfo: '',
    });
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      khmerName: emp.khmerName || emp.displayName || '',
      latinName: emp.latinName || '',
      gender: emp.gender || 'ប្រុស',
      skill: emp.skill || '',
      studyDay: emp.studyDay || 'គ្មាន',
      phone: emp.phone || '',
      position: emp.position || '',
      departmentId: emp.department?.id || '',
      scheduleId: emp.schedule?.id || '',
      employeeCode: emp.employeeCode || '',
      email: emp.email || '',
      password: '',
      status: emp.status || 'ACTIVE',
      shiftType: emp.shiftType || 'STANDARD',
      checkInStartTime: emp.checkInStartTime || '07:30',
      checkInDeadline: emp.checkInDeadline || '07:30',
      workEndTime: emp.workEndTime || '17:30',
      studyClassInfo: emp.studyClassInfo || '',
    });
    setIsEditModalOpen(true);
  };

  const openResetPwd = (emp: Employee) => {
    setSelectedEmployee(emp);
    setNewPassword('');
    setResetSuccessMsg('');
    setIsResetPwdModalOpen(true);
  };

  // KPIs
  const stats = useMemo(() => {
    const list = employees || [];
    const total = list.length;
    const studyingToday = list.filter((e) => isStudyDayToday(e.studyDay)).length;
    const workingToday = total - studyingToday;
    const active = list.filter((e) => e.status === 'ACTIVE').length;
    return { total, workingToday, studyingToday, active };
  }, [employees]);

  // Filtering and Sorting
  const filteredEmployees = useMemo(() => {
    let list = employees || [];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((emp) => {
        const kh = (emp.khmerName || '').toLowerCase();
        const lat = (emp.latinName || '').toLowerCase();
        const disp = (emp.displayName || '').toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const phone = (emp.phone || '').toLowerCase();
        const skill = (emp.skill || '').toLowerCase();
        const pos = (emp.position || '').toLowerCase();
        const dept = (emp.department?.name || '').toLowerCase();
        const study = (emp.studyDay || '').toLowerCase();
        return (
          kh.includes(q) ||
          lat.includes(q) ||
          disp.includes(q) ||
          code.includes(q) ||
          phone.includes(q) ||
          skill.includes(q) ||
          pos.includes(q) ||
          dept.includes(q) ||
          study.includes(q)
        );
      });
    }

    // Department filter
    if (departmentFilter) {
      list = list.filter((e) => e.department?.id === departmentFilter);
    }

    // Status filter
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    }

    // Duty today filter
    if (dutyFilter === 'STUDY_TODAY') {
      list = list.filter((e) => isStudyDayToday(e.studyDay));
    } else if (dutyFilter === 'WORK_TODAY') {
      list = list.filter((e) => !isStudyDayToday(e.studyDay));
    }

    // Study Schedule Preset filter
    if (studyPresetFilter) {
      if (studyPresetFilter === 'NONE') {
        list = list.filter((e) => !e.studyDay || e.studyDay.includes('គ្មាន'));
      } else {
        list = list.filter((e) => e.studyDay?.includes(studyPresetFilter));
      }
    }

    // Sort
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'code') {
        comparison = (a.employeeCode || '').localeCompare(b.employeeCode || '');
      } else if (sortBy === 'name') {
        const nameA = a.khmerName || a.displayName || '';
        const nameB = b.khmerName || b.displayName || '';
        comparison = nameA.localeCompare(nameB, 'km');
      } else if (sortBy === 'dept') {
        const deptA = a.department?.name || '';
        const deptB = b.department?.name || '';
        comparison = deptA.localeCompare(deptB);
      } else if (sortBy === 'study') {
        const studyA = a.studyDay || '';
        const studyB = b.studyDay || '';
        comparison = studyA.localeCompare(studyB);
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    employees,
    searchTerm,
    departmentFilter,
    statusFilter,
    dutyFilter,
    studyPresetFilter,
    sortBy,
    sortOrder,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('employees.title', 'ការគ្រប់គ្រងបុគ្គលិក (Staff Directory & Schedules)')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'employees.subtitle',
              'Manage staff profiles, work and study day shifts, positions, and live account status'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            icon={Sparkles}
            size="md"
            className="border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 bg-brand-50/70 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 font-semibold"
            onClick={() => setIsImportModalOpen(true)}
          >
            {t('employees.importOfficial', 'Import All 20 Staff (នាំចូលបុគ្គលិក)')}
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

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-gradient-to-br from-slate-50 to-white dark:from-dark-elevated dark:to-dark border border-slate-200/80 dark:border-dark-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              បុគ្គលិកសរុប (Total Staff)
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.total}
            </span>
            <span className="text-xs text-slate-400">នាក់</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-dark border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              ធ្វើការថ្ងៃនេះ (Work Duty Today)
            </span>
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {stats.workingToday}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">នាក់</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/20 dark:to-dark border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
              រៀនថ្ងៃនេះ (Study Session Today)
            </span>
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
              {stats.studyingToday}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">នាក់</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/20 dark:to-dark border border-blue-200/80 dark:border-blue-800/60 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
              ស្ថានភាពសកម្ម (Active Status)
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {stats.active}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">នាក់</span>
          </div>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <Card
        padding="sm"
        className="flex flex-col md:flex-row items-stretch md:items-center gap-3 border border-slate-200 dark:border-dark-border"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ស្វែងរកតាម ឈ្មោះ, ឡាតាំង, ជំនាញ, កូដ, ថ្ងៃរៀន..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Duty Today Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-dark-elevated p-1 rounded-xl border border-slate-200 dark:border-dark-border">
            <button
              type="button"
              onClick={() => setDutyFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dutyFilter === 'ALL'
                  ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ទាំងអស់ (All)
            </button>
            <button
              type="button"
              onClick={() => setDutyFilter('WORK_TODAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dutyFilter === 'WORK_TODAY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              💼 ធ្វើការថ្ងៃនេះ ({stats.workingToday})
            </button>
            <button
              type="button"
              onClick={() => setDutyFilter('STUDY_TODAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dutyFilter === 'STUDY_TODAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              🎓 រៀនថ្ងៃនេះ ({stats.studyingToday})
            </button>
          </div>

          {/* Study Schedule Filter */}
          <select
            value={studyPresetFilter}
            onChange={(e) => setStudyPresetFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          >
            <option value="">គ្រប់កាលវិភាគថ្ងៃរៀន (All Study Shifts)</option>
            <option value="សុក្រ-សៅរ៍-អាទិត្យ">សុក្រ-សៅរ៍-អាទិត្យ (Fri-Sun)</option>
            <option value="ព្រហ-សុក្រ">ព្រហ-សុក្រ (Thu-Fri)</option>
            <option value="ចន្ទ-អង្គារ">ចន្ទ-អង្គារ (Mon-Tue)</option>
            <option value="សៅរ៍-អាទិត្យ">សៅរ៍-អាទិត្យ (Sat-Sun)</option>
            <option value="NONE">គ្មានថ្ងៃរៀន / ពេញម៉ោង (Full-Time)</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          >
            <option value="">{t('common.all', 'All')} ផ្នែក (Departments)</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          >
            <option value="">{t('common.all', 'All')} ស្ថានភាព (Statuses)</option>
            <option value="ACTIVE">🟢 {t('common.active', 'Active')}</option>
            <option value="INACTIVE">🔴 {t('common.inactive', 'Inactive')}</option>
            <option value="SUSPENDED">🟠 Suspended</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-medium"
            >
              <option value="code">តម្រៀបតាម: អត្តលេខ (Code)</option>
              <option value="name">តម្រៀបតាម: ឈ្មោះ (Name)</option>
              <option value="dept">តម្រៀបតាម: ផ្នែក (Department)</option>
              <option value="study">តម្រៀបតាម: ថ្ងៃរៀន (Study Day)</option>
              <option value="status">តម្រៀបតាម: ស្ថានភាព (Status)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="text-[10px] font-bold px-1 py-0.5 rounded bg-slate-200/60 dark:bg-dark-border text-slate-600 dark:text-slate-300"
              title="Reverse Order"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card
        padding="none"
        className="overflow-hidden border border-slate-200 dark:border-dark-border shadow-xs"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="រកមិនឃើញបុគ្គលិកទេ (No employees found)"
            description="គ្មានបុគ្គលិកត្រូវគ្នានឹងការស្វែងរក ឬតម្រងដែលបានជ្រើសរើសទេ។"
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
                  <th className="py-3.5 px-4">{t('employees.khmerName', 'ឈ្មោះ & កូដ')}</th>
                  <th className="py-3.5 px-3">{t('employees.latinName', 'ឡាតាំង & ភេទ')}</th>
                  <th className="py-3.5 px-3">ផ្នែក & តួនាទី (Dept & Role)</th>
                  <th className="py-3.5 px-3">🎓 ថ្ងៃរៀន (Study Shift)</th>
                  <th className="py-3.5 px-3">🛠 ថ្ងៃធ្វើការ (Work Days)</th>
                  <th className="py-3.5 px-3">វេនថ្ងៃនេះ (Today's Duty)</th>
                  <th className="py-3.5 px-3">{t('common.status', 'ស្ថានភាព')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'សកម្មភាព')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border font-medium">
                {filteredEmployees.map((emp) => {
                  const isStudyingToday = isStudyDayToday(emp.studyDay);
                  const workDaysText = computeWorkDays(emp.studyDay);
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/50 transition-colors"
                    >
                      {/* 1. ឈ្មោះ & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-brand-200/60 dark:border-brand-800/40 overflow-hidden">
                            {emp.profilePhoto ? (
                              <img
                                src={emp.profilePhoto}
                                alt={emp.khmerName || emp.displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              (emp.khmerName || emp.displayName).charAt(0)
                            )}
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

                      {/* 2. ឡាតាំង & ភេទ */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{emp.latinName || emp.displayName || '—'}</div>
                        <span className="text-[10px] text-slate-400">{emp.gender || 'ប្រុស'}</span>
                      </td>

                      {/* 3. ផ្នែក & តួនាទី */}
                      <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {emp.department?.name || 'General'}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.position || 'Staff'}</div>
                      </td>

                      {/* 4. 🎓 ថ្ងៃរៀន (Study Shift) */}
                      <td className="py-3.5 px-3">
                        {emp.studyDay && !emp.studyDay.includes('គ្មាន') ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {emp.studyDay}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-dark-elevated px-2 py-0.5 rounded-lg">
                            ពេញម៉ោង (Full-Time)
                          </span>
                        )}
                      </td>

                      {/* 5. 🛠 ថ្ងៃធ្វើការ (Work Days) */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                          <Briefcase className="w-3.5 h-3.5" />
                          {workDaysText}
                        </span>
                      </td>

                      {/* 6. វេនថ្ងៃនេះ (Today's Duty) */}
                      <td className="py-3.5 px-3">
                        {isStudyingToday ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 animate-pulse">
                            🎓 រៀនថ្ងៃនេះ (Studying)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            💼 ធ្វើការថ្ងៃនេះ (Working)
                          </span>
                        )}
                      </td>

                      {/* 7. ស្ថានភាព (Status) */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800/60'
                              : emp.status === 'SUSPENDED'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === 'ACTIVE'
                                ? 'bg-success-500'
                                : emp.status === 'SUSPENDED'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {emp.status}
                        </span>
                      </td>

                      {/* 8. សកម្មភាព (Actions) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors cursor-pointer"
                            title={t('common.edit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openResetPwd(emp)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            title={t('employees.resetPassword', 'Reset Password')}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title={t('common.delete', 'Delete')}
                            aria-label="Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: ADD EMPLOYEE */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('employees.addEmployee', 'បន្ថែមបុគ្គលិកថ្មី (New Staff)')}
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

          {/* Row 2: ភេទ & ជំនាញ */}
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
                placeholder="ឧ. Mobile Developer, Accounting..."
              />
            </div>
          </div>

          {/* Interactive Work & Study Day Selector */}
          <ScheduleDaySelector
            value={formData.studyDay}
            onChange={(val) => setFormData({ ...formData, studyDay: val })}
          />

          {/* Row 3: លេខទូរសព្ទ & អ៊ីមែល */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('employees.email', 'អ៊ីមែល (Email)')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="sokha@galaxytv4k.com"
              />
            </div>
          </div>

          {/* Row 4: តួនាទី & ផ្នែកការងារ */}
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
                placeholder="ឧ. Software Engineer"
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
          title={t('employees.editEmployee', 'កែប្រែព័ត៌មានបុគ្គលិក & កាលវិភាគ')}
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
                  {t('employees.khmerName', 'ឈ្មោះ (Khmer Name)')} *
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
                  {t('employees.latinName', 'ឡាតាំង (Latin Name)')} *
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
                  {t('employees.skill', 'ជំនាញ (Skill)')}
                </label>
                <input
                  type="text"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Interactive Work & Study Day Selector */}
            <ScheduleDaySelector
              value={formData.studyDay}
              onChange={(val) => setFormData({ ...formData, studyDay: val })}
            />

            {/* Row 3: លេខទូរសព្ទ & អ៊ីមែល */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.phone', 'លេខទូរសព្ទ (Phone)')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.email', 'អ៊ីមែល (Email)')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Row 4: តួនាទី & ផ្នែកការងារ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employees.position', 'តួនាទី (Position)')} *
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
                  {t('employees.department', 'ផ្នែកការងារ (Department)')}
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

            {/* Shift & Check-In Window Section */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200 dark:border-dark-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  វេនការងារ & ម៉ោង Check-in (Work Shift & Check-In Window)
                </label>
                <span className="text-[10px] text-slate-400 font-medium">កំណត់សម្រាប់បុគ្គលិកម្នាក់ៗ</span>
              </div>

              {/* Shift Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      shiftType: 'STANDARD',
                      checkInStartTime: '08:00',
                      checkInDeadline: '08:00',
                      workEndTime: '17:30',
                      studyClassInfo: '',
                    })
                  }
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    formData.shiftType === 'STANDARD' || !formData.shiftType
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">☀️ វេនធម្មតា (08:00)</div>
                  <div className="text-[10px] opacity-80">ចូល 08:00 - ចេញ 17:30</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      shiftType: 'AFTERNOON',
                      checkInStartTime: '12:00',
                      checkInDeadline: '13:00',
                      workEndTime: '17:30',
                      studyClassInfo: 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)',
                    })
                  }
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    formData.shiftType === 'AFTERNOON'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">🎓 វេនរសៀល (12:00 - 13:00)</div>
                  <div className="text-[10px] opacity-80">រៀនចិនព្រឹក ចូលមុន 13:00</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      shiftType: 'CUSTOM',
                    })
                  }
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    formData.shiftType === 'CUSTOM'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">⚙️ កំណត់ផ្ទាល់ខ្លួន</div>
                  <div className="text-[10px] opacity-80">កែប្រែម៉ោងដោយសេរី</div>
                </button>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ម៉ោងបើកឱ្យ Check-in (Open Time)
                  </label>
                  <input
                    type="time"
                    value={formData.checkInStartTime || '07:30'}
                    onChange={(e) => setFormData({ ...formData, checkInStartTime: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ម៉ោងកំណត់ត្រូវ Check-in / យឺត (Deadline)
                  </label>
                  <input
                    type="time"
                    value={formData.checkInDeadline || '07:30'}
                    onChange={(e) => setFormData({ ...formData, checkInDeadline: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Study Class Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ព័ត៌មានម៉ោងរៀនភាសា / វគ្គសិក្សា (Study Class Info)
                </label>
                <input
                  type="text"
                  value={formData.studyClassInfo || ''}
                  onChange={(e) => setFormData({ ...formData, studyClassInfo: e.target.value })}
                  placeholder="ឧ. រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Row 5: ស្ថានភាព (Status) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('common.status', 'ស្ថានភាពគណនីបុគ្គលិក (Employee Status)')} *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ACTIVE">🟢 សកម្ម (ACTIVE) - Full Access & Attendance</option>
                <option value="SUSPENDED">🟠 ផ្អាកបណ្តោះអាសន្ន (SUSPENDED)</option>
                <option value="INACTIVE">🔴 អសកម្ម (INACTIVE) - Deactivated</option>
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
                {t('common.save', 'រក្សាទុក (Save All Changes)')}
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
                  Reset account credentials for{' '}
                  <strong>{selectedEmployee.khmerName || selectedEmployee.displayName}</strong> (
                  {selectedEmployee.email}).
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
                  {employeeToDelete.khmerName || employeeToDelete.displayName} (
                  {employeeToDelete.employeeCode})
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
