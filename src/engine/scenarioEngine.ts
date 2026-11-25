import { DaySchedule, ShiftCode } from './types';
import { ShiftEngine, INITIAL_SLOTS } from './shiftEngine';
import { validateEntireSchedule } from './constraintValidator';

export interface QueueSlot {
  index: number; // 0 to 8
  name: string;
  originalSlotNo: number;
  unit: '3U' | '4U';
  isFloat: boolean;
}

export const INITIAL_QUEUE_NAMES = [
  '최창호', // 0: 3U
  '손정기', // 1: 3U
  '박경욱', // 2: 3U
  '임원택', // 3: 3U
  '나상흠', // 4: 4U
  '권재호', // 5: 4U
  '이근현', // 6: 4U
  '신욱제', // 7: 4U
  '송명관', // 8: 4U / FLOAT
];

/**
 * 9-cell Circular Queue helper functions:
 * rotateRight(Q, 1) shifts elements to the right by 1.
 * Index 0~3 = 3호기, Index 4~8 = 4호기 & Float.
 */
export function rotateQueueRight(queue: string[], steps: number = 1): string[] {
  const len = queue.length;
  const normalizedSteps = ((steps % len) + len) % len;
  return [...queue.slice(len - normalizedSteps), ...queue.slice(0, len - normalizedSteps)];
}

export function getQueueStateAfterCycles(cycleCount: number): string[] {
  return rotateQueueRight(INITIAL_QUEUE_NAMES, cycleCount);
}

export interface DynamicScenarioOptions {
  name: string;
  mode: 'NORMAL_9' | 'EIGHT_PLUS_DAYTIME';
  startDate: string;
  endDate: string;
  departure?: {
    slotNo: number;
    memberName: string;
    dateStr: string;
    reason: string;
  };
  arrival?: {
    slotNo: number;
    memberName: string;
    dateStr: string;
  };
  supportPersonnel?: {
    name: string;
    startDate: string;
    endDate: string;
  };
  tempCover?: {
    vacantSlotNo: number;
    coveringSlotNo: number;
    restoreDate: string;
    restoreGraceDays: number; // default 14 days
  };
  enforce84dShift: boolean;
  autoHolidays: boolean;
}

export interface ScenarioDiffCell {
  dateStr: string;
  slotNo: number;
  memberName: string;
  baseCode: ShiftCode;
  scenarioCode: ShiftCode;
  reason?: string;
}

export interface ScenarioSimulationResult {
  options: DynamicScenarioOptions;
  baselineDays: DaySchedule[];
  scenarioDays: DaySchedule[];
  diffs: ScenarioDiffCell[];
  queueStates: Array<{ dateStr: string; event: string; queue: string[] }>;
  statsComparison: Array<{
    slotNo: number;
    memberName: string;
    base: { d: number; a: number; n: number; total: number; credit: number };
    scenario: { d: number; a: number; n: number; total: number; credit: number };
    diff: { d: number; a: number; n: number; total: number; credit: number };
  }>;
  validation: {
    coverageErrorsCount: number;
    maxConsecutiveDays: number;
    quickReturnsCount: number;
    isPass: boolean;
  };
}

/**
 * Executes a General Scenario Simulation and compares it against a 9-person normal baseline schedule.
 */
