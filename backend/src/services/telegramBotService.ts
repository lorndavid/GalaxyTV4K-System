import https from 'node:https';
import { prisma } from '../utils/prisma.js';
import { decryptText } from '../utils/encryption.js';
import { TelegramService } from './telegramService.js';

let isPollingActive = false;
let pollingAbortController: AbortController | null = null;
let lastUpdateId = 0;

interface ReplyKeyboardMarkup {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard: boolean;
  is_persistent?: boolean;
}

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Persistent Bottom Keyboard Dock (Under the Text Input Box - Exactly as in Screenshot)
 */
export function getPersistentReplyKeyboard(): ReplyKeyboardMarkup {
  return {
    keyboard: [
      [{ text: '📊 របាយការណ៍សង្ខេប' }, { text: '👥 បញ្ជីបុគ្គលិក ២០ នាក់' }],
      [{ text: '🎓 បុគ្គលិកវេនរៀន' }, { text: '💼 បុគ្គលិកបំពេញការងារ' }],
      [{ text: '🏢 វត្តមានក្នុង/ក្រៅការិយាល័យ' }, { text: '📝 បុគ្គលិកសុំច្បាប់' }],
      [{ text: '🔄 ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/**
 * Inline Menu Markup (Attached to messages)
 */
export function getMainInlineMenu(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '📊 របាយការណ៍សង្ខេបប្រចាំថ្ងៃ', callback_data: 'menu_summary' }],
      [
        { text: '🎓 បុគ្គលិកវេនរៀន', callback_data: 'menu_study' },
        { text: '💼 បុគ្គលិកបំពេញការងារ', callback_data: 'menu_work' },
      ],
      [
        { text: '🏢 វត្តមានក្នុង/ក្រៅការិយាល័យ', callback_data: 'menu_location' },
        { text: '📝 បុគ្គលិកសុំច្បាប់', callback_data: 'menu_leave' },
      ],
      [{ text: '👥 បញ្ជីឈ្មោះបុគ្គលិកទាំង ២០ រូប', callback_data: 'menu_all_staff' }],
      [{ text: '🔄 ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ (Refresh)', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Navigation for Study Filter View
 */
export function getStudyNavMarkup(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '💼 មើលអ្នកធ្វើការ', callback_data: 'menu_work' },
        { text: '🏢 វត្តមានទីតាំង', callback_data: 'menu_location' },
      ],
      [{ text: '🔙 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Navigation for Work Filter View
 */
export function getWorkNavMarkup(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🎓 មើលអ្នករៀន', callback_data: 'menu_study' },
        { text: '🏢 វត្តមានទីតាំង', callback_data: 'menu_location' },
      ],
      [{ text: '🔙 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Navigation for Location Filter View
 */
export function getLocationNavMarkup(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🔄 ផ្ទុកទីតាំងឡើងវិញ', callback_data: 'menu_location' },
        { text: '📝 មើលអ្នកសុំច្បាប់', callback_data: 'menu_leave' },
      ],
      [{ text: '🔙 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Navigation for Leave Filter View
 */
export function getLeaveNavMarkup(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '💼 មើលអ្នកធ្វើការ', callback_data: 'menu_work' },
        { text: '🎓 មើលអ្នករៀន', callback_data: 'menu_study' },
      ],
      [{ text: '🔙 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Standard Back to Main Menu Markup
 */
export function getBackToMenuMarkup(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '🔙 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }],
    ],
  };
}

/**
 * Send HTTP Request to Telegram Bot API
 */
async function callTelegram(
  botToken: string,
  endpoint: string,
  payload?: any,
  timeoutMs: number = 10000
): Promise<any> {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${botToken}/${endpoint}`;
    const dataString = payload ? JSON.stringify(payload) : '';

    const req = https.request(
      url,
      {
        method: payload ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch {
            resolve({ ok: false, description: 'Invalid JSON response from Telegram' });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ ok: false, description: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, description: 'Request timeout' });
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

/**
 * Verify if incoming chat/sender is in the admin-authorized whitelist
 */
export async function isChatAuthorized(chatId: string | number): Promise<boolean> {
  const strId = String(chatId).trim();
  const chat = await prisma.telegramChat.findFirst({
    where: {
      chatId: strId,
      enabled: true,
    },
  });
  return Boolean(chat);
}

/**
 * Build Main Menu Welcome Text (Lively Emojis & Premium Visual Design)
 */
export function buildMainMenuText(): string {
  const KHMER_DAYS = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const KHMER_MONTHS = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];

  const now = new Date();
  const cambodiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
  const dayName = KHMER_DAYS[cambodiaDate.getDay()];
  const monthName = KHMER_MONTHS[cambodiaDate.getMonth()];
  const dayNum = TelegramService.toKhmerDigits(cambodiaDate.getDate());
  const yearNum = TelegramService.toKhmerDigits(cambodiaDate.getFullYear());
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return [
    `✨ <b>ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងកាលវិភាគការងារ</b>`,
    `🏢 <b>ស្ថាប័ន:</b> Galaxy TV 4K`,
    `📅 <b>កាលបរិច្ឆេទ:</b> ថ្ងៃ${dayName} ទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`,
    `⏰ <b>ម៉ោងបច្ចុប្បន្ន:</b> ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `សូមជ្រើសរើសមុខងារពី <b>ផ្ទាំងបញ្ជាខាងក្រោម (Keyboard Menu)</b>:`,
  ].join('\n');
}

/**
 * Filter: Employees Studying Today
 */
export async function buildStudyOnlyReport(): Promise<string> {
  const now = new Date();
  const cambodiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
  const dayIndex = cambodiaDate.getDay();

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { department: true },
    orderBy: { employeeCode: 'asc' },
  });

  const studyingStaff = employees.filter((e) =>
    TelegramService.checkIsStudyDay(e.studyDay, dayIndex)
  );

  const lines: string[] = [];
  studyingStaff.forEach((emp, index) => {
    const numKh = index + 1;
    const khmerName = emp.khmerName || emp.displayName;
    const deptName = emp.department?.name || 'ទូទៅ';
    const position = emp.position || 'បុគ្គលិក';
    const skill = emp.skill || 'ទូទៅ';
    const studyDay = emp.studyDay || 'គ្មាន';

    lines.push(
      `${numKh}. 👤 <b>${khmerName}</b>\n` +
      `   🔹 ផ្នែកការងារ: ${deptName}\n` +
      `   🔹 តួនាទី: ${position}\n` +
      `   🔹 ជំនាញ: ${skill}\n` +
      `   🔹 ថ្ងៃរៀន: ${studyDay}\n` +
      `   🔸 ស្ថានភាព: 🎓 <b>វេនរៀន</b>`
    );
  });

  return [
    `🎓 <b>បញ្ជីបុគ្គលិកមានវេនរៀនថ្ងៃនេះ</b>`,
    `🏢 <b>ស្ថាប័ន:</b> Galaxy TV 4K`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>ចំនួនសរុប:</b> <b>${TelegramService.toKhmerDigits(studyingStaff.length)} នាក់</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    studyingStaff.length > 0
      ? lines.join('\n\n')
      : '✨ មិនមានបុគ្គលិកមានវេនរៀននៅថ្ងៃនេះទេ។',
  ].join('\n');
}

/**
 * Filter: Employees Working Today
 */
export async function buildWorkOnlyReport(): Promise<string> {
  const now = new Date();
  const cambodiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
  const dayIndex = cambodiaDate.getDay();
  const todayIso = cambodiaDate.toISOString().split('T')[0];

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { department: true },
    orderBy: { employeeCode: 'asc' },
  });

  const activeLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: todayIso },
      endDate: { gte: todayIso },
    },
  });
  const leaveSet = new Set(activeLeaves.map((l) => l.employeeId));

  const workingStaff = employees.filter((e) => {
    const isStudying = TelegramService.checkIsStudyDay(e.studyDay, dayIndex);
    const isOnLeave = leaveSet.has(e.id);
    return !isStudying && !isOnLeave;
  });

  const lines: string[] = [];
  workingStaff.forEach((emp, index) => {
    const numKh = index + 1;
    const khmerName = emp.khmerName || emp.displayName;
    const deptName = emp.department?.name || 'ទូទៅ';
    const position = emp.position || 'បុគ្គលិក';
    const skill = emp.skill || 'ទូទៅ';
    const studyDay = emp.studyDay || 'គ្មាន';

    lines.push(
      `${numKh}. 👤 <b>${khmerName}</b>\n` +
      `   🔹 ផ្នែកការងារ: ${deptName}\n` +
      `   🔹 តួនាទី: ${position}\n` +
      `   🔹 ជំនាញ: ${skill}\n` +
      `   🔹 ថ្ងៃរៀន: ${studyDay}\n` +
      `   🔸 ស្ថានភាព: 💼 <b>បំពេញការងារ</b>`
    );
  });

  return [
    `💼 <b>បញ្ជីបុគ្គលិកបំពេញការងារថ្ងៃនេះ</b>`,
    `🏢 <b>ស្ថាប័ន:</b> Galaxy TV 4K`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>ចំនួនសរុប:</b> <b>${TelegramService.toKhmerDigits(workingStaff.length)} នាក់</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    workingStaff.length > 0
      ? lines.join('\n\n')
      : '✨ មិនមានបុគ្គលិកបំពេញការងារនៅថ្ងៃនេះទេ។',
  ].join('\n');
}

/**
 * Filter: Inside / Outside Office Real-Time Location
 */
export async function buildLocationStatusReport(): Promise<string> {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { department: true },
    orderBy: { employeeCode: 'asc' },
  });

  const insideStaff = employees.filter((e) => e.lastLocationStatus === 'INSIDE_OFFICE');
  const outsideStaff = employees.filter((e) => e.lastLocationStatus === 'OUTSIDE_OFFICE');
  const otherStaff = employees.filter(
    (e) => e.lastLocationStatus !== 'INSIDE_OFFICE' && e.lastLocationStatus !== 'OUTSIDE_OFFICE'
  );

  const lines: string[] = [];
  employees.forEach((emp, index) => {
    const numKh = index + 1;
    const khmerName = emp.khmerName || emp.displayName;
    let statusText = 'មិនទាន់កំណត់ទីតាំង';
    let statusIcon = '⚪';
    if (emp.lastLocationStatus === 'INSIDE_OFFICE') {
      statusText = 'នៅក្នុងការិយាល័យ';
      statusIcon = '🟢';
    } else if (emp.lastLocationStatus === 'OUTSIDE_OFFICE') {
      statusText = 'នៅក្រៅការិយាល័យ';
      statusIcon = '🔴';
    }

    lines.push(`${numKh}. 👤 <b>${khmerName}</b> — ${statusIcon} ${statusText}`);
  });

  return [
    `🏢 <b>ស្ថានភាពវត្តមានក្នុង និងក្រៅការិយាល័យ (Real-time)</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🟢 នៅក្នុងការិយាល័យ: <b>${TelegramService.toKhmerDigits(insideStaff.length)} នាក់</b>`,
    `🔴 នៅក្រៅការិយាល័យ: <b>${TelegramService.toKhmerDigits(outsideStaff.length)} នាក់</b>`,
    `⚪ មិនទាន់កំណត់ទីតាំង: <b>${TelegramService.toKhmerDigits(otherStaff.length)} នាក់</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    lines.join('\n'),
  ].join('\n');
}

/**
 * Filter: Employees on Approved Leave Today
 */
export async function buildLeaveOnlyReport(): Promise<string> {
  const now = new Date();
  const cambodiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
  const todayIso = cambodiaDate.toISOString().split('T')[0];

  const activeLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: todayIso },
      endDate: { gte: todayIso },
    },
    include: { employee: true },
  });

  if (activeLeaves.length === 0) {
    return [
      `📝 <b>បញ្ជីបុគ្គលិកសុំច្បាប់សម្រាកថ្ងៃនេះ</b>`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✨ មិនមានបុគ្គលិកសុំច្បាប់សម្រាកនៅថ្ងៃនេះទេ។`,
    ].join('\n');
  }

  const lines = activeLeaves.map((l, index) => {
    const numKh = index + 1;
    const name = l.employee.khmerName || l.employee.displayName;
    return (
      `${numKh}. 👤 <b>${name}</b>\n` +
      `   🔹 ប្រភេទច្បាប់: 🌴 ${l.type}\n` +
      `   🔹 រយៈពេល: ${l.startDate} ដល់ ${l.endDate}\n` +
      `   🔹 មូលហេតុ: ${l.reason || 'ផ្ទាល់ខ្លួន'}`
    );
  });

  return [
    `📝 <b>បញ្ជីបុគ្គលិកសុំច្បាប់សម្រាកថ្ងៃនេះ</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>ចំនួនសរុប:</b> <b>${TelegramService.toKhmerDigits(activeLeaves.length)} នាក់</b>`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    lines.join('\n\n'),
  ].join('\n');
}

