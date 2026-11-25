import { DaySchedule, ShiftCell, ShiftCode, UnitType } from './types';
import { isHoliday, getHolidayName } from './holidays';

export const CYCLE_12: ShiftCode[] = ['D', 'D', 'X', 'A', 'A', 'A', 'X', 'N', 'N', 'N', 'X', 'X'];

export const ANCHOR_DATE_STR = '2025-12-29'; // Monday, d = 0

// Slot 1~9 Names
export interface SlotConfig {
  slotNo: number;
  initialName: string;
  initialUnit: UnitType;
  initialPhase: number;
}

export const INITIAL_SLOTS: SlotConfig[] = [
  { slotNo: 1, initialName: '최창호', initialUnit: '4U', initialPhase: 3 },
  { slotNo: 2, initialName: '손정기', initialUnit: '4U', initialPhase: 6 },
  { slotNo: 3, initialName: '박경욱', initialUnit: '3U', initialPhase: 8 },
  { slotNo: 4, initialName: '임원택', initialUnit: '3U', initialPhase: 11 },
  { slotNo: 5, initialName: '나상흠', initialUnit: '3U', initialPhase: 2 },
  { slotNo: 6, initialName: '권재호', initialUnit: '3U', initialPhase: 5 },
  { slotNo: 7, initialName: '이근현', initialUnit: '4U', initialPhase: 9 },
  { slotNo: 8, initialName: '신욱제', initialUnit: '4U', initialPhase: 0 },
  { slotNo: 9, initialName: '송명관', initialUnit: 'FLOAT', initialPhase: 0 },
];

