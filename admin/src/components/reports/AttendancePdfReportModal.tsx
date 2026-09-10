import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Printer,
  Download,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  X,
  SlidersHorizontal,
  ChevronDown,
  LayoutTemplate,
} from 'lucide-react';

export type ReportPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
export type PageOrientation = 'landscape' | 'portrait';

interface AttendancePdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod?: ReportPeriod;
  defaultDate?: string;
}

interface RawDailyAttendance {
  id: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  dutyType?: 'WORK' | 'STUDY' | 'LEAVE';
  dutyLabel?: string;
  isStudyDay?: boolean;
  studyDay?: string;
  notes?: string | null;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    khmerName?: string;
    latinName?: string;
    studyDay?: string;
    department?: { id?: string; name: string };
  };
}

interface EmployeeSummaryItem {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  department?: string;
  present: number;
  late: number;
  absent: number;
  workedMinutes: number;
}

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
export const toKhmerNum = (val: number | string): string => {
  return String(val).replace(/[0-9]/g, (d) => KHMER_DIGITS[parseInt(d, 10)]);
};

const KHMER_MONTH_NAMES = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

const KHMER_DAY_NAMES = [
  'អាទិត្យ',
  'ច័ន្ទ',
  'អង្គារ',
  'ពុធ',
  'ព្រហស្បតិ៍',
  'សុក្រ',
  'សៅរ៍',
];

