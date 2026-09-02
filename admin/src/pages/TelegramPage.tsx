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
  Send,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  MessageSquare,
  Bell,
  RefreshCw,
} from 'lucide-react';

interface TelegramChat {
  id: string;
  chatId: string;
  label: string;
  enabled: boolean;
  createdAt: string;
}

interface TelegramConfig {
  id: string;
  hasBotToken: boolean;
  botTokenMasked: string;
  botUsername: string | null;
  enabled: boolean;
  attendanceNotificationsEnabled: boolean;
  locationNotificationsEnabled: boolean;
  dailySummaryEnabled: boolean;
  systemAlertsEnabled: boolean;
  chats: TelegramChat[];
}

export const TelegramPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [botTokenInput, setBotTokenInput] = useState('');
  const [testChatIdInput, setTestChatIdInput] = useState('');
  const [isAddChatOpen, setIsAddChatOpen] = useState(false);
  const [newChat, setNewChat] = useState({ chatId: '', label: '' });
  const [testStatus, setTestStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Fetch Telegram Config
  const { data, isLoading, refetch } = useQuery<TelegramConfig>({
    queryKey: ['adminTelegramConfig'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/telegram/config');
      return res.data.data;
    },
  });

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/admin/telegram/config', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTelegramConfig'] });
      setBotTokenInput('');
      showToast('Telegram configuration saved successfully.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to save config.', 'error');
    },
  });

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: async (payload: { botToken?: string; chatId?: string }) => {
      return await apiClient.post('/admin/telegram/test', payload);
    },
    onSuccess: (res) => {
      setTestStatus({
        success: true,
        message: res.data.data.message || 'Telegram Bot connected successfully!',
      });
      showToast('Telegram connection verified.');
    },
    onError: (err: any) => {
      setTestStatus({
        success: false,
        message: err?.response?.data?.error?.message || 'Unable to connect to Telegram Bot.',
      });
      showToast('Telegram connection test failed.', 'error');
    },
  });

  // Add Chat Mutation
  const addChatMutation = useMutation({
    mutationFn: async (payload: { chatId: string; label: string }) => {
      return await apiClient.post('/admin/telegram/chats', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTelegramConfig'] });
      setIsAddChatOpen(false);
      setNewChat({ chatId: '', label: '' });
      showToast('Telegram chat added.');
    },
  });

  // Delete Chat Mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/admin/telegram/chats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTelegramConfig'] });
      showToast('Chat channel removed.');
    },
  });

  // Send Daily Summary Mutation
  const summaryMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/telegram/daily-summary');
    },
    onSuccess: () => {
      showToast('Daily summary dispatched to Telegram.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to dispatch summary.', 'error');
    },
  });

  const isConnected = data?.enabled && data?.hasBotToken;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Telegram Bot Integration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure automated attendance alerts, office entry events, and daily summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Send}
            isLoading={summaryMutation.isPending}
            onClick={() => summaryMutation.mutate()}
          >
            Send Daily Summary Now
          </Button>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="p-5 border-slate-200 dark:border-dark-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isConnected
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                  : 'bg-slate-100 dark:bg-dark-elevated text-slate-400'
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {data?.botUsername ? `@${data.botUsername}` : 'Telegram Bot Channel'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isConnected
                      ? 'bg-success-50 dark:bg-success-950/50 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800'
                      : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-border'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-success-500' : 'bg-slate-400'
                    }`}
                  />
                  {isConnected ? 'Connected & Active' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data?.chats?.length || 0} registered chat recipient(s) receiving instant alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              isLoading={testMutation.isPending}
              onClick={() => {
                setTestStatus(null);
                testMutation.mutate({
                  botToken: botTokenInput || undefined,
                  chatId: testChatIdInput || data?.chats?.[0]?.chatId || undefined,
                });
              }}
            >
              Test Connection
            </Button>
          </div>
        </div>

        {/* Test Result Message */}
        {testStatus && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testStatus.success
                ? 'bg-success-50 dark:bg-success-950/40 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800'
                : 'bg-danger-50 dark:bg-danger-950/40 text-danger-800 dark:text-danger-300 border-danger-200 dark:border-danger-800'
            }`}
          >
            {testStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testStatus.success ? 'Success' : 'Connection Error'}</p>
              <p className="mt-0.5">{testStatus.message}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Main Settings & Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Settings & Credentials Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 space-y-4 border-slate-200 dark:border-dark-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Bot Credentials & Policy
            </h3>

            {/* Enable switch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Enable Telegram Notifications
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Master switch to toggle all outbound Telegram notifications
                </span>
              </div>
              <input
                type="checkbox"
                checked={data?.enabled || false}
                onChange={(e) => {
                  saveMutation.mutate({
                    enabled: e.target.checked,
                    attendanceNotificationsEnabled: data?.attendanceNotificationsEnabled,
                    locationNotificationsEnabled: data?.locationNotificationsEnabled,
                    dailySummaryEnabled: data?.dailySummaryEnabled,
                    systemAlertsEnabled: data?.systemAlertsEnabled,
                  });
                }}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </div>

            {/* Token Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telegram Bot Token
              </label>
              <input
                type="password"
                placeholder={data?.botTokenMasked || '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'}
                value={botTokenInput}
                onChange={(e) => setBotTokenInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-dark-elevated text-slate-900 dark:text-slate-100"
              />
              <p className="text-[10px] text-slate-400">
                Created via @BotFather on Telegram. Token is encrypted with AES-256 in the database.
              </p>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Notification Events</span>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data?.attendanceNotificationsEnabled || false}
                  onChange={(e) => {
                    saveMutation.mutate({
                      enabled: data?.enabled,
                      attendanceNotificationsEnabled: e.target.checked,
                      locationNotificationsEnabled: data?.locationNotificationsEnabled,
                      dailySummaryEnabled: data?.dailySummaryEnabled,
                      systemAlertsEnabled: data?.systemAlertsEnabled,
                    });
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Attendance Check-In & Check-Out alerts (includes GPS distance & late info)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data?.locationNotificationsEnabled || false}
                  onChange={(e) => {
                    saveMutation.mutate({
                      enabled: data?.enabled,
                      attendanceNotificationsEnabled: data?.attendanceNotificationsEnabled,
                      locationNotificationsEnabled: e.target.checked,
                      dailySummaryEnabled: data?.dailySummaryEnabled,
                      systemAlertsEnabled: data?.systemAlertsEnabled,
                    });
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Office Entry & Exit perimeter crossing events (with hysteresis buffer)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data?.dailySummaryEnabled || false}
                  onChange={(e) => {
                    saveMutation.mutate({
                      enabled: data?.enabled,
                      attendanceNotificationsEnabled: data?.attendanceNotificationsEnabled,
                      locationNotificationsEnabled: data?.locationNotificationsEnabled,
                      dailySummaryEnabled: e.target.checked,
                      systemAlertsEnabled: data?.systemAlertsEnabled,
                    });
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Scheduled Daily Attendance Summary</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data?.systemAlertsEnabled || false}
                  onChange={(e) => {
                    saveMutation.mutate({
                      enabled: data?.enabled,
                      attendanceNotificationsEnabled: data?.attendanceNotificationsEnabled,
                      locationNotificationsEnabled: data?.locationNotificationsEnabled,
                      dailySummaryEnabled: data?.dailySummaryEnabled,
                      systemAlertsEnabled: e.target.checked,
                    });
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Critical System Error & Attendance API Failure alerts</span>
              </label>
            </div>

            {botTokenInput && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={saveMutation.isPending}
                  onClick={() => {
                    saveMutation.mutate({
                      botToken: botTokenInput,
                      enabled: true,
                      attendanceNotificationsEnabled: data?.attendanceNotificationsEnabled,
                      locationNotificationsEnabled: data?.locationNotificationsEnabled,
                      dailySummaryEnabled: data?.dailySummaryEnabled,
                      systemAlertsEnabled: data?.systemAlertsEnabled,
                    });
                  }}
                >
                  Save New Bot Token
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Telegram Chat Channels Table (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 space-y-3 border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Notification Chat Channels
              </h3>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setIsAddChatOpen(true)}
              >
                Add Chat ID
              </Button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-dark-border border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {!data?.chats || data.chats.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No Chat IDs configured. Add a group or personal chat ID to receive notifications.
                </div>
              ) : (
                data.chats.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{c.label}</span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block">
                        ID: {c.chatId}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteChatMutation.mutate(c.id)}
                      className="p-1.5 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-lg transition-colors"
                      title="Remove Chat ID"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Chat Modal */}
      <Modal
        isOpen={isAddChatOpen}
        onClose={() => setIsAddChatOpen(false)}
        title="Add Telegram Chat ID"
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addChatMutation.mutate(newChat);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chat Channel Label <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Management Group or HR Channel"
              value={newChat.label}
              onChange={(e) => setNewChat({ ...newChat, label: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telegram Chat ID <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. -100198273645 or 987654321"
              value={newChat.chatId}
              onChange={(e) => setNewChat({ ...newChat, chatId: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: Add your bot to the group and invite @userinfobot to see your group's Chat ID.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsAddChatOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={addChatMutation.isPending}>
              Save Chat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
