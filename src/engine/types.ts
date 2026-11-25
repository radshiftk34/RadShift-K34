export type UnitType = '3U' | '4U' | 'FLOAT' | 'SUPPORT';

export type ShiftCode =
  | 'D'
  | 'A'
  | 'N'
  | 'X'
  | '3D'
  | '4D'
  | '3D*'
  | '4D*'
  | '일근'
  | '3N'
  | '연차'
  | '대근';

export interface ShiftCell {
  slotNo: number; // 1 to 9 (or 10 for support)
  memberName: string;
  unit: UnitType;
  shiftCode: ShiftCode;
  phase?: number;
  badge?: string;
  isAdjusted?: boolean;
  creditDelta?: number;
  note?: string;
}

export interface DaySchedule {
  dateStr: string; // YYYY-MM-DD
  dayIndex: number; // days from anchor (2025-12-29 = 0)
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isHoliday: boolean;
  holidayName?: string;
  isWeekend: boolean;
  isWeekdayWorkday: boolean; // Monday-Friday and not a holiday
  shifts: ShiftCell[]; // slots 1 to 9 (and optional support)
  supportShift?: ShiftCell;
  coverageErrors: string[];
}

export interface Holiday {
  dateStr: string;
  name: string;
  isSubstitute?: boolean;
}

export interface ConstraintViolation {
  type: 'HARD' | 'SOFT';
  message: string;
  dateStr: string;
  slotNo?: number;
  memberName?: string;
}
