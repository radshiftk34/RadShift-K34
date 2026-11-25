import React, { useState } from 'react';
import { DaySchedule, ShiftCode } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { ChevronLeft, ChevronRight, Edit3, RefreshCw, X } from 'lucide-react';

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
  const [editingCell, setEditingCell] = useState<{
    dateStr: string;
    slotNo: number;
    currentCode: ShiftCode;
    memberName: string;
  } | null>(null);

  const monthStr = String(selectedMonth).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;
  const monthDays = schedule.filter((d) => d.dateStr.startsWith(monthPrefix));

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

  const handleCellClick = (dateStr: string, slotNo: number, currentCode: ShiftCode, memberName: string) => {
    if (currentRole !== 'L3_ADMIN') return;
    setEditingCell({ dateStr, slotNo, currentCode, memberName });
  };

  const overrideCount = Object.keys(overrides).length;

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

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>D 주간</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>A 오후</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>N 야간</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>3D/4D 통상</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>3D*/4D* 대휴지원</span>
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
            </tr>
          </thead>

          {/* Body Rows: Slots 1 to 9 */}
          <tbody className="divide-y divide-slate-200 bg-white">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slotNo) => {
              const sampleCell = monthDays[0]?.shifts.find((s) => s.slotNo === slotNo);
              const displayName = sampleCell ? getName(slotNo, sampleCell.memberName) : `Slot ${slotNo}`;

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
                          )} ${isOverridden ? 'ring-2 ring-purple-500 font-extrabold' : ''}`}
                          title={`${d.dateStr} Slot ${slotNo} (${shift?.memberName}): ${activeCode}`}
                        >
                          {activeCode}
                        </span>
                      </td>
                    );
                  })}
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
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Palette Modal for L3 Admin */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">근무표 퀵 팔레트 수정</h4>
                <p className="text-xs text-slate-500">
                  {editingCell.dateStr} | Slot {editingCell.slotNo} ({editingCell.memberName})
                </p>
              </div>
              <button onClick={() => setEditingCell(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">변경할 근무 코드 선택:</span>
              <div className="grid grid-cols-4 gap-2">
                {(['D', 'A', 'N', 'X', '3D', '4D', '3N', '연차', '대근'] as ShiftCode[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      const key = `${editingCell.dateStr}_${editingCell.slotNo}`;
                      onApplyOverride(key, code);
                      setEditingCell(null);
                    }}
                    className={`py-2 rounded-lg font-black text-xs border transition-transform hover:scale-105 ${getShiftBadgeStyle(
                      code
                    )} ${editingCell.currentCode === code ? 'ring-2 ring-brand-600' : ''}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end space-x-2">
              <button
                onClick={() => setEditingCell(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
