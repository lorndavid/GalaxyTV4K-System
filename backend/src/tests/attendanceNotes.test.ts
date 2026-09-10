import { describe, it, expect } from 'vitest';
import { sanitizeAttendanceNote } from '../utils/noteUtils.js';

describe('sanitizeAttendanceNote', () => {
  it('should remove repeated 1-Click and Manual edit chains for standard employees', () => {
    const dirty =
      '1-Click In-Zone Check-In | 1-Click Check-Out 1-Click In-Zone Check-In1-Click In-Zone Check-In | Manual edit: 1-Click In-Zone Check-In | Manual edit: 1-Click In-Zone Check-In | Manual edit: 1-Click In-Zone Check-In | Manual edit: 1-Click In-Zone Check-In | | Manual edit: 7';
    const result = sanitizeAttendanceNote(dirty, false, false);
    expect(result).toBeNull();
  });

  it('should preserve Chinese study badge even with dirty 1-Click strings', () => {
    const dirty =
      '1-Click In-Zone Check-In | 1-Click Check-Out 1-Click In-Zone Check-In1-Click In-Zone Check-In | Manual edit: 1-Click In-Zone Check-In | Manual edit: 7';
    const result = sanitizeAttendanceNote(dirty, true, false);
    expect(result).toBe('រៀនភាសាចិន (Study Chinese)');
  });

  it('should preserve Chinese study badge and append genuine admin notes', () => {
    const dirty =
      '1-Click In-Zone Check-In | 1-Click Check-Out | Manual edit: សុំចេញមុនម៉ោង 30 នាទី';
    const result = sanitizeAttendanceNote(dirty, true, false);
    expect(result).toBe('រៀនភាសាចិន (Study Chinese) | សុំចេញមុនម៉ោង 30 នាទី');
  });

  it('should return genuine admin note for regular employees', () => {
    const dirty =
      '1-Click In-Zone Check-In | 1-Click Check-Out | Manual edit: បានសុំច្បាប់ផ្ទាល់មាត់';
    const result = sanitizeAttendanceNote(dirty, false, false);
    expect(result).toBe('បានសុំច្បាប់ផ្ទាល់មាត់');
  });

  it('should return null when input is empty or just 1-Click check-in', () => {
    expect(sanitizeAttendanceNote('1-Click In-Zone Check-In', false, false)).toBeNull();
    expect(sanitizeAttendanceNote('1-Click In-Zone Check-In | 1-Click Check-Out', false, false)).toBeNull();
    expect(sanitizeAttendanceNote(null, false, false)).toBeNull();
    expect(sanitizeAttendanceNote(undefined, false, false)).toBeNull();
  });

  it('should return Chinese study label when notes are null for Chinese study employees', () => {
    expect(sanitizeAttendanceNote(null, true, false)).toBe('រៀនភាសាចិន (Study Chinese)');
    expect(sanitizeAttendanceNote('', true, false)).toBe('រៀនភាសាចិន (Study Chinese)');
  });
});
