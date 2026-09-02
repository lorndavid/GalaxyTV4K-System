import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportStats {
  period: { startDate: string; endDate: string };
  summary: {
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    earlyLeaveCount: number;
    totalWorkedMinutes: number;
    attendanceRate: number;
  };
  byDepartment: Array<{
    name: string;
    total: number;
    present: number;
    rate: number;
  }>;
  employeeSummaries: Array<{
    employeeId: string;
    employeeCode: string;
    displayName: string;
    department?: string;
    present: number;
    late: number;
    absent: number;
    workedMinutes: number;
  }>;
}

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading } = useQuery<ReportStats>({
    queryKey: ['adminReport', startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get(
        `/admin/reports/summary?startDate=${startDate}&endDate=${endDate}`
      );
      return res.data.data;
    },
  });

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await apiClient.get(
        `/admin/reports/export-csv?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Payroll CSV exported and downloaded successfully.');
    } catch (err) {
      console.error('Failed to export CSV', err);
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const totalHours = Math.round((report?.summary?.totalWorkedMinutes || 0) / 60);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Attendance Analytics & Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate aggregated staff attendance metrics and export official CSV reports for payroll.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            icon={Download}
            size="md"
            isLoading={isExporting}
            onClick={handleExportCSV}
          >
            Export Payroll CSV
          </Button>
        </div>
      </div>

      {/* Date Filter Card */}
      <Card padding="sm" className="flex flex-wrap items-center gap-3 border border-slate-200 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Date Period:</span>
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </Card>

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 flex flex-col justify-center">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Attendance Rate"
              value={`${report?.summary?.attendanceRate ?? 0}%`}
              subtitle="Across all shifts"
              icon={CheckCircle2}
              variant="blue"
              index={0}
            />
            <StatCard
              title="Total Worked Hours"
              value={`${totalHours} hrs`}
              subtitle={`${report?.summary?.totalRecords ?? 0} shift records`}
              icon={Clock}
              variant="green"
              index={1}
            />
            <StatCard
              title="Late Arrivals"
              value={report?.summary?.lateCount ?? 0}
              subtitle="Punches after grace period"
              icon={AlertCircle}
              variant="amber"
              index={2}
            />
            <StatCard
              title="Absences"
              value={report?.summary?.absentCount ?? 0}
              subtitle="Unapproved absences"
              icon={Users}
              variant="red"
              index={3}
            />
          </>
        )}
      </div>

      {/* Employee Breakdown Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee Summary Breakdown</h2>

        <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !report?.employeeSummaries || report.employeeSummaries.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No data in selected date range"
              description="Select a different date window to generate staff attendance summaries."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Present Days</th>
                    <th className="py-3.5 px-4">Late Arrivals</th>
                    <th className="py-3.5 px-4">Absences</th>
                    <th className="py-3.5 px-4 text-right">Worked Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {report.employeeSummaries.map((emp) => {
                    const hours = Math.floor(emp.workedMinutes / 60);
                    const mins = emp.workedMinutes % 60;

                    return (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{emp.displayName}</div>
                          <div className="font-mono text-xs text-slate-400">{emp.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">{emp.department || '—'}</td>
                        <td className="py-3.5 px-4 font-bold text-xs text-success-700 dark:text-success-400">
                          {emp.present} days
                        </td>
                        <td className="py-3.5 px-4 font-bold text-xs text-warning-700 dark:text-warning-400">
                          {emp.late}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-xs text-danger-700 dark:text-danger-400">
                          {emp.absent}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {hours}h {mins}m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
