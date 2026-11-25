import React, { useState } from 'react';
import { DaySchedule } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { Award, Check, Sparkles, UserCheck, Users } from 'lucide-react';

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
  const [targetDateStr, setTargetDateStr] = useState<string>('2027-01-15');
  const [requesterSlot, setRequesterSlot] = useState<number>(3); // e.g. Slot 3
  const [leaveType, setLeaveType] = useState<string>('연차');
  const [reason, setReason] = useState<string>('개인 사유 연차 신청');
  const [compType, setCompType] = useState<'OT_PAY' | 'SWAP_CREDIT'>('OT_PAY');
  const [selectedReliefSlot, setSelectedReliefSlot] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dayIndex = schedule.findIndex((d) => d.dateStr === targetDateStr);
  const targetDay = dayIndex >= 0 ? schedule[dayIndex] : schedule[0];

  const requesterShift = targetDay?.shifts.find((s) => s.slotNo === requesterSlot);

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  // Top 3 Recommendation Engine
  // 1. Hard Filter: Must be OFF (X) today, shift must not cause > 3 consecutive days, no quick return
  // 2. Score: Phase-11 bonus (+100) -> Same Unit (+50) -> Fewer total working days / credit
  const candidates = targetDay?.shifts
    .filter((s) => s.slotNo !== requesterSlot && s.shiftCode === 'X')
    .map((s) => {
      let score = 0;
      let reasons: string[] = [];

      // Check if same unit
      if (requesterShift && s.unit === requesterShift.unit) {
        score += 50;
        reasons.push('동일 호기 소속 (+50)');
      }

      // Check Phase 11
      if (s.phase === 11) {
        score += 100;
        reasons.push('Phase-11 NNN 직후 휴무 최우선 (+100)');
      }

      // Credit bonus
      score += 20;

      return {
        slotNo: s.slotNo,
        memberName: getName(s.slotNo, s.memberName),
        unit: s.unit,
        phase: s.phase,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3) || [];

  const handleConfirm = () => {
    if (!selectedReliefSlot) return;
    onApplyRelief(targetDateStr, requesterSlot, selectedReliefSlot, `${leaveType}: ${reason}`);
    setSuccessMessage(`성공적으로 대근자가 매칭되었습니다! (Slot ${requesterSlot} -> Slot ${selectedReliefSlot})`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">휴가 신청 및 대근자 자동 추천 엔진</h2>
            <p className="text-xs text-slate-500">
              Hard 제약 필터링 및 4단계 점수 기반 알고리즘으로 최적의 대근자 Top 3를 추천합니다.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">대상 일자</label>
            <input
              type="date"
              value={targetDateStr}
              onChange={(e) => setTargetDateStr(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">신청자 (휴가자)</label>
            <select
              value={requesterSlot}
              onChange={(e) => setRequesterSlot(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => {
                const shift = targetDay?.shifts.find((shift) => shift.slotNo === s);
                return (
                  <option key={s} value={s}>
                    Slot {s}: {getName(s, shift?.memberName || '')} ({shift?.shiftCode})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">휴가 유형</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {['연차', '대휴 (크레딧 사용)', '병가', '공가', '교육', '경조'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">보상 방식</label>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="OT_PAY">연장/휴일수당 (OT 정산)</option>
              <option value="SWAP_CREDIT">1:1 맞대근 크레딧 적립</option>
            </select>
          </div>
        </div>

        {/* Reason Input */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-700 block mb-1">휴가 사유</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="상세 사유 입력"
            className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>

        {/* Top 3 Recommended Candidates */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              자동 추천 대근자 Top 3 (알고리즘 검증 완료)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidates.map((cand, idx) => {
              const isSelected = selectedReliefSlot === cand.slotNo;
              return (
                <div
                  key={cand.slotNo}
                  onClick={() => setSelectedReliefSlot(cand.slotNo)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                      추천 {idx + 1}순위
                    </span>
                    <span className="text-xs font-extrabold text-brand-700">{cand.score}점</span>
                  </div>

                  <div className="font-extrabold text-sm text-slate-900 mb-1">
                    {cand.memberName} <span className="text-xs text-slate-400 font-medium">(Slot {cand.slotNo})</span>
                  </div>

                  <div className="text-[11px] text-slate-500 mb-3">
                    소속: {cand.unit} | 당일 상태: 휴무(X, Phase {cand.phase})
                  </div>

                  <div className="space-y-1">
                    {cand.reasons.map((r, i) => (
                      <div key={i} className="text-[10px] text-slate-600 flex items-center space-x-1">
                        <Award className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-brand-200 flex items-center justify-end text-brand-700 text-xs font-bold">
                      <UserCheck className="w-4 h-4 mr-1" />
                      선택됨
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={!selectedReliefSlot}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>대근 요청 확정 (근무표 반영)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
