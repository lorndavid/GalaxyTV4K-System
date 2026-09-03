import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
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
  Clock,
  Eye,
  Copy,
  Check,
  Users,
  GraduationCap,
  Briefcase,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface TelegramChat {
  id: string;
  chatId: string;
  label: string;
  chatType?: 'PERSONAL' | 'GROUP' | 'CHANNEL';
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

interface SummaryPreviewData {
  dateStr: string;
  totalEmployees: number;
  workingCount: number;
  studentCount: number;
  onLeaveCount: number;
  messages: string[];
  rawText: string;
}

export const TelegramPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [botTokenInput, setBotTokenInput] = useState('');
  const [testChatIdInput, setTestChatIdInput] = useState('');
  const [isAddChatOpen, setIsAddChatOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [newChat, setNewChat] = useState<{
    chatId: string;
    label: string;
    chatType: 'PERSONAL' | 'GROUP' | 'CHANNEL';
  }>({ chatId: '', label: '', chatType: 'GROUP' });
  const [testStatus, setTestStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Fetch Telegram Config
  const { data, isLoading } = useQuery<TelegramConfig>({
    queryKey: ['adminTelegramConfig'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/telegram/config');
      return res.data.data;
    },
  });

  // Fetch Live Khmer 7:00 AM Daily Summary Preview
  const { data: previewData, isLoading: isPreviewLoading, refetch: refetchPreview } = useQuery<SummaryPreviewData>({
    queryKey: ['adminTelegramDailyPreview'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/telegram/daily-summary-preview');
      return res.data.data;
    },
    enabled: isPreviewOpen,
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
    mutationFn: async (payload: { chatId: string; label: string; chatType?: string }) => {
      return await apiClient.post('/admin/telegram/chats', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTelegramConfig'] });
      setIsAddChatOpen(false);
      setNewChat({ chatId: '', label: '', chatType: 'GROUP' });
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

  // Send Daily 7:00 AM Summary Mutation
  const summaryMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/telegram/daily-summary');
    },
    onSuccess: (res) => {
      const msg = res?.data?.message || 'Daily 7:00 AM summary dispatched to Telegram.';
      showToast(msg);
      if (isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'Failed to dispatch summary.', 'error');
    },
  });

  const handleCopyPreviewText = () => {
    if (!previewData?.rawText) return;
    // Strip simple HTML tags for clipboard plain text
    const cleanText = previewData.rawText
      .replace(/<b>(.*?)<\/b>/g, '$1')
      .replace(/<code>(.*?)<\/code>/g, '$1')
      .replace(/<i>(.*?)<\/i>/g, '$1');

    navigator.clipboard.writeText(cleanText);
    setIsCopied(true);
    showToast('✓ បានចម្លងសារគំរូទៅកាន់ក្តារតម្បៀតខ្ទាស់ (Copied)');
    setTimeout(() => setIsCopied(false), 2000);
  };

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
            Automated morning work & study rosters, attendance alerts, and office events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => {
              setIsPreviewOpen(true);
              refetchPreview();
            }}
          >
            Preview Khmer Message
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Send}
            isLoading={summaryMutation.isPending}
            onClick={() => summaryMutation.mutate()}
          >
            Send 7:00 AM Summary Now
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

      {/* 7:00 AM Daily Morning Summary Showcase Card */}
      <Card className="p-5 border-brand-200/80 dark:border-brand-900/50 bg-gradient-to-br from-white via-white to-brand-50/40 dark:from-dark-surface dark:via-dark-surface dark:to-brand-950/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-600/20">
              <Clock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  7:00 AM Daily Summary (របាយការណ៍ស្វ័យប្រវត្តិម៉ោង ០៧:០០ ព្រឹក)
                </h3>
                <Badge
                  status={data?.dailySummaryEnabled ? 'PRESENT' : 'ABSENT'}
                  customLabel={data?.dailySummaryEnabled ? 'Auto 07:00 AM Active' : 'Disabled'}
                  size="sm"
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Automatically broadcasts an official Khmer summary to all registered Telegram channels every morning at <strong>07:00 AM</strong> (Asia/Phnom_Penh). Summarizes which employees work today, student count, and lists all 20 staff members with list numbers and <strong>zero emojis</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center">
            <label className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-100 dark:bg-dark-elevated cursor-pointer hover:bg-slate-200/60 dark:hover:bg-dark-border transition-colors">
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
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {data?.dailySummaryEnabled ? 'Enabled' : 'Enable 7:00 AM Auto-Send'}
              </span>
            </label>
          </div>
        </div>

        {/* Feature Points & Actions */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-brand-500" />
              All 20 Official Employees
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <GraduationCap className="w-4 h-4 text-brand-500" />
              Daily Student Count & Study Day
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Briefcase className="w-4 h-4 text-brand-500" />
              Shift & Working Status
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-brand-500" />
              No Emoji • Numbered List
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => {
                setIsPreviewOpen(true);
                refetchPreview();
              }}
            >
              Preview Message
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Send}
              isLoading={summaryMutation.isPending}
              onClick={() => summaryMutation.mutate()}
            >
              Send to Telegram Now
            </Button>
          </div>
        </div>
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
                <span>Daily 7:00 AM Attendance & Study Summary (All 20 Staff, Zero Emojis)</span>
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
                  No Chat IDs configured. Add a personal, group, or channel ID to authorize access.
                </div>
              ) : (
                data.chats.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{c.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            c.chatType === 'PERSONAL'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : c.chatType === 'CHANNEL'
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {c.chatType === 'PERSONAL' ? 'Personal' : c.chatType === 'CHANNEL' ? 'Channel' : 'Group'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
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

          {/* Interactive Bot & Whitelist Security Guide Card */}
          <Card className="p-5 space-y-3 border-slate-200 dark:border-dark-border bg-slate-50/70 dark:bg-dark-elevated/40">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Private Whitelist & Interactive Bot Menu
            </h4>

            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                <strong>សុវត្ថិភាព Whitelist:</strong> មានតែ Personal ID, Group ID ឬ Channel ID ដែលបានបន្ថែមក្នុងបញ្ជីខាងលើនេះប៉ុណ្ណោះ ទើបអាចទទួលសារ និងប្រើប្រាស់ Bot បាន។ អ្នកប្រើប្រាស់ដែលមិនមានក្នុងបញ្ជី នឹងមិនអាចមើលទិន្នន័យបានឡើយ។
              </p>
              <div className="pt-1 border-t border-slate-200/80 dark:border-dark-border">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  ពាក្យបញ្ជា Interactive Bot (/start ឬ /menu):
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>របាយការណ៍សង្ខេបប្រចាំថ្ងៃ:</strong> បង្ហាញសរុប និងបុគ្គលិកទាំង ២០ រូប</li>
                  <li><strong>បុគ្គលិកវេនរៀន:</strong> ច្រោះមើលតែបុគ្គលិកមានវេនរៀនថ្ងៃនេះ</li>
                  <li><strong>បុគ្គលិកបំពេញការងារ:</strong> ច្រោះមើលតែបុគ្គលិកធ្វើការថ្ងៃនេះ</li>
                  <li><strong>វត្តមានក្នុង/ក្រៅការិយាល័យ:</strong> ពិនិត្យទីតាំងជាក់ស្តែង Real-time</li>
                  <li><strong>បុគ្គលិកសុំច្បាប់:</strong> បង្ហាញអ្នកសុំច្បាប់សម្រាកថ្ងៃនេះ</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Live Khmer 7:00 AM Message Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="គំរូសារ Telegram ប្រចាំថ្ងៃ (ម៉ោង ០៧:០០ ព្រឹក)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {isPreviewLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">បុគ្គលិកសរុប</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {previewData?.totalEmployees || 20} នាក់
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-success-50/50 dark:bg-success-950/30 border border-success-200 dark:border-success-900/40 text-center">
                  <span className="text-[11px] text-success-700 dark:text-success-400 block">បំពេញការងារថ្ងៃនេះ</span>
                  <span className="text-lg font-bold text-success-700 dark:text-success-300">
                    {previewData?.workingCount || 0} នាក់
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/40 text-center">
                  <span className="text-[11px] text-brand-700 dark:text-brand-400 block">វេនរៀនថ្ងៃនេះ</span>
                  <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                    {previewData?.studentCount || 0} នាក់
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block">សុំច្បាប់ថ្ងៃនេះ</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {previewData?.onLeaveCount || 0} នាក់
                  </span>
                </div>
              </div>

              {/* Message Details Preview Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ទម្រង់សារផ្លូវការ (គ្មាន Emoji • លេខរៀងតាមលំដាប់):
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={isCopied ? Check : Copy}
                    onClick={handleCopyPreviewText}
                  >
                    {isCopied ? 'Copied' : 'Copy Text'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-sans text-xs leading-relaxed max-h-96 overflow-y-auto border border-slate-800 space-y-3 select-text shadow-inner">
                  {previewData?.messages?.map((msg, i) => (
                    <div
                      key={i}
                      className="whitespace-pre-wrap font-sans"
                      dangerouslySetInnerHTML={{ __html: msg }}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
                <Button variant="secondary" size="md" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={Send}
                  isLoading={summaryMutation.isPending}
                  onClick={() => summaryMutation.mutate()}
                >
                  Send to Telegram Now
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add Chat Modal */}
      <Modal
        isOpen={isAddChatOpen}
        onClose={() => setIsAddChatOpen(false)}
        title="Add Telegram Recipient (Personal, Group, or Channel)"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addChatMutation.mutate(newChat);
          }}
          className="space-y-4"
        >
          {/* Chat Type Segmented Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Recipient Type (ប្រភេទអ្នកទទួល) <span className="text-danger-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewChat({ ...newChat, chatType: 'PERSONAL' })}
                className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                  newChat.chatType === 'PERSONAL'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'bg-white dark:bg-dark-elevated border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Personal
                <span className="block text-[10px] font-normal opacity-80">គណនីផ្ទាល់ខ្លួន</span>
              </button>

              <button
                type="button"
                onClick={() => setNewChat({ ...newChat, chatType: 'GROUP' })}
                className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                  newChat.chatType === 'GROUP'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-dark-elevated border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Group
                <span className="block text-[10px] font-normal opacity-80">ក្រុមពិភាក្សា</span>
              </button>

              <button
                type="button"
                onClick={() => setNewChat({ ...newChat, chatType: 'CHANNEL' })}
                className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                  newChat.chatType === 'CHANNEL'
                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'bg-white dark:bg-dark-elevated border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Channel
                <span className="block text-[10px] font-normal opacity-80">ប៉ុស្តិ៍ផ្សព្វផ្សាយ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chat Channel Label <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                newChat.chatType === 'PERSONAL'
                  ? 'e.g. Director Personal Chat or HR Manager'
                  : newChat.chatType === 'CHANNEL'
                  ? 'e.g. Official Announcement Channel'
                  : 'e.g. Management Group or Daily HR Room'
              }
              value={newChat.label}
              onChange={(e) => setNewChat({ ...newChat, label: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-dark-elevated text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Telegram Chat ID <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                newChat.chatType === 'PERSONAL'
                  ? 'e.g. 987654321 (Numerical ID)'
                  : newChat.chatType === 'CHANNEL'
                  ? 'e.g. -100198273645 (Channel ID)'
                  : 'e.g. -100123456789 or -987654321'
              }
              value={newChat.chatId}
              onChange={(e) => setNewChat({ ...newChat, chatId: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-dark-elevated text-slate-900 dark:text-slate-100"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {newChat.chatType === 'PERSONAL' &&
                '💡 Tip for Personal Chat: Open Telegram and message @userinfobot to see your user ID.'}
              {newChat.chatType === 'GROUP' &&
                '💡 Tip for Group Chat: Add your bot to the Telegram group, then forward a message to @userinfobot to find group ID.'}
              {newChat.chatType === 'CHANNEL' &&
                '💡 Tip for Channel: Add bot as Administrator in your Channel, then forward a post to @userinfobot to find channel ID.'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-elevated border border-slate-200/60 dark:border-dark-border text-[11px] text-slate-500">
            🔒 <strong>Private Access Control:</strong> Only added Chat IDs can see the 7:00 AM summary or use the interactive bot menu (/start, /menu). All other chats will be blocked.
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setIsAddChatOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={addChatMutation.isPending}>
              Save Authorized Chat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
