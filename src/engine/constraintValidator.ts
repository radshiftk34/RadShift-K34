import { DaySchedule, ShiftCode, ShiftCell, ConstraintViolation } from './types';

export function isDayShift(code: ShiftCode): boolean {
  return ['D', '3D', '4D', '3D*', '4D*', '일근'].includes(code);
}

export function isAfternoonShift(code: ShiftCode): boolean {
  return code === 'A';
}

export function isNightShift(code: ShiftCode): boolean {
  return code === 'N' || code === '3N';
}

export function isWorkShift(code: ShiftCode): boolean {
  return code !== 'X' && code !== '연차';
}

/**
 * Checks if transitioning from prevCode on day d to nextCode on day d+1 constitutes a Quick Return.
 * Quick Return is defined as N/3N or A followed immediately by D/3D/4D/일근 on the next day.
 */
export function isQuickReturn(prevCode: ShiftCode, nextCode: ShiftCode): boolean {
  if (isNightShift(prevCode) && isDayShift(nextCode)) return true;
  if (isAfternoonShift(prevCode) && isDayShift(nextCode)) return true;
  return false;
}

export interface ValidationResult {
  isValid: boolean; // false if any HARD violation exists
  hardViolations: string[];
  softWarnings: string[];
}

/**
 * Validates a single proposed cell change before committing.
 */