/**
 * Handle Inbound Update (Message or Callback Query)
 */
async function processUpdate(botToken: string, update: any): Promise<void> {
  // 1. Handle Inline Keyboard Button Click
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    const data = cq.data;

    // Fast responsive native toast animation
    let toastMsg = '✨ កំពុងដំណើរការ...';
    if (data === 'menu_main') toastMsg = '🏠 ម៉ឺនុយដើម';
    if (data === 'menu_study') toastMsg = '🎓 បុគ្គលិកវេនរៀន';
    if (data === 'menu_work') toastMsg = '💼 បុគ្គលិកបំពេញការងារ';
    if (data === 'menu_location') toastMsg = '🏢 វត្តមានទីតាំង';
    if (data === 'menu_leave') toastMsg = '📝 បុគ្គលិកសុំច្បាប់';
    if (data === 'menu_summary' || data === 'menu_all_staff') toastMsg = '📊 របាយការណ៍សង្ខេប';

    await callTelegram(botToken, 'answerCallbackQuery', {
      callback_query_id: cq.id,
      text: toastMsg,
    });

    if (!chatId) return;

    // Check authorization
    const authorized = await isChatAuthorized(chatId);
    if (!authorized) {
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text:
          `🔒 <b>ការជូនដំណឹងពីប្រព័ន្ធសុវត្ថិភាព</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⛔ លោកអ្នកមិនមានសិទ្ធិចូលមើលទិន្នន័យនេះទេ។\n` +
          `🆔 លេខសម្គាល់គណនីរបស់អ្នកគឺ: <code>${chatId}</code>\n` +
          `💬 សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ដើម្បីបន្ថែមលេខសម្គាល់នេះ។`,
        parse_mode: 'HTML',
      });
      return;
    }

    let responseText = '';
    let keyboard: InlineKeyboardMarkup = getBackToMenuMarkup();

    switch (data) {
      case 'menu_main':
        responseText = buildMainMenuText();
        keyboard = getMainInlineMenu();
        break;

      case 'menu_study':
        responseText = await buildStudyOnlyReport();
        keyboard = getStudyNavMarkup();
        break;

      case 'menu_work':
        responseText = await buildWorkOnlyReport();
        keyboard = getWorkNavMarkup();
        break;

      case 'menu_location':
        responseText = await buildLocationStatusReport();
        keyboard = getLocationNavMarkup();
        break;

      case 'menu_leave':
        responseText = await buildLeaveOnlyReport();
        keyboard = getLeaveNavMarkup();
        break;

      case 'menu_summary':
      case 'menu_all_staff': {
        const full = await TelegramService.buildDailyMorningSummaryKhmer();
        responseText = full.messages[0] || 'មិនមានទិន្នន័យ';
        keyboard = getBackToMenuMarkup();
        break;
      }

      default:
        responseText = buildMainMenuText();
        keyboard = getMainInlineMenu();
    }

    // Try to edit the message smoothly, or send new if edit fails
    const editRes = await callTelegram(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: responseText,
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });

    if (!editRes.ok) {
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: getPersistentReplyKeyboard(),
        disable_web_page_preview: true,
      });
    }

    return;
  }

  // 2. Handle Bottom Reply Keyboard Clicks or Direct Text (e.g. /start, /menu, button clicks)
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();

    if (!chatId) return;

    // Check authorization
    const authorized = await isChatAuthorized(chatId);
    if (!authorized) {
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text:
          `🔒 <b>ការជូនដំណឹងពីប្រព័ន្ធសុវត្ថិភាព</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⛔ លោកអ្នកមិនមានសិទ្ធិចូលមើលទិន្នន័យនេះទេ។\n` +
          `🆔 លេខសម្គាល់គណនីរបស់អ្នកគឺ: <code>${chatId}</code>\n` +
          `💬 សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ដើម្បីបន្ថែមលេខសម្គាល់នេះ។`,
        parse_mode: 'HTML',
      });
      return;
    }

    const lower = text.toLowerCase();

    // 1. Daily Summary
    if (text.includes('សង្ខេប') || lower.startsWith('/summary')) {
      const full = await TelegramService.buildDailyMorningSummaryKhmer();
      for (const msgPart of full.messages) {
        await callTelegram(botToken, 'sendMessage', {
          chat_id: chatId,
          text: msgPart,
          parse_mode: 'HTML',
          reply_markup: getPersistentReplyKeyboard(),
          disable_web_page_preview: true,
        });
      }
      return;
    }

    // 2. Study filter
    if (text.includes('រៀន') || lower.startsWith('/study')) {
      const report = await buildStudyOnlyReport();
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: report,
        parse_mode: 'HTML',
        reply_markup: getPersistentReplyKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    // 3. Work filter
    if (text.includes('បំពេញការងារ') || text.includes('ធ្វើការ') || lower.startsWith('/work')) {
      const report = await buildWorkOnlyReport();
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: report,
        parse_mode: 'HTML',
        reply_markup: getPersistentReplyKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    // 4. Location filter
    if (text.includes('វត្តមាន') || text.includes('ទីតាំង') || lower.startsWith('/location')) {
      const report = await buildLocationStatusReport();
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: report,
        parse_mode: 'HTML',
        reply_markup: getPersistentReplyKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    // 5. Leave filter
    if (text.includes('ច្បាប់') || lower.startsWith('/leave')) {
      const report = await buildLeaveOnlyReport();
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: report,
        parse_mode: 'HTML',
        reply_markup: getPersistentReplyKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    // 6. All 20 Staff
    if (text.includes('២០') || text.includes('20') || text.includes('បញ្ជី') || lower.startsWith('/staff')) {
      const full = await TelegramService.buildDailyMorningSummaryKhmer();
      for (const msgPart of full.messages) {
        await callTelegram(botToken, 'sendMessage', {
          chat_id: chatId,
          text: msgPart,
          parse_mode: 'HTML',
          reply_markup: getPersistentReplyKeyboard(),
          disable_web_page_preview: true,
        });
      }
      return;
    }

    // Default: Main Menu with persistent bottom keyboard
    const menuText = buildMainMenuText();
    await callTelegram(botToken, 'sendMessage', {
      chat_id: chatId,
      text: menuText,
      parse_mode: 'HTML',
      reply_markup: getPersistentReplyKeyboard(),
      disable_web_page_preview: true,
    });
  }
}

/**
 * Start Telegram Interactive Bot Long-Polling Loop
 */
export async function startTelegramBotPolling(): Promise<void> {
  if (isPollingActive) {
    return;
  }

  isPollingActive = true;
  pollingAbortController = new AbortController();

  console.log('🤖 Starting Telegram Bot Interactive Long-Polling Service...');

  // Run in background without blocking server boot
  (async () => {
    while (isPollingActive) {
      try {
        const config = await prisma.telegramConfig.findUnique({
          where: { id: 'default' },
        });

        if (!config || !config.enabled || !config.botTokenEncrypted) {
          // Wait 10 seconds before re-checking if disabled
          await new Promise((r) => setTimeout(r, 10000));
          continue;
        }

        const botToken = decryptText(config.botTokenEncrypted);
        if (!botToken) {
          await new Promise((r) => setTimeout(r, 10000));
          continue;
        }

        // Configure default commands for top [Menu] button
        callTelegram(botToken, 'setMyCommands', {
          commands: [
            { command: 'menu', description: 'បើកផ្ទាំងបញ្ជា (Open Menu)' },
            { command: 'summary', description: 'របាយការណ៍សង្ខេបប្រចាំថ្ងៃ' },
            { command: 'study', description: 'បុគ្គលិកវេនរៀន' },
            { command: 'work', description: 'បុគ្គលិកបំពេញការងារ' },
            { command: 'location', description: 'វត្តមានទីតាំង' },
            { command: 'leave', description: 'បុគ្គលិកសុំច្បាប់' },
          ],
        }).catch(() => {});

        // Long poll updates with 20s timeout
        const updatesRes = await callTelegram(
          botToken,
          'getUpdates',
          {
            offset: lastUpdateId + 1,
            timeout: 20,
            allowed_updates: ['message', 'callback_query'],
          },
          25000
        );

        if (updatesRes.ok && Array.isArray(updatesRes.result)) {
          for (const update of updatesRes.result) {
            if (update.update_id > lastUpdateId) {
              lastUpdateId = update.update_id;
            }
            // Process update asynchronously
            processUpdate(botToken, update).catch((err) =>
              console.error('[TelegramBot] processUpdate error:', err)
            );
          }
        } else {
          // Slight pause on error or rate-limit
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error('[TelegramBot] Polling loop exception:', err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
}

/**
 * Stop Polling Loop
 */
export function stopTelegramBotPolling(): void {
  isPollingActive = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  console.log('🛑 Telegram Bot Interactive Long-Polling Service stopped.');
}
