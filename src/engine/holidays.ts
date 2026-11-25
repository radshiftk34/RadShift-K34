import { Holiday } from './types';

// 2027년 대한민국 법정공휴일 및 대체공휴일 (총 24일, 우주항공청 2027년 월력요항 기준)
export const HOLIDAYS_2027: Holiday[] = [
  { dateStr: '2027-01-01', name: '신정' },
  { dateStr: '2027-02-06', name: '설날 연휴' },
  { dateStr: '2027-02-07', name: '설날' },
  { dateStr: '2027-02-08', name: '설날 연휴' },
  { dateStr: '2027-02-09', name: '설날 대체공휴일', isSubstitute: true },
  { dateStr: '2027-03-01', name: '3·1절' },
  { dateStr: '2027-05-01', name: '근로자의 날' },
  { dateStr: '2027-05-03', name: '근로자의 날 대체공휴일', isSubstitute: true },
  { dateStr: '2027-05-05', name: '어린이날' },
  { dateStr: '2027-05-13', name: '부처님오신날' },
  { dateStr: '2027-06-06', name: '현충일' },
  { dateStr: '2027-07-17', name: '제헌절' },
  { dateStr: '2027-07-19', name: '제헌절 대체공휴일', isSubstitute: true },
  { dateStr: '2027-08-15', name: '광복절' },
  { dateStr: '2027-08-16', name: '광복절 대체공휴일', isSubstitute: true },
  { dateStr: '2027-09-14', name: '추석 연휴' },
  { dateStr: '2027-09-15', name: '추석' },
  { dateStr: '2027-09-16', name: '추석 연휴' },
  { dateStr: '2027-10-03', name: '개천절' },
  { dateStr: '2027-10-04', name: '개천절 대체공휴일', isSubstitute: true },
  { dateStr: '2027-10-09', name: '한글날' },
  { dateStr: '2027-10-11', name: '한글날 대체공휴일', isSubstitute: true },
  { dateStr: '2027-12-25', name: '성탄절' },
  { dateStr: '2027-12-27', name: '성탄절 대체공휴일', isSubstitute: true },
];

export const HOLIDAYS_2026: Holiday[] = [
  { dateStr: '2026-01-01', name: '신정' },
  { dateStr: '2026-02-16', name: '설날 연휴' },
  { dateStr: '2026-02-17', name: '설날' },
  { dateStr: '2026-02-18', name: '설날 연휴' },
  { dateStr: '2026-03-01', name: '3·1절' },
  { dateStr: '2026-03-02', name: '3·1절 대체공휴일', isSubstitute: true },
  { dateStr: '2026-05-01', name: '근로자의 날' },
  { dateStr: '2026-05-05', name: '어린이날' },
  { dateStr: '2026-05-24', name: '부처님오신날' },
  { dateStr: '2026-05-25', name: '부처님오신날 대체공휴일', isSubstitute: true },
  { dateStr: '2026-06-06', name: '현충일' },
  { dateStr: '2026-08-15', name: '광복절' },
  { dateStr: '2026-08-17', name: '광복절 대체공휴일', isSubstitute: true },
  { dateStr: '2026-09-24', name: '추석 연휴' },
  { dateStr: '2026-09-25', name: '추석' },
  { dateStr: '2026-09-26', name: '추석 연휴' },
  { dateStr: '2026-10-03', name: '개천절' },
  { dateStr: '2026-10-05', name: '개천절 대체공휴일', isSubstitute: true },
  { dateStr: '2026-10-09', name: '한글날' },
  { dateStr: '2026-12-25', name: '성탄절' },
];

const holidayMap: Record<string, string> = {};
[...HOLIDAYS_2026, ...HOLIDAYS_2027].forEach((h) => {
  holidayMap[h.dateStr] = h.name;
});

export function getHolidayName(dateStr: string): string | undefined {
  return holidayMap[dateStr];
}

export function isHoliday(dateStr: string): boolean {
  return Boolean(holidayMap[dateStr]);
}
