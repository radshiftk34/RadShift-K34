import React, { useState, useMemo, useEffect } from 'react';
import { DaySchedule, ShiftCode } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { calculateReliefCandidates, ReliefCandidate } from '../engine/reliefEngine';
import { getExcelBadgeStyle } from '../data/master2027Data';
import {
  Check,
  Sparkles,
  Users,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LeaveReliefModalProps {
  schedule: DaySchedule[];
  anonymize: boolean;
  currentRole: UserRole;
  onApplyRelief: (targetDate: string, requesterSlot: number, reliefSlot: number, reason: string) => void;
  overrides?: Record<string, ShiftCode>;
  onCancelOverride?: (overrideKey: string) => void;
}

export const LeaveReliefModal: React.FC<LeaveReliefModalProps> = ({
  schedule,
  anonymize,
  currentRole: _currentRole,
  onApplyRelief,
  overrides = {},
  onCancelOverride,
}) => {
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const defaultTargetDate = useMemo(() => {
    if (schedule.some((s) => s.dateStr === todayDateStr)) return todayDateStr;
    return schedule[0]?.dateStr || '2026-01-01';
  }, [schedule, todayDateStr]);

  const [targetDateStr, setTargetDateStr] = useState<string>(defaultTargetDate);

  useEffect(() => {
    setTargetDateStr(defaultTargetDate);
  }, [defaultTargetDate]);

  // Monthly Calendar Navigation & Overrides State
  const [calendarMonth, setCalendarMonth] = useState<string>(() => (defaultTargetDate ? defaultTargetDate.slice(0, 7) : '2026-12'));

  useEffect(() => {
    if (targetDateStr) {
      const ym = targetDateStr.slice(0, 7);
      if (ym !== calendarMonth) {
        setCalendarMonth(ym);
      }
    }
  }, [targetDateStr]);

  const [calYear, calMonthNum] = useMemo(() => {
    const parts = calendarMonth.split('-').map(Number);
    return [parts[0] || 2026, parts[1] || 12];
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    let newYear = calYear;
    let newMonth = calMonthNum - 1;
    if (newMonth < 1) {
      newYear -= 1;
      newMonth = 12;
    }
    setCalendarMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = calYear;
    let newMonth = calMonthNum + 1;
    if (newMonth > 12) {
      newYear += 1;
      newMonth = 1;
    }
    setCalendarMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const calendarDays = useMemo(() => {
    const firstDate = new Date(calYear, calMonthNum - 1, 1);
    const startDayOfWeek = firstDate.getDay(); // 0 = Sun
    const lastDate = new Date(calYear, calMonthNum, 0);
    const totalDaysInMonth = lastDate.getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      dayOfWeek: number;
      isCurrentMonth: boolean;
    } | null> = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = (startDayOfWeek + d - 1) % 7;
      days.push({
        dateStr,
        dayNum: d,
        dayOfWeek: dow,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [calYear, calMonthNum]);

  const getDayOverridesInfo = (dateStr: string) => {
    const dayLeaves: string[] = [];
    const dayReliefs: string[] = [];

    Object.entries(overrides).forEach(([key, shiftCode]) => {
      const [dStr, sNo] = key.split('_');
      if (dStr === dateStr) {
        const slot = Number(sNo);
        const day = schedule.find((s) => s.dateStr === dateStr);
        const member = day?.shifts.find((s) => s.slotNo === slot);
        const memName = member ? getName(slot, member.memberName) : `S${slot}`;

        if (shiftCode === '연차') {
          dayLeaves.push(memName);
        } else {
          dayReliefs.push(`${memName}(${shiftCode})`);
        }
      }
    });

    return { dayLeaves, dayReliefs };
  };

  const [requesterSlot, setRequesterSlot] = useState<number>(3);
  const [leaveType, setLeaveType] = useState<string>('연차');
  const [reason, setReason] = useState<string>('개인 사유 연차 신청');
  const [selectedReliefSlot, setSelectedReliefSlot] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDisqualified, setShowDisqualified] = useState<boolean>(false);

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const targetDay = useMemo(
    () => schedule.find((d) => d.dateStr === targetDateStr) || schedule[0],
    [schedule, targetDateStr]
  );

  const dayOfWeekStr = useMemo(() => {
    if (!targetDay) return '';
    const dows = ['일', '월', '화', '수', '목', '금', '토'];
    return dows[targetDay.dayOfWeek] || '';
  }, [targetDay]);

  const requesterShift = useMemo(() => {
    if (!targetDay) return undefined;
    return targetDay.shifts.find((s) => s.slotNo === requesterSlot);
  }, [targetDay, requesterSlot]);

  // Handle Date Navigation
  const handlePrevDay = () => {
    const idx = schedule.findIndex((s) => s.dateStr === targetDateStr);
    if (idx > 0) {
      setTargetDateStr(schedule[idx - 1].dateStr);
      setSelectedReliefSlot(null);
    }
  };

  const handleNextDay = () => {
    const idx = schedule.findIndex((s) => s.dateStr === targetDateStr);
    if (idx >= 0 && idx < schedule.length - 1) {
      setTargetDateStr(schedule[idx + 1].dateStr);
      setSelectedReliefSlot(null);
    }
  };

  const handleJumpToToday = () => {
    if (schedule.some((s) => s.dateStr === todayDateStr)) {
      setTargetDateStr(todayDateStr);
      setSelectedReliefSlot(null);
    }
  };

  // Exact Relief Candidates Calculation
  const candidates: ReliefCandidate[] = useMemo(() => {
    return calculateReliefCandidates(schedule, targetDateStr, requesterSlot, {}, {}, overrides);
  }, [schedule, targetDateStr, requesterSlot, overrides]);

  const eligibleCandidates = useMemo(() => candidates.filter((c) => c.isEligible), [candidates]);
  const disqualifiedCandidates = useMemo(() => candidates.filter((c) => !c.isEligible), [candidates]);

  // Auto-select first candidate if current selection becomes invalid
  useEffect(() => {
    if (selectedReliefSlot) {
      const stillEligible = eligibleCandidates.some((c) => c.slotNo === selectedReliefSlot);
      if (!stillEligible) setSelectedReliefSlot(null);
    }
  }, [eligibleCandidates, selectedReliefSlot]);

  const handleConfirm = () => {
    if (!selectedReliefSlot) return;
    onApplyRelief(targetDateStr, requesterSlot, selectedReliefSlot, `${leaveType}: ${reason}`);
    const selectedCandidate = candidates.find((c) => c.slotNo === selectedReliefSlot);
    setSuccessMessage(
      `성공적으로 대근자가 매칭 및 확정되었습니다! (${getName(requesterSlot, requesterShift?.memberName || '')} ➔ ${getName(
        selectedReliefSlot,
        selectedCandidate?.memberName || ''
      )})`
    );
    setSelectedReliefSlot(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Active Overrides for this month / date
  const activeOverridesList = useMemo(() => {
    const currentMonthPrefix = targetDateStr.slice(0, 7);
    const list: { key: string; dateStr: string; slotNo: number; memberName: string; shiftCode: ShiftCode }[] = [];
    Object.entries(overrides).forEach(([key, shiftCode]) => {
      const [dStr, sNo] = key.split('_');
      if (dStr && dStr.startsWith(currentMonthPrefix)) {
        const slot = Number(sNo);
        const day = schedule.find((s) => s.dateStr === dStr);
        const member = day?.shifts.find((s) => s.slotNo === slot);
        list.push({
          key,
          dateStr: dStr,
          slotNo: slot,
          memberName: member?.memberName || `Slot ${slot}`,
          shiftCode,
        });
      }
    });
    return list.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.slotNo - b.slotNo);
  }, [overrides, targetDateStr, schedule]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Header Banner & Rule Announcement */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold text-slate-900">
                  휴가 신청 및 최적 대근자 추천 관리
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-brand-100 text-brand-800">
                  Section 5.3 엔진
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                근무자 휴가(연차, 경조사 등) 발생 시 결원을 방지하고 공평한 대근자 자동 추천 및 근무표 실시간 반영을 지원합니다.
              </p>
            </div>
          </div>

          <div className="text-right text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 block">적합도 공식:</span>
            <code className="text-[11px] text-purple-700 font-mono font-bold">
              Score = 100×Phase11 + 50×호기일치 - 10×월근무 - 20×대근누적 - 5×대체크레딧
            </code>
          </div>
        </div>

        {/* Highlighted Rule Notice */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/70 rounded-xl border border-amber-200 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-950 space-y-1">
            <p className="font-bold">
              [대근 규정 안내] 결원 방지를 위한 연속 3일 초과 근무 허용
            </p>
            <p className="text-amber-800 leading-relaxed">
              정상 교대에서는 3일 이하 근무가 권장되나, <strong>대근 투입의 경우 결원 방지 및 현업 운영을 위해 연속 3일 초과(4일 이상 연속근무)도 정식 허용</strong>됩니다.
              단, 전일 야간 후 당일 주간 등 신체적 휴식이 불가능한 <strong>역순환(Quick Return)</strong>은 엄격히 차단됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Step 1: Target Date & Applicant Picker */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-black text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="font-extrabold text-slate-900 text-sm">
              휴가 대상일 및 신청자 선택
            </h2>
          </div>

          {/* Quick Date Navigator */}
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
              title="이전 날짜"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1.5 px-2 font-mono font-bold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              <span>{targetDateStr} ({dayOfWeekStr})</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
              title="다음 날짜"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={targetDateStr}
              onChange={(e) => {
                setTargetDateStr(e.target.value);
                setSelectedReliefSlot(null);
              }}
              className="px-2 py-0.5 border border-slate-300 rounded font-semibold text-slate-800 bg-white ml-1 text-xs"
            />
            <button
              onClick={handleJumpToToday}
              className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-[11px] transition-colors ml-1"
            >
              오늘
            </button>
          </div>
        </div>

        {/* 1-1. Monthly Calendar View (휴가자 및 대근자 현황 달력) */}
        <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 bg-white shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전달</span>
            </button>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {calYear}년 {calMonthNum}월
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 bg-white shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>다음달</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Sun~Sat) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-black py-1.5 border-b border-slate-200">
            <div className="text-rose-600">일</div>
            <div className="text-slate-700">월</div>
            <div className="text-slate-700">화</div>
            <div className="text-slate-700">수</div>
            <div className="text-slate-700">목</div>
            <div className="text-slate-700">금</div>
            <div className="text-blue-600">토</div>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-xl border border-transparent min-h-[70px] sm:min-h-[82px] bg-slate-100/40"
                  />
                );
              }

              const isSelected = cell.dateStr === targetDateStr;
              const isToday = cell.dateStr === todayDateStr;
              const { dayLeaves, dayReliefs } = getDayOverridesInfo(cell.dateStr);
              const hasEvents = dayLeaves.length > 0 || dayReliefs.length > 0;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => {
                    setTargetDateStr(cell.dateStr);
                    setSelectedReliefSlot(null);
                  }}
                  className={`relative p-2 rounded-xl border text-left transition-all min-h-[70px] sm:min-h-[82px] flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/80 shadow-md ring-2 ring-brand-500/80 z-10'
                      : hasEvents
                      ? 'border-amber-300/90 bg-white hover:border-brand-400 hover:shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {/* Top row: day number & badges */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs ${
                        cell.dayOfWeek === 0
                          ? 'text-rose-600 font-black'
                          : cell.dayOfWeek === 6
                          ? 'text-blue-600 font-black'
                          : 'text-slate-800 font-bold'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <div className="flex items-center space-x-1">
                      {isToday && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-brand-600 text-white">
                          오늘
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-brand-200 text-brand-900">
                          선택
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle/Bottom: Leave and Relief summary */}
                  <div className="space-y-0.5 mt-1">
                    {dayLeaves.length > 0 && (
                      <div
                        className="text-[10px] font-extrabold text-rose-700 bg-rose-50/90 px-1.5 py-0.5 rounded border border-rose-200 truncate flex items-center space-x-1"
                        title={`휴가자: ${dayLeaves.join(', ')}`}
                      >
                        <span className="font-black shrink-0 text-rose-600">휴:</span>
                        <span className="truncate">{dayLeaves.join(', ')}</span>
                      </div>
                    )}
                    {dayReliefs.length > 0 && (
                      <div
                        className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200 truncate flex items-center space-x-1"
                        title={`대근자: ${dayReliefs.join(', ')}`}
                      >
                        <span className="font-black shrink-0 text-emerald-600">대:</span>
                        <span className="truncate">{dayReliefs.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Guide Caption */}
          <div className="text-center text-xs text-slate-500 font-semibold pt-1 flex items-center justify-center space-x-1.5">
            <span>💡</span>
            <span>날짜 셀을 클릭하면 해당 일자의 휴가자 등록 및 대근자 선택 상세 화면으로 전환됩니다.</span>
          </div>
        </div>

        {/* 1-2. Visual 9-Slot Selection Grid for Target Date */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">
                선택 일자: <strong className="text-brand-700 font-mono text-sm">{targetDateStr} ({dayOfWeekStr})</strong>
              </span>
              <span className="text-xs text-slate-500">
                — 휴가 신청자를 클릭하여 선택하세요 (당일 근무 요원 자동 강조):
              </span>
            </div>
            {requesterShift && (
              <span className="text-xs text-brand-700 font-bold bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                선택된 신청자: [{requesterShift.unit}호기] {getName(requesterSlot, requesterShift.memberName)} (원래 근무: [{requesterShift.shiftCode}])
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => {
              const shift = targetDay?.shifts.find((item) => item.slotNo === s);
              const name = shift ? getName(s, shift.memberName) : `Slot ${s}`;
              const code = shift?.shiftCode || 'X';
              const isSelected = requesterSlot === s;
              const is3U = s <= 4;
              const badgeStyle = getExcelBadgeStyle(code);
              const isWorking = code !== 'X' && code !== '연차';

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setRequesterSlot(s);
                    setSelectedReliefSlot(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/80 shadow-md ring-2 ring-brand-400'
                      : isWorking
                      ? 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
                      : 'border-slate-100 bg-slate-50/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold text-slate-400">S{s}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-black border ${
                        is3U ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {is3U ? '3호기' : '4호기'}
                    </span>
                  </div>

                  <div className="my-1.5 text-center">
                    <div className="font-extrabold text-xs text-slate-900 truncate">{name}</div>
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black border ${badgeStyle}`}>
                        {code}
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-[10px] font-semibold">
                    {isSelected ? (
                      <span className="text-brand-700 font-black">신청자 선택됨</span>
                    ) : isWorking ? (
                      <span className="text-slate-500">근무 예정</span>
                    ) : (
                      <span className="text-slate-400">비번/휴무</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leave Type and Reason Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">휴가 종류 선택</label>
            <div className="flex flex-wrap gap-1.5">
              {['연차', '반차', '병가', '경조사', '공가/교육'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    leaveType === type
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">신청 사유</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 개인 사유 연차, 집안 경조사, 정기 검진 등"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-brand-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* 3. Step 2: Recommended Relief Candidates (Top 3 & All Eligible) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">
              2
            </span>
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-slate-900 text-sm">
              최적 대근 후보자 자동 추천 (적합도 순위)
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
              적격 후보 {eligibleCandidates.length}명
            </span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
              부적격(역순환 등) {disqualifiedCandidates.length}명
            </span>
          </div>
        </div>

        {eligibleCandidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed space-y-2">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
            <p className="font-bold text-slate-800">
              당일 조건을 만족하는 적격 대근 후보자가 없습니다.
            </p>
            <p className="text-slate-500">
              모든 비번 요원이 당일 근무 중이거나 전일/익일 역순환(Quick Return)에 해당합니다. 날짜나 신청자를 변경해 주세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {eligibleCandidates.map((c, idx) => {
              const isSelected = selectedReliefSlot === c.slotNo;
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={c.slotNo}
                  onClick={() => setSelectedReliefSlot(c.slotNo)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 shadow-lg ring-2 ring-brand-400'
                      : isFirst
                      ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div>
                    {/* Header: Rank & Score */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isFirst
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isSecond
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : isThird
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isFirst ? '👑 1순위 (최우선)' : `${idx + 1}순위 추천`}
                      </span>
                      <span className="text-base font-black text-brand-700 font-mono">
                        {c.score}점
                      </span>
                    </div>

                    {/* Member Name & Slot */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Slot {c.slotNo} ({getName(c.slotNo, c.memberName)})
                      </h3>
                      <span className="text-xs text-slate-400 font-bold">
                        {c.slotNo <= 4 ? '3호기' : '4호기'}
                      </span>
                    </div>

                    {/* Notice for consecutive working days */}
                    {c.consecutiveDays > 3 ? (
                      <div className="mt-2 px-2 py-1 bg-amber-100/70 rounded-md border border-amber-200 text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>연속 {c.consecutiveDays}일 근무 발생 (대근 허용)</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">
                        투입 시 연속근무: <strong className="text-slate-800">{c.consecutiveDays}일</strong>
                      </div>
                    )}

                    {/* Breakdown Checklist */}
                    <div className="mt-3 space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                      <div className="flex items-center justify-between">
                        <span>Phase-11 NNN 직후 휴무</span>
                        <span className={`font-bold ${c.isPhase11 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {c.isPhase11 ? '+100점' : '0점'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>동일 호기 소속 보너스</span>
                        <span className={`font-bold ${c.sameUnit ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {c.sameUnit ? '+50점' : '0점'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>월간 근무일수 차감</span>
                        <span className="font-mono text-slate-500">
                          -{c.scoreBreakdown.shiftPenalty}점 ({c.monthlyShifts}일)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>누적 대근 횟수 차감</span>
                        <span className="font-mono text-slate-500">
                          -{c.scoreBreakdown.reliefPenalty}점 ({c.reliefCount}회)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Select Button */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isSelected ? '선택 완료됨' : '클릭하여 선택'}
                    </span>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{isSelected ? '선택됨' : '대근자 지정'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Confirmation Bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="text-xs">
            {selectedReliefSlot && requesterShift ? (
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <span className="text-rose-700">
                  신청자: [{requesterShift.unit}호기] {getName(requesterSlot, requesterShift.memberName)} ([{requesterShift.shiftCode}] 결원)
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-700">
                  대근자: [{selectedReliefSlot <= 4 ? '3' : '4'}호기] {getName(selectedReliefSlot, candidates.find((c) => c.slotNo === selectedReliefSlot)?.memberName || '')} (대체 투입)
                </span>
              </div>
            ) : (
              <span className="text-slate-500 font-semibold">
                대근을 수행할 요원을 상단 추천 목록에서 선택해 주세요.
              </span>
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedReliefSlot}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold disabled:opacity-40 disabled:pointer-events-none shadow-md flex items-center space-x-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>대근 확정 및 근무표 실시간 반영</span>
          </button>
        </div>
      </div>

      {/* 4. Disqualified Candidates Collapsible Section */}
      {disqualifiedCandidates.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <button
            type="button"
            onClick={() => setShowDisqualified((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-extrabold text-slate-800">
                제외된 부적격 요원 내역 ({disqualifiedCandidates.length}명)
              </h3>
              <span className="text-[11px] text-slate-400">
                (당일 이미 근무 중이거나 전/익일 역순환 발생으로 제외됨)
              </span>
            </div>
            <span className="text-xs text-brand-600 font-bold">
              {showDisqualified ? '접기 ▲' : '자세히 보기 ▼'}
            </span>
          </button>

          {showDisqualified && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
              {disqualifiedCandidates.map((d) => (
                <div key={d.slotNo} className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-lg text-xs">
                  <span className="font-bold text-slate-900 block">
                    Slot {d.slotNo} ({getName(d.slotNo, d.memberName)})
                  </span>
                  <span className="text-[11px] text-rose-700 block mt-0.5">
                    사유: {d.disqualificationReason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Active Leave/Relief Overrides List */}
      {activeOverridesList.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-extrabold text-slate-800">
                현재 반영된 휴가 및 대근 처리 내역 ({targetDateStr.slice(0, 7)}월)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              총 {activeOverridesList.length}건
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeOverridesList.map((item) => {
              const isLeave = item.shiftCode === '연차';
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-mono text-[11px] text-slate-500">{item.dateStr}</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      Slot {item.slotNo} ({getName(item.slotNo, item.memberName)})
                    </div>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          isLeave
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isLeave ? '휴가 (연차)' : `대근 투입 [${item.shiftCode}]`}
                      </span>
                    </div>
                  </div>

                  {onCancelOverride && (
                    <button
                      type="button"
                      onClick={() => onCancelOverride(item.key)}
                      className="px-2 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center space-x-1"
                      title="이 대근/휴가 기록을 원래 근무로 복구"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>원상복구</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
