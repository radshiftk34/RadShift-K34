import * as XLSX from 'xlsx';
import { DaySchedule } from '../engine/types';

export function exportScheduleToExcel(
  schedule2026: DaySchedule[],
  schedule2027: DaySchedule[],
  year: number = 2027
) {
  const currentSchedule = year === 2026 ? schedule2026 : schedule2027;
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Monthly Matrix for Selected Year
  const matrixData: any[][] = [];
  matrixData.push([`한수원 고리 3,4호기 HP 교대근무표 (${year}년)`]);
  matrixData.push(['슬롯', '성명', '소속', ...currentSchedule.slice(0, 31).map((_, i) => `${i + 1}일`)]);

  // Group by slots 1 to 9
  for (let slot = 1; slot <= 9; slot++) {
    const slotShifts = currentSchedule.slice(0, 31).map((d) => {
      const s = d.shifts.find((shift) => shift.slotNo === slot);
      return s ? s.shiftCode : 'X';
    });
    const sample = currentSchedule[0].shifts.find((s) => s.slotNo === slot);
    matrixData.push([`Slot ${slot}`, sample?.memberName || '', sample?.unit || '', ...slotShifts]);
  }

  // Support shift row if 2027
  if (year === 2027) {
    const supportShifts = currentSchedule.slice(0, 31).map((d) => d.supportShift?.shiftCode || 'X');
    matrixData.push(['Support', '방안부지원', 'SUPPORT', ...supportShifts]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, ws1, `${year}년 근무표`);

  // 2. Sheet 2: 2026 vs 2027 Comparison
  const compData: any[][] = [
    ['구분', '2026년 정상 9인 (연간)', '', '', '', '2027년 8+1 지원 체제 (연간)', '', '', ''],
    ['성명', '주간(D)', '오후(A)', '야간(N)', '총 근무일', '주간(D)', '오후(A)', '야간(N)', '총 근무일', '비고'],
  ];

  const getStats = (schedule: DaySchedule[], slot: number) => {
    let d = 0, a = 0, n = 0;
    for (const day of schedule) {
      const s = day.shifts.find((shift) => shift.slotNo === slot);
      if (!s) continue;
      if (s.shiftCode === 'D' || s.shiftCode === '3D' || s.shiftCode === '4D' || s.shiftCode === '3D*' || s.shiftCode === '4D*') d++;
      else if (s.shiftCode === 'A') a++;
      else if (s.shiftCode === 'N' || s.shiftCode === '3N') n++;
    }
    return { d, a, n, total: d + a + n };
  };

  for (let slot = 1; slot <= 9; slot++) {
    const s26 = getStats(schedule2026, slot);
    const s27 = getStats(schedule2027, slot);
    const name26 = schedule2026[0].shifts.find((s) => s.slotNo === slot)?.memberName || `Slot ${slot}`;
    const name27 = schedule2027[0].shifts.find((s) => s.slotNo === slot)?.memberName || `Slot ${slot}`;
    compData.push([
      `${name27} (Slot ${slot})`,
      s26.d, s26.a, s26.n, s26.total,
      s27.d, s27.a, s27.n, s27.total,
      name26 !== name27 ? `${name26} -> ${name27}` : ''
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(compData);
  XLSX.utils.book_append_sheet(wb, ws2, '2026 vs 2027 비교표');

  // 3. Sheet 3: Credit Settlement
  const creditData: any[][] = [
    ['2027년 방안부 8+1 대체휴무 크레딧 적립/사용 원장'],
    ['일자', '슬롯', '대상자', '구분', '변동', '상세 사유'],
  ];

  for (const day of schedule2027) {
    for (const s of day.shifts) {
      if (s.creditDelta) {
        creditData.push([
          day.dateStr,
          `Slot ${s.slotNo}`,
          s.memberName,
          s.creditDelta > 0 ? '적립' : '사용',
          s.creditDelta > 0 ? '+1' : '-1',
          s.badge || '대체휴무 정산',
        ]);
      }
    }
  }

  const ws3 = XLSX.utils.aoa_to_sheet(creditData);
  XLSX.utils.book_append_sheet(wb, ws3, '크레딧 정산표');

  // Write and trigger download
  XLSX.writeFile(wb, `RadShift_K34_근무표_${year}.xlsx`);
}
