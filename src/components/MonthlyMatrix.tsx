import React, { useState, useMemo } from 'react';
import { DaySchedule, ShiftCode } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { validateProposedCellChange, ValidationResult } from '../engine/constraintValidator';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface MonthlyMatrixProps {
  schedule: DaySchedule[];
  year: number;
  currentRole: UserRole;
  anonymize: boolean;
  overrides: Record<string, ShiftCode>;
  onApplyOverride: (key: string, newCode: ShiftCode, note?: string) => void;
  onResetOverrides: () => void;
}

export const MonthlyMatrix: React.FC<MonthlyMatrixProps> = ({
  schedule,
  year,
  currentRole,
  anonymize,
  overrides,
  onApplyOverride,
  onResetOverrides,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1 ~ 12
  const [unitFilter, setUnitFilter] = useState<'ALL' | '3U' | '4U' | 'FLOAT'>('ALL');

  // Editing state for Admin Palette Modal
  const [editingCell, setEditingCell] = useState<{
    dateStr: string;
    slotNo: number;
    currentCode: ShiftCode;
    tentativeCode: ShiftCode;
    memberName: string;
    note: string;
  } | null>(null);

  const monthStr = String(selectedMonth).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;
  const monthDays = useMemo(
    () => schedule.filter((d) => d.dateStr.startsWith(monthPrefix)),
    [schedule, monthPrefix]
  );

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const getShiftBadgeStyle = (code: string) => {
    switch (code) {
      case 'D':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'A':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'N':
      case '3N':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case '3D':
      case '4D':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '3D*':
      case '4D*':
      case '일근':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'X':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case '연차':
      case '대근':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleCellClick = (
    dateStr: string,
    slotNo: number,
    currentCode: ShiftCode,
    memberName: string
  ) => {
    if (currentRole !== 'L3_ADMIN') return;
    setEditingCell({
      dateStr,
      slotNo,
      currentCode,
      tentativeCode: currentCode,
      memberName,
      note: '관리자 수동 조정',
    });
  };

  // Evaluate real-time constraints on tentative change
  const validation: ValidationResult = useMemo(() => {
    if (!editingCell) return { isValid: true, hardViolations: [], softWarnings: [] };
    return validateProposedCellChange(
      schedule,
      editingCell.dateStr,
      editingCell.slotNo,
      editingCell.tentativeCode,
      overrides
    );
  }, [schedule, editingCell, overrides]);

  const handleCommitEdit = () => {
    if (!editingCell) return;
    if (!validation.isValid) {
      alert('Hard 제약조건(역순환, 일일 커버리지 부족)을 위반하여 저장할 수 없습니다.');
      return;
    }
    const key = `${editingCell.dateStr}_${editingCell.slotNo}`;
    onApplyOverride(key, editingCell.tentativeCode, editingCell.note);
    setEditingCell(null);
  };

  const overrideCount = Object.keys(overrides).length;

  // Filter slots
  const displayedSlots = useMemo(() => {
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    if (unitFilter === 'ALL') return all;
    if (unitFilter === '3U') return [3, 4, 5, 6];
    if (unitFilter === '4U') return [1, 2, 7, 8];
    if (unitFilter === 'FLOAT') return [9];
    return all;
  }, [unitFilter]);

  return (
    <div className="space-y-4">
      {/* Month Navigation & Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedMonth((m) => Math.max(1, m - 1))}
            disabled={selectedMonth === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-extrabold text-slate-900 text-base min-w-[120px] text-center">
            {year}년 {selectedMonth}월
          </span>
          <button
            onClick={() => setSelectedMonth((m) => Math.min(12, m + 1))}
            disabled={selectedMonth === 12}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Unit Filter */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setUnitFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg ${unitFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
          >
            전체(9명)
          </button>
          <button
            onClick={() => setUnitFilter('3U')}
            className={`px-2.5 py-1 rounded-lg ${unitFilter === '3U' ? 'bg-white text-blue-800 shadow-sm' : ''}`}
          >
            3호기
          </button>
          <button
            onClick={() => setUnitFilter('4U')}
            className={`px-2.5 py-1 rounded-lg ${unitFilter === '4U' ? 'bg-white text-emerald-800 shadow-sm' : ''}`}
          >
            4호기
          </button>
          <button
            onClick={() => setUnitFilter('FLOAT')}
            className={`px-2.5 py-1 rounded-lg ${unitFilter === 'FLOAT' ? 'bg-white text-purple-800 shadow-sm' : ''}`}
          >
            통상Day
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200">
            <span>D 주간</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
            <span>A 오후</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
            <span>N 야간</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
            <span>3D/4D 통상</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
            <span>X 휴무</span>
          </span>
        </div>

        {/* Override Status / Reset */}
        <div className="flex items-center space-x-2">
          {overrideCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                수동 수정 {overrideCount}건
              </span>
              {currentRole === 'L3_ADMIN' && (
                <button
                  onClick={onResetOverrides}
                  className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 p-1 rounded"
                  title="모든 수동 오버라이드 초기화"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>초기화</span>
                </button>
              )}
            </div>
          )}
          {currentRole === 'L3_ADMIN' && (
            <span className="inline-flex items-center space-x-1 text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              <Edit3 className="w-3.5 h-3.5" />
              <span>관리자 2-Layer 편집 가능</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          {/* Header Row: Days of Month */}
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 px-3 py-3 text-left font-bold text-slate-700 w-28 border-r border-slate-200 shadow-sm">
                성명 (슬롯)
              </th>
              {monthDays.map((d) => {
                const dayNum = d.dateStr.slice(8);
                const isSun = d.dayOfWeek === 0;
                const isSat = d.dayOfWeek === 6;
                const isHol = d.isHoliday;

                return (
                  <th
                    key={d.dateStr}
                    className={`px-1.5 py-2 text-center font-bold min-w-[34px] border-r border-slate-200 ${
                      isHol || isSun ? 'bg-red-50/70 text-red-600' : isSat ? 'bg-blue-50/70 text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    <div>{dayNum}</div>
                    <div className="text-[10px] font-medium text-slate-400">
                      {['일', '월', '화', '수', '목', '금', '토'][d.dayOfWeek]}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center font-bold bg-slate-100 text-slate-700">
                월간 합계 (D/A/N)
              </th>
            </tr>
          </thead>

          {/* Body Rows: Slots 1 to 9 */}
          <tbody className="divide-y divide-slate-200 bg-white">
            {displayedSlots.map((slotNo) => {
              const sampleCell = monthDays[0]?.shifts.find((s) => s.slotNo === slotNo);
              const displayName = sampleCell ? getName(slotNo, sampleCell.memberName) : `Slot ${slotNo}`;

              // Calculate monthly stats for this slot
              let dCount = 0, aCount = 0, nCount = 0;
              for (const day of monthDays) {
                const s = day.shifts.find((shift) => shift.slotNo === slotNo);
                const cellKey = `${day.dateStr}_${slotNo}`;
                const code = overrides[cellKey] || s?.shiftCode || 'X';
                if (['D', '3D', '4D', '3D*', '4D*', '일근'].includes(code)) dCount++;
                else if (code === 'A') aCount++;
                else if (['N', '3N'].includes(code)) nCount++;
              }

              return (
                <tr key={slotNo} className="hover:bg-slate-50/80 transition-colors">
                  {/* Sticky Member Column */}
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-bold text-slate-900 border-r border-slate-200 shadow-sm whitespace-nowrap">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{displayName}</span>
                      <span className="text-[10px] font-semibold text-slate-400 ml-1">S{slotNo}</span>
                    </div>
                  </td>

                  {/* Day Cells */}
                  {monthDays.map((d) => {
                    const shift = d.shifts.find((s) => s.slotNo === slotNo);
                    const cellKey = `${d.dateStr}_${slotNo}`;
                    const activeCode = overrides[cellKey] || shift?.shiftCode || 'X';
                    const isOverridden = Boolean(overrides[cellKey]);

                    return (
                      <td
                        key={d.dateStr}
                        onClick={() => handleCellClick(d.dateStr, slotNo, activeCode, shift?.memberName || '')}
                        className={`p-1 text-center border-r border-slate-100 ${
                          currentRole === 'L3_ADMIN' ? 'cursor-pointer hover:bg-brand-50/50' : ''
                        }`}
                      >
                        <span
                          className={`inline-block w-7 h-7 leading-7 rounded-md font-black text-[11px] border text-center transition-transform hover:scale-105 ${getShiftBadgeStyle(
                            activeCode
                          )} ${isOverridden ? 'ring-2 ring-purple-500 font-extrabold shadow-sm' : ''}`}
                          title={`${d.dateStr} Slot ${slotNo} (${shift?.memberName}): ${activeCode}${isOverridden ? ' (수동 수정됨)' : ''}`}
                        >
                          {activeCode}
                        </span>
                      </td>
                    );
                  })}

                  {/* Monthly Summary */}
                  <td className="px-3 py-2 text-center font-mono text-[11px] font-bold text-slate-700 bg-slate-50/50 whitespace-nowrap">
                    <span className="text-sky-700">{dCount}D</span> / <span className="text-amber-700">{aCount}A</span> / <span className="text-purple-700">{nCount}N</span> ({dCount + aCount + nCount}일)
                  </td>
                </tr>
              );
            })}

            {/* Optional Support Worker Row (2027 mode) */}
            {year === 2027 && (
              <tr className="bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors border-t-2 border-emerald-200">
                <td className="sticky left-0 z-10 bg-emerald-50 px-3 py-2 font-extrabold text-emerald-900 border-r border-emerald-200 shadow-sm">
                  방안부지원
                </td>
                {monthDays.map((d) => {
                  const s = d.supportShift;
                  const code = s?.shiftCode || 'X';
                  return (
                    <td key={d.dateStr} className="p-1 text-center border-r border-slate-100">
                      <span
                        className={`inline-block w-7 h-7 leading-7 rounded-md font-black text-[11px] border text-center ${getShiftBadgeStyle(
                          code
                        )}`}
                        title={s?.badge || '지원'}
                      >
                        {code}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50/50">
                  평일 일근 지원
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Enhanced Quick Palette Modal with Real-time Constraint Guardrails */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  근무표 2-Layer 팔레트 수정
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingCell.dateStr} | Slot {editingCell.slotNo} ({getName(editingCell.slotNo, editingCell.memberName)})
                </p>
              </div>
              <button onClick={() => setEditingCell(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Selector */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">변경할 근무 코드 선택:</span>
              <div className="grid grid-cols-4 gap-2">
                {(['D', 'A', 'N', 'X', '3D', '4D', '3N', '연차', '대근'] as ShiftCode[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => setEditingCell((prev) => (prev ? { ...prev, tentativeCode: code } : null))}
                    className={`py-2 rounded-lg font-black text-xs border transition-all ${getShiftBadgeStyle(
                      code
                    )} ${editingCell.tentativeCode === code ? 'ring-2 ring-purple-600 scale-105 shadow-sm' : ''}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Constraint Violations Alert */}
            {!validation.isValid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Hard 제약조건 위반 (반영 원천 차단):
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {validation.hardViolations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.isValid && validation.softWarnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Soft 제약조건 경고:
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {validation.softWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.isValid && validation.softWarnings.length === 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                모든 규칙 준수 (커버리지 오류 0건, 역순환 0건)
              </div>
            )}

            {/* Audit Note */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">수정 사유 (감사 로그 기록):</label>
              <input
                type="text"
                value={editingCell.note}
                onChange={(e) =>
                  setEditingCell((prev) => (prev ? { ...prev, note: e.target.value } : null))
                }
                placeholder="예: 긴급 병가로 인한 대근 스왑"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="pt-2 border-t flex justify-end space-x-2">
              <button
                onClick={() => setEditingCell(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCommitEdit}
                disabled={!validation.isValid}
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              >
                근무표 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
