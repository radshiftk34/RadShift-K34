import { describe, it, expect } from 'vitest';
import { ShiftEngine } from '../shiftEngine';
import { ShiftCode } from '../types';

function isWorkShift(code: ShiftCode): boolean {
  return code !== 'X';
}

function isDayShift(code: ShiftCode): boolean {
  return code === 'D' || code === '3D' || code === '4D' || code === '3D*' || code === '4D*' || code === '일근';
}

function isAfternoonOrNightShift(code: ShiftCode): boolean {
  return code === 'A' || code === 'N' || code === '3N';
}

describe('RadShift_K34 Deterministic Shift Engine Tests', () => {
  const engine = new ShiftEngine();

  describe('2026 Full Year (365 days) Invariant Verification', () => {
    const schedule2026 = engine.generateSchedule('2026-01-01', '2026-12-31');

    it('should generate exactly 365 days', () => {
      expect(schedule2026.length).toBe(365);
    });

    it('should maintain 0 daily coverage errors for all 365 days', () => {
      const errorDays: { date: string; errors: string[] }[] = [];
      for (const day of schedule2026) {
        if (day.coverageErrors.length > 0) {
          errorDays.push({ date: day.dateStr, errors: day.coverageErrors });
        }
      }
      expect(errorDays).toEqual([]);
    });

    it('should never exceed 3 consecutive working days for any member', () => {
      const memberConsecutiveWork: Record<number, number> = {};
      const violations: { date: string; slotNo: number; consecutive: number }[] = [];

      for (const day of schedule2026) {
        for (const shift of day.shifts) {
          if (isWorkShift(shift.shiftCode)) {
            memberConsecutiveWork[shift.slotNo] = (memberConsecutiveWork[shift.slotNo] || 0) + 1;
            if (memberConsecutiveWork[shift.slotNo] > 3) {
              violations.push({
                date: day.dateStr,
                slotNo: shift.slotNo,
                consecutive: memberConsecutiveWork[shift.slotNo],
              });
            }
          } else {
            memberConsecutiveWork[shift.slotNo] = 0;
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('should have 0 quick return violations (N/A -> D next day)', () => {
      const quickReturns: { date: string; slotNo: number; prev: string; curr: string }[] = [];

      for (let i = 1; i < schedule2026.length; i++) {
        const prevDay = schedule2026[i - 1];
        const currDay = schedule2026[i];

        for (const currShift of currDay.shifts) {
          const prevShift = prevDay.shifts.find((s) => s.slotNo === currShift.slotNo);
          if (prevShift && isAfternoonOrNightShift(prevShift.shiftCode) && isDayShift(currShift.shiftCode)) {
            quickReturns.push({
              date: currDay.dateStr,
              slotNo: currShift.slotNo,
              prev: prevShift.shiftCode,
              curr: currShift.shiftCode,
            });
          }
        }
      }

      expect(quickReturns).toEqual([]);
    });

    it('should verify 2026 84-day unit swap schedule', () => {
      // 3/2: 손정기 (Slot 2) 4->3
      const day0302 = schedule2026.find((d) => d.dateStr === '2026-03-02')!;
      const slot2_0302 = day0302.shifts.find((s) => s.slotNo === 2)!;
      expect(slot2_0302.unit).toBe('3U');

      // 5/25: 권재호 (Slot 6) 3->4
      const day0525 = schedule2026.find((d) => d.dateStr === '2026-05-25')!;
      const slot6_0525 = day0525.shifts.find((s) => s.slotNo === 6)!;
      expect(slot6_0525.unit).toBe('4U');

      // 8/17: 최창호 (Slot 1) 4->3
      const day0817 = schedule2026.find((d) => d.dateStr === '2026-08-17')!;
      const slot1_0817 = day0817.shifts.find((s) => s.slotNo === 1)!;
      expect(slot1_0817.unit).toBe('3U');

      // 11/9: 나상흠 (Slot 5) 3->4
      const day1109 = schedule2026.find((d) => d.dateStr === '2026-11-09')!;
      const slot5_1109 = day1109.shifts.find((s) => s.slotNo === 5)!;
      expect(slot5_1109.unit).toBe('4U');
    });
  });

  describe('2027 Full Year (365 days) Scenario Verification', () => {
    const schedule2027 = engine.generateSchedule('2027-01-01', '2027-12-31');

    it('should generate exactly 365 days for 2027', () => {
      expect(schedule2027.length).toBe(365);
    });

    it('should maintain 0 daily coverage errors for all 365 days of 2027', () => {
      const errorDays: { date: string; errors: string[] }[] = [];
      for (const day of schedule2027) {
        if (day.coverageErrors.length > 0) {
          errorDays.push({ date: day.dateStr, errors: day.coverageErrors });
        }
      }
      expect(errorDays).toEqual([]);
    });

    it('should never exceed 3 consecutive working days for all staff in 2027', () => {
      const personConsecutiveWork: Record<string, number> = {};
      const violations: { date: string; memberName: string; consecutive: number }[] = [];

      for (const day of schedule2027) {
        // Collect actual physical workers working today
        // Note: Slot 8 when badge is '1행 대체' is vacant; Shin Uk-je is physically in Slot 1
        for (const shift of day.shifts) {
          if (shift.badge === '1행 대체') continue; // vacant slot placeholder
          const actualPerson = shift.memberName === '최창호(결원)' ? '신욱제' : shift.memberName;

          if (isWorkShift(shift.shiftCode)) {
            personConsecutiveWork[actualPerson] = (personConsecutiveWork[actualPerson] || 0) + 1;
            if (personConsecutiveWork[actualPerson] > 3) {
              violations.push({
                date: day.dateStr,
                memberName: actualPerson,
                consecutive: personConsecutiveWork[actualPerson],
              });
            }
          } else {
            personConsecutiveWork[actualPerson] = 0;
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('should have 0 quick return violations in 2027', () => {
      const quickReturns: { date: string; memberName: string; prev: string; curr: string }[] = [];
      const personPrevShift: Record<string, string> = {};

      for (const day of schedule2027) {
        for (const shift of day.shifts) {
          if (shift.badge === '1행 대체') continue;
          const actualPerson = shift.memberName === '최창호(결원)' ? '신욱제' : shift.memberName;

          const prev = personPrevShift[actualPerson];
          if (prev && isAfternoonOrNightShift(prev as ShiftCode) && isDayShift(shift.shiftCode)) {
            quickReturns.push({
              date: day.dateStr,
              memberName: actualPerson,
              prev,
              curr: shift.shiftCode,
            });
          }

          personPrevShift[actualPerson] = shift.shiftCode;
        }
      }

      expect(quickReturns).toEqual([]);
    });

    it('should verify 2027-01-01 Slot 5 rename and Slot 1 vacancy handling', () => {
      const day0101 = schedule2027.find((d) => d.dateStr === '2027-01-01')!;
      const slot5 = day0101.shifts.find((s) => s.slotNo === 5)!;
      expect(slot5.memberName).toBe('박상현');

      const slot1 = day0101.shifts.find((s) => s.slotNo === 1)!;
      expect(slot1.badge).toContain('신욱제');
    });

    it('should verify 2027-02-01 84-day swap and 2/2 Tuesday 3N adjustment', () => {
      const day0201 = schedule2027.find((d) => d.dateStr === '2027-02-01')!;
      const slot9 = day0201.shifts.find((s) => s.slotNo === 9)!;
      const slot4 = day0201.shifts.find((s) => s.slotNo === 4)!;
      expect(slot9.unit).toBe('3U');
      expect(slot4.unit).toBe('4U');

      const day0202 = schedule2027.find((d) => d.dateStr === '2027-02-02')!;
      const slot9_02 = day0202.shifts.find((s) => s.slotNo === 9)!;
      const slot4_02 = day0202.shifts.find((s) => s.slotNo === 4)!;
      expect(slot9_02.shiftCode).toBe('X'); // Song Myeong-gwan rest
      expect(slot4_02.shiftCode).toBe('3N'); // Im Won-taek 3N adjustment
    });

    it('should verify 2027-03-08 restoration: Lee Jae-gyeom 4D cover & Shin Uk-je rest', () => {
      const day0308 = schedule2027.find((d) => d.dateStr === '2027-03-08')!;
      const slot1 = day0308.shifts.find((s) => s.slotNo === 1)!;
      const slot8 = day0308.shifts.find((s) => s.slotNo === 8)!;

      expect(slot1.memberName).toBe('이재겸');
      expect(slot1.shiftCode).toBe('4D'); // Handover cover
      expect(slot8.shiftCode).toBe('X'); // Rest after NNN to avoid quick return
    });

    it('should verify 2027-03-22 regular rotation resumption with Song Myeong-gwan', () => {
      const day0322 = schedule2027.find((d) => d.dateStr === '2027-03-22')!;
      const slot9 = day0322.shifts.find((s) => s.slotNo === 9)!;
      expect(slot9.unit).toBe('FLOAT');
    });
  });

  describe('Section 5 & 6 Modules: Validator, Relief, Queue, Simulator, Bot, Diagnostics', () => {
    it('should validate 9-cell circular queue rotateRight(Q, 1)', async () => {
      const { rotateQueueRight, INITIAL_QUEUE_NAMES } = await import('../scenarioEngine');
      const rotated = rotateQueueRight(INITIAL_QUEUE_NAMES, 1);
      expect(rotated[0]).toBe('송명관');
      expect(rotated[1]).toBe('최창호');
      expect(rotated[4]).toBe('임원택');
    });

    it('should accurately calculate Top 3 relief candidates with Section 5.3 scoring', async () => {
      const { calculateReliefCandidates } = await import('../reliefEngine');
      const schedule = engine.generateSchedule('2027-01-01', '2027-01-31');
      const candidates = calculateReliefCandidates(schedule, '2027-01-15', 3);
      expect(candidates.length).toBeGreaterThan(0);
      const eligible = candidates.filter((c) => c.isEligible);
      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible[0].score).toBeGreaterThanOrEqual(eligible[1].score);
    });

    it('should detect quick return violations in validateProposedCellChange', async () => {
      const { validateProposedCellChange } = await import('../constraintValidator');
      const schedule = engine.generateSchedule('2026-01-01', '2026-01-10');
      // Slot 2 worked N on 2026-01-01. Assigning D on 2026-01-02 must fail.
      const res = validateProposedCellChange(schedule, '2026-01-02', 2, 'D');
      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.includes('역순환'))).toBe(true);
    });

    it('should execute telegram bot dispatcher commands', async () => {
      const { handleTelegramCommand } = await import('../telegramDispatcher');
      const schedule = engine.generateSchedule('2026-01-01', '2026-01-31');
      const todayMsg = handleTelegramCommand('/오늘', schedule);
      expect(todayMsg.text).toContain('3호기');
      expect(todayMsg.text).toContain('4호기');

      const reliefMsg = handleTelegramCommand('/대근요청 2026-01-15', schedule);
      expect(reliefMsg.buttons).toBeDefined();
    });

    it('should pass all 10 suites in One-Step Diagnostic Test Runner', async () => {
      const { runAllDiagnostics } = await import('../testRunner');
      const rep = await runAllDiagnostics(engine);
      const failed = rep.results.filter((r) => !r.isPassed);
      if (failed.length > 0) {
        console.error('FAILED DIAGNOSTICS:', JSON.stringify(failed, null, 2));
      }
      expect(rep.totalTests).toBe(10);
      expect(rep.passedTests).toBe(10);
      expect(rep.failedTests).toBe(0);
    });
  });
});