export function getDaysBetween(startStr: string, targetStr: string): number {
  const start = new Date(startStr + 'T00:00:00Z');
  const target = new Date(targetStr + 'T00:00:00Z');
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDateStrFromDayIndex(anchorStr: string, dayIndex: number): string {
  const d = new Date(anchorStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

interface MemberState {
  slotNo: number;
  name: string;
  unit: UnitType;
  phase: number;
  credit: number;
}

/**
 * Deterministic Shift Engine for RadShift_K34
 * Generates schedule for any range starting from Anchor Date (2025-12-29)
 */
export class ShiftEngine {
  private anchorDateStr = ANCHOR_DATE_STR;

  /**
   * Generates continuous schedule from anchor date up to the given end date.
   */
  public generateSchedule(startDateStr: string, endDateStr: string): DaySchedule[] {
    const totalDays = getDaysBetween(this.anchorDateStr, endDateStr) + 1;
    const startDayIndex = getDaysBetween(this.anchorDateStr, startDateStr);

    const allDays: DaySchedule[] = [];

    // State tracking across days
    const members: MemberState[] = INITIAL_SLOTS.map((s) => ({
      slotNo: s.slotNo,
      name: s.initialName,
      unit: s.initialUnit,
      phase: s.initialPhase,
      credit: 0,
    }));

    // In normal rotation, current float slot index (0 to 8 corresponding to slot 9, 1, 2, ..., 8)
    const floatSlotOrder = [9, 1, 2, 3, 4, 5, 6, 7, 8];
    let floatOrderIdx = 0; // starts at Slot 9
    let floatBlockDay = 0; // 0 to 20 inside 21-day block

    // Scenario state
    let is8PersonMode = false;
    let isSupportActive = false;
    let tempCoverSlotNo: number | null = null;
    let restoreActive = false;
    let restoreFloatRemainingDays = 0;

    for (let d = 0; d < totalDays; d++) {
      const dateStr = getDateStrFromDayIndex(this.anchorDateStr, d);
      const dateObj = new Date(dateStr + 'T00:00:00Z');
      const dayOfWeek = dateObj.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const holiday = isHoliday(dateStr);
      const holidayName = getHolidayName(dateStr);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWeekdayWorkday = !isWeekend && !holiday;

      // -----------------------------------------------------------------------
      // 1. Check Date Milestones (2027 scenarios)
      // -----------------------------------------------------------------------
      if (dateStr === '2027-01-01') {
        // Slot 5 rename
        const s5 = members.find((m) => m.slotNo === 5);
        if (s5) s5.name = '박상현';

        // Slot 1 vacancy -> 8 person mode
        is8PersonMode = true;
        // Slot 8 신욱제 temp covers Slot 1
        tempCoverSlotNo = 8;
        const s8 = members.find((m) => m.slotNo === 8)!;
        const s1 = members.find((m) => m.slotNo === 1)!;
        s8.unit = '3U';
        // Set phase to Slot 1's expected phase (1/1 phase is 4)
        s8.phase = 4;
        s1.name = '최창호(결원)';
        s1.unit = '3U';
      }

      if (dateStr === '2027-01-04') {
        // Bang-an-bu support starts
        isSupportActive = true;
      }

      if (dateStr === '2027-02-01') {
        // 84-day unit swap during 8-person mode:
        // Slot 9 송명관 (4->3) and Slot 4 임원택 (3->4) swap units and phases
        const s9 = members.find((m) => m.slotNo === 9)!;
        const s4 = members.find((m) => m.slotNo === 4)!;
        s9.unit = '3U';
        s4.unit = '4U';
        const tempPhase = s9.phase;
        s9.phase = s4.phase;
        s4.phase = tempPhase;
      }

      if (dateStr === '2027-03-08') {
        // 2027-03-08: Restoration of 9-person system
        isSupportActive = false;
        is8PersonMode = false;
        restoreActive = true;
        restoreFloatRemainingDays = 14; // 3/8 ~ 3/21 (14 days)

        // Slot 1 restored with new member 이재겸 (Unit 3, 3/8 phase 10)
        const s1 = members.find((m) => m.slotNo === 1)!;
        s1.name = '이재겸';
        s1.unit = '3U';
        s1.phase = 10;

        // Slot 8 신욱제 returns to Slot 8 Float Day
        const s8 = members.find((m) => m.slotNo === 8)!;
        s8.unit = 'FLOAT';
        tempCoverSlotNo = null;
      }

      if (dateStr === '2027-03-22') {
        // Regular 21-day rotation resumes with Slot 9 송명관
        restoreActive = false;
        const s8 = members.find((m) => m.slotNo === 8)!;
        const s9 = members.find((m) => m.slotNo === 9)!;
        // Shin Uk-je inherits Song Myeong-gwan's unit and phase
        s8.unit = s9.unit;
        s8.phase = s9.phase;
        s9.unit = 'FLOAT';
        floatOrderIdx = 0; // Slot 9
        floatBlockDay = 0;
      }

      // -----------------------------------------------------------------------
      // 2. Normal 21-day Float rotation boundaries (for 2026 and after 2027-03-22)
      // -----------------------------------------------------------------------
      const inNormalRotation = !is8PersonMode && !isSupportActive && !restoreActive;

      // Handle Sunday boundary adjustment (Block Day 20) before Monday transition
      let sundayType1IncomingSlot: number | null = null;
      let sundayType1OutgoingSlot: number | null = null;

      if (inNormalRotation && floatBlockDay === 20 && dayOfWeek === 0) {
        // Next Monday is day 0 of next block
        const nextFloatOrderIdx = (floatOrderIdx + 1) % floatSlotOrder.length;
        const nextFloatSlotNo = floatSlotOrder[nextFloatOrderIdx];
        const nextMember = members.find((m) => m.slotNo === nextFloatSlotNo)!;
        const currentFloatSlotNo = floatSlotOrder[floatOrderIdx];

        const nextDMod3 = (d + 1) % 3;

        if (nextMember.unit === '4U' && nextDMod3 === 0) {
          // Type 1 adjustment: Incoming 4U (phase 11) works D, Outgoing Float gets X
          sundayType1IncomingSlot = nextFloatSlotNo;
          sundayType1OutgoingSlot = currentFloatSlotNo;
        }
      }

      // -----------------------------------------------------------------------
      // 3. Calculate shifts for each of the 9 slots
      // -----------------------------------------------------------------------
      const dayShifts: ShiftCell[] = [];
      const dMod3 = d % 3;

      for (let i = 0; i < 9; i++) {
        const m = members[i];
        let code: ShiftCode = 'X';
        let badge: string | undefined = undefined;
        let isAdjusted = false;

        if (is8PersonMode) {
          // In 8-person mode (2027-01-01 to 2027-03-07):
          if (m.slotNo === 1 && tempCoverSlotNo === 8) {
            // Slot 1 is physically covered by 신욱제
            const cycleCode = CYCLE_12[m.phase % 12];
            code = cycleCode;
            badge = '신욱제 대근';
          } else if (m.slotNo === 8 && tempCoverSlotNo === 8) {
            // Row 8 is vacant/represented by Shin Uk-je acting in Row 1
            code = 'X';
            badge = '1행 대체';
          } else {
            // Regular 12-day cycle for shift workers
            code = CYCLE_12[m.phase % 12];
          }

          // Special 2027-02-02 adjustment:
          // Slot 9 송명관 gets X, Slot 4 임원택 gets 3N (1 day adjustment to avoid 4 consecutive nights)
          if (dateStr === '2027-02-02') {
            if (m.slotNo === 9) {
              code = 'X';
              badge = '4연속 방지';
              isAdjusted = true;
            } else if (m.slotNo === 4) {
              code = '3N';
              badge = '3N 보정';
              isAdjusted = true;
            }
          }
        } else if (restoreActive) {
          // Restore transition period (2027-03-08 to 2027-03-21)
          if (dateStr === '2027-03-08') {
            // 3/8 special handover:
            // Shin Uk-je (Slot 8): worked NNN on 3/5~3/7 -> X (essential rest to avoid quick return)
            // Lee Jae-gyeom (Slot 1): covers 4D (handover)
            if (m.slotNo === 8) {
              code = 'X';
              badge = '인수인계 휴무';
              isAdjusted = true;
            } else if (m.slotNo === 1) {
              code = '4D';
              badge = '인수인계 커버';
              isAdjusted = true;
            } else {
              code = m.unit === 'FLOAT' ? (dMod3 === 0 ? '3D' : dMod3 === 2 ? '4D' : 'X') : CYCLE_12[m.phase % 12];
            }
          } else if (dateStr === '2027-03-09' && m.slotNo === 1) {
            // Lee Jae-gyeom 3/9 X, then 3/10~11 D-D
            code = 'X';
          } else {
            if (m.unit === 'FLOAT') {
              code = dMod3 === 0 ? '3D' : dMod3 === 2 ? '4D' : 'X';
            } else {
              code = CYCLE_12[m.phase % 12];
            }
          }
        } else {
          // Normal 9-person system
          if (m.unit === 'FLOAT') {
            // Base float pattern: d%3==0 -> 3D, d%3==1 -> X, d%3==2 -> 4D
            code = dMod3 === 0 ? '3D' : dMod3 === 2 ? '4D' : 'X';

            // Check Sunday Type 1 outgoing exemption
            if (sundayType1OutgoingSlot === m.slotNo) {
              code = 'X';
              badge = '4D 면제';
              isAdjusted = true;
            }
          } else {
            // Check Sunday Type 1 incoming cover
            if (sundayType1IncomingSlot === m.slotNo) {
              code = 'D'; // covers 4D
              badge = '일요 4D';
              isAdjusted = true;
            } else {
              code = CYCLE_12[m.phase % 12];
            }
          }
        }

        dayShifts.push({
          slotNo: m.slotNo,
          memberName: m.name,
          unit: m.unit,
          shiftCode: code,
          phase: m.phase % 12,
          badge,
          isAdjusted,
        });
      }

      // -----------------------------------------------------------------------
      // 4. Support worker & Holiday Phase-11 Cover logic (8+1 mode)
      // -----------------------------------------------------------------------
      let supportShift: ShiftCell | undefined = undefined;

      if (isSupportActive) {
        if (isWeekdayWorkday) {
          // Weekday workday: Bang-an-bu support works
          if (dMod3 === 0) {
            supportShift = {
              slotNo: 10,
              memberName: '방안부지원',
              unit: 'SUPPORT',
              shiftCode: '3D',
              badge: '3호기 지원',
            };
          } else if (dMod3 === 2) {
            supportShift = {
              slotNo: 10,
              memberName: '방안부지원',
              unit: 'SUPPORT',
              shiftCode: '4D',
              badge: '4호기 지원',
            };
          } else {
            // dMod3 === 1: Neither unit has vacancy
            // Swap D -> X with credit holder if available
            // Candidates: workers scheduled for D today
            const dCandidates = dayShifts.filter((s) => s.shiftCode === 'D');
            const eligible = dCandidates
              .map((s) => members.find((m) => m.slotNo === s.slotNo)!)
              .filter((m) => m && m.credit > 0)
              .sort((a, b) => b.credit - a.credit || (b.phase % 12) - (a.phase % 12));

            if (eligible.length > 0) {
              const target = eligible[0];
              target.credit -= 1;
              const targetCell = dayShifts.find((s) => s.slotNo === target.slotNo)!;
              const unitNum = target.unit === '3U' ? '3D*' : '4D*';
              targetCell.shiftCode = 'X';
              targetCell.badge = '대체휴무';
              targetCell.creditDelta = -1;
              targetCell.isAdjusted = true;

              supportShift = {
                slotNo: 10,
                memberName: '방안부지원',
                unit: 'SUPPORT',
                shiftCode: unitNum as ShiftCode,
                badge: `${target.name} 대휴 지원`,
              };
            } else {
              supportShift = {
                slotNo: 10,
                memberName: '방안부지원',
                unit: 'SUPPORT',
                shiftCode: '일근',
                badge: '정상 일근',
              };
            }
          }
        } else {
          // Weekend or Holiday: Bang-an-bu OFF
          supportShift = {
            slotNo: 10,
            memberName: '방안부지원',
            unit: 'SUPPORT',
            shiftCode: 'X',
            badge: '휴무',
          };

          // Coverage vacancy check:
          // If dMod3 === 0 (3D blank) or dMod3 === 2 (4D blank), Phase-11 worker steps in (X -> D) and gets +1 credit
          const targetUnit: UnitType = dMod3 === 0 ? '3U' : dMod3 === 2 ? '4U' : 'FLOAT';

          if (targetUnit === '3U' || targetUnit === '4U') {
            const p11Member = members.find(
              (m) => m.unit === targetUnit && m.phase % 12 === 11 && (m.slotNo !== 1 || tempCoverSlotNo !== null)
            );

            if (p11Member) {
              p11Member.credit += 1;
              const cell = dayShifts.find((s) => s.slotNo === p11Member.slotNo);
              if (cell) {
                cell.shiftCode = 'D';
                cell.badge = '대휴 적립(+1)';
                cell.creditDelta = 1;
                cell.isAdjusted = true;
              }
            }
          }
        }
      } else if (dateStr >= '2027-01-01' && dateStr <= '2027-01-03') {
        // Special case: 2027-01-01 to 01-03 before Bang-an-bu arrives
        // 2027-01-01 (holiday, d%3=2 -> 4D blank)
        // 2027-01-02 (weekend, d%3=0 -> 3D blank)
        const targetUnit: UnitType = dMod3 === 0 ? '3U' : dMod3 === 2 ? '4U' : 'FLOAT';
        if (targetUnit === '3U' || targetUnit === '4U') {
          const p11Member = members.find((m) => m.unit === targetUnit && m.phase % 12 === 11);
          if (p11Member) {
            p11Member.credit += 1;
            const cell = dayShifts.find((s) => s.slotNo === p11Member.slotNo);
            if (cell) {
              cell.shiftCode = 'D';
              cell.badge = '대휴 적립(+1)';
              cell.creditDelta = 1;
              cell.isAdjusted = true;
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 5. Verify Daily Coverage Invariant
      // -----------------------------------------------------------------------
      const coverageErrors: string[] = [];
      let count3D = 0,
        count3A = 0,
        count3N = 0;
      let count4D = 0,
        count4A = 0,
        count4N = 0;

      for (const s of dayShifts) {
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

      if (supportShift) {
        if (supportShift.shiftCode === '3D' || supportShift.shiftCode === '3D*') count3D++;
        if (supportShift.shiftCode === '4D' || supportShift.shiftCode === '4D*') count4D++;
      }

      if (count3D !== 1) coverageErrors.push(`3호기 D 인원 불일치 (현재 ${count3D}명)`);
      if (count3A !== 1) coverageErrors.push(`3호기 A 인원 불일치 (현재 ${count3A}명)`);
      if (count3N !== 1) coverageErrors.push(`3호기 N 인원 불일치 (현재 ${count3N}명)`);
      if (count4D !== 1) coverageErrors.push(`4호기 D 인원 불일치 (현재 ${count4D}명)`);
      if (count4A !== 1) coverageErrors.push(`4호기 A 인원 불일치 (현재 ${count4A}명)`);
      if (count4N !== 1) coverageErrors.push(`4호기 N 인원 불일치 (현재 ${count4N}명)`);

      const daySchedule: DaySchedule = {
        dateStr,
        dayIndex: d,
        dayOfWeek,
        isHoliday: holiday,
        holidayName,
        isWeekend,
        isWeekdayWorkday,
        shifts: dayShifts,
        supportShift,
        coverageErrors,
      };

      if (d >= startDayIndex) {
        allDays.push(daySchedule);
      }

      // -----------------------------------------------------------------------
      // 6. Advance State to Next Day (d + 1)
      // -----------------------------------------------------------------------
      // Advance phase for members
      for (const m of members) {
        m.phase = (m.phase + 1) % 12;
      }

      // Advance float rotation blocks
      if (inNormalRotation) {
        floatBlockDay++;
        if (floatBlockDay >= 21) {
          // Block transition on Monday morning
          floatBlockDay = 0;
          const currentFloatSlotNo = floatSlotOrder[floatOrderIdx];
          const nextOrderIdx = (floatOrderIdx + 1) % floatSlotOrder.length;
          const nextFloatSlotNo = floatSlotOrder[nextOrderIdx];

          const currentFloat = members.find((m) => m.slotNo === currentFloatSlotNo)!;
          const nextFloat = members.find((m) => m.slotNo === nextFloatSlotNo)!;

          // Outgoing float inherits incoming float's unit and phase!
          currentFloat.unit = nextFloat.unit;
          currentFloat.phase = nextFloat.phase;

          // Incoming member becomes float
          nextFloat.unit = 'FLOAT';

          floatOrderIdx = nextOrderIdx;
        }
      } else if (restoreActive) {
        restoreFloatRemainingDays--;
      }
    }

    return allDays;
  }
}
