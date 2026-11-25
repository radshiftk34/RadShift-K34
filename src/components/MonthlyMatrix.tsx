import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DaySchedule, ShiftCode } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import { validateProposedCellChange, ValidationResult } from '../engine/constraintValidator';
import {
  master2027Data,
  getAnonymizedName,
  getExcelBadgeStyle,
} from '../data/master2027Data';
import { master2026Data } from '../data/master2026Data';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';

interface MonthlyMatrixProps {
  schedule: DaySchedule[];
  year: number;
  currentRole: UserRole;
  anonymize: boolean;
  overrides: Record<string, ShiftCode>;
  onApplyOverride: (key: string, newCode: ShiftCode, note?: string) => void;
  onResetOverrides: () => void;
  onYearChange?: (year: number) => void;
  onOpenAnnualView?: () => void;
}

export const MonthlyMatrix: React.FC<MonthlyMatrixProps> = ({
  schedule,
  year,
  currentRole,
  anonymize,
  overrides,
  onApplyOverride,
  onResetOverrides,
  onYearChange,
  onOpenAnnualView,
}) => {
  // Current real-world date for "Today" highlighting
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayDateStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  // Default to today's month if viewing that year, otherwise month 1
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (year === todayYear) return todayMonth;
    return 1;
  });

  // When year changes, auto-switch to today's month if viewing current year
  useEffect(() => {
    if (year === todayYear) {
      setSelectedMonth(todayMonth);
    }
  }, [year, todayYear, todayMonth]);

  // Ref to today's column header to auto-scroll into center view on load
  const todayHeaderRef = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (year === todayYear && selectedMonth === todayMonth && todayHeaderRef.current) {
      // Delay slightly for table DOM render completion
      const timer = setTimeout(() => {
        todayHeaderRef.current?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedMonth, year, todayYear, todayMonth]);

  const [unitFilter, setUnitFilter] = useState<'ALL' | '3U' | '4U' | 'SUPPORT'>('ALL');

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

  // Master Month Data (from the uploaded official Excel files for 2026 or 2027)
  const masterMonth = useMemo(() => {
    if (year === 2026) {
      return master2026Data.months.find((m) => m.month === selectedMonth) || null;
    }
    if (year === 2027) {
      return master2027Data.months.find((m) => m.month === selectedMonth) || null;
    }
    return null;
  }, [year, selectedMonth]);

  // Jump to Today handler
  const handleJumpToToday = () => {
    if (onYearChange && year !== todayYear) {
      onYearChange(todayYear);
    }
    setSelectedMonth(todayMonth);
  };

  const isCurrentMonthToday = year === todayYear && selectedMonth === todayMonth;

  // Real-time Constraint Validator for Admin Edit
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

  /**
   * Dynamic Member Rows for the Month
   * Groups members by Unit (3호기, 4호기, 방안부지원)
   */
  interface DisplayRow {
    id: string;
    unit: '3호기' | '4호기' | '지원';
    unitLabel: string;
    name: string;
    slotNo?: number;
    shifts: { dateStr: string; code: string; isOverridden: boolean; slotNo?: number }[];
    dCount: number;
    aCount: number;
    nCount: number;
    totalWork: number;
  }

  const dynamicRows: DisplayRow[] = useMemo(() => {
    if ((year === 2026 || year === 2027) && masterMonth) {
      // 2026 / 2027: Use official 84-day circular queue rows from Excel
      return masterMonth.members.map((mem, memIdx) => {
        const u = mem.unit === '3' ? '3호기' : mem.unit === '4' ? '4호기' : '지원';
        const shifts = mem.shifts.map((baseCode, dIdx) => {
          const dayNum = masterMonth.days[dIdx];
          const dateStr = `${year}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
          // Check if there is an override for this date and member
          const daySchedule = monthDays.find((d) => d.dateStr === dateStr);
          const shiftItem = daySchedule?.shifts.find((s) => s.memberName === mem.name);
          const cellKey = shiftItem ? `${dateStr}_${shiftItem.slotNo}` : '';
          const activeCode = (cellKey && overrides[cellKey]) ? overrides[cellKey] : baseCode;
          const isOverridden = Boolean(cellKey && overrides[cellKey]);

          return {
            dateStr,
            code: activeCode,
            isOverridden,
            slotNo: shiftItem?.slotNo,
          };
        });

        let dCount = 0, aCount = 0, nCount = 0;
        for (const s of shifts) {
          if (['D', '3D', '4D', '3D*', '4D*', '일근'].includes(s.code)) dCount++;
          else if (s.code === 'A') aCount++;
          else if (['N', '3N'].includes(s.code)) nCount++;
        }

        return {
          id: `${mem.name}_${u}_${memIdx}`,
          unit: u,
          unitLabel: u,
          name: mem.name,
          shifts,
          dCount,
          aCount,
          nCount,
          totalWork: dCount + aCount + nCount,
        };
      });
    }

    // 2026: 9-person standard structure grouped by unit
    const rows: DisplayRow[] = [];
    const members2026 = [
      { slotNo: 3, name: '박경욱', unit: '3호기' as const },
      { slotNo: 4, name: '임원택', unit: '3호기' as const },
      { slotNo: 5, name: '나상흠', unit: '3호기' as const },
      { slotNo: 6, name: '권재호', unit: '3호기' as const },
      { slotNo: 7, name: '이근현', unit: '4호기' as const },
      { slotNo: 8, name: '신욱제', unit: '4호기' as const },
      { slotNo: 1, name: '최창호', unit: '4호기' as const },
      { slotNo: 2, name: '손정기', unit: '4호기' as const },
      { slotNo: 9, name: '송명관', unit: '지원' as const, label: '통상' },
    ];

    for (const m of members2026) {
      const shifts = monthDays.map((d) => {
        const s = d.shifts.find((shift) => shift.slotNo === m.slotNo);
        const cellKey = `${d.dateStr}_${m.slotNo}`;
        const activeCode = overrides[cellKey] || s?.shiftCode || 'X';
        const isOverridden = Boolean(overrides[cellKey]);
        return {
          dateStr: d.dateStr,
          code: activeCode,
          isOverridden,
          slotNo: m.slotNo,
        };
      });

      let dCount = 0, aCount = 0, nCount = 0;
      for (const s of shifts) {
        if (['D', '3D', '4D', '3D*', '4D*', '일근'].includes(s.code)) dCount++;
        else if (s.code === 'A') aCount++;
        else if (['N', '3N'].includes(s.code)) nCount++;
      }

      rows.push({
        id: `slot_${m.slotNo}`,
        unit: m.unit,
        unitLabel: m.label || m.unit,
        name: m.name,
        slotNo: m.slotNo,
        shifts,
        dCount,
        aCount,
        nCount,
        totalWork: dCount + aCount + nCount,
      });
    }

    return rows;
  }, [year, masterMonth, monthDays, overrides, monthStr]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (unitFilter === 'ALL') return dynamicRows;
    if (unitFilter === '3U') return dynamicRows.filter((r) => r.unit === '3호기');
    if (unitFilter === '4U') return dynamicRows.filter((r) => r.unit === '4호기');
    if (unitFilter === 'SUPPORT') {
      return dynamicRows.filter(
        (r) =>
          r.unit === '지원' ||
          r.name.includes('지원') ||
          r.shifts.some((s) => s.code.includes('3D') || s.code.includes('4D'))
      );
    }
    return dynamicRows;
  }, [dynamicRows, unitFilter]);

  return (
    <div className="space-y-4">
      {/* 1. Month Navigation & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Month Nav & Jump to Today */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedMonth((m) => Math.max(1, m - 1))}
            disabled={selectedMonth === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>

          <span className="font-extrabold text-slate-900 text-lg min-w-[130px] text-center tracking-tight">
            {year}년 {selectedMonth}월
          </span>

          <button
            onClick={() => setSelectedMonth((m) => Math.min(12, m + 1))}
            disabled={selectedMonth === 12}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          {/* Jump to Today Button */}
          <button
            onClick={handleJumpToToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isCurrentMonthToday
                ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-400'
                : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200'
            }`}
            title="현재 오늘 날짜로 이동"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>오늘 ({todayMonth}월 {todayDay}일)</span>
            {isCurrentMonthToday && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            )}
          </button>
        </div>

        {/* Middle: Unit Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setUnitFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              unitFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            전체 표시
          </button>
          <button
            onClick={() => setUnitFilter('3U')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              unitFilter === '3U' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'hover:text-blue-700'
            }`}
          >
            3호기
          </button>
          <button
            onClick={() => setUnitFilter('4U')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              unitFilter === '4U' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'hover:text-emerald-700'
            }`}
          >
            4호기
          </button>
          <button
            onClick={() => setUnitFilter('SUPPORT')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              unitFilter === 'SUPPORT' ? 'bg-purple-600 text-white shadow-sm font-bold' : 'hover:text-purple-700'
            }`}
          >
            {year === 2027 ? '지원조' : '통상Day'}
          </button>
        </div>

        {/* Right: Legend & Actions */}
        <div className="flex items-center space-x-2">
          {onOpenAnnualView && (
            <button
              onClick={onOpenAnnualView}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>연간 엑셀 양식</span>
            </button>
          )}

          {overrideCount > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                수동 {overrideCount}건
              </span>
              {currentRole === 'L3_ADMIN' && (
                <button
                  onClick={onResetOverrides}
                  className="p-1 text-slate-400 hover:text-red-600"
                  title="초기화"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {currentRole === 'L3_ADMIN' && (
            <span className="hidden sm:inline-flex items-center space-x-1 text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
              <Edit3 className="w-3.5 h-3.5" />
              <span>2-Layer 편집</span>
            </span>
          )}
        </div>
      </div>

      {/* Color Legend Bar */}
      <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-bold mr-1 flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
          근무 범례:
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fde2cb] text-[#8a3800] border-[#f9cb9c]">
          [주황 3D/4D] 통상Day
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border-[#fde68a]">
          [노랑 3D*/4D*] 평일스왑
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]">
          [민트 일근] 방안부일근
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]">
          [파랑 D] 주간/휴일
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fef9c3] text-[#854d0e] border-[#fef08a]">
          [황갈색 A] 오후
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]">
          [보라 N/3N] 야간
        </span>
        <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-slate-100 text-slate-500 border-slate-300">
          [연두 X] 대체휴무
        </span>
      </div>

      {/* 2. Dynamic Monthly Schedule Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs divide-y divide-slate-200 border-collapse">
            <thead>
              {/* Row 1: Day numbers */}
              <tr className="bg-[#ccfbf1]/50 text-slate-800">
                <th className="sticky left-0 z-20 bg-[#ccfbf1] px-3 py-2 text-left font-bold w-36 border-r border-slate-300 shadow-xs">
                  호기 / 성명
                </th>
                {monthDays.map((d) => {
                  const dayNum = parseInt(d.dateStr.slice(8), 10);
                  const isToday = d.dateStr === todayDateStr;
                  const isSun = d.dayOfWeek === 0;
                  const isSat = d.dayOfWeek === 6;
                  const isHol = d.isHoliday;

                  return (
                    <th
                      key={d.dateStr}
                      ref={isToday ? todayHeaderRef : undefined}
                      className={`px-1 py-1.5 text-center min-w-[32px] border-r border-slate-200 transition-all ${
                        isToday
                          ? 'bg-brand-500 text-white font-black ring-2 ring-brand-400 z-10 shadow-md'
                          : isHol || isSun
                          ? 'bg-red-100/70 text-red-700 font-extrabold'
                          : isSat
                          ? 'bg-blue-100/70 text-blue-700 font-extrabold'
                          : 'text-slate-800 font-bold'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        {isToday && (
                          <span className="text-[9px] font-black bg-white text-brand-700 px-1 rounded-sm leading-tight mb-0.5 shadow-xs">
                            오늘
                          </span>
                        )}
                        <span>{dayNum}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-center font-bold bg-[#ccfbf1] text-slate-800 border-l border-slate-300 min-w-[130px]">
                  월 합계 (D/A/N)
                </th>
              </tr>

              {/* Row 2: Days of Week */}
              <tr className="bg-[#ccfbf1]/30 text-slate-700 border-b border-slate-300">
                <th className="sticky left-0 z-20 bg-[#ccfbf1]/40 px-3 py-1 text-left font-semibold text-[11px] border-r border-slate-300 shadow-xs">
                  84일 주기 구분
                </th>
                {monthDays.map((d) => {
                  const isToday = d.dateStr === todayDateStr;
                  const isSun = d.dayOfWeek === 0;
                  const isSat = d.dayOfWeek === 6;
                  const isHol = d.isHoliday;
                  const dowText = ['일', '월', '화', '수', '목', '금', '토'][d.dayOfWeek];

                  return (
                    <th
                      key={`dow_${d.dateStr}`}
                      className={`px-1 py-1 text-center font-bold text-[10px] border-r border-slate-200 ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : isHol || isSun
                          ? 'text-red-600 bg-red-50'
                          : isSat
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-600'
                      }`}
                    >
                      {dowText}
                    </th>
                  );
                })}
                <th className="px-3 py-1 text-center font-semibold text-[10px] bg-[#ccfbf1]/40 text-slate-600 border-l border-slate-300">
                  총 근무일
                </th>
              </tr>
            </thead>

            {/* Body: Dynamic Rows with Unit Badges */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.map((row) => {
                const displayName = getAnonymizedName(row.name, anonymize);
                const unitBadgeStyle =
                  row.unit === '3호기'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : row.unit === '4호기'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-purple-100 text-purple-800 border-purple-300';

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {/* Sticky Unit & Name Column */}
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-bold text-slate-900 border-r border-slate-200 shadow-xs whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${unitBadgeStyle}`}
                        >
                          {row.unitLabel}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                          {displayName}
                        </span>
                        {row.slotNo && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            S{row.slotNo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Daily Shift Cells */}
                    {row.shifts.map((s) => {
                      const isToday = s.dateStr === todayDateStr;
                      const badgeStyle = getExcelBadgeStyle(s.code);
                      const canEdit = currentRole === 'L3_ADMIN' && s.slotNo;

                      return (
                        <td
                          key={s.dateStr}
                          onClick={() => {
                            if (canEdit) {
                              setEditingCell({
                                dateStr: s.dateStr,
                                slotNo: s.slotNo!,
                                currentCode: s.code as ShiftCode,
                                tentativeCode: s.code as ShiftCode,
                                memberName: row.name,
                                note: '관리자 수동 조정',
                              });
                            }
                          }}
                          className={`p-0.5 text-center border-r border-slate-200 transition-colors ${
                            isToday ? 'bg-brand-50/70 ring-1 ring-brand-400' : ''
                          } ${canEdit ? 'cursor-pointer hover:bg-purple-50' : ''}`}
                        >
                          {s.code ? (
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] border leading-none transition-transform hover:scale-110 ${badgeStyle} ${
                                s.isOverridden ? 'ring-2 ring-purple-600 font-black shadow-xs' : ''
                              } ${isToday ? 'ring-2 ring-brand-500 font-black' : ''}`}
                              title={`${s.dateStr} [${row.unitLabel}] ${displayName}: ${s.code}${
                                s.isOverridden ? ' (수동 수정됨)' : ''
                              }${isToday ? ' [오늘]' : ''}`}
                            >
                              {s.code}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Monthly Summary */}
                    <td className="px-3 py-2 text-center font-mono text-[11px] font-bold text-slate-700 bg-slate-50/60 border-l border-slate-200 whitespace-nowrap">
                      <span className="text-sky-700">{row.dCount}D</span> /{' '}
                      <span className="text-amber-700">{row.aCount}A</span> /{' '}
                      <span className="text-purple-700">{row.nCount}N</span>{' '}
                      <span className="text-slate-900 font-extrabold">({row.totalWork}일)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Operational Remarks for the Month (from Excel) */}
      {masterMonth?.remark && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {year}년 {selectedMonth}월 교대근무 운영 특이사항 (비 고)
              </h4>
              <div className="mt-1.5 space-y-1 text-xs text-amber-900/90 leading-relaxed font-medium">
                {masterMonth.remark.split('\n').map((line, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5">
                    <span className="font-bold text-amber-700">•</span>
                    <span>{line.replace(/^[○•-]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Admin 2-Layer Editing Palette Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  근무표 2-Layer 팔레트 수정
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingCell.dateStr} | Slot {editingCell.slotNo} ({getAnonymizedName(editingCell.memberName, anonymize)})
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Selector */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                변경할 근무 코드 선택:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['D', 'A', 'N', 'X', '3D', '4D', '3N', '연차', '대근'] as ShiftCode[]).map(
                  (code) => (
                    <button
                      key={code}
                      onClick={() =>
                        setEditingCell((prev) =>
                          prev ? { ...prev, tentativeCode: code } : null
                        )
                      }
                      className={`py-2 rounded-lg font-black text-xs border transition-all ${getExcelBadgeStyle(
                        code
                      )} ${
                        editingCell.tentativeCode === code
                          ? 'ring-2 ring-purple-600 scale-105 shadow-sm'
                          : ''
                      }`}
                    >
                      {code}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Guardrail Violations */}
            {!validation.isValid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Hard 제약조건 위반 (반영 차단):
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
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Soft 제약조건 경고:
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
              <label className="text-xs font-bold text-slate-700 block mb-1">
                수정 사유 (감사 로그 기록):
              </label>
              <input
                type="text"
                value={editingCell.note}
                onChange={(e) =>
                  setEditingCell((prev) =>
                    prev ? { ...prev, note: e.target.value } : null
                  )
                }
                placeholder="예: 긴급 병가로 인한 대근 스왑"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
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