export function runScenarioSimulation(
  baselineEngine: ShiftEngine,
  options: DynamicScenarioOptions
): ScenarioSimulationResult {
  // Scenario days (using deterministic 2027 engine)
  const scenarioDays = baselineEngine.generateSchedule(options.startDate, options.endDate);

  // Baseline days: Pure 9-person schedule (where Slot 1 has Choi Chang-ho without vacancy)
  const baselineDays: DaySchedule[] = scenarioDays.map((d) => {
    const normalShifts = d.shifts.map((s) => {
      if (s.slotNo === 1 && s.badge?.includes('대근')) {
        return { ...s, memberName: '최창호', badge: undefined };
      }
      if (s.slotNo === 8 && s.badge?.includes('대체')) {
        return { ...s, shiftCode: 'D' as ShiftCode, badge: undefined };
      }
      return s;
    });
    return {
      ...d,
      shifts: normalShifts,
      supportShift: undefined,
    };
  });

  // Collect diffs
  const diffs: ScenarioDiffCell[] = [];

  // Track queue states at 84-day intervals or milestones
  const queueStates: Array<{ dateStr: string; event: string; queue: string[] }> = [
    { dateStr: options.startDate, event: '초기 큐 상태', queue: [...INITIAL_QUEUE_NAMES] },
  ];

  if (options.enforce84dShift) {
    queueStates.push({
      dateStr: '2027-02-01',
      event: '1차 84일 시프트 (rotateRight 1)',
      queue: rotateQueueRight(INITIAL_QUEUE_NAMES, 1),
    });
    queueStates.push({
      dateStr: '2027-04-26',
      event: '2차 84일 시프트 (rotateRight 2)',
      queue: rotateQueueRight(INITIAL_QUEUE_NAMES, 2),
    });
  }

  // Calculate Statistics Comparison
  const statsMap: Record<number, {
    slotNo: number;
    memberName: string;
    base: { d: number; a: number; n: number; total: number; credit: number };
    scenario: { d: number; a: number; n: number; total: number; credit: number };
  }> = {};

  for (let s = 1; s <= 9; s++) {
    const initialName = INITIAL_SLOTS.find((cfg) => cfg.slotNo === s)?.initialName || `HP-0${s}`;
    statsMap[s] = {
      slotNo: s,
      memberName: initialName,
      base: { d: 0, a: 0, n: 0, total: 0, credit: 0 },
      scenario: { d: 0, a: 0, n: 0, total: 0, credit: 0 },
    };
  }

  for (let i = 0; i < baselineDays.length; i++) {
    const bDay = baselineDays[i];
    const sDay = scenarioDays[i];

    for (const bShift of bDay.shifts) {
      const sShift = sDay.shifts.find((s) => s.slotNo === bShift.slotNo);
      if (!sShift) continue;

      // Update base stats
      const baseStats = statsMap[bShift.slotNo].base;
      if (['D', '3D', '4D', '3D*', '4D*', '일근'].includes(bShift.shiftCode)) baseStats.d++;
      else if (bShift.shiftCode === 'A') baseStats.a++;
      else if (['N', '3N'].includes(bShift.shiftCode)) baseStats.n++;
      baseStats.total = baseStats.d + baseStats.a + baseStats.n;

      // Update scenario stats
      const scenStats = statsMap[sShift.slotNo].scenario;
      if (['D', '3D', '4D', '3D*', '4D*', '일근'].includes(sShift.shiftCode)) scenStats.d++;
      else if (sShift.shiftCode === 'A') scenStats.a++;
      else if (['N', '3N'].includes(sShift.shiftCode)) scenStats.n++;
      scenStats.total = scenStats.d + scenStats.a + scenStats.n;
      if (sShift.creditDelta) scenStats.credit += sShift.creditDelta;

      // Check diff
      if (bShift.shiftCode !== sShift.shiftCode || bShift.memberName !== sShift.memberName) {
        diffs.push({
          dateStr: bDay.dateStr,
          slotNo: bShift.slotNo,
          memberName: sShift.memberName,
          baseCode: bShift.shiftCode,
          scenarioCode: sShift.shiftCode,
          reason: sShift.note || sShift.badge,
        });
      }
    }
  }

  const statsComparison = Object.values(statsMap).map((item) => ({
    ...item,
    diff: {
      d: item.scenario.d - item.base.d,
      a: item.scenario.a - item.base.a,
      n: item.scenario.n - item.base.n,
      total: item.scenario.total - item.base.total,
      credit: item.scenario.credit - item.base.credit,
    },
  }));

  const validationRes = validateEntireSchedule(scenarioDays);

  return {
    options,
    baselineDays,
    scenarioDays,
    diffs,
    queueStates,
    statsComparison,
    validation: {
      coverageErrorsCount: validationRes.hardViolations.filter((v) => v.message.includes('불일치')).length,
      maxConsecutiveDays: validationRes.maxConsecutiveDays,
      quickReturnsCount: validationRes.totalQuickReturns,
      isPass: validationRes.hardViolations.length === 0 && validationRes.maxConsecutiveDays <= 3,
    },
  };
}
