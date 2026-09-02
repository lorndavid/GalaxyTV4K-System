import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarOff,
  QrCode,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardMetrics {
  today: string;
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  onLeaveCount: number;
  currentlyOutCount: number;
  absentCount: number;
  attendancePercentage: number;
  pendingLeaveCount: number;
  pendingOutCount: number;
  recentActivity: Array<{
    id: string;
    employee: {
      displayName: string;
      employeeCode: string;
      department?: { name: string };
    };
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
    lateMinutes: number;
  }>;
}

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'km';

  const { data, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/dashboard');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const currentDateFormatted = new Intl.DateTimeFormat(currentLang === 'km' ? 'km-KH' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const totalStaff = data?.totalEmployees ?? 0;
  const presentStaff = data?.presentCount ?? 0;
  const lateStaff = data?.lateCount ?? 0;
  const absentStaff = data?.absentCount ?? 0;
  const leaveStaff = data?.onLeaveCount ?? 0;
  const attendanceRate = data?.attendancePercentage ?? 0;
  const pendingLeaves = data?.pendingLeaveCount ?? 0;
  const pendingOuts = data?.pendingOutCount ?? 0;
  const liveActivity = data?.recentActivity ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('common.dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {currentDateFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/qr-station">
            <Button variant="primary" icon={QrCode} size="md">
              {t('common.qrAttendance')}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-28 flex flex-col justify-center">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title={currentLang === 'km' ? 'បុគ្គលិកសរុប' : 'Total Staff'}
              value={totalStaff}
              subtitle={currentLang === 'km' ? 'បានចុះឈ្មោះសកម្ម' : 'Active registered'}
              icon={Users}
              variant="blue"
            />
            <StatCard
              title={currentLang === 'km' ? 'វត្តមានថ្ងៃនេះ' : 'Present Today'}
              value={presentStaff}
              subtitle={`${attendanceRate}% ${currentLang === 'km' ? 'អត្រាវត្តមាន' : 'attendance rate'}`}
              icon={CheckCircle2}
              variant="green"
            />
            <StatCard
              title={currentLang === 'km' ? 'មកយឺត' : 'Late Arrivals'}
              value={lateStaff}
              subtitle={currentLang === 'km' ? 'លើសម៉ោងអនុគ្រោះ' : 'Exceeded grace period'}
              icon={Clock}
              variant="amber"
            />
            <StatCard
              title={currentLang === 'km' ? 'អវត្តមាន' : 'Absent'}
              value={absentStaff}
              subtitle={currentLang === 'km' ? 'គ្មានការអនុញ្ញាត' : 'Unaccounted for'}
              icon={AlertCircle}
              variant="red"
            />
            <StatCard
              title={currentLang === 'km' ? 'កំពុងសុំច្បាប់' : 'On Leave'}
              value={leaveStaff}
              subtitle={currentLang === 'km' ? 'បានអនុម័ត' : 'Approved absences'}
              icon={CalendarOff}
              variant="purple"
            />
          </>
        )}
      </div>

      {/* Attendance Rate Progress Banner */}
      <Card className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {currentLang === 'km' ? 'វឌ្ឍនភាពវត្តមានការងារ' : 'Attendance Progress'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {presentStaff} {currentLang === 'km' ? 'នាក់ ក្នុងចំណោម' : 'of'} {totalStaff}{' '}
              {currentLang === 'km' ? 'នាក់ បានស្កេនចូលធ្វើការថ្ងៃនេះ' : 'employees checked in today'}
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              <span>{currentLang === 'km' ? 'អត្រាភាគរយ' : 'Rate'}</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{attendanceRate}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-dark-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 dark:bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(attendanceRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid: Live Feed & Quick Action Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Attendance Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {currentLang === 'km' ? 'សកម្មភាពស្កេនវត្តមានថ្ងៃនេះ' : "Today's Attendance Activity"}
            </h2>
            <Link
              to="/attendance"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1"
            >
              {currentLang === 'km' ? 'មើលកំណត់ត្រាពេញលេញ' : 'View Full Log'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : liveActivity.length === 0 ? (
              <EmptyState
                icon={Clock}
                title={currentLang === 'km' ? 'មិនទាន់មានការស្កេនវត្តមាននៅឡើយទេ' : 'No check-ins recorded yet'}
                description={
                  currentLang === 'km'
                    ? 'ទិន្នន័យស្កេនចូល និងចេញរបស់បុគ្គលិកនឹងបង្ហាញនៅទីនេះពេលពួកគេស្កេន QR។'
                    : 'Staff check-ins and check-outs for today will appear here as they scan in.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{currentLang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                      <th className="py-3 px-4">{currentLang === 'km' ? 'ផ្នែក' : 'Department'}</th>
                      <th className="py-3 px-4">{currentLang === 'km' ? 'ម៉ោងចូល' : 'Check-In'}</th>
                      <th className="py-3 px-4">{currentLang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                    {liveActivity.slice(0, 8).map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-elevated/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {record.employee.displayName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {record.employee.employeeCode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {record.employee.department?.name || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {record.checkInAt
                            ? new Date(record.checkInAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={record.status} size="sm" />
                          {record.lateMinutes > 0 && (
                            <span className="ml-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              +{record.lateMinutes}m
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Pending Reviews & Action Shortcuts */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {currentLang === 'km' ? 'សំណើរង់ចាំការអនុម័ត' : 'Pending Actions'}
          </h2>

          <Card className="space-y-3 border border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-dark-border">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('common.leaveRequests')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentLang === 'km' ? 'រង់ចាំការត្រួតពិនិត្យពីថ្នាក់ដឹកនាំ' : 'Awaiting management review'}
                </p>
              </div>
              <Link to="/leave">
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 hover:bg-brand-100 transition-colors">
                  {pendingLeaves} {currentLang === 'km' ? 'កំពុងរង់ចាំ' : 'Pending'}
                </span>
              </Link>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('common.outRequests')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentLang === 'km' ? 'សុំអនុញ្ញាតចេញក្រៅបណ្តោះអាសន្ន' : 'Temporary departure requests'}
                </p>
              </div>
              <Link to="/out-requests">
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 hover:bg-brand-100 transition-colors">
                  {pendingOuts} {currentLang === 'km' ? 'កំពុងរង់ចាំ' : 'Pending'}
                </span>
              </Link>
            </div>
          </Card>

          <Card className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {currentLang === 'km' ? 'ផ្លូវកាត់រហ័ស' : 'Quick Navigation'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/employees">
                <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                  {t('common.employees')}
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                  {t('common.reports')}
                </Button>
              </Link>
              <Link to="/schedules">
                <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                  {t('common.schedules')}
                </Button>
              </Link>
              <Link to="/location">
                <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                  {t('common.employeeLocation')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