export function validateProposedCellChange(
  allDays: DaySchedule[],
  targetDateStr: string,
  targetSlotNo: number,
  newCode: ShiftCode,
  overrides: Record<string, ShiftCode> = {}
): ValidationResult {
  const hardViolations: string[] = [];
  const softWarnings: string[] = [];

  const dayIndex = allDays.findIndex((d) => d.dateStr === targetDateStr);
  if (dayIndex === -1) {
    return { isValid: false, hardViolations: ['유효하지 않은 일자입니다.'], softWarnings: [] };
  }

  const targetDay = allDays[dayIndex];
  const targetShift = targetDay.shifts.find((s) => s.slotNo === targetSlotNo);
  if (!targetShift) {
    return { isValid: false, hardViolations: ['유효하지 않은 근무자 슬롯입니다.'], softWarnings: [] };
  }

  // 1. Check Quick Return with previous day
  if (dayIndex > 0) {
    const prevDay = allDays[dayIndex - 1];
    const prevOverrideKey = `${prevDay.dateStr}_${targetSlotNo}`;
    const prevCode = overrides[prevOverrideKey] || prevDay.shifts.find((s) => s.slotNo === targetSlotNo)?.shiftCode || 'X';
    if (isQuickReturn(prevCode, newCode)) {
      hardViolations.push(
        `역순환(Quick Return) 위반: 전일(${prevDay.dateStr}) [${prevCode}] 근무 후 당일 [${newCode}] 배정은 불가합니다.`
      );
    }
  }

  // 2. Check Quick Return with next day
  if (dayIndex < allDays.length - 1) {
    const nextDay = allDays[dayIndex + 1];
    const nextOverrideKey = `${nextDay.dateStr}_${targetSlotNo}`;
    const nextCode = overrides[nextOverrideKey] || nextDay.shifts.find((s) => s.slotNo === targetSlotNo)?.shiftCode || 'X';
    if (isQuickReturn(newCode, nextCode)) {
      hardViolations.push(
        `역순환(Quick Return) 위반: 당일 [${newCode}] 배정 시 익일(${nextDay.dateStr}) [${nextCode}] 근무로 역순환이 발생합니다.`
      );
    }
  }

  // 3. Check Daily Coverage Impact on targetDay
  const tentativeShifts = targetDay.shifts.map((s) => {
    if (s.slotNo === targetSlotNo) {
      return { ...s, shiftCode: newCode };
    }
    const overrideKey = `${targetDay.dateStr}_${s.slotNo}`;
    if (overrides[overrideKey]) {
      return { ...s, shiftCode: overrides[overrideKey] };
    }
    return s;
  });

  let count3D = 0, count3A = 0, count3N = 0;
  let count4D = 0, count4A = 0, count4N = 0;

  for (const s of tentativeShifts) {
    if (s.shiftCode === 'D') {
      if (s.unit === '3U') count3D++;
      if (s.unit === '4U') count4D++;
    } else if (s.shiftCode === '3D' || s.shiftCode === '3D*') {
      count3D++;
    } else if (s.shiftCode === '4D' || s.shiftCode === '4D*') {
      count4D++;
    } else if (s.shiftCode === 'A') {
      if (s.unit === '3U') count3A++;
      if (s.unit === '4U') count4A++;
    } else if (s.shiftCode === 'N') {
      if (s.unit === '3U') count3N++;
      if (s.unit === '4U') count4N++;
    } else if (s.shiftCode === '3N') {
      count3N++;
    }
  }

  if (targetDay.supportShift && (targetDay.supportShift.shiftCode === '3D' || targetDay.supportShift.shiftCode === '3D*')) count3D++;
  if (targetDay.supportShift && (targetDay.supportShift.shiftCode === '4D' || targetDay.supportShift.shiftCode === '4D*')) count4D++;

  if (count3D !== 1) hardViolations.push(`일일 커버리지 불일치: 3호기 D (${count3D}/1명)`);
  if (count3A !== 1) hardViolations.push(`일일 커버리지 불일치: 3호기 A (${count3A}/1명)`);
  if (count3N !== 1) hardViolations.push(`일일 커버리지 불일치: 3호기 N (${count3N}/1명)`);
  if (count4D !== 1) hardViolations.push(`일일 커버리지 불일치: 4호기 D (${count4D}/1명)`);
  if (count4A !== 1) hardViolations.push(`일일 커버리지 불일치: 4호기 A (${count4A}/1명)`);
  if (count4N !== 1) hardViolations.push(`일일 커버리지 불일치: 4호기 N (${count4N}/1명)`);

  // 4. Consecutive work days check (Soft Warning if >= 4)
  if (isWorkShift(newCode)) {
    let consecutive = 1;

    // Look backward
    for (let i = dayIndex - 1; i >= 0; i--) {
      const d = allDays[i];
      const key = `${d.dateStr}_${targetSlotNo}`;
      const code = overrides[key] || d.shifts.find((s) => s.slotNo === targetSlotNo)?.shiftCode || 'X';
      if (isWorkShift(code)) {
        consecutive++;
      } else {
        break;
      }
    }

    // Look forward
    for (let i = dayIndex + 1; i < allDays.length; i++) {
      const d = allDays[i];
      const key = `${d.dateStr}_${targetSlotNo}`;
      const code = overrides[key] || d.shifts.find((s) => s.slotNo === targetSlotNo)?.shiftCode || 'X';
      if (isWorkShift(code)) {
        consecutive++;
      } else {
        break;
      }
    }

    if (consecutive >= 4) {
      softWarnings.push(
        `연속근무 주의: 변경 시 총 ${consecutive}일 연속 근무가 발생합니다. (권장: 3일 이하)`
      );
    }
  }

  return {
    isValid: hardViolations.length === 0,
    hardViolations,
    softWarnings,
  };
}

/**
 * Validates the entire schedule against Hard & Soft constraints.
 */
