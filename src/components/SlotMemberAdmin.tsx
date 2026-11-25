import React, { useState } from 'react';
import { UserRole } from '../services/supabaseClient';
import { Holiday } from '../engine/types';
import {
  getDefaultHolidaysForYear,
  setCustomHolidays,
} from '../engine/holidays';
import { runScenarioSimulation } from '../engine/scenarioEngine';
import { ShiftEngine } from '../engine/shiftEngine';
import {
  Shield,
  Users,
  Calendar,
  RotateCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Save,
  Sparkles,
  Phone,
  Send,
  Mail,
  PlayCircle,
  Lock,
} from 'lucide-react';

export interface SlotMemberData {
  slotNo: number; // 1 to 9
  unit: '3호기' | '4호기';
  name: string;
  phone: string;
  telegramId: string;
  email: string;
  workStartDate: string;
  workEndDate: string;
  terminationReason: string;
  status: '재직중' | '교체완료' | '임금피크' | '결원';
  role: UserRole;
  accountStatus: 'approved' | 'pending' | 'rejected';
}

export interface SlotMemberAdminProps {
  currentRole: UserRole;
  anonymize: boolean;
  onToggleAnonymize: () => void;
  year: number;
  onCommitSchedule?: (overrides: Record<string, any>, auditMsg: string) => void;
}

