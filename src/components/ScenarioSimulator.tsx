import React, { useState, useMemo } from 'react';
import { DaySchedule, ShiftCode } from '../engine/types';
import { ShiftEngine } from '../engine/shiftEngine';
import {
  rotateQueueRight,
  INITIAL_QUEUE_NAMES,
  runScenarioSimulation,
  DynamicScenarioOptions,
} from '../engine/scenarioEngine';
import {
  RotateCw,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ScenarioSimulatorProps {
  schedule2026?: DaySchedule[];
  schedule2027?: DaySchedule[];
  anonymize: boolean;
  onApplyScenarioToLive?: (overrides: Record<string, ShiftCode>) => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  schedule2026: _schedule2026,
  schedule2027: _schedule2027,
  anonymize,
  onApplyScenarioToLive: _onApplyScenarioToLive,
}) => {
  const engine = useMemo(() => new ShiftEngine(), []);

  // Simulator Inputs (Section 5.4 of SPECIFICATION)
  const [mode, setMode] = useState<'NORMAL_9' | 'EIGHT_PLUS_DAYTIME'>('EIGHT_PLUS_DAYTIME');
  const [startDate, setStartDate] = useState<string>('2027-01-01');
  const [endDate, setEndDate] = useState<string>('2027-12-31');
  const [supportName, setSupportName] = useState<string>('방안부 일근지원');
  const [supportStart, setSupportStart] = useState<string>('2027-01-04');
  const [supportEnd, setSupportEnd] = useState<string>('2027-03-07');
  const [vacantSlot] = useState<number>(1); // 최창호
  const [coveringSlot, setCoveringSlot] = useState<number>(8); // 신욱제
  const [restoreDate, setRestoreDate] = useState<string>('2027-03-08');
  const [restoreRemainingDays] = useState<number>(14);
  const [enforce84dShift, setEnforce84dShift] = useState<boolean>(true);
  const [autoHolidays, setAutoHolidays] = useState<boolean>(true);

  // Queue visualizer interactive state
  const [queueShiftCount, setQueueShiftCount] = useState<number>(0);

  const activeQueue = useMemo(
    () => rotateQueueRight(INITIAL_QUEUE_NAMES, queueShiftCount),
    [queueShiftCount]
  );

  // Run simulation
  const simulationResult = useMemo(() => {
    const opts: DynamicScenarioOptions = {
      name: '2027 임피 및 8+1 복원 시나리오',
      mode,
      startDate,
      endDate,
      departure: {
        slotNo: vacantSlot,
        memberName: '최창호',
        dateStr: startDate,
        reason: '임금피크제 전환',
      },
      arrival: {
        slotNo: vacantSlot,
        memberName: '이재겸',
        dateStr: restoreDate,
      },
      supportPersonnel: {
        name: supportName,
        startDate: supportStart,
        endDate: supportEnd,
      },
      tempCover: {
        vacantSlotNo: vacantSlot,
        coveringSlotNo: coveringSlot,
        restoreDate,
        restoreGraceDays: restoreRemainingDays,
      },
      enforce84dShift,
      autoHolidays,
    };
    return runScenarioSimulation(engine, opts);
  }, [
    engine,
    mode,
    startDate,
    endDate,
    supportName,
    supportStart,
    supportEnd,
    vacantSlot,
    coveringSlot,
    restoreDate,
    restoreRemainingDays,
    enforce84dShift,
    autoHolidays,
  ]);

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const [activeTab, setActiveTab] = useState<'queue' | 'diff' | 'stats' | 'timeline'>('queue');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              범용 관리자 시나리오 시뮬레이터 (General Scenario Simulator)
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                9칸 원형 큐 & 84일 회전
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              인원 변동(임피/전보/휴직), 8+1 지원조 투입, 84일 호기 이동 및 신규 복원 시나리오를 가상 시뮬레이션하고 3대 불변식을 검증합니다.
            </p>
          </div>
        </div>

        {/* 3 Invariants Real-time Validation Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>일일 커버리지 오류 {simulationResult.validation.coverageErrorsCount}건</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>최대 연속근무 {simulationResult.validation.maxConsecutiveDays}일 (3일 이하)</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <span>역순환(Quick Return) {simulationResult.validation.quickReturnsCount}건</span>
          </div>
        </div>
      </div>

      {/* Simulator 5 Parameters Input Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <Filter className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-slate-900 text-sm">시뮬레이션 5대 파라미터 설정</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* 1. Mode */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">1. 쉬프트 운영 모드</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="EIGHT_PLUS_DAYTIME">8+1 방안부 일근지원 모드</option>
              <option value="NORMAL_9">9인 정상 연속운영 모드</option>
            </select>
          </div>

          {/* 2. Target Period */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">2. 체제 변경 기간 (시작 ~ 종료)</label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-[11px]"
              />
              <span className="text-slate-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 3. Support Details (if 8+1) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">3. 방안부 지원인력 및 기간</label>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
                placeholder="지원자명"
                className="w-1/3 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-xs"
              />
              <input
                type="date"
                value={supportStart}
                onChange={(e) => setSupportStart(e.target.value)}
                className="w-1/3 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-[10px]"
              />
              <input
                type="date"
                value={supportEnd}
                onChange={(e) => setSupportEnd(e.target.value)}
                className="w-1/3 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-[10px]"
              />
            </div>
          </div>

          {/* 4. Temp Cover & Restore */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">4. 임시 대체자 & 9인 복원일</label>
            <div className="flex items-center space-x-1">
              <select
                value={coveringSlot}
                onChange={(e) => setCoveringSlot(Number(e.target.value))}
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-xs"
              >
                <option value={8}>Slot 8 (신욱제 - 1순위 추천)</option>
                <option value={7}>Slot 7 (이근현)</option>
                <option value={9}>Slot 9 (송명관)</option>
              </select>
              <input
                type="date"
                value={restoreDate}
                onChange={(e) => setRestoreDate(e.target.value)}
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enforce84dShift}
                onChange={(e) => setEnforce84dShift(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-bold text-slate-700">84일 원형 큐 순환 시프트 (rotateRight 1) 적용</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoHolidays}
                onChange={(e) => setAutoHolidays(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-bold text-slate-700">법정공휴일/대체공휴일 DB 자동 반영 (주말지원 휴무)</span>
            </label>
          </div>

          <span className="text-[11px] text-slate-400">
            * 변경사항은 실시간으로 연산되어 아래 뷰에 즉시 반영됩니다.
          </span>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'queue' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔄 9칸 원형 큐(Circular Queue) 시각화
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'diff' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔍 근무표 변경 비교 (Diff {simulationResult.diffs.length}건)
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'stats' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📊 개인별 근무일수 및 크레딧 변동 표
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'timeline' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📅 마일스톤 타임라인
        </button>
      </div>

      {/* Tab 1: 9-cell Circular Queue Visualizer */}
      {activeTab === 'queue' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                9칸 연결 원형 큐(Circular Queue) 호기 매핑
                <span className="text-xs font-normal text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {queueShiftCount === 0 ? '기준 초기 큐 상태' : `${queueShiftCount}회 우측 시프트 (+${queueShiftCount * 84}일)`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                원형 큐 공식: 매 84일마다 rotateRight(Q, 1). 큐의 앞 4칸(0~3)은 3호기, 뒤 5칸(4~8)은 4호기(통상 Day 포함)로 자동 귀속됩니다.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setQueueShiftCount((c) => Math.max(0, c - 1))}
                disabled={queueShiftCount === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                ◀ 좌측 1칸
              </button>
              <button
                onClick={() => setQueueShiftCount((c) => c + 1)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 flex items-center gap-1 shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" /> 84일 우측 1칸 시프트 ▶
              </button>
              <button
                onClick={() => setQueueShiftCount(0)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
              >
                초기화
              </button>
            </div>
          </div>

          {/* Queue Slots Visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-9 gap-2">
            {activeQueue.map((name, idx) => {
              const isUnit3 = idx < 4;
              const isFloat = idx === 8;
              const rowSlotNo = idx + 1;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    isUnit3
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : isFloat
                      ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    Index {idx}
                  </span>
                  <span className="text-xs font-mono font-bold mt-1 text-slate-600">
                    Row {rowSlotNo}
                  </span>
                  <span className="text-sm font-extrabold my-2 text-slate-900">
                    {name}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isUnit3
                        ? 'bg-blue-100 text-blue-800'
                        : isFloat
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isUnit3 ? '3호기' : isFloat ? '통상 Day' : '4호기'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">💡 표 행(Row) 순번 불변 원칙:</span><br />
            근무표의 행 위치(Row 1~9)는 고정되어 있으며, 84일 회전 시 4호기 통상근무자(Index 8)가 3호기 1번 행(Row 1, Index 0)으로 진입합니다. 기존 3호기 인원은 1칸씩 밀리며 3호기 4번 행(Row 4, Index 3) 근무자가 4호기 1번 행(Row 5, Index 4)으로 이동합니다.
          </div>
        </div>
      )}

      {/* Tab 2: Diff View */}
      {activeTab === 'diff' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">
              시뮬레이션 전/후 근무표 변경 내역 (총 {simulationResult.diffs.length}건 교체)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              * 정상 9인 대비 8+1 지원 및 복원에 따른 차이점
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b">
                <tr>
                  <th className="py-2.5 px-4">일자</th>
                  <th className="py-2.5 px-4">슬롯 / 성명</th>
                  <th className="py-2.5 px-4 text-center">기존 코드</th>
                  <th className="py-2.5 px-4 text-center"></th>
                  <th className="py-2.5 px-4 text-center">시뮬레이션 코드</th>
                  <th className="py-2.5 px-4">변경 사유 및 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {simulationResult.diffs.slice(0, 100).map((diff, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono text-slate-600">{diff.dateStr}</td>
                    <td className="py-2 px-4 font-bold text-slate-900">
                      Slot {diff.slotNo} ({diff.memberName})
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {diff.baseCode}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center text-slate-400">
                      <ArrowRight className="w-3.5 h-3.5 inline" />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-extrabold border border-purple-200">
                        {diff.scenarioCode}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-500 text-[11px]">
                      {diff.reason || '시나리오 규칙에 따른 전환'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Workload & Credit Statistics */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm">
              인원별 연간 근무일수 및 대체휴무 크레딧 변동 집계
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="py-3 px-4">슬롯</th>
                  <th className="py-3 px-4">성명</th>
                  <th className="py-3 px-4 text-center">주간(D)</th>
                  <th className="py-3 px-4 text-center">오후(A)</th>
                  <th className="py-3 px-4 text-center">야간(N)</th>
                  <th className="py-3 px-4 text-center">총 근무일수</th>
                  <th className="py-3 px-4 text-center">대체휴무 크레딧</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {simulationResult.statsComparison.map((st) => (
                  <tr key={st.slotNo} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">Slot {st.slotNo}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{getName(st.slotNo, st.memberName)}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {st.scenario.d}일{' '}
                      <span className={`text-[10px] ${st.diff.d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({st.diff.d >= 0 ? `+${st.diff.d}` : st.diff.d})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {st.scenario.a}일{' '}
                      <span className="text-[10px] text-slate-400">
                        ({st.diff.a >= 0 ? `+${st.diff.a}` : st.diff.a})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {st.scenario.n}일{' '}
                      <span className="text-[10px] text-slate-400">
                        ({st.diff.n >= 0 ? `+${st.diff.n}` : st.diff.n})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {st.scenario.total}일
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          st.scenario.credit > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.scenario.credit < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st.scenario.credit > 0 ? `+${st.scenario.credit}` : st.scenario.credit}일
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Milestones Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                date: '2027-01-01',
                title: '결원 발생 & 대체',
                desc: '최창호 임피 결원 -> 신욱제(Slot 8)가 1행 최창호 위치(1/1 위상 4) 임시 대체 투입',
                badge: '8인 체제 돌입',
              },
              {
                date: '2027-01-04 ~ 03-07',
                title: '방안부 지원조 투입',
                desc: '평일 3D/4D 직접 지원 & 여유일 D->X 대휴 스왑 / 주말·공휴일 Phase-11 X->D 대휴 적립',
                badge: '8+1 체제 운영',
              },
              {
                date: '2027-02-01',
                title: '84일 주기 호기 이동',
                desc: '송명관(4->3호기)과 임원택(3->4호기) 교차 이동 (2/2 송명관 X, 임원택 3N 1일 보정)',
                badge: '연속근무 3일 보장',
              },
              {
                date: '2027-03-08',
                title: '이재겸 투입 & 복원',
                desc: '신규 이재겸 Slot 1 배치, 신욱제 본래 Slot 8 복귀. 3/8 신욱제 X, 이재겸 4D 인수인계',
                badge: '9인 복원 완료',
              },
              {
                date: '2027-03-22',
                title: '정규 순환 재개',
                desc: '신욱제 14일 잔여 통상근무 완료 후 Slot 9 송명관으로 정규 21일 통상 순환 재개',
                badge: '정상 21일 주기',
              },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                    {item.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block mt-2">{item.date}</span>
                  <span className="text-xs font-extrabold text-brand-700 block mt-0.5">{item.title}</span>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
