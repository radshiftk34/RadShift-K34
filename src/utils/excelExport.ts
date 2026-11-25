import * as XLSX from 'xlsx';
import { DaySchedule } from '../engine/types';
import { master2027Data } from '../data/master2027Data';

export function exportScheduleToExcel(
  schedule2026: DaySchedule[],
  _schedule2027: DaySchedule[],
  year: number = 2027
) {
  const wb = XLSX.utils.book_new();

  if (year === 2027) {
    // 1. Sheet 1: 2027년_교대근무표 (12 Months Matrix)
    const s1Rows: any[][] = [];
    s1Rows.push([master2027Data.title]);
    s1Rows.push([master2027Data.subtitle]);
    s1Rows.push([]); // blank

    for (const m of master2027Data.months) {
      // Row 1: Month name + day numbers
      s1Rows.push([`${m.month}월`, '', ...m.days]);
      // Row 2: Day of week
      s1Rows.push(['', '', ...m.dows]);

      // Member rows
      for (let memIdx = 0; memIdx < m.members.length; memIdx++) {
        const mem = m.members[memIdx];
        const remark = memIdx === 0 ? m.remark : '';
        s1Rows.push([mem.unit, mem.name, ...mem.shifts, remark]);
      }
      s1Rows.push([]); // blank between months
    }

    const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, '2027년_교대근무표');

    // 2. Sheet 2: 2026vs2027_근무일수_비교
    const ws2 = XLSX.utils.aoa_to_sheet(master2027Data.comparisonTable);
    XLSX.utils.book_append_sheet(wb, ws2, '2026vs2027_근무일수_비교');

    // 3. Sheet 3: 8+1구간_상세및크레딧정산
    const ws3 = XLSX.utils.aoa_to_sheet(master2027Data.creditTable);
    XLSX.utils.book_append_sheet(wb, ws3, '8+1구간_상세및크레딧정산');

    // 4. Sheet 4: 2027년_통상Day_순환일정
    const ws4 = XLSX.utils.aoa_to_sheet(master2027Data.timelineTable);
    XLSX.utils.book_append_sheet(wb, ws4, '2027년_통상Day_순환일정');
  } else {
    // 2026 Normal 9-person Schedule
    const s1Rows: any[][] = [];
    s1Rows.push([`2026년도 고리3,4호기 HP 교대근무표 (정상 9인 체제)`]);
    s1Rows.push([]);

    for (let month = 1; month <= 12; month++) {
      const monthPrefix = `2026-${String(month).padStart(2, '0')}`;
      const mDays = schedule2026.filter((d) => d.dateStr.startsWith(monthPrefix));
      const dayNums = mDays.map((d) => parseInt(d.dateStr.slice(8), 10));
      const dows = mDays.map((d) => ['일', '월', '화', '수', '목', '금', '토'][d.dayOfWeek]);

      s1Rows.push([`${month}월`, '', ...dayNums]);
      s1Rows.push(['', '', ...dows]);

      // 9 members
      for (let slot = 1; slot <= 9; slot++) {
        const sample = mDays[0]?.shifts.find((s) => s.slotNo === slot);
        const shifts = mDays.map((d) => {
          const s = d.shifts.find((shift) => shift.slotNo === slot);
          return s?.shiftCode || 'X';
        });
        s1Rows.push([sample?.unit || '', sample?.memberName || `Slot ${slot}`, ...shifts]);
      }
      s1Rows.push([]);
    }

    const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, '2026년_교대근무표');
  }

  // Trigger download
  XLSX.writeFile(wb, `고리3_4호기_HP_교대근무표_${year}년.xlsx`);
}
