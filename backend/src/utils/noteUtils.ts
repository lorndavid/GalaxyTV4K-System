/**
 * Attendance Note Sanitization Utility
 *
 * Removes automated technical logging strings (1-Click, Manual edit loops)
 * while preserving genuine admin notes and Chinese study tags.
 */
export function sanitizeAttendanceNote(
  rawNote?: string | null,
  isChineseStudy?: boolean,
  isAfternoonShift?: boolean
): string | null {
  if (isChineseStudy) {
    if (!rawNote) return 'រៀនភាសាចិន (Study Chinese)';

    let cleaned = rawNote
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

    // If leftover is empty or lone digits (e.g. dummy test entries like "7")
    if (!cleaned || cleaned === '|' || /^\d+$/.test(cleaned)) {
      return 'រៀនភាសាចិន (Study Chinese)';
    }

    return `រៀនភាសាចិន (Study Chinese) | ${cleaned}`;
  }

  if (!rawNote) {
    return isAfternoonShift ? 'វេនរសៀល (Afternoon Shift)' : null;
  }

  let cleaned = rawNote
    .replace(/1-Click In-Zone Check-In/gi, '')
    .replace(/1-Click Check-Out/gi, '')
    .replace(/Manual edit:\s*/gi, '')
    .replace(/Manual creation by admin:\s*(No reason provided)?/gi, '')
    .replace(/No reason provided/gi, '')
    .replace(/\|\s*\|/g, '')
    .replace(/^[\s|]+|[\s|]+$/g, '')
    .trim();

  // If leftover is empty or lone digits (e.g. "7")
  if (!cleaned || cleaned === '|' || /^\d+$/.test(cleaned)) {
    return isAfternoonShift ? 'វេនរសៀល (Afternoon Shift)' : null;
  }

  return cleaned;
}
