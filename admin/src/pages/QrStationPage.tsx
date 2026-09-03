import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/ui/Toast';
import { AttendanceQrPrintDocument, AttendanceQrPrintData } from '../components/qr/AttendanceQrPrintDocument';
import {
  QrCode,
  RefreshCw,
  Clock,
  ShieldCheck,
  Plus,
  Printer,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  Trash2,
  Ban,
  Eye,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface QrItem {
  id: string;
  name?: string;
  token?: string;
  payload?: string;
  date?: string;
  validFrom?: string;
  validUntil?: string;
  officeName?: string;
  description?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'USED';
  type: string;
  expiresAt: string;
  createdAt: string;
}

export const QrStationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Tabs / Views
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'LIVE_KIOSK'>('MANAGEMENT');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [printData, setPrintData] = useState<AttendanceQrPrintData | null>(null);
  const [selectedQr, setSelectedQr] = useState<QrItem | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live Kiosk State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [qrType, setQrType] = useState<'ANY' | 'CHECK_IN' | 'CHECK_OUT'>('ANY');
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // New QR Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: 'Main Office Attendance',
    date: todayStr,
    validFrom: '07:00',
    validUntil: '18:00',
    officeName: 'Headquarters Main Office',
    description: 'Reception attendance punch point',
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch QR codes list
  const { data: qrList, isLoading: isListLoading } = useQuery<QrItem[]>({
    queryKey: ['adminQrList', statusFilter],
    queryFn: async () => {
      const param = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await apiClient.get(`/admin/qr/list${param}`);
      return res.data.data || [];
    },
  });

  // Fetch Live Active QR Session for Kiosk
  const { data: activeSession } = useQuery({
    queryKey: ['activeQrSession', qrType],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/qr/active?type=${qrType}`);
      return res.data.data;
    },
    enabled: activeTab === 'LIVE_KIOSK' || isFullscreen,
  });

  // Generate Kiosk QR Mutation
  const generateKioskMutation = useMutation({
    mutationFn: async (type: 'ANY' | 'CHECK_IN' | 'CHECK_OUT') => {
      const res = await apiClient.post('/admin/qr/generate', { type });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['activeQrSession', qrType], data);
      showToast('New dynamic QR session generated.');
    },
  });

  // Create One-Day / Custom QR Mutation
  const createQrMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await apiClient.post('/admin/qr/create', payload);
      return res.data.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['adminQrList'] });
      setIsCreateModalOpen(false);
      showToast('Attendance QR created successfully.');
      // Open print preview
      setPrintData({
        qrName: created.name,
        date: created.date,
        validFrom: created.validFrom,
        validUntil: created.validUntil,
        officeName: created.officeName,
        payload: created.payload,
        token: created.token,
      });
    },
    onError: () => {
      showToast('Failed to create attendance QR.', 'error');
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/admin/qr/${id}/deactivate`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQrList'] });
      setDeactivateId(null);
      showToast('QR code deactivated.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/admin/qr/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQrList'] });
      setDeleteId(null);
      showToast('QR code deleted successfully.');
    },
  });

  // Handle Print Action
  const handlePrint = (qr: QrItem) => {
    setPrintData({
      qrName: qr.name || 'Main Office Attendance',
      date: qr.date || qr.createdAt.split('T')[0],
      validFrom: qr.validFrom || '07:00 AM',
      validUntil: qr.validUntil || '06:00 PM',
      officeName: qr.officeName || 'Main Headquarters',
      description: qr.description,
      payload: qr.payload,
      token: qr.token,
    });
  };

  const triggerBrowserPrint = () => {
    const printElement = document.querySelector('.a4-print-sheet') as HTMLElement;
    if (!printElement) {
      window.print();
      return;
    }

    // Clean up any previous print iframe
    const oldFrame = document.getElementById('attendance-qr-print-frame');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'attendance-qr-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Extract all styles to preserve fonts, Tailwind utilities, and colors
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="km">
        <head>
          <meta charset="utf-8" />
          <title>Attendance QR - Galaxy TV4K</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              background: #ffffff !important;
              color: #0f172a !important;
            }
            .a4-print-sheet {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 auto !important;
              padding: 12mm 14mm !important;
              box-sizing: border-box !important;
              border: none !important;
              box-shadow: none !important;
              transform: none !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
            }
          </style>
        </head>
        <body>
          ${printElement.outerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    // Give browser 300ms to render SVG QR and fonts, then trigger print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove temporary iframe after dialog completes
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }, 300);
  };

  // Filtered list
  const filteredList = (qrList || []).filter((item) => {
    if (searchQuery) {
      const matchName = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchOffice = item.officeName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchName || matchOffice;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Attendance QR Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create one-day printable attendance QR codes and manage live rotation kiosks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 dark:bg-dark-elevated p-1 rounded-xl flex items-center border border-slate-200 dark:border-dark-border">
            <button
              onClick={() => setActiveTab('MANAGEMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'MANAGEMENT'
                  ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              QR Codes & Printing
            </button>
            <button
              onClick={() => setActiveTab('LIVE_KIOSK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'LIVE_KIOSK'
                  ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Live Kiosk Screen
            </button>
          </div>

          {activeTab === 'MANAGEMENT' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Attendance QR
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: QR Codes Management & Printable List */}
      {activeTab === 'MANAGEMENT' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-dark-surface p-3 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search QR codes or office..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked / Inactive</option>
              </select>
            </div>
          </div>

          {/* Desktop Table & Mobile Cards */}
          <div className="space-y-3">
            {isListLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading attendance QR codes...</div>
            ) : filteredList.length === 0 ? (
              <Card className="p-10 text-center space-y-3 border-slate-200 dark:border-dark-border">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Attendance QR Codes Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                    Create a one-day or office attendance QR code for employees to scan.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create QR Code
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map((qr) => (
                  <Card
                    key={qr.id}
                    className="p-5 border-slate-200 dark:border-dark-border flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {qr.name || 'Attendance QR'}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {qr.officeName || 'Main Office'}
                        </p>
                      </div>

                      <Badge status={qr.status === 'ACTIVE' ? 'APPROVED' : qr.status === 'EXPIRED' ? 'LATE' : 'REJECTED'} size="sm" />
                    </div>

                    {/* QR Details */}
                    <div className="bg-slate-50 dark:bg-dark-elevated p-3 rounded-2xl border border-slate-100 dark:border-dark-border/80 text-xs space-y-1.5 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Date:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {qr.date || qr.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Valid Hours:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {qr.validFrom || '07:00'} — {qr.validUntil || '18:00'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-dark-border">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs"
                        icon={Printer}
                        onClick={() => handlePrint(qr)}
                      >
                        Print / PDF
                      </Button>

                      {qr.status === 'ACTIVE' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-warning-600 hover:text-warning-700 p-2"
                          title="Deactivate QR"
                          onClick={() => setDeactivateId(qr.id)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-danger-600 hover:text-danger-700 p-2"
                        title="Delete QR"
                        onClick={() => setDeleteId(qr.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Live Rotating Kiosk Screen Mode */}
      {activeTab === 'LIVE_KIOSK' && (
        <Card className="p-8 text-center space-y-6 border-slate-200 dark:border-dark-border max-w-lg mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Attendance Kiosk</h3>
              <p className="text-xs text-slate-500">Auto-regenerates every 60s for high security</p>
            </div>
            <span className="font-mono text-lg font-bold text-brand-600 dark:text-brand-400">{currentTime}</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border-2 border-slate-200 dark:border-dark-border inline-block shadow-subtle mx-auto">
            <QRCodeSVG
              value={activeSession?.qrPayload || JSON.stringify({ token: activeSession?.token, type: qrType })}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Scan with Employee Attendance Web App
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                icon={RefreshCw}
                isLoading={generateKioskMutation.isPending}
                onClick={() => generateKioskMutation.mutate(qrType)}
              >
                Regenerate Kiosk Token
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL 1: Create Attendance QR Form */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Attendance QR Code"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createQrMutation.mutate(formData);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              QR Code Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Main Office Reception Attendance"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Effective Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Location
              </label>
              <input
                type="text"
                required
                value={formData.officeName}
                onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valid From
              </label>
              <input
                type="time"
                required
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valid Until
              </label>
              <input
                type="time"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Ground Floor Entrance stand"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createQrMutation.isPending}
            >
              Create & Preview A4 Sheet
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: A4 Printable PDF Sheet Preview Modal */}
      {printData && (
        <Modal
          isOpen={!!printData}
          onClose={() => setPrintData(null)}
          title="Printable A4 Attendance Sheet Preview"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-dark-elevated p-3 rounded-xl border border-slate-200 dark:border-dark-border text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Ready to print or export as PDF (210mm × 297mm standard A4 format).
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={Printer}
                onClick={triggerBrowserPrint}
              >
                Print / Save PDF
              </Button>
            </div>

            {/* Scrollable preview wrapper for screen */}
            <div className="max-h-[65vh] overflow-y-auto overflow-x-auto p-2 bg-slate-200 dark:bg-dark-bg rounded-2xl flex justify-center print:overflow-visible print:max-h-none print:p-0 print:m-0">
              <div className="scale-90 sm:scale-95 origin-top print:scale-100 print:transform-none">
                <AttendanceQrPrintDocument data={printData} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Deactivate Confirmation */}
      {deactivateId && (
        <Modal
          isOpen={!!deactivateId}
          onClose={() => setDeactivateId(null)}
          title="Deactivate QR Code?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to deactivate this attendance QR code? Employees will no longer be able to punch attendance using this QR code.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setDeactivateId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={deactivateMutation.isPending}
                onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete QR Code Record?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              This action cannot be undone. Are you sure you want to delete this QR record?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