export function validateEntireSchedule(
  allDays: DaySchedule[],
  overrides: Record<string, ShiftCode> = {}
): {
  hardViolations: ConstraintViolation[];
  softWarnings: ConstraintViolation[];
  maxConsecutiveDays: number;
  totalQuickReturns: number;
} {
  const hardViolations: ConstraintViolation[] = [];
  const softWarnings: ConstraintViolation[] = [];
  let maxConsecutiveOverall = 0;
  let totalQuickReturns = 0;

  // Track consecutive days per member by memberName to correctly handle replacements
  const memberConsecutive: Record<string, number> = {};

  for (let d = 0; d < allDays.length; d++) {
    const day = allDays[d];

    // Compute effective shifts with overrides
    const effectiveShifts: ShiftCell[] = day.shifts.map((s) => {
      const key = `${day.dateStr}_${s.slotNo}`;
      if (overrides[key]) {
        return { ...s, shiftCode: overrides[key] };
      }
      return s;
    });

    // 1. Coverage Check
    let count3D = 0, count3A = 0, count3N = 0;
    let count4D = 0, count4A = 0, count4N = 0;

    for (const s of effectiveShifts) {
      if (s.shiftCode === 'D') {
        if (s.unit === '3U') count3D++;
        if (s.unit === '4U') count4D++;
      } else if (s.shiftCode === '3D' || s.shiftCode === '3D*') {
        count3D++;
      } else if (s.shiftCode === '4D' || s.shiftCode === '4D*') {
        count4D++;
      } else if (s.shiftCode === 'A') {
        if (s.unit === '3U') count3A++;
        if (s.unit === '4U') count4A++;
      } else if (s.shiftCode === 'N') {
        if (s.unit === '3U') count3N++;
        if (s.unit === '4U') count4N++;
      } else if (s.shiftCode === '3N') {
        count3N++;
      }
    }

    if (day.supportShift && (day.supportShift.shiftCode === '3D' || day.supportShift.shiftCode === '3D*')) count3D++;
    if (day.supportShift && (day.supportShift.shiftCode === '4D' || day.supportShift.shiftCode === '4D*')) count4D++;

    if (count3D !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `3호기 D 인원 불일치 (${count3D}/1명)`,
        dateStr: day.dateStr,
      });
    }
    if (count3A !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `3호기 A 인원 불일치 (${count3A}/1명)`,
        dateStr: day.dateStr,
      });
    }
    if (count3N !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `3호기 N 인원 불일치 (${count3N}/1명)`,
        dateStr: day.dateStr,
      });
    }
    if (count4D !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `4호기 D 인원 불일치 (${count4D}/1명)`,
        dateStr: day.dateStr,
      });
    }
    if (count4A !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `4호기 A 인원 불일치 (${count4A}/1명)`,
        dateStr: day.dateStr,
      });
    }
    if (count4N !== 1) {
      hardViolations.push({
        type: 'HARD',
        message: `4호기 N 인원 불일치 (${count4N}/1명)`,
        dateStr: day.dateStr,
      });
    }

    // 2. Quick return and consecutive check for each member
    for (const s of effectiveShifts) {
      if (isWorkShift(s.shiftCode)) {
        memberConsecutive[s.memberName] = (memberConsecutive[s.memberName] || 0) + 1;
        if (memberConsecutive[s.memberName] > maxConsecutiveOverall) {
          maxConsecutiveOverall = memberConsecutive[s.memberName];
        }
        if (memberConsecutive[s.memberName] >= 4) {
          softWarnings.push({
            type: 'SOFT',
            message: `${s.memberName}(Slot ${s.slotNo}) ${memberConsecutive[s.memberName]}일 연속 근무`,
            dateStr: day.dateStr,
            slotNo: s.slotNo,
            memberName: s.memberName,
          });
        }
      } else {
        memberConsecutive[s.memberName] = 0;
      }

      // Check quick return with previous day
      if (d > 0) {
        const prevDay = allDays[d - 1];
        const prevKey = `${prevDay.dateStr}_${s.slotNo}`;
        const prevShift = prevDay.shifts.find((ps) => ps.slotNo === s.slotNo);
        const prevCode = overrides[prevKey] || prevShift?.shiftCode || 'X';

        // Check by employee name rather than slot if name changed
        if (prevShift && prevShift.memberName === s.memberName) {
          if (isQuickReturn(prevCode, s.shiftCode)) {
            totalQuickReturns++;
            hardViolations.push({
              type: 'HARD',
              message: `${s.memberName} 역순환 발생: ${prevDay.dateStr}(${prevCode}) -> ${day.dateStr}(${s.shiftCode})`,
              dateStr: day.dateStr,
              slotNo: s.slotNo,
              memberName: s.memberName,
            });
          }
        }
      }
    }
  }

  return {
    hardViolations,
    softWarnings,
    maxConsecutiveDays: maxConsecutiveOverall,
    totalQuickReturns,
  };
}
