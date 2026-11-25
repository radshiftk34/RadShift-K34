import { DaySchedule } from '../engine/types';

export interface BanganWorker {
  order: number; // 1, 2, 3...
  name: string;
  department?: string;
  note?: string;
}

export interface BanganDayAssignment {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // 월, 화, 수, 목, 금
  workerOrder: number | null; // 1, 2, 3... or null
  workerName: string; // resolved worker name or ''
  unitSupportType: string; // e.g. '3호기 주간 (3D)'
  shiftCode: string; // '3D' | '4D' | '3D*' | '4D*'
  note?: string;
}

const STORAGE_KEY_WORKERS = 'radshift_bangan_workers_v1';
const STORAGE_KEY_ASSIGNMENTS = 'radshift_bangan_assignments_v1';
const STORAGE_KEY_CONFIG = 'radshift_bangan_config_v1';

// Default initial pool of Bang-an-bu workers
export const DEFAULT_BANGAN_WORKERS: BanganWorker[] = [
  { order: 1, name: '권지환', department: '방사선안전부' },
  { order: 2, name: '서민우', department: '방사선안전부' },
  { order: 3, name: '이정훈', department: '방사선안전부' },
  { order: 4, name: '최은호', department: '방사선안전부' },
  { order: 5, name: '박태양', department: '방사선안전부' },
];

export const DEFAULT_BANGAN_CONFIG = {
  startDate: '2027-01-01',
  endDate: '2027-03-07',
};

// Load workers from localStorage or fallback
export function loadBanganWorkers(): BanganWorker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((w, idx) => ({ ...w, order: idx + 1 }));
      }
    }
  } catch (err) {
    console.error('Failed to load bangan workers from localStorage:', err);
  }
  return [...DEFAULT_BANGAN_WORKERS];
}

// Save workers to localStorage
export function saveBanganWorkers(workers: BanganWorker[]): void {
  try {
    const ordered = workers.map((w, idx) => ({ ...w, order: idx + 1 }));
    localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(ordered));
  } catch (err) {
    console.error('Failed to save bangan workers:', err);
  }
}

// Load assignments map (dateStr -> workerOrder)
export function loadBanganAssignments(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load bangan assignments:', err);
  }
  return {};
}

// Save assignments map
export function saveBanganAssignments(assignments: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
  } catch (err) {
    console.error('Failed to save bangan assignments:', err);
  }
}

// Load config (start/end date)
export function loadBanganConfig(): { startDate: string; endDate: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load bangan config:', err);
  }
  return { ...DEFAULT_BANGAN_CONFIG };
}

// Save config
export function saveBanganConfig(cfg: { startDate: string; endDate: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
  } catch (err) {
    console.error('Failed to save bangan config:', err);
  }
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// Build complete list of weekday workdays for 8+1 mode with assigned workers
export function generateBanganWorkdayList(
  startDate: string,
  endDate: string,
  schedule: DaySchedule[],
  workers: BanganWorker[],
  assignments: Record<string, number>
): BanganDayAssignment[] {
  const workerMap = new Map<number, string>();
  workers.forEach((w) => workerMap.set(w.order, w.name));

  return schedule
    .filter((day) => {
      // Must be between startDate and endDate
      if (day.dateStr < startDate || day.dateStr > endDate) return false;
      // Must be weekday and NOT holiday
      return !day.isWeekend && !day.isHoliday;
    })
    .map((day) => {
      const order = assignments[day.dateStr] || null;
      const workerName = order ? workerMap.get(order) || `순번 ${order} (미등록)` : '';

      // Determine unit support type from supportShift or calculation
      let unitSupportType = 'Day 교대 지원';
      let shiftCode = 'D';

      if (day.supportShift) {
        shiftCode = day.supportShift.shiftCode;
        if (shiftCode === '3D') {
          unitSupportType = '3호기 주간 (3D)';
        } else if (shiftCode === '4D') {
          unitSupportType = '4호기 주간 (4D)';
        } else if (shiftCode === '3D*') {
          unitSupportType = '3호기 대체휴무 커버 (3D*)';
        } else if (shiftCode === '4D*') {
          unitSupportType = '4호기 대체휴무 커버 (4D*)';
        } else {
          unitSupportType = `${shiftCode} (${day.supportShift.badge || '지원'})`;
        }
      }

      const dayOfWeekStr = DAY_NAMES[day.dayOfWeek] || '';

      return {
        dateStr: day.dateStr,
        dayOfWeek: dayOfWeekStr,
        workerOrder: order,
        workerName,
        unitSupportType,
        shiftCode,
      };
    });
}