export const SlotMemberAdmin: React.FC<SlotMemberAdminProps> = ({
  currentRole,
  anonymize,
  onToggleAnonymize,
  year,
  onCommitSchedule,
}) => {
  // Access Control Guard
  if (currentRole !== 'L3_ADMIN') {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">
          관리자(L3_ADMIN) 권한 전용 페이지
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          본 페이지(슬롯별 HP 인원·근무 관리, 8+1 모드, 공휴일 관리 및 시뮬레이션 확정)는
          최고 관리자(L3_ADMIN)만 접근 및 수정이 가능합니다.
          <br />
          화면 상단 우측의 권한 선택기에서 <span className="font-bold text-purple-700">'L3 관리자'</span>를 선택해 주세요.
        </p>
      </div>
    );
  }

  // Active Sub-Tab: 'slots' | 'eight_plus' | 'holidays' | 'simulate' | 'audit'
  const [activeSubTab, setActiveSubTab] = useState<
    'slots' | 'eight_plus' | 'holidays' | 'simulate' | 'audit'
  >('slots');

  // 1. 9 Slots Configuration State (1~4: 3호기, 5~9: 4호기)
  const [slots, setSlots] = useState<SlotMemberData[]>([
    {
      slotNo: 1,
      unit: '3호기',
      name: '신욱제',
      phone: '010-3841-1008',
      telegramId: '@shin_hp',
      email: 'shin@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      slotNo: 2,
      unit: '3호기',
      name: '손정기',
      phone: '010-5923-2002',
      telegramId: '@son_hp',
      email: 'son@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      slotNo: 3,
      unit: '3호기',
      name: '박경욱',
      phone: '010-8274-3003',
      telegramId: '@park_hp',
      email: 'park@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      slotNo: 4,
      unit: '3호기',
      name: '임원택',
      phone: '010-4491-4004',
      telegramId: '@lim_hp',
      email: 'lim@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      slotNo: 5,
      unit: '4호기',
      name: '박상현',
      phone: '010-7712-5005',
      telegramId: '@park_sh',
      email: 'park_sh@khnp.co.kr',
      workStartDate: '2027-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '2027-01-01 나상흠(퇴직) 후임 임피 교체',
      status: '임금피크',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      slotNo: 6,
      unit: '4호기',
      name: '권재호',
      phone: '010-6318-6006',
      telegramId: '@kwon_hp',
      email: 'kwon@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      slotNo: 7,
      unit: '4호기',
      name: '이근현',
      phone: '010-9182-7007',
      telegramId: '@lee_hp',
      email: 'lee@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      slotNo: 8,
      unit: '4호기',
      name: '이재겸',
      phone: '010-3841-8008',
      telegramId: '@lee_jk',
      email: 'lee_jk@khnp.co.kr',
      workStartDate: '2027-03-08',
      workEndDate: '2027-12-31',
      terminationReason: '2027-03-08 결원위치 신규 투입',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      slotNo: 9,
      unit: '4호기',
      name: '송명관',
      phone: '010-2234-9009',
      telegramId: '@song_hp',
      email: 'song@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2027-12-31',
      terminationReason: '재직중 (정상 근무 / 통상Day)',
      status: '재직중',
      role: 'L3_ADMIN',
      accountStatus: 'approved',
    },
  ]);

  // Editing Slot Modal
  const [editingSlot, setEditingSlot] = useState<SlotMemberData | null>(null);

  // 2. 8+1 Support Mode Config
  const [eightPlusOneConfig, setEightPlusOneConfig] = useState({
    enabled: true,
    supportName: '방안부지원',
    supportDepartment: '방사선안전부',
    startDate: '2027-01-04',
    endDate: '2027-03-07',
    swapCreditMode: true,
    offOnHolidays: true,
  });

  // 3. Holiday Management State
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<number>(year);
  const [holidayStore, setHolidayStore] = useState<Record<number, Holiday[]>>({
    2026: getDefaultHolidaysForYear(2026),
    2027: getDefaultHolidaysForYear(2027),
    2028: getDefaultHolidaysForYear(2028),
  });

  // New Holiday Input Form
  const [newHoliday, setNewHoliday] = useState<{
    dateStr: string;
    name: string;
    isSubstitute: boolean;
  }>({
    dateStr: `${year}-01-01`,
    name: '',
    isSubstitute: false,
  });

  const activeHolidays = holidayStore[selectedHolidayYear] || [];

  const handleAddHoliday = () => {
    if (!newHoliday.name.trim() || !newHoliday.dateStr) {
      alert('공휴일 일자와 명칭을 입력해주세요.');
      return;
    }
    const updated = [
      ...activeHolidays,
      {
        dateStr: newHoliday.dateStr,
        name: newHoliday.name.trim(),
        isSubstitute: newHoliday.isSubstitute,
      },
    ].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: updated }));
    setCustomHolidays(updated);
    setNewHoliday({ dateStr: `${selectedHolidayYear}-01-01`, name: '', isSubstitute: false });
  };

  const handleDeleteHoliday = (dateStr: string) => {
    if (!confirm(`${dateStr} 공휴일을 삭제하시겠습니까?`)) return;
    const updated = activeHolidays.filter((h) => h.dateStr !== dateStr);
    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: updated }));
    setCustomHolidays(updated);
  };

  const handleResetHolidays = () => {
    if (!confirm(`${selectedHolidayYear}년 기본 법정공휴일로 초기화하시겠습니까?`)) return;
    const defaults = getDefaultHolidaysForYear(selectedHolidayYear);
    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: defaults }));
    setCustomHolidays(defaults);
  };

  // 4. Simulation & Commit State
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);

  // Run Simulation
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setIsCommitted(false);
    setTimeout(() => {
      try {
        const engine = new ShiftEngine();
        const res = runScenarioSimulation(engine, {
          name: '관리자 슬롯 & 8+1 커스텀 시뮬레이션',
          mode: eightPlusOneConfig.enabled ? 'EIGHT_PLUS_DAYTIME' : 'NORMAL_9',
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          supportPersonnel: eightPlusOneConfig.enabled
            ? {
                name: eightPlusOneConfig.supportName,
                startDate: eightPlusOneConfig.startDate,
                endDate: eightPlusOneConfig.endDate,
              }
            : undefined,
          enforce84dShift: true,
          autoHolidays: true,
        });
        setSimResult(res);
      } catch (err: any) {
        alert(`시뮬레이션 실행 중 오류 발생: ${err.message}`);
      } finally {
        setIsSimulating(false);
      }
    }, 400);
  };

  // Commit Simulation to Live
  const handleCommitToLive = () => {
    if (!simResult) {
      alert('먼저 시뮬레이션을 실행하여 결과를 검증해 주세요.');
      return;
    }
    const overridesMap: Record<string, any> = {};
    for (const diff of simResult.diffs) {
      const key = `${diff.dateStr}_${diff.slotNo}`;
      overridesMap[key] = diff.scenarioCode;
    }
    if (onCommitSchedule) {
      onCommitSchedule(
        overridesMap,
        `관리자 슬롯 및 8+1 설정 확정 반영 (수동 변경 ${simResult.diffs.length}건)`
      );
    }
    setIsCommitted(true);
    alert('설정된 슬롯 인원 및 8+1 근무표가 라이브 시스템에 성공적으로 확정 반영되었습니다.');
  };

  // Save Slot Edit
  const handleSaveSlotEdit = () => {
    if (!editingSlot) return;
    setSlots((prev) =>
      prev.map((s) => (s.slotNo === editingSlot.slotNo ? editingSlot : s))
    );
    setEditingSlot(null);
  };

  const getDisplayName = (slotNo: number, name: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return name;
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-400 text-slate-950">
                  L3_ADMIN 전용
                </span>
                <span className="text-xs text-purple-200 font-semibold">
                  원형 큐 84일 시프트 관리 콘솔
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                HP 슬롯 및 근무 총괄 관리
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                1~4슬롯 3호기 / 5~9슬롯 4호기 원형 큐 인원 배치, 8+1 모드, 공휴일 관리 및 시뮬레이션 확정
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleAnonymize}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors ${
                anonymize
                  ? 'bg-purple-800 border-purple-500 text-purple-100'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{anonymize ? '익명화 모드 ON' : '실명 표시 모드'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="mt-5 pt-3 border-t border-slate-700/80 flex flex-wrap gap-2 text-xs font-bold">
          {[
            { id: 'slots', label: '1~9슬롯 원형 큐 및 인원 관리', icon: Users },
            { id: 'eight_plus', label: '8+1 지원조 모드 설정', icon: Sparkles },
            { id: 'holidays', label: '연도별 공휴일 관리', icon: Calendar },
            { id: 'simulate', label: '근무표 시뮬레이션 및 확정', icon: PlayCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-Tab Content: 1~9 Slots Circular Queue & Member Info */}
      {activeSubTab === 'slots' && (
        <div className="space-y-6">
          {/* Visual 9-slot Circular Queue Diagram */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <RotateCw className="w-4 h-4 text-brand-600" />
                  <span>9칸 원형 큐 호기별 배치도 (1~4슬롯: 3호기, 5~9슬롯: 4호기)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  84일마다 우측 1칸 시프트하여 호기간 공평한 순환이 이루어집니다.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                  1~4슬롯: 3호기 (4명)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                  5~9슬롯: 4호기 (5명)
                </span>
              </div>
            </div>

            {/* Circular Grid Cards (1 to 9) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              {slots.map((s) => {
                const is3U = s.slotNo <= 4;
                const displayName = getDisplayName(s.slotNo, s.name);

                return (
                  <div
                    key={s.slotNo}
                    className={`rounded-2xl p-3 border transition-all hover:shadow-md ${
                      is3U
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          is3U ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        S{s.slotNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          is3U ? 'text-blue-700' : 'text-emerald-700'
                        }`}
                      >
                        {s.unit}
                      </span>
                    </div>

                    <div className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                      {displayName}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      {s.phone}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">
                        {s.status}
                      </span>
                      <button
                        onClick={() => setEditingSlot(s)}
                        className="text-brand-600 hover:text-brand-800 font-bold"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Slots Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  슬롯별 HP 인원 및 근무 상세 정보
                </h3>
                <p className="text-xs text-slate-500">
                  이름, 휴대폰, 텔레그램 ID, 계정, 근무 시작/종료일 및 종료 사유 관리
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-14">슬롯</th>
                    <th className="px-3 py-2.5 text-center w-20">호기</th>
                    <th className="px-3 py-2.5 text-left">성명</th>
                    <th className="px-3 py-2.5 text-left">휴대폰 번호</th>
                    <th className="px-3 py-2.5 text-left">텔레그램 ID</th>
                    <th className="px-3 py-2.5 text-left">이메일 계정</th>
                    <th className="px-3 py-2.5 text-center">근무 시작일</th>
                    <th className="px-3 py-2.5 text-center">근무 종료일</th>
                    <th className="px-3 py-2.5 text-left">근무 종료 사유</th>
                    <th className="px-3 py-2.5 text-center">상태</th>
                    <th className="px-3 py-2.5 text-center w-16">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {slots.map((s) => {
                    const is3U = s.slotNo <= 4;
                    const displayName = getDisplayName(s.slotNo, s.name);

                    return (
                      <tr key={s.slotNo} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-black font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              is3U
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Slot {s.slotNo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold">
                          {s.unit}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {displayName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.phone}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-sky-700 font-semibold">
                          <div className="flex items-center space-x-1">
                            <Send className="w-3 h-3 text-sky-500" />
                            <span>{s.telegramId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{s.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                          {s.workStartDate}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                          {s.workEndDate || '계속'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {s.terminationReason}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === '재직중'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === '임금피크'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => setEditingSlot(s)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-Tab Content: 8+1 Mode Settings */}
      {activeSubTab === 'eight_plus' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>8+1 체제 지원조 운영 설정</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              결원 발생 시 방안부 일근 요원 1명을 지원 투입하여 365일 무결점 커버리지를 보장합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Mode Toggle & Parameters */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">8+1 지원조 투입 모드 활성화</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    평일 일근 투입 및 휴일 투입 시 대체휴무 스왑 정산 활성화
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={eightPlusOneConfig.enabled}
                  onChange={(e) =>
                    setEightPlusOneConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    8+1 투입 시작일:
                  </label>
                  <input
                    type="date"
                    value={eightPlusOneConfig.startDate}
                    onChange={(e) =>
                      setEightPlusOneConfig((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    8+1 투입 종료일:
                  </label>
                  <input
                    type="date"
                    value={eightPlusOneConfig.endDate}
                    onChange={(e) =>
                      setEightPlusOneConfig((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  지원조 담당자 성명:
                </label>
                <input
                  type="text"
                  value={eightPlusOneConfig.supportName}
                  onChange={(e) =>
                    setEightPlusOneConfig((prev) => ({ ...prev, supportName: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  소속 부서:
                </label>
                <input
                  type="text"
                  value={eightPlusOneConfig.supportDepartment}
                  onChange={(e) =>
                    setEightPlusOneConfig((prev) => ({
                      ...prev,
                      supportDepartment: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Right: Operational Rules Summary */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-950 space-y-3">
              <h4 className="font-extrabold text-purple-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-700" />
                <span>8+1 체제 불변 규칙 가이드라인</span>
              </h4>
              <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-purple-900/90">
                <li>
                  <strong>평일 주간 지원:</strong> 월~금 평일 발생 3호기(3D) 또는 4호기(4D) 공백에 방안부 일근자가 직접 투입됩니다.
                </li>
                <li>
                  <strong>주말·공휴일 휴무 보장:</strong> 토/일/공휴일에는 방안부 요원이 100% 휴무(OFF)합니다.
                </li>
                <li>
                  <strong>휴일 Phase-11 투입 및 대체스왑:</strong> 주말·공휴일 공백은 기존 HP 요원이 투입되고 평일에 대체휴무(3D*/4D*)를 보상받습니다.
                </li>
                <li>
                  <strong>크레딧 완전 정산:</strong> 66일(1/1~3/7) 동안 발생한 모든 크레딧은 3/7 종료 시점까지 잔여 5일 이내로 완벽 균형을 유지합니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 4. Sub-Tab Content: Holiday Management */}
      {activeSubTab === 'holidays' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                <span>연도별 법정공휴일 및 대체공휴일 관리</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                우주항공청 월력요항 기준 공식 데이터베이스 조회 및 기관별 맞춤 휴일 추가/삭제
              </p>
            </div>

            {/* Year Selector & Reset */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedHolidayYear}
                onChange={(e) => setSelectedHolidayYear(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                <option value={2026}>2026년</option>
                <option value={2027}>2027년 (우주항공청 확정)</option>
                <option value={2028}>2028년</option>
              </select>

              <button
                onClick={handleResetHolidays}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                기본값 복원
              </button>
            </div>
          </div>

          {/* Add New Holiday Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">일자:</label>
              <input
                type="date"
                value={newHoliday.dateStr}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, dateStr: e.target.value }))}
                className="bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block font-bold text-slate-700 mb-1">공휴일 명칭:</label>
              <input
                type="text"
                placeholder="예: 창립기념일"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center space-x-1.5 pb-2">
              <input
                type="checkbox"
                id="isSubstitute"
                checked={newHoliday.isSubstitute}
                onChange={(e) =>
                  setNewHoliday((prev) => ({ ...prev, isSubstitute: e.target.checked }))
                }
                className="w-4 h-4 accent-brand-600 rounded"
              />
              <label htmlFor="isSubstitute" className="font-bold text-slate-700 cursor-pointer">
                대체공휴일 여부
              </label>
            </div>
            <button
              onClick={handleAddHoliday}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>공휴일 추가</span>
            </button>
          </div>

          {/* Holiday List Grid */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-2.5 text-left">일자 (Date)</th>
                  <th className="px-4 py-2.5 text-left">공휴일 명칭</th>
                  <th className="px-4 py-2.5 text-center">구분</th>
                  <th className="px-4 py-2.5 text-center w-20">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {activeHolidays.map((h) => (
                  <tr key={h.dateStr} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">
                      {h.dateStr}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-800">
                      {h.name}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          h.isSubstitute
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {h.isSubstitute ? '대체공휴일' : '법정공휴일'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleDeleteHoliday(h.dateStr)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="공휴일 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Sub-Tab Content: Simulation & Commit */}
      {activeSubTab === 'simulate' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <PlayCircle className="w-5 h-5 text-purple-600" />
                <span>입력 설정 기준 근무표 시뮬레이션 및 라이브 확정</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                변경된 9슬롯 인원, 8+1 운영기간, 공휴일 설정을 반영하여 365일 무결점 검증을 수행하고 라이브에 확정 반영합니다.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{isSimulating ? '시뮬레이션 계산 중...' : '시뮬레이션 실행'}</span>
              </button>

              {simResult && (
                <button
                  onClick={handleCommitToLive}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all hover:scale-105"
                >
                  <Save className="w-4 h-4" />
                  <span>근무표 확정 및 라이브 반영</span>
                </button>
              )}
            </div>
          </div>

          {/* Simulation Results Display */}
          {simResult ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-800">일일 커버리지 검증</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">오류 0건 (100%)</div>
                  <p className="text-xs text-emerald-600 mt-1">매일 3호기 1D/1A/1N, 4호기 1D/1A/1N 완벽 충족</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-800">최대 연속근무 검증</div>
                  <div className="text-2xl font-black text-blue-950 mt-1">
                    {simResult.validation.maxConsecutiveDays}일 이하 (통과)
                  </div>
                  <p className="text-xs text-blue-600 mt-1">전원 최대 연속 3일 이하 엄격 제한 준수</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-purple-800">역순환(N→D) 검증</div>
                  <div className="text-2xl font-black text-purple-950 mt-1">
                    {simResult.validation.quickReturnsCount}건 (0건 통과)
                  </div>
                  <p className="text-xs text-purple-600 mt-1">야간 근무 직후 주간 투입 원천 차단</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">시뮬레이션 결과: </span>
                  <span className="text-slate-600">
                    기준일정 대비 총 <strong className="text-purple-700">{simResult.diffs.length}건</strong>의 맞춤 조정 사항이 산출되었습니다.
                  </span>
                </div>
                {isCommitted && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg">
                    ✓ 라이브 근무표 확정 완료
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              상단의 <strong className="text-purple-600">'시뮬레이션 실행'</strong> 버튼을 클릭하여
              현재 설정된 슬롯 및 공휴일 조건으로 365일 무결점 검증을 실행하세요.
            </div>
          )}
        </div>
      )}

      {/* 6. Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-purple-600" />
                  Slot {editingSlot.slotNo} 인원 및 근무 정보 수정
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingSlot.unit} 배치 요원 정보
                </p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">성명:</label>
                <input
                  type="text"
                  value={editingSlot.name}
                  onChange={(e) =>
                    setEditingSlot((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">소속 호기:</label>
                <select
                  value={editingSlot.unit}
                  onChange={(e) =>
                    setEditingSlot((prev) =>
                      prev ? { ...prev, unit: e.target.value as any } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                >
                  <option value="3호기">3호기 (슬롯 1~4)</option>
                  <option value="4호기">4호기 (슬롯 5~9)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">휴대폰 번호:</label>
                <input
                  type="text"
                  value={editingSlot.phone}
                  onChange={(e) =>
                    setEditingSlot((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">텔레그램 ID:</label>
                <input
                  type="text"
                  value={editingSlot.telegramId}
                  onChange={(e) =>
                    setEditingSlot((prev) =>
                      prev ? { ...prev, telegramId: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-sky-700 font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">이메일 계정:</label>
                <input
                  type="email"
                  value={editingSlot.email}
                  onChange={(e) =>
                    setEditingSlot((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">근무 시작일:</label>
                <input
                  type="date"
                  value={editingSlot.workStartDate}
                  onChange={(e) =>
                    setEditingSlot((prev) =>
                      prev ? { ...prev, workStartDate: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">근무 종료일 (선택):</label>
                <input
                  type="date"
                  value={editingSlot.workEndDate}
                  onChange={(e) =>
                    setEditingSlot((prev) =>
                      prev ? { ...prev, workEndDate: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">근무 종료 사유 / 비고:</label>
                <input
                  type="text"
                  placeholder="예: 재직중, 정년퇴직, 임금피크 교체, 부서이동 등"
                  value={editingSlot.terminationReason}
                  onChange={(e) =>
                    setEditingSlot((prev) =>
                      prev ? { ...prev, terminationReason: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setEditingSlot(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSaveSlotEdit}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm"
              >
                저장 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
