import React, { useState, useMemo, useEffect } from 'react';
import { DaySchedule } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { calculateReliefCandidates, ReliefCandidate } from '../engine/reliefEngine';
import { Check, Sparkles, Users, AlertCircle, ShieldAlert } from 'lucide-react';

interface LeaveReliefModalProps {
  schedule: DaySchedule[];
  anonymize: boolean;
  currentRole: UserRole;
  onApplyRelief: (targetDate: string, requesterSlot: number, reliefSlot: number, reason: string) => void;
}

export const LeaveReliefModal: React.FC<LeaveReliefModalProps> = ({
  schedule,
  anonymize,
  currentRole: _currentRole,
  onApplyRelief,
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
  const [requesterSlot, setRequesterSlot] = useState<number>(3); // e.g. Slot 3 박경욱
  const [leaveType, setLeaveType] = useState<string>('연차');
  const [reason, setReason] = useState<string>('개인 사유 연차 신청');
  const [selectedReliefSlot, setSelectedReliefSlot] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const targetDay = useMemo(
    () => schedule.find((d) => d.dateStr === targetDateStr) || schedule[0],
    [schedule, targetDateStr]
  );

  const requesterShift = targetDay?.shifts.find((s) => s.slotNo === requesterSlot);

  // Exact Top 3 Recommendation using ReliefEngine
  const candidates: ReliefCandidate[] = useMemo(() => {
    return calculateReliefCandidates(schedule, targetDateStr, requesterSlot);
  }, [schedule, targetDateStr, requesterSlot]);

  const eligibleCandidates = candidates.filter((c) => c.isEligible);
  const top3 = eligibleCandidates.slice(0, 3);
  const disqualified = candidates.filter((c) => !c.isEligible);

  const handleConfirm = () => {
    if (!selectedReliefSlot) return;
    onApplyRelief(targetDateStr, requesterSlot, selectedReliefSlot, `${leaveType}: ${reason}`);
    const selectedCandidate = candidates.find((c) => c.slotNo === selectedReliefSlot);
    setSuccessMessage(
      `성공적으로 대근자가 매칭 및 승인되었습니다! (${getName(requesterSlot, requesterShift?.memberName || '')} -> ${getName(
        selectedReliefSlot,
        selectedCandidate?.memberName || ''
      )})`
    );
    setSelectedReliefSlot(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              휴가 신청 및 최적 대근자 자동 추천 엔진
              <span className="px-2 py-0.5 text-xs font-bold bg-brand-100 text-brand-800 rounded-full">
                Section 5.3 알고리즘 적용
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Hard 제약조건(역순환 방지, 연속근무 3일 이하, 당일 휴무자) 필터링 및 4단계 적합도 공식에 따라 Top 3를 자동 산출합니다.
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="font-bold text-slate-700 block">수학적 적합도 공식:</span>
          <code className="text-[11px] text-purple-700 font-mono">
            Score = 100×Phase11 + 50×SameUnit - 10×Shifts - 20×Relief - 5×Credit
          </code>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form: Vacation Request Inputs */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b">1. 휴가 신청 정보 입력</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">휴가 대상 일자</label>
            <input
              type="date"
              value={targetDateStr}
              onChange={(e) => setTargetDateStr(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">휴가 신청자 (슬롯)</label>
            <select
              value={requesterSlot}
              onChange={(e) => setRequesterSlot(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-xs focus:ring-1 focus:ring-brand-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => {
                const shift = targetDay?.shifts.find((item) => item.slotNo === s);
                const name = shift ? getName(s, shift.memberName) : `Slot ${s}`;
                const code = shift?.shiftCode || 'X';
                return (
                  <option key={s} value={s}>
                    Slot {s} ({name}) - 당일 [{code}]
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">휴가 종류</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-xs"
            >
              <option value="연차">연차 유급휴가</option>
              <option value="병가">병가</option>
              <option value="경조사">경조사 특별휴가</option>
              <option value="공가">공가/교육</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">신청 사유</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유 입력"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>
        </div>

        {requesterShift && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <div>
              신청자 원래 근무: <span className="font-black text-brand-700">[{requesterShift.shiftCode}]</span> | 소속 호기: <span className="font-bold">{requesterShift.unit}</span> | 위상: Phase {requesterShift.phase}
            </div>
            {requesterShift.shiftCode === 'X' && (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 신청자가 당일 이미 휴무(X)입니다.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top 3 Recommendation Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              2. 추천 대근자 Top 3 (적합도 점수순)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            적격 후보자 {eligibleCandidates.length}명 / 부적격 {disqualified.length}명
          </span>
        </div>

        {top3.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            당일 조건을 만족하는 적격 대근 후보자가 없습니다. (전원 연속근무 초과 또는 역순환 제한)
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((c, idx) => {
              const isSelected = selectedReliefSlot === c.slotNo;
              const isFirst = idx === 0;

              return (
                <div
                  key={c.slotNo}
                  onClick={() => setSelectedReliefSlot(c.slotNo)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/50 shadow-md ring-2 ring-brand-300'
                      : isFirst
                      ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isFirst ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {idx + 1}순위 추천
                      </span>
                      <span className="text-base font-black text-brand-700 font-mono">
                        {c.score}점
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900">
                      Slot {c.slotNo} ({getName(c.slotNo, c.memberName)})
                    </h4>

                    {/* Breakdown Checklist */}
                    <div className="mt-3 space-y-1 text-[11px] text-slate-600">
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

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isSelected ? '선택됨' : '클릭하여 선택'}
                    </span>
                    <button
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isSelected ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      {isSelected ? '선택 완료' : '선택'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedReliefSlot ? (
              <span className="font-bold text-brand-700">
                선택된 대근자: Slot {selectedReliefSlot} ({getName(selectedReliefSlot, candidates.find((c) => c.slotNo === selectedReliefSlot)?.memberName || '')})
              </span>
            ) : (
              '대근자를 선택해 주세요.'
            )}
          </div>
          <button
            onClick={handleConfirm}
            disabled={!selectedReliefSlot}
            className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> 대근 확정 및 근무표 반영
          </button>
        </div>
      </div>

      {/* Disqualified Candidates Inspection (Section 5.1 Hard Constraint Filter) */}
      {disqualified.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h4 className="text-xs font-extrabold text-slate-700 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            제외된 부적격 후보자 내역 (Hard Constraint 차단)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {disqualified.map((d) => (
              <div key={d.slotNo} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-xs">
                <span className="font-bold text-slate-900 block">
                  Slot {d.slotNo} ({getName(d.slotNo, d.memberName)})
                </span>
                <span className="text-[11px] text-rose-700 block mt-0.5">
                  사유: {d.disqualificationReason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
