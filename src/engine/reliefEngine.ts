import { DaySchedule, ShiftCode } from './types';
import { isQuickReturn, isWorkShift } from './constraintValidator';

export interface ReliefCandidate {
  slotNo: number;
  memberName: string;
  score: number;
  isPhase11: boolean;
  sameUnit: boolean;
  monthlyShifts: number;
  reliefCount: number;
  creditBalance: number;
  isEligible: boolean;
  disqualificationReason?: string;
  scoreBreakdown: {
    phase11Bonus: number;
    unitBonus: number;
    shiftPenalty: number;
    reliefPenalty: number;
    creditPenalty: number;
  };
}

/**
 * Calculates Top 3 Relief Candidates according to Section 5.3:
 * Score = 100 * IsPhase11 + 50 * SameUnit - 10 * MonthlyShifts - 20 * ReliefCount - 5 * CreditBalance
 */
export function calculateReliefCandidates(
  allDays: DaySchedule[],
  targetDateStr: string,
  requesterSlotNo: number,
  reliefHistory: Record<number, number> = {}, // slotNo -> total relief count
  creditBalances: Record<number, number> = {}, // slotNo -> credit balance
  overrides: Record<string, ShiftCode> = {}
): ReliefCandidate[] {
  const dayIndex = allDays.findIndex((d) => d.dateStr === targetDateStr);
  if (dayIndex === -1) return [];

  const targetDay = allDays[dayIndex];
  const requesterShift = targetDay.shifts.find((s) => s.slotNo === requesterSlotNo);
  if (!requesterShift) return [];

  const neededShiftCode = overrides[`${targetDateStr}_${requesterSlotNo}`] || requesterShift.shiftCode;
  const monthPrefix = targetDateStr.slice(0, 7);

  // Count shifts worked in this month for each slot
  const monthlyShiftCounts: Record<number, number> = {};
  for (let s = 1; s <= 9; s++) monthlyShiftCounts[s] = 0;

  for (const day of allDays) {
    if (!day.dateStr.startsWith(monthPrefix)) continue;
    for (const shift of day.shifts) {
      const code = overrides[`${day.dateStr}_${shift.slotNo}`] || shift.shiftCode;
      if (isWorkShift(code)) {
        monthlyShiftCounts[shift.slotNo] = (monthlyShiftCounts[shift.slotNo] || 0) + 1;
      }
    }
  }

  const candidates: ReliefCandidate[] = [];

  for (const shift of targetDay.shifts) {
    // Skip requester
    if (shift.slotNo === requesterSlotNo) continue;

    const currentCode = overrides[`${targetDateStr}_${shift.slotNo}`] || shift.shiftCode;

    // Hard Filter 1: Candidate MUST be on off/rest duty ('X')
    if (isWorkShift(currentCode)) {
      candidates.push({
        slotNo: shift.slotNo,
        memberName: shift.memberName,
        score: -999,
        isPhase11: false,
        sameUnit: shift.unit === requesterShift.unit,
        monthlyShifts: monthlyShiftCounts[shift.slotNo] || 0,
        reliefCount: reliefHistory[shift.slotNo] || 0,
        creditBalance: creditBalances[shift.slotNo] || 0,
        isEligible: false,
        disqualificationReason: `당일 이미 [${currentCode}] 근무 중입니다.`,
        scoreBreakdown: { phase11Bonus: 0, unitBonus: 0, shiftPenalty: 0, reliefPenalty: 0, creditPenalty: 0 },
      });
      continue;
    }

    // Hard Filter 2: Candidate must not cause Quick Return with previous day
    let qrReason: string | undefined = undefined;
    if (dayIndex > 0) {
      const prevDay = allDays[dayIndex - 1];
      const prevCode = overrides[`${prevDay.dateStr}_${shift.slotNo}`] ||
        prevDay.shifts.find((s) => s.slotNo === shift.slotNo)?.shiftCode || 'X';
      if (isQuickReturn(prevCode, neededShiftCode)) {
        qrReason = `전일 [${prevCode}] 근무 후 당일 [${neededShiftCode}] 투입 시 역순환(Quick Return) 발생`;
      }
    }

    // Hard Filter 3: Candidate must not cause Quick Return with next day
    if (!qrReason && dayIndex < allDays.length - 1) {
      const nextDay = allDays[dayIndex + 1];
      const nextCode = overrides[`${nextDay.dateStr}_${shift.slotNo}`] ||
        nextDay.shifts.find((s) => s.slotNo === shift.slotNo)?.shiftCode || 'X';
      if (isQuickReturn(neededShiftCode, nextCode)) {
        qrReason = `당일 [${neededShiftCode}] 투입 시 익일 [${nextCode}] 근무로 역순환(Quick Return) 발생`;
      }
    }

    // Hard Filter 4: Candidate must not exceed 3 consecutive working days
    let consecutive = 1;
    if (!qrReason) {
      for (let i = dayIndex - 1; i >= 0; i--) {
        const d = allDays[i];
        const code = overrides[`${d.dateStr}_${shift.slotNo}`] ||
          d.shifts.find((s) => s.slotNo === shift.slotNo)?.shiftCode || 'X';
        if (isWorkShift(code)) consecutive++;
        else break;
      }
      for (let i = dayIndex + 1; i < allDays.length; i++) {
        const d = allDays[i];
        const code = overrides[`${d.dateStr}_${shift.slotNo}`] ||
          d.shifts.find((s) => s.slotNo === shift.slotNo)?.shiftCode || 'X';
        if (isWorkShift(code)) consecutive++;
        else break;
      }
    }

    if (qrReason || consecutive > 3) {
      candidates.push({
        slotNo: shift.slotNo,
        memberName: shift.memberName,
        score: -999,
        isPhase11: false,
        sameUnit: shift.unit === requesterShift.unit,
        monthlyShifts: monthlyShiftCounts[shift.slotNo] || 0,
        reliefCount: reliefHistory[shift.slotNo] || 0,
        creditBalance: creditBalances[shift.slotNo] || 0,
        isEligible: false,
        disqualificationReason: qrReason || `투입 시 ${consecutive}일 연속 근무로 최대 3일 초과`,
        scoreBreakdown: { phase11Bonus: 0, unitBonus: 0, shiftPenalty: 0, reliefPenalty: 0, creditPenalty: 0 },
      });
      continue;
    }

    // Candidate is ELIGIBLE -> Calculate Score
    const isPhase11 = (shift.phase || 0) % 12 === 11;
    const sameUnit = shift.unit === requesterShift.unit;
    const monthlyShifts = monthlyShiftCounts[shift.slotNo] || 0;
    const reliefCount = reliefHistory[shift.slotNo] || 0;
    const creditBalance = creditBalances[shift.slotNo] || 0;

    const phase11Bonus = isPhase11 ? 100 : 0;
    const unitBonus = sameUnit ? 50 : 0;
    const shiftPenalty = 10 * monthlyShifts;
    const reliefPenalty = 20 * reliefCount;
    const creditPenalty = 5 * creditBalance;

    const totalScore = phase11Bonus + unitBonus - shiftPenalty - reliefPenalty - creditPenalty;

    candidates.push({
      slotNo: shift.slotNo,
      memberName: shift.memberName,
      score: totalScore,
      isPhase11,
      sameUnit,
      monthlyShifts,
      reliefCount,
      creditBalance,
      isEligible: true,
      scoreBreakdown: {
        phase11Bonus,
        unitBonus,
        shiftPenalty,
        reliefPenalty,
        creditPenalty,
      },
    });
  }

  // Sort eligible candidates by score descending
  candidates.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.score - a.score;
  });

  return candidates;
}
