import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../lib/queryKeys';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Clock3,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Fingerprint,
  LogIn,
  LogOut,
  Building2,
  Navigation,
  Palmtree,
  Calendar,
  BookOpen,
  GraduationCap,
  Quote,
  Lightbulb,
  Coffee,
  Target,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface TodayDuty {
  dutyType: 'WORK' | 'STUDY' | 'ON_LEAVE' | 'REST_DAY';
  canCheckIn: boolean;
  dutyTitle: string;
  dutySubtitle?: string;
  dutyMessage: string;
  isStudyDay: boolean;
  isWorkingDay: boolean;
  shiftType?: string;
  checkInStartTime?: string;
  checkInDeadline?: string;
  workEndTime?: string;
  studyClassInfo?: string | null;
  studyDay?: string | null;
  activeLeave?: {
    type: string;
    isPermission: boolean;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
  } | null;
}

interface TodayAttendance {
  id?: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: string;
  lateMinutes?: number;
  workedMinutes?: number;
  duty?: TodayDuty;
}

interface LeaveBalanceItem {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface StudyQuote {
  id: number;
  khmer: string;
  english?: string;
  author: string;
  topic: string;
}

const MOTIVATIONAL_STUDY_QUOTES: StudyQuote[] = [
  {
    id: 1,
    khmer: 'ការរៀនសូត្រប្រៀបដូចជាការជិះទូកបញ្ច្រាសទឹក បើមិនខិតខំទៅមុខ គង់តែថយក្រោយ។',
    english: 'Learning is like rowing upstream: not to advance is to drop back.',
    author: 'សុភាសិតខ្មែរ',
    topic: 'ការតស៊ូព្យាយាម',
  },
  {
    id: 2,
    khmer: 'វិជ្ជាជាទ្រព្យជាប់ប្រាណ ចោរលួចមិនបាន ភ្លើងឆេះមិនឆេះ។ ការវិនិយោគលើចំណេះដឹងតែងផ្តល់ផលចំណេញខ្ពស់បំផុត។',
    english: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
    topic: 'តម្លៃនៃចំណេះដឹង',
  },
  {
    id: 3,
    khmer: 'ឫសគល់នៃការរៀនសូត្រអាចជូរចត់ និងលំបាក ប៉ុន្តែផ្លែផ្កានឹងផ្អែមល្ហែមក្រៃលែង។',
    english: 'The roots of education are bitter, but the fruit is sweet.',
    author: 'Aristotle',
    topic: 'ផ្លែផ្កានៃការសិក្សា',
  },
  {
    id: 4,
    khmer: 'ចូររស់នៅឱ្យអស់ពីលទ្ធភាពនៅថ្ងៃនេះ ហើយបន្តរៀនសូត្រដូចជាអ្នកនឹងរស់នៅជារៀងរហូត។',
    english: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    author: 'Mahatma Gandhi',
    topic: 'ការរៀនមួយជីវិត',
  },
  {
    id: 5,
    khmer: 'ចំណេះដឹងគឺជាអាវុធដ៏មានឥទ្ធិពលបំផុត ដែលអ្នកអាចប្រើប្រាស់ដើម្បីផ្លាស់ប្តូរជីវិត និងពិភពលោក។',
    english: 'Education is the most powerful weapon which you can use to change the world.',
    author: 'Nelson Mandela',
    topic: 'ថាមពលចំណេះដឹង',
  },
  {
    id: 6,
    khmer: 'ភាពជោគជ័យមិនមែនកើតឡើងដោយចៃដន្យទេ វាជាលទ្ធផលនៃការខិតខំរៀនសូត្រ តស៊ូ និងការលះបង់ជារៀងរាល់ថ្ងៃ។',
    english: 'Success is no accident. It is hard work, perseverance, learning, and sacrifice.',
    author: 'Pelé',
    topic: 'ភាពជោគជ័យ',
  },
  {
    id: 7,
    khmer: 'កុំខ្លាចការចាប់ផ្តើមយឺត ខ្លាចតែការឈប់នៅមួយកន្លែងមិនព្រមរៀនសូត្របន្ថែម។',
    english: 'Be not afraid of going slowly, be afraid only of standing still.',
    author: 'ទស្សនវិជ្ជាបុរាណ',
    topic: 'ការបន្តដំណើរ',
  },
  {
    id: 8,
    khmer: 'ការអានសៀវភៅ និងការរៀនជំនាញថ្មី គឺជាគន្លឹះបើកទ្វារឆ្ពោះទៅរកអនាគតដ៏ភ្លឺស្វាង។',
    english: 'Wisdom is not a product of schooling but of the lifelong attempt to acquire it.',
    author: 'Albert Einstein',
    topic: 'ការអភិវឌ្ឍខ្លួន',
  },
];

// Helper to extract the given/last name of the employee
function getLastName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1];
}

