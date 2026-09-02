import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ShieldAlert, Search, Filter, Terminal } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actorType: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    email: string;
    employee?: { displayName: string };
  };
}

export const AuditLogsPage: React.FC = () => {
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs', actionFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/audit-logs?action=${actionFilter}`);
      return res.data.data;
    },
  });

  const filtered = logs?.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor?.employee?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System Audit Trail</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Immutable forensic log of administrative corrections, security actions, and policy changes.
        </p>
      </div>

      {/* Filter Bar */}
      <Card padding="sm" className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 border border-slate-200 dark:border-dark-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs py-2 px-3 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
        >
          <option value="">All Actions</option>
          <option value="ATTENDANCE_CHECK_IN">ATTENDANCE_CHECK_IN</option>
          <option value="ATTENDANCE_CHECK_OUT">ATTENDANCE_CHECK_OUT</option>
          <option value="ATTENDANCE_MANUAL_ADJUSTMENT">ATTENDANCE_MANUAL_ADJUSTMENT</option>
          <option value="QR_GENERATED">QR_GENERATED</option>
          <option value="LEAVE_APPROVED">LEAVE_APPROVED</option>
          <option value="LEAVE_REJECTED">LEAVE_REJECTED</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
        </select>
      </Card>

      {/* Main Table */}
      <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-dark-border">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No audit logs found"
            description="System events and administrative actions will be recorded here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Metadata Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300 font-mono text-xs">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-dark-elevated/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {log.actor?.employee?.displayName || log.actorType}
                      </div>
                      <div className="text-[11px] text-slate-400">{log.actor?.email || 'System'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800 font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-700 dark:text-slate-300">
                      <span className="font-bold">{log.entityType}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-md truncate text-slate-500 dark:text-slate-400 text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