export const AttendancePdfReportModal: React.FC<AttendancePdfReportModalProps> = ({
  isOpen,
  onClose,
  defaultPeriod = 'TODAY',
  defaultDate,
}) => {
  const { showToast } = useToast();
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Period state
  const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod);
  const [orientation, setOrientation] = useState<PageOrientation>('landscape');

  // Dates
  const todayStr = useMemo(() => defaultDate || new Date().toISOString().split('T')[0], [defaultDate]);
  const [singleDate, setSingleDate] = useState<string>(todayStr);

  // Compute default week range
  const { currentWeekStart, currentWeekEnd } = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diffToMon));
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    return {
      currentWeekStart: mon.toISOString().split('T')[0],
      currentWeekEnd: sat.toISOString().split('T')[0],
    };
  }, []);

  // Compute default month range
  const { currentMonthStart, currentMonthEnd } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { currentMonthStart: start, currentMonthEnd: end };
  }, []);

  const [customStart, setCustomStart] = useState<string>(currentWeekStart);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [filterDuty, setFilterDuty] = useState<'ALL' | 'WORK' | 'STUDY' | 'LEAVE'>('ALL');

  // Boss & Signatures customization
  const [companyNameKh, setCompanyNameKh] = useState<string>('ក្រុមហ៊ុន ហ្គាឡាក់ស៊ី ធីវី ៤ខេ (GALAXY TV4K)');
  const [departmentNameKh, setDepartmentNameKh] = useState<string>('នាយកដ្ឋានរដ្ឋបាល និងធនធានមនុស្ស');
  const [bossName, setBossName] = useState<string>('លោកអគ្គនាយក');
  const [bossTitle, setBossTitle] = useState<string>('អគ្គនាយកក្រុមហ៊ុន');
  const [preparedByName, setPreparedByName] = useState<string>('មន្ត្រីរដ្ឋបាល និងធនធានមនុស្ស');
  const [verifiedByName, setVerifiedByName] = useState<string>('ប្រធានផ្នែកធនធានមនុស្ស');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Fetch departments for filter
  const { data: departments } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['adminDepartmentsList'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/departments');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // Determine active start & end dates
  const { effectiveStart, effectiveEnd, isSingleDay } = useMemo(() => {
    if (period === 'TODAY') {
      return { effectiveStart: singleDate, effectiveEnd: singleDate, isSingleDay: true };
    }
    if (period === 'WEEK') {
      return { effectiveStart: currentWeekStart, effectiveEnd: currentWeekEnd, isSingleDay: false };
    }
    if (period === 'MONTH') {
      return { effectiveStart: currentMonthStart, effectiveEnd: currentMonthEnd, isSingleDay: false };
    }
    return {
      effectiveStart: customStart,
      effectiveEnd: customEnd,
      isSingleDay: customStart === customEnd,
    };
  }, [period, singleDate, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd, customStart, customEnd]);

  // Query Daily Unified Roster when single day
  const { data: dailyRecords, isLoading: isDailyLoading } = useQuery<RawDailyAttendance[]>({
    queryKey: ['attendanceDailyPdf', effectiveStart],
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/daily?date=${effectiveStart}`);
      return res.data.data;
    },
    enabled: isOpen && isSingleDay,
  });

  // Query Date Range Data when multi-day
  const { data: rangeData, isLoading: isRangeLoading } = useQuery<{
    summary: any;
    employeeSummaries: EmployeeSummaryItem[];
    records: any[];
  }>({
    queryKey: ['attendanceRangePdf', effectiveStart, effectiveEnd],
    queryFn: async () => {
      const [summaryRes, recordsRes] = await Promise.all([
        apiClient.get(`/admin/reports/summary?startDate=${effectiveStart}&endDate=${effectiveEnd}`),
        apiClient.get(`/admin/reports/attendance?startDate=${effectiveStart}&endDate=${effectiveEnd}`),
      ]);
      return {
        summary: summaryRes.data.data?.summary || {},
        employeeSummaries: summaryRes.data.data?.employeeSummaries || [],
        records: recordsRes.data.data || [],
      };
    },
    enabled: isOpen && !isSingleDay,
  });

  const isLoading = isSingleDay ? isDailyLoading : isRangeLoading;

  // Filter and process records
  const filteredDailyList = useMemo(() => {
    if (!dailyRecords) return [];
    return dailyRecords.filter((rec) => {
      if (selectedDeptId !== 'ALL' && rec.employee.department?.id !== selectedDeptId) {
        return false;
      }
      if (filterDuty !== 'ALL' && rec.dutyType !== filterDuty) {
        return false;
      }
      return true;
    });
  }, [dailyRecords, selectedDeptId, filterDuty]);

  // Compute Daily summary stats
  const dailySummary = useMemo(() => {
    if (!filteredDailyList.length) {
      return { total: 0, present: 0, late: 0, leave: 0, study: 0, absent: 0, rate: 0 };
    }
    const total = filteredDailyList.length;
    const present = filteredDailyList.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const late = filteredDailyList.filter((r) => r.status === 'LATE' || (r.lateMinutes && r.lateMinutes > 0)).length;
    const leave = filteredDailyList.filter((r) => r.dutyType === 'LEAVE' || r.status === 'ON_LEAVE').length;
    const study = filteredDailyList.filter((r) => r.dutyType === 'STUDY' || r.isStudyDay).length;
    const absent = filteredDailyList.filter((r) => r.status === 'ABSENT' || (!r.checkInAt && r.dutyType === 'WORK')).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, late, leave, study, absent, rate };
  }, [filteredDailyList]);

  // Compute Date Range summary stats
  const rangeSummary = useMemo(() => {
    if (!rangeData?.employeeSummaries) {
      return { total: 0, present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 };
    }
    const list = rangeData.employeeSummaries;
    const totalEmployees = list.length;
    const totalPresent = list.reduce((acc, emp) => acc + (emp.present || 0), 0);
    const totalLate = list.reduce((acc, emp) => acc + (emp.late || 0), 0);
    const totalAbsent = list.reduce((acc, emp) => acc + (emp.absent || 0), 0);
    const totalMinutes = list.reduce((acc, emp) => acc + (emp.workedMinutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);
    const rate = rangeData.summary?.attendanceRate ?? 95;
    return {
      total: totalEmployees,
      present: totalPresent,
      late: totalLate,
      absent: totalAbsent,
      totalHours,
      rate,
    };
  }, [rangeData]);

  // Format Date in formal Khmer
  const now = new Date();
  const currentDayKhmer = KHMER_DAY_NAMES[now.getDay()];
  const currentDayNum = toKhmerNum(now.getDate());
  const currentMonthKhmer = KHMER_MONTH_NAMES[now.getMonth()];
  const currentYearKhmer = toKhmerNum(now.getFullYear());

  const periodTitleKhmer = useMemo(() => {
    if (period === 'TODAY') {
      const parts = singleDate.split('-');
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[0], 10);
      return `របាយការណ៍វត្តមានប្រចាំថ្ងៃ ទី${toKhmerNum(d)} ខែ${KHMER_MONTH_NAMES[m]} ឆ្នាំ${toKhmerNum(y)}`;
    }
    if (period === 'WEEK') {
      return `របាយការណ៍វត្តមានប្រចាំសប្តាហ៍ (ពីថ្ងៃ ${effectiveStart} ដល់ ${effectiveEnd})`;
    }
    if (period === 'MONTH') {
      const parts = effectiveStart.split('-');
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[0], 10);
      return `របាយការណ៍វត្តមានប្រចាំខែ ${KHMER_MONTH_NAMES[m]} ឆ្នាំ${toKhmerNum(y)}`;
    }
    return `របាយការណ៍វត្តមាន ចាប់ពីថ្ងៃ ${effectiveStart} ដល់ ${effectiveEnd}`;
  }, [period, singleDate, effectiveStart, effectiveEnd]);

  // Browser Print / Save as PDF function (Dual-Engine: Window + Portal Fallback)
  const handlePrintToPdf = () => {
    const printContent = printSheetRef.current;
    if (!printContent) {
      showToast('No report content available to print.', 'error');
      return;
    }

    const title = `${periodTitleKhmer} - Galaxy TV4K`;
    let htmlContent = printContent.innerHTML;

    // Ensure image source is absolute so it loads in any new window or context
    const origin = window.location.origin;
    htmlContent = htmlContent.replace(/src="\/logo\.png"/g, `src="${origin}/logo.png"`);

    const standaloneCss = `
      @page {
        size: A4 ${orientation};
        margin: 8mm 10mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Battambang', 'Khmer OS Battambang', 'Suwannaphum', sans-serif !important;
        -webkit-font-smoothing: antialiased;
      }
      .font-moul {
        font-family: 'Moul', 'Moulpali', 'Khmer OS Muol Light', serif !important;
      }
      .font-battambang {
        font-family: 'Battambang', 'Khmer OS Battambang', sans-serif !important;
      }
      .a4-report-sheet {
        width: 100% !important;
        max-width: 100% !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        margin-top: 8px !important;
        margin-bottom: 12px !important;
      }
      th, td {
        border: 1px solid #64748b !important;
        padding: 4px 6px !important;
        font-size: 11px !important;
      }
      th {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
        font-weight: 700 !important;
      }
      tr {
        page-break-inside: avoid !important;
      }
      .no-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      /* Explicit utility classes for bulletproof PDF styling */
      .grid { display: grid !important; }
      .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
      .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
      .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      .divide-x > * + * { border-left: 1px solid #94a3b8 !important; }
      .flex { display: flex !important; }
      .flex-col { flex-direction: column !important; }
      .items-center { align-items: center !important; }
      .items-start { align-items: flex-start !important; }
      .justify-between { justify-content: space-between !important; }
      .justify-center { justify-content: center !important; }
      .text-center { text-align: center !important; }
      .text-left { text-align: left !important; }
      .text-right { text-align: right !important; }
      .font-bold { font-weight: 700 !important; }
      .font-semibold { font-weight: 600 !important; }
      .font-mono { font-family: monospace !important; }
      .font-sans { font-family: sans-serif !important; }
      .border { border: 1px solid #cbd5e1 !important; }
      .border-2 { border: 2px solid #94a3b8 !important; }
      .border-b { border-bottom: 1px solid #cbd5e1 !important; }
      .border-b-2 { border-bottom: 2px solid #475569 !important; }
      .border-slate-300 { border-color: #cbd5e1 !important; }
      .border-slate-400 { border-color: #94a3b8 !important; }
      .border-dotted { border-style: dotted !important; }
      .border-dashed { border-style: dashed !important; }
      .bg-white { background-color: #ffffff !important; }
      .bg-slate-50 { background-color: #f8fafc !important; }
      .bg-slate-100 { background-color: #f1f5f9 !important; }
      .bg-emerald-50\\/60 { background-color: #ecfdf5 !important; }
      .bg-amber-50\\/60 { background-color: #fffbeb !important; }
      .bg-blue-50\\/60 { background-color: #eff6ff !important; }
      .bg-indigo-50\\/60 { background-color: #eef2ff !important; }
      .bg-rose-50\\/60 { background-color: #fff1f2 !important; }
      .text-emerald-700, .text-emerald-800 { color: #047857 !important; }
      .text-amber-700, .text-amber-800 { color: #b45309 !important; }
      .text-blue-700, .text-blue-800 { color: #1d4ed8 !important; }
      .text-indigo-700, .text-indigo-800 { color: #4338ca !important; }
      .text-rose-500, .text-rose-700, .text-rose-800 { color: #e11d48 !important; }
      .text-slate-900, .text-slate-950 { color: #0f172a !important; }
      .text-slate-800 { color: #1e293b !important; }
      .text-slate-700 { color: #334155 !important; }
      .text-slate-600 { color: #475569 !important; }
      .text-slate-500 { color: #64748b !important; }
      .p-1 { padding: 4px !important; }
      .p-1\\.5 { padding: 6px !important; }
      .p-2 { padding: 8px !important; }
      .p-3 { padding: 12px !important; }
      .p-4 { padding: 16px !important; }
      .pb-3 { padding-bottom: 12px !important; }
      .mb-4 { margin-bottom: 16px !important; }
      .mb-5 { margin-bottom: 20px !important; }
      .mb-6 { margin-bottom: 24px !important; }
      .mt-auto { margin-top: auto !important; }
      .gap-3 { gap: 12px !important; }
      .gap-6 { gap: 24px !important; }
      .w-full { width: 100% !important; }
      .w-8 { width: 32px !important; }
      .w-14 { width: 56px !important; }
      .h-14 { height: 56px !important; }
      .w-16 { width: 64px !important; }
      .h-16 { height: 64px !important; }
      .w-20 { width: 80px !important; }
      .w-24 { width: 96px !important; }
      .w-36 { width: 144px !important; }
      .w-40 { width: 160px !important; }
      .h-40 { height: 160px !important; }
      .mx-auto { margin-left: auto !important; margin-right: auto !important; }
      .rounded-lg { border-radius: 8px !important; }
      .rounded-xl { border-radius: 12px !important; }
      .rounded-full { border-radius: 9999px !important; }
      .block { display: block !important; }
      .inline-block { display: inline-block !important; }
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="km">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <base href="${origin}/">
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Moul&family=Moulpali&family=Koh+Santepheap:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            ${standaloneCss}
          </style>
        </head>
        <body>
          <div class="a4-report-sheet font-battambang">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    // 1. Try dedicated print window first (cleanest & most reliable across Edge, Chrome, Safari)
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow && !printWindow.closed) {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        showToast('កំពុងបើកផ្ទាំងបោះពុម្ព / Export PDF...');
        return;
      }
    } catch (e) {
      console.warn('Popup window blocked, falling back to print portal', e);
    }

    // 2. Fallback: In-page print portal (guaranteed to print report even if popup is blocked)
    const oldPortal = document.getElementById('report-print-portal');
    if (oldPortal) oldPortal.remove();

    const portal = document.createElement('div');
    portal.id = 'report-print-portal';
    portal.innerHTML = `
      <style>
        @media screen {
          #report-print-portal { display: none !important; }
        }
        @media print {
          body > *:not(#report-print-portal) { display: none !important; }
          #report-print-portal {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          ${standaloneCss}
        }
      </style>
      <div class="a4-report-sheet font-battambang">
        ${htmlContent}
      </div>
    `;
    document.body.appendChild(portal);

    const cleanup = () => {
      portal.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      showToast('កំពុងបើកផ្ទាំងបោះពុម្ព / Export PDF...');
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-6xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-elevated">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-battambang">
                <span>នាំចេញរបាយការណ៍ជា PDF ស្តង់ដារ A4</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800/40">
                  A4 Report
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                រៀបចំទម្រង់ផ្លូវការជូនថ្នាក់ដឹកនាំ/អគ្គនាយក ជាមួយពុម្ពអក្សរ មូល និង បាត់ដំបង
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? 'លាក់ការកំណត់' : 'កំណត់ហត្ថលេខា & ព័ត៌មាន'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrintToPdf}
              className="shadow-sm"
            >
              បោះពុម្ព / រក្សាទុកជា PDF (Print / Save A4)
            </Button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-surface text-slate-500 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface space-y-3">
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Period Segmented Buttons */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-dark-elevated rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold font-battambang">
              <button
                type="button"
                onClick={() => setPeriod('TODAY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'TODAY'
                    ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ថ្ងៃនេះ (Today)
              </button>
              <button
                type="button"
                onClick={() => setPeriod('WEEK')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'WEEK'
                    ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                សប្តាហ៍នេះ (This Week)
              </button>
              <button
                type="button"
                onClick={() => setPeriod('MONTH')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'MONTH'
                    ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ខែនេះ (This Month)
              </button>
              <button
                type="button"
                onClick={() => setPeriod('CUSTOM')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'CUSTOM'
                    ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ចន្លោះកាលបរិច្ឆេទ (Custom)
              </button>
            </div>

            {/* Orientation & Department */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Orientation Toggle */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-dark-elevated rounded-lg border border-slate-200 dark:border-dark-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    orientation === 'landscape'
                      ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  A4 ផ្ដេក (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    orientation === 'portrait'
                      ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  A4 បញ្ឈរ (Portrait)
                </button>
              </div>

              {/* Department Filter */}
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200 font-battambang focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="ALL">គ្រប់ផ្នែកទាំងអស់ (All Depts)</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker inputs when single or custom */}
          {period === 'TODAY' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-battambang">
                ជ្រើសរើសថ្ងៃ៖
              </span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>
          )}

          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2 pt-1 font-battambang text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">ចាប់ពីថ្ងៃ៖</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200 font-mono"
              />
              <span className="text-slate-400">ដល់</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>
          )}

          {/* Collapsible Signatures & Customization Form */}
          {showConfig && (
            <div className="p-3.5 bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200 dark:border-dark-border rounded-xl space-y-2.5 animate-fade-in font-battambang">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                កំណត់ព័ត៌មានលិខិត & ហត្ថលេខាថ្នាក់ដឹកនាំ (Report Settings & Signatures)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">ឈ្មោះស្ថាប័ន / ក្រុមហ៊ុន</label>
                  <input
                    type="text"
                    value={companyNameKh}
                    onChange={(e) => setCompanyNameKh(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">ឈ្មោះផ្នែក / នាយកដ្ឋាន</label>
                  <input
                    type="text"
                    value={departmentNameKh}
                    onChange={(e) => setDepartmentNameKh(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">ឈ្មោះថ្នាក់ដឹកនាំ / អគ្គនាយក (Boss Name)</label>
                  <input
                    type="text"
                    value={bossName}
                    onChange={(e) => setBossName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200 font-bold text-brand-600 dark:text-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">តួនាទីថ្នាក់ដឹកនាំ (Boss Title)</label>
                  <input
                    type="text"
                    value={bossTitle}
                    onChange={(e) => setBossTitle(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">អ្នករៀបចំ (Prepared By)</label>
                  <input
                    type="text"
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">អ្នកពិនិត្យ (Verified By)</label>
                  <input
                    type="text"
                    value={verifiedByName}
                    onChange={(e) => setVerifiedByName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live A4 Document Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-black/50 flex justify-center">
          <div
            ref={printSheetRef}
            className={`a4-report-sheet bg-white text-slate-900 shadow-xl border border-slate-300 p-8 transition-all ${
              orientation === 'landscape'
                ? 'w-[297mm] min-h-[210mm]'
                : 'w-[210mm] min-h-[297mm]'
            }`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* 1. Official National Motto & Kingdom Header */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
              {/* Left: Company Emblem & Logo */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 p-1 bg-white border border-slate-300 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-moul text-xs text-slate-900 tracking-wide">
                    {companyNameKh}
                  </h3>
                  <p className="font-battambang text-[11px] text-slate-700 font-semibold">
                    {departmentNameKh}
                  </p>
                  <p className="font-battambang text-[10px] text-slate-500">
                    ទូរស័ព្ទ / ទំនាក់ទំនង៖ (+855) 12 345 678 | អ៊ីមែល៖ info@galaxytv4k.online
                  </p>
                </div>
              </div>

              {/* Right: Kingdom of Cambodia Emblem & Motto */}
              <div className="text-center">
                <h2 className="font-moul text-sm text-slate-900 tracking-wider">
                  ព្រះរាជាណាចក្រកម្ពុជា
                </h2>
                <h3 className="font-moul text-xs text-slate-800 tracking-wide mt-0.5">
                  ជាតិ សាសនា ព្រះមហាក្សត្រ
                </h3>
                <div className="text-xs text-slate-500 tracking-widest mt-0.5 font-serif">
                  ❖ ❖ ❖
                </div>
              </div>
            </div>

            {/* 2. Official Report Title */}
            <div className="text-center space-y-1 mb-5">
              <h1 className="font-moul text-base sm:text-lg text-slate-950 uppercase tracking-wide">
                របាយការណ៍វត្តមាន និងម៉ោងបំពេញការងាររបស់បុគ្គលិក
              </h1>
              <p className="text-xs font-bold font-sans tracking-wider text-slate-600 uppercase">
                OFFICIAL STAFF ATTENDANCE & WORKING HOURS REPORT
              </p>
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-md text-xs font-battambang font-bold text-slate-800 mt-1">
                {periodTitleKhmer}
              </div>
            </div>

            {/* 3. Executive KPI Summary Box */}
            <div className="mb-5">
              {isSingleDay ? (
                <div className="grid grid-cols-7 border border-slate-400 bg-slate-50 text-center text-xs font-battambang divide-x divide-slate-400">
                  <div className="p-2">
                    <span className="text-[10px] text-slate-500 block font-semibold">បុគ្គលិកសរុប</span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {toKhmerNum(dailySummary.total)}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50/60">
                    <span className="text-[10px] text-emerald-700 block font-semibold">វត្តមានជាក់ស្តែង</span>
                    <span className="font-bold text-sm text-emerald-800 font-mono">
                      {toKhmerNum(dailySummary.present)}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50/60">
                    <span className="text-[10px] text-amber-700 block font-semibold">មកយឺត</span>
                    <span className="font-bold text-sm text-amber-800 font-mono">
                      {toKhmerNum(dailySummary.late)}
                    </span>
                  </div>
                  <div className="p-2 bg-blue-50/60">
                    <span className="text-[10px] text-blue-700 block font-semibold">សុំច្បាប់សម្រាក</span>
                    <span className="font-bold text-sm text-blue-800 font-mono">
                      {toKhmerNum(dailySummary.leave)}
                    </span>
                  </div>
                  <div className="p-2 bg-indigo-50/60">
                    <span className="text-[10px] text-indigo-700 block font-semibold">វេនរៀនសូត្រ</span>
                    <span className="font-bold text-sm text-indigo-800 font-mono">
                      {toKhmerNum(dailySummary.study)}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50/60">
                    <span className="text-[10px] text-rose-700 block font-semibold">អវត្តមាន</span>
                    <span className="font-bold text-sm text-rose-800 font-mono">
                      {toKhmerNum(dailySummary.absent)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100">
                    <span className="text-[10px] text-slate-600 block font-semibold">អត្រាវត្តមាន</span>
                    <span className="font-bold text-sm text-brand-700 font-mono">
                      {toKhmerNum(dailySummary.rate)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-6 border border-slate-400 bg-slate-50 text-center text-xs font-battambang divide-x divide-slate-400">
                  <div className="p-2">
                    <span className="text-[10px] text-slate-500 block font-semibold">ចំនួនបុគ្គលិក</span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {toKhmerNum(rangeSummary.total)}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50/60">
                    <span className="text-[10px] text-emerald-700 block font-semibold">វត្តមានសរុប (វេន)</span>
                    <span className="font-bold text-sm text-emerald-800 font-mono">
                      {toKhmerNum(rangeSummary.present)}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50/60">
                    <span className="text-[10px] text-amber-700 block font-semibold">មកយឺតសរុប</span>
                    <span className="font-bold text-sm text-amber-800 font-mono">
                      {toKhmerNum(rangeSummary.late)}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50/60">
                    <span className="text-[10px] text-rose-700 block font-semibold">អវត្តមានសរុប</span>
                    <span className="font-bold text-sm text-rose-800 font-mono">
                      {toKhmerNum(rangeSummary.absent)}
                    </span>
                  </div>
                  <div className="p-2 bg-indigo-50/60">
                    <span className="text-[10px] text-indigo-700 block font-semibold">ម៉ោងធ្វើការសរុប</span>
                    <span className="font-bold text-sm text-indigo-800 font-mono">
                      {toKhmerNum(rangeSummary.totalHours)} ម៉ោង
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100">
                    <span className="text-[10px] text-slate-600 block font-semibold">អត្រាវត្តមានជាមធ្យម</span>
                    <span className="font-bold text-sm text-brand-700 font-mono">
                      {toKhmerNum(rangeSummary.rate)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Main Corporate Attendance Table */}
            <div className="mb-6 font-battambang">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-battambang">
                  កំពុងទាញយកទិន្នន័យរបាយការណ៍... (Loading Report Data)
                </div>
              ) : isSingleDay ? (
                /* Daily Detailed Table */
                <table className="w-full border-collapse border border-slate-400 text-[11px] text-slate-800">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-center border-b border-slate-400">
                      <th className="border border-slate-400 p-1.5 w-8">ល.រ</th>
                      <th className="border border-slate-400 p-1.5 w-16">អត្តលេខ</th>
                      <th className="border border-slate-400 p-1.5 text-left">គោត្តនាម-នាម</th>
                      <th className="border border-slate-400 p-1.5 text-left w-24">ផ្នែក</th>
                      <th className="border border-slate-400 p-1.5 w-24">កាលវិភាគ/វេន</th>
                      <th className="border border-slate-400 p-1.5 w-20">ម៉ោងចូល</th>
                      <th className="border border-slate-400 p-1.5 w-20">ម៉ោងចេញ</th>
                      <th className="border border-slate-400 p-1.5 w-16">ម៉ោងការងារ</th>
                      <th className="border border-slate-400 p-1.5 w-24">ស្ថានភាព</th>
                      <th className="border border-slate-400 p-1.5 text-left">សម្គាល់ / ផ្សេងៗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="border border-slate-400 p-4 text-center text-slate-500">
                          មិនមានទិន្នន័យវត្តមានសម្រាប់កាលបរិច្ឆេទនេះទេ
                        </td>
                      </tr>
                    ) : (
                      filteredDailyList.map((rec, index) => {
                        const inTime = rec.checkInAt
                          ? new Date(rec.checkInAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Phnom_Penh',
                            })
                          : '—';
                        const outTime = rec.checkOutAt
                          ? new Date(rec.checkOutAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Phnom_Penh',
                            })
                          : '—';
                        const workedHours = rec.workedMinutes
                          ? `${Math.floor(rec.workedMinutes / 60)}h ${rec.workedMinutes % 60}m`
                          : '—';

                        let statusKhmer = 'វត្តមាន';
                        let statusColor = 'text-emerald-700 font-bold';

                        if (rec.dutyType === 'STUDY' || rec.isStudyDay) {
                          statusKhmer = 'វេនរៀនសូត្រ';
                          statusColor = 'text-indigo-700 font-bold';
                        } else if (rec.dutyType === 'LEAVE' || rec.status === 'ON_LEAVE') {
                          statusKhmer = 'សុំច្បាប់';
                          statusColor = 'text-blue-700 font-bold';
                        } else if (rec.status === 'LATE' || (rec.lateMinutes && rec.lateMinutes > 0)) {
                          statusKhmer = `មកយឺត (+${rec.lateMinutes}m)`;
                          statusColor = 'text-amber-700 font-bold';
                        } else if (rec.status === 'ABSENT' || (!rec.checkInAt && rec.dutyType === 'WORK')) {
                          statusKhmer = 'អវត្តមាន';
                          statusColor = 'text-rose-700 font-bold';
                        }

                        return (
                          <tr
                            key={rec.id}
                            className={`border-b border-slate-300 hover:bg-slate-50 ${
                              index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                            }`}
                          >
                            <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                              {toKhmerNum(index + 1)}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">
                              {rec.employee.employeeCode}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              <div className="font-bold text-slate-900">
                                {rec.employee.khmerName || rec.employee.displayName}
                              </div>
                              {rec.employee.latinName && rec.employee.latinName !== rec.employee.khmerName && (
                                <div className="text-[10px] text-slate-500 font-sans">
                                  {rec.employee.latinName}
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-slate-700">
                              {rec.employee.department?.name || 'ទូទៅ'}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center text-[10px]">
                              {rec.dutyType === 'STUDY' || rec.isStudyDay
                                ? 'រៀនសូត្រ'
                                : (rec.employee as any).shiftType === 'AFTERNOON' || (rec.employee as any).studyClassInfo
                                ? '12:00 – 17:30'
                                : '07:30 – 17:30'}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">
                              {inTime}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">
                              {outTime}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">
                              {workedHours}
                            </td>
                            <td className={`border border-slate-300 p-1.5 text-center ${statusColor}`}>
                              {statusKhmer}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-[10px] text-slate-600">
                              {(() => {
                                const raw = rec.notes || '';
                                const isChinese =
                                  Boolean((rec.employee as any)?.studyClassInfo) ||
                                  (rec.employee as any)?.shiftType === 'AFTERNOON' ||
                                  raw.includes('ចិន') ||
                                  raw.toLowerCase().includes('chinese');

                                let cleaned = raw
                                  .replace(/1-Click In-Zone Check-In/gi, '')
                                  .replace(/1-Click Check-Out/gi, '')
                                  .replace(/Manual edit:\s*/gi, '')
                                  .replace(/Manual creation by admin:\s*(No reason provided)?/gi, '')
                                  .replace(/No reason provided/gi, '')
                                  .replace(/រៀនភាសាចិន\s*(\(Study Chinese\))?/gi, '')
                                  .replace(/Study Chinese/gi, '')
                                  .replace(/\|\s*\|/g, '')
                                  .replace(/^[\s|]+|[\s|]+$/g, '')
                                  .trim();

                                if (!cleaned || cleaned === '|' || /^\d+$/.test(cleaned)) {
                                  cleaned = '';
                                }

                                if (isChinese) {
                                  return cleaned
                                    ? `រៀនភាសាចិន (Study Chinese) • ${cleaned}`
                                    : 'រៀនភាសាចិន (Study Chinese)';
                                }

                                return cleaned || (rec.dutyType === 'STUDY' ? 'ថ្ងៃសិក្សាប្រចាំសប្តាហ៍' : '—');
                              })()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                /* Period Timesheet Table */
                <table className="w-full border-collapse border border-slate-400 text-[11px] text-slate-800">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-center border-b border-slate-400">
                      <th className="border border-slate-400 p-1.5 w-8">ល.រ</th>
                      <th className="border border-slate-400 p-1.5 w-20">អត្តលេខ</th>
                      <th className="border border-slate-400 p-1.5 text-left">គោត្តនាម-នាម បុគ្គលិក</th>
                      <th className="border border-slate-400 p-1.5 text-left w-32">ផ្នែក</th>
                      <th className="border border-slate-400 p-1.5 w-20">វត្តមាន (ថ្ងៃ)</th>
                      <th className="border border-slate-400 p-1.5 w-20">មកយឺត (ដង)</th>
                      <th className="border border-slate-400 p-1.5 w-20">អវត្តមាន (ថ្ងៃ)</th>
                      <th className="border border-slate-400 p-1.5 w-28">ម៉ោងការងារសរុប</th>
                      <th className="border border-slate-400 p-1.5 text-left">ការវាយតម្លៃ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!rangeData?.employeeSummaries || rangeData.employeeSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border border-slate-400 p-4 text-center text-slate-500">
                          មិនមានទិន្នន័យសម្រាប់ចន្លោះកាលបរិច្ឆេទនេះទេ
                        </td>
                      </tr>
                    ) : (
                      rangeData.employeeSummaries.map((emp, index) => {
                        const hours = Math.floor(emp.workedMinutes / 60);
                        const mins = emp.workedMinutes % 60;

                        return (
                          <tr
                            key={emp.employeeId}
                            className={`border-b border-slate-300 hover:bg-slate-50 ${
                              index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                            }`}
                          >
                            <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                              {toKhmerNum(index + 1)}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">
                              {emp.employeeCode}
                            </td>
                            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                              {emp.displayName}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-slate-700">
                              {emp.department || 'ទូទៅ'}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-700 font-mono">
                              {toKhmerNum(emp.present)} ថ្ងៃ
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-700 font-mono">
                              {toKhmerNum(emp.late)}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-rose-700 font-mono">
                              {toKhmerNum(emp.absent)}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold font-mono text-slate-900">
                              {toKhmerNum(hours)}h {toKhmerNum(mins)}m
                            </td>
                            <td className="border border-slate-300 p-1.5 text-[10px] text-slate-600">
                              {emp.absent === 0 && emp.late === 0
                                ? 'ល្អប្រសើរ (Excellent)'
                                : emp.absent === 0
                                ? 'ល្អបង្គួរ (Good)'
                                : 'ត្រូវការពិនិត្យ (Review)'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* 5. Executive Approvals & Signature Block */}
            <div className="no-break mt-6 pt-3 font-battambang">
              {/* Cambodian Formal Issuance Date */}
              <div className="text-right text-xs text-slate-800 mb-4">
                ធ្វើនៅរាជធានីភ្នំពេញ, ថ្ងៃ{currentDayKhmer} ទី{currentDayNum} ខែ{currentMonthKhmer} ឆ្នាំ{currentYearKhmer}
              </div>

              {/* 3-Column Formal Sign-off */}
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* Column 1: Prepared By */}
                <div className="flex flex-col justify-between h-40 border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                  <div>
                    <h4 className="font-bold text-slate-900">អ្នករៀបចំរបាយការណ៍</h4>
                    <p className="text-[11px] text-slate-500">Prepared By</p>
                  </div>
                  <div className="mt-auto">
                    <div className="border-b border-dotted border-slate-400 w-36 mx-auto mb-1.5" />
                    <span className="font-bold text-slate-900 block">{preparedByName}</span>
                    <span className="text-[10px] text-slate-500">មន្ត្រីរដ្ឋបាល & ធនធានមនុស្ស</span>
                  </div>
                </div>

                {/* Column 2: Verified By */}
                <div className="flex flex-col justify-between h-40 border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                  <div>
                    <h4 className="font-bold text-slate-900">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</h4>
                    <p className="text-[11px] text-slate-500">Verified By</p>
                  </div>
                  <div className="mt-auto">
                    <div className="border-b border-dotted border-slate-400 w-36 mx-auto mb-1.5" />
                    <span className="font-bold text-slate-900 block">{verifiedByName}</span>
                    <span className="text-[10px] text-slate-500">ប្រធានផ្នែកធនធានមនុស្ស</span>
                  </div>
                </div>

                {/* Column 3: Approved By Boss (CEO) */}
                <div className="flex flex-col justify-between h-40 border-2 border-slate-300 rounded-xl p-3 bg-slate-50/60 relative">
                  <div>
                    <h4 className="font-moul text-xs text-slate-900">បានឃើញ និងឯកភាព / អនុម័ត</h4>
                    <p className="text-[10px] text-slate-500 font-sans">Approved by Executive</p>
                  </div>

                  {/* Stamp Area */}
                  <div className="my-auto">
                    <div className="w-16 h-16 rounded-full border border-dashed border-rose-400 text-rose-500 text-[9px] flex items-center justify-center mx-auto opacity-70">
                      ត្រាក្រុមហ៊ុន
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="border-b border-slate-400 w-40 mx-auto mb-1.5" />
                    <span className="font-moul text-xs text-slate-900 block">{bossName}</span>
                    <span className="text-[10px] text-slate-600 font-semibold">{bossTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-elevated">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-battambang">
            ទំហំក្រដាស៖ <strong className="text-slate-700 dark:text-slate-200">A4 ({orientation === 'landscape' ? '297mm x 210mm ផ្ដេក' : '210mm x 297mm បញ្ឈរ'})</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              បិទ (Close)
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrintToPdf}
              className="shadow-sm"
            >
              បោះពុម្ព / រក្សាទុកជា PDF (Print / Save PDF)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