// Helper to check if today is a study day in Khmer
function checkIsStudyDayKhmer(studyDay?: string | null, dayIndex?: number): boolean {
  if (!studyDay || dayIndex === undefined) return false;
  const s = studyDay.trim();
  if (dayIndex === 0 && s.includes('អាទិត្យ')) return true;
  if (dayIndex === 1 && s.includes('ចន្ទ')) return true;
  if (dayIndex === 2 && s.includes('អង្គារ')) return true;
  if (dayIndex === 3 && s.includes('ពុធ')) return true;
  if (dayIndex === 4 && (s.includes('ព្រហ') || s.includes('ព្រហស្បតិ៍'))) return true;
  if (dayIndex === 5 && s.includes('សុក្រ')) return true;
  if (dayIndex === 6 && s.includes('សៅរ៍')) return true;
  return false;
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');

  // Live ticking clock for Cambodia timezone
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Cambodia hour (0-23)
  const cambodiaHour = useMemo(() => {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        hour: 'numeric',
        hour12: false,
      }).format(liveDate);
      return parseInt(hourStr, 10);
    } catch {
      return liveDate.getHours();
    }
  }, [liveDate]);

  // Compute Cambodia day index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const cambodiaDayIndex = useMemo(() => {
    try {
      const dayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        weekday: 'short',
      }).format(liveDate);
      const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return map[dayStr] ?? liveDate.getDay();
    } catch {
      return liveDate.getDay();
    }
  }, [liveDate]);

  // Context-aware dynamic greeting with customized vibrant time-of-day styling
  const { greetingText, greetingColor } = useMemo(() => {
    if (cambodiaHour >= 5 && cambodiaHour < 12) {
      return {
        greetingText: t('home.goodMorning', 'អរុណសួស្តី'),
        greetingColor: 'text-amber-500 dark:text-amber-400',
      };
    } else if (cambodiaHour >= 12 && cambodiaHour < 18) {
      return {
        greetingText: t('home.goodAfternoon', 'ទិវាសួស្តី'),
        greetingColor: 'text-sky-500 dark:text-sky-400',
      };
    } else if (cambodiaHour >= 18 && cambodiaHour < 22) {
      return {
        greetingText: t('home.goodEvening', 'សាយណ្ហសួស្តី'),
        greetingColor: 'text-indigo-500 dark:text-indigo-400',
      };
    } else {
      return {
        greetingText: t('home.goodNight', 'រាត្រីសួស្តី'),
        greetingColor: 'text-purple-500 dark:text-purple-400',
      };
    }
  }, [cambodiaHour, t]);

  // Short name: exclusively the last username (given name)
  const shortEmployeeName = useMemo(() => {
    if (isKhmer) {
      const khmerFull =
        user?.employee?.khmerName ||
        user?.employee?.displayName ||
        user?.email?.split('@')[0] ||
        'បុគ្គលិក';
      return getLastName(khmerFull) || 'បុគ្គលិក';
    } else {
      const latinFull =
        user?.employee?.latinName ||
        user?.employee?.displayName ||
        user?.employee?.firstName ||
        user?.email?.split('@')[0] ||
        'Colleague';
      return getLastName(latinFull) || 'Colleague';
    }
  }, [isKhmer, user]);

  // Localized date header
  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(isKhmer ? 'km-KH' : 'en-US', {
        timeZone: 'Asia/Phnom_Penh',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(liveDate);
    } catch {
      return liveDate.toLocaleDateString();
    }
  }, [isKhmer, liveDate]);

  // Live Digital Time String
  const digitalTimeStr = useMemo(() => {
    try {
      return liveDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return liveDate.toLocaleTimeString();
    }
  }, [liveDate]);

  // 1. Fetch today's attendance record & duty status
  const { data: todayRecord } = useQuery<TodayAttendance>({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await apiClient.get('/attendance/my-today');
      return res.data.data;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // 2. Fetch leave balances (for compact highlight pill)
  const { data: leaveBalances } = useQuery<LeaveBalanceItem[]>({
    queryKey: ['myLeaveBalances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return res.data.data;
    },
    staleTime: 60000,
  });

  // 3. Fetch location telemetry state
  const { data: locData } = useQuery({
    queryKey: ['myLocationStatus'],
    queryFn: async () => {
      const res = await apiClient.get('/location/me');
      return res.data.data;
    },
    staleTime: 30000,
  });

  const isLocationActive = locData?.isLocationSharingActive || false;
  const isInside = locData?.lastLocation?.status === 'INSIDE_OFFICE';
  const distanceMeters = locData?.lastLocation?.distanceFromOffice;

  // Study Day & Shift Calculations
  const isStudySchedule = useMemo(() => {
    return checkIsStudyDayKhmer(user?.employee?.studyDay, cambodiaDayIndex);
  }, [user?.employee?.studyDay, cambodiaDayIndex]);

  const isAfternoonShift = useMemo(() => {
    return (
      user?.employee?.shiftType === 'AFTERNOON' ||
      (Boolean(user?.employee?.checkInStartTime) && user?.employee?.checkInStartTime !== '08:00')
    );
  }, [user?.employee?.shiftType, user?.employee?.checkInStartTime]);

  // Morning Chinese learner study mode: Afternoon shift worker, currently before 12:00 PM, and not yet checked in
  const isMorningChineseStudy = useMemo(() => {
    return isAfternoonShift && cambodiaHour < 12 && !todayRecord?.checkInAt;
  }, [isAfternoonShift, cambodiaHour, todayRecord?.checkInAt]);

  const isFullStudyDay = useMemo(() => {
    return isStudySchedule && !isAfternoonShift;
  }, [isStudySchedule, isAfternoonShift]);

  // Overall study mode: active if server duty says STUDY or locally detected as study day/morning study
  const isStudyMode = Boolean(
    todayRecord?.duty?.dutyType === 'STUDY' ||
    isFullStudyDay ||
    isMorningChineseStudy
  );

  const canCheckIn = Boolean(
    todayRecord?.duty
      ? todayRecord.duty.canCheckIn
      : !isFullStudyDay && (!isAfternoonShift || cambodiaHour >= 12)
  );

  // Motivational Quote Carousel State
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_STUDY_QUOTES.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  const currentQuote = MOTIVATIONAL_STUDY_QUOTES[quoteIndex];

  // Live worked duration calculation
  const [liveWorkedTime, setLiveWorkedTime] = useState<string>('0h 0m');
  const [workedPercentage, setWorkedPercentage] = useState<number>(0);

  useEffect(() => {
    if (todayRecord?.checkInAt && !todayRecord?.checkOutAt) {
      const checkInTime = new Date(todayRecord.checkInAt).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.max(0, Math.floor((now - checkInTime) / 60000));
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      setLiveWorkedTime(`${hours}h ${mins}m`);
      setWorkedPercentage(Math.min(100, Math.round((diffMinutes / 480) * 100)));
    } else if (todayRecord?.workedMinutes) {
      const hours = Math.floor(todayRecord.workedMinutes / 60);
      const mins = todayRecord.workedMinutes % 60;
      setLiveWorkedTime(`${hours}h ${mins}m`);
      setWorkedPercentage(Math.min(100, Math.round((todayRecord.workedMinutes / 480) * 100)));
    } else {
      setLiveWorkedTime('0h 0m');
      setWorkedPercentage(0);
    }
  }, [todayRecord, liveDate]);

  const isCheckedIn = Boolean(todayRecord?.checkInAt);
  const isCheckedOut = Boolean(todayRecord?.checkOutAt);
  const isCompletedToday = isCheckedIn && isCheckedOut;

  // Annual Leave Remaining
  const annualBalanceObj = Array.isArray(leaveBalances)
    ? leaveBalances.find((b) => b.leaveType === 'ANNUAL')
    : null;
  const annualRemaining = annualBalanceObj
    ? Number(annualBalanceObj.remainingDays).toFixed(1)
    : '15.0';

  return (
    <div className="space-y-4 pb-4 animate-fade-in max-w-lg mx-auto select-none">
      {/* 1. Senior Executive Greeting Header */}
      <div className="flex items-center justify-between gap-3 pt-1 px-0.5">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate">
            <span className={`${greetingColor}`}>{greetingText}, </span>
            <span className="text-slate-900 dark:text-slate-100 font-extrabold">{shortEmployeeName}</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5 truncate">
            {todayFormatted}
          </p>
        </div>

        {/* Study Mode Indicator or Proximity Pill */}
        {isStudyMode && !isCheckedIn ? (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{isMorningChineseStudy ? 'វេនរៀនចិន' : 'វេនរៀនសូត្រ'}</span>
            </div>
          </div>
        ) : (
          <Link to="/location-privacy" className="flex-shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 shadow-2xs ${
                isLocationActive
                  ? isInside
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                  : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLocationActive
                    ? isInside
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>
                {isLocationActive
                  ? isInside
                    ? `${t('status.INSIDE_OFFICE', 'ក្នុងតំបន់')} ${distanceMeters ? `(±${distanceMeters}m)` : ''}`
                    : t('status.OUTSIDE_OFFICE', 'ក្រៅតំបន់')
                  : t('status.LOCATION_INACTIVE', 'GPS អសកម្ម')}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* 2. DYNAMIC MAIN HERO CARD */}
      {isStudyMode && !isCheckedIn ? (
        /* STUDY DAY MOTIVATIONAL EXPERIENCE (Employee does not work / in morning study session) */
        <div className="space-y-4">
          {/* Main Hero Study Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-dark-surface border border-indigo-200/80 dark:border-indigo-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:shadow-none p-5 sm:p-6 space-y-4">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-indigo-500/15 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/15 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Digital Clock + Study Badge */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {isMorningChineseStudy
                      ? 'វេនរៀនភាសាចិន ពេលព្រឹក (Morning Chinese Class)'
                      : 'វេនសិក្សា & ពង្រឹងសមត្ថភាព (Study Day)'}
                  </span>
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {digitalTimeStr}
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{isMorningChineseStudy ? 'ម៉ោងរៀនភាសាចិន' : 'វេនរៀនសូត្រ'}</span>
              </span>
            </div>

            {/* Study Info Card */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-dark-elevated/70 backdrop-blur-sm border border-indigo-100 dark:border-dark-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMorningChineseStudy
                        ? (user?.employee?.studyClassInfo || 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)')
                        : `កាលវិភាគសិក្សា: ${user?.employee?.studyDay || 'ថ្ងៃរៀនសូត្រ'}`}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {isMorningChineseStudy
                        ? 'ចូលធ្វើការវេនរសៀល: ម៉ោង ១២:០០ ថ្ងៃត្រង់ ដល់ ០៥:៣០ ល្ងាច'
                        : 'ថ្ងៃនេះជាពេលវេលាដ៏មានតម្លៃសម្រាប់ពង្រឹងចំណេះដឹងរបស់អ្នក'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {isMorningChineseStudy
                  ? 'ពេលព្រឹកនេះជាម៉ោងរៀនភាសាចិនរបស់អ្នក។ ការស្កេន Check-In ចូលធ្វើការនឹងបើកនៅម៉ោង ១២:០០ ថ្ងៃត្រង់ (ចន្លោះពី 12:00 ដល់ 13:00)។'
                  : 'ថ្ងៃនេះជាថ្ងៃសិក្សារបស់អ្នក មិនតម្រូវឱ្យស្កេនវត្តមានចូលធ្វើការឡើយ។ សូមផ្តោតអារម្មណ៍ និងរីករាយជាមួយការរៀនសូត្រ!'}
              </p>
            </div>

            {/* Non-Clickable Friendly Status Notice (Prevents Check-In) */}
            <div className="w-full py-3.5 px-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-xs">
              {isMorningChineseStudy ? (
                <>
                  <Clock3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Check-In វេនរសៀល នឹងបើកចាប់ពីម៉ោង ១២:០០ ថ្ងៃត្រង់ (Opens at 12:00 PM)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>មិនតម្រូវឱ្យ Check-In វត្តមានឡើយ • សូមរីករាយជាមួយការរៀនសូត្រ</span>
                </>
              )}
            </div>
          </div>

          {/* Curated Hard Study Motivational Quotes Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-dark-surface dark:via-dark-surface dark:to-dark-elevated border border-slate-200/90 dark:border-dark-border shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Quote className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  សម្រង់គំនិតលើកទឹកចិត្តសម្រាប់ការសិក្សា (Inspiring Study Quote)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_STUDY_QUOTES.length)}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>សម្រង់បន្ទាប់</span>
              </button>
            </div>

            {/* Quote Body */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-2.5 transition-all duration-300">
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                {currentQuote.topic}
              </span>
              <blockquote className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed italic">
                "{currentQuote.khmer}"
              </blockquote>
              {currentQuote.english && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{currentQuote.english}"
                </p>
              )}
              <div className="text-right text-xs font-bold text-amber-700 dark:text-amber-400 pt-1">
                — {currentQuote.author}
              </div>
            </div>
          </div>

          {/* Three Study Focus & Productivity Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border space-y-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
                <Target className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                ផ្ដោតអារម្មណ៍ពេញលេញ
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                អនុវត្តបច្ចេកទេស Pomodoro 25-50 នាទី ដោយបិទ Notification ទូរស័ព្ទ។
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border space-y-1">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                កត់ត្រា និងអនុវត្ត
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                កត់ត្រាចំណុចគន្លឹះ និងអនុវត្តភ្លាមៗដើម្បីចងចាំបានយូរអង្វែង។
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border space-y-1">
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
                <Coffee className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                សម្រាកខួរក្បាល
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                សម្រាកភ្នែក ៥-១០ នាទី ផឹកទឹក និងធ្វើចលនាបន្តិចបន្តួចដើម្បីភាពស្រស់ស្រាយ។
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL WORKING SHIFT PUNCH STATION CARD */
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-white to-slate-50/70 dark:from-dark-surface dark:via-dark-surface dark:to-dark-elevated border border-slate-200/80 dark:border-dark-border shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:shadow-none p-5 sm:p-6 space-y-4">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header: Live Cambodia Clock + Attendance Status Badge */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>{t('home.todayAttendance', 'វត្តមានថ្ងៃនេះ')}</span>
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {digitalTimeStr}
              </div>
            </div>

            <Badge
              status={
                isCompletedToday
                  ? todayRecord?.status || 'PRESENT'
                  : isCheckedIn
                  ? 'PRESENT'
                  : 'NOT_RECORDED'
              }
              size="md"
            />
          </div>

          {/* Dual Punch Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Check-In Metric */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-100 dark:border-dark-border/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('home.checkInTime', 'ម៉ោងស្កេនចូល')}
                </span>
                <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {todayRecord?.checkInAt
                  ? new Date(todayRecord.checkInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '— : —'}
              </div>
              {todayRecord?.lateMinutes ? (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  +{todayRecord.lateMinutes}m {t('home.lateLabel', 'មកយឺត')}
                </span>
              ) : null}
            </div>

            {/* Check-Out Metric */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-elevated/70 border border-slate-100 dark:border-dark-border/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('home.checkOutTime', 'ម៉ោងស្កេនចេញ')}
                </span>
                <LogOut className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {todayRecord?.checkOutAt
                  ? new Date(todayRecord.checkOutAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '— : —'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-1">
                {isCompletedToday
                  ? t('home.completed', 'បានបញ្ចប់')
                  : isCheckedIn
                  ? t('home.workingShift', 'កំពុងធ្វើការ')
                  : t('home.awaitingPunch', 'រង់ចាំការស្កេន')}
              </span>
            </div>
          </div>

          {/* Live Work Progress Bar (Active during shift) */}
          {isCheckedIn && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {t('home.workedDuration', 'ម៉ោងធ្វើការសរុប')}
                </span>
                <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">
                  {liveWorkedTime} / 8h
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-elevated h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-brand-600 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${workedPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Instant Check-In / Check-Out Call to Action */}
          <Link
            to="/scan"
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] shadow-md ${
              isCompletedToday
                ? 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                : isCheckedIn
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/25'
                : 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white shadow-brand-500/30 ring-2 ring-brand-500/20'
            }`}
          >
            {isCompletedToday ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>{t('attendance.alreadyCompleted', 'បានបំពេញវត្តមានថ្ងៃនេះរួចរាល់')}</span>
              </>
            ) : isCheckedIn ? (
              <>
                <Fingerprint className="w-5 h-5 animate-pulse" />
                <span>{t('attendance.punchOutBtn', 'ចុច Check-Out ចេញពីធ្វើការ')}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 animate-pulse" />
                <span>{t('attendance.punchInBtn', 'ចុច Check-In ចូលធ្វើការ')}</span>
              </>
            )}
          </Link>
        </div>
      )}

      {/* 3. Daily Shift Schedule Timeline Card */}
      <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-dark-border rounded-3xl space-y-3.5 bg-white dark:bg-dark-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isStudyMode
                ? 'កាលវិភាគសិក្សា & វេនការងារ'
                : t('home.shiftSchedule', 'កាលវិភាគការងារថ្ងៃនេះ')}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-800/40">
            {isAfternoonShift
              ? `${user?.employee?.checkInStartTime || '12:00'} – ${user?.employee?.workEndTime || '17:30'}`
              : '08:00 – 17:30'}
          </span>
        </div>

        {/* 3-Step Workday Visual Timeline */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {isAfternoonShift ? (
            <>
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
                  រៀនភាសាចិន
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  08:00 – 11:00
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  ចូលធ្វើការ (Check-In)
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  12:00 – 13:00
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  ចេញល្ងាច (End)
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  05:30 PM
                </span>
              </div>
            </>
          ) : isFullStudyDay ? (
            <>
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
                  ពេលព្រឹក
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  08:00 – 11:30
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  សម្រាកថ្ងៃត្រង់
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  11:30 – 13:00
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
                  ពេលរសៀល
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  13:00 – 17:30
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  {t('home.morningStart', 'ចូលពេលព្រឹក')}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  08:00 AM
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  {t('home.lunchBreak', 'សម្រាកថ្ងៃត្រង់')}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  11:30 – 13:00
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-100 dark:border-dark-border/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                  {t('home.shiftEnd', 'ចេញពេលល្ងាច')}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-1 block">
                  05:30 PM
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 4. Compact Clean Leave Balance Highlight Bar */}
      <Link to="/leave" className="block">
        <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-50/70 via-white to-purple-50/70 dark:from-dark-elevated dark:via-dark-surface dark:to-dark-elevated border border-slate-200/80 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700 transition-all shadow-2xs group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Palmtree className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t('home.leaveBalance', 'ច្បាប់ប្រចាំឆ្នាំនៅសល់')}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {t('home.daysRemaining', 'សិទ្ធិឈប់សម្រាកដែលអាចប្រើបាន')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-black text-brand-600 dark:text-brand-400 font-mono">
              {annualRemaining} <span className="text-xs font-normal text-slate-400">{t('home.days', 'ថ្ងៃ')}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
};

