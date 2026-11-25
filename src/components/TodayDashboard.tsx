import React, { useState, useMemo, useEffect } from 'react';
import { DaySchedule, ShiftCell } from '../engine/types';
import { exportPersonalICalendar } from '../utils/icsExport';
import {
  Calendar,
  Clock,
  Download,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  loadBanganWorkers,
  loadBanganAssignments,
} from '../services/banganScheduleService';

interface TodayDashboardProps {
  schedule: DaySchedule[];
  anonymize: boolean;
  year: number;
  onOpenBanganTab?: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  schedule,
  anonymize,
  year,
  onOpenBanganTab,
}) => {
  // Current real-world date string (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Default to today if it exists in current schedule, otherwise schedule start
  const defaultDateStr = useMemo(() => {
    if (schedule.some((d) => d.dateStr === todayDateStr)) {
      return todayDateStr;
    }
    return schedule[0]?.dateStr || `${year}-01-01`;
  }, [schedule, todayDateStr, year]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(defaultDateStr);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  // Sync when schedule or year changes
  useEffect(() => {
    setSelectedDateStr(defaultDateStr);
  }, [defaultDateStr]);

  // Bang-an-bu support data
  const banganWorkers = useMemo(() => loadBanganWorkers(), []);
  const banganAssignments = useMemo(() => loadBanganAssignments(), []);

  const getBanganSupportInfo = (dateStr?: string) => {
    if (!dateStr) return null;
    const order = banganAssignments[dateStr];
    if (!order) return null;
    const worker = banganWorkers.find((w) => w.order === order);
    return {
      order,
      name: worker?.name || `순번 ${order}`,
      department: worker?.department || '방사선안전부',
    };
  };

  const dayIndex = schedule.findIndex((d) => d.dateStr === selectedDateStr);
  const today = dayIndex >= 0 ? schedule[dayIndex] : schedule[0];
  const tomorrow = dayIndex >= 0 && dayIndex + 1 < schedule.length ? schedule[dayIndex + 1] : null;

  const todayBangan = getBanganSupportInfo(today?.dateStr);
  const tomorrowBangan = getBanganSupportInfo(tomorrow?.dateStr);

  const handleDateShift = (delta: number) => {
    const nextIdx = dayIndex + delta;
    if (nextIdx >= 0 && nextIdx < schedule.length) {
      setSelectedDateStr(schedule[nextIdx].dateStr);
    }
  };

  const handleGoToToday = () => {
    if (schedule.some((d) => d.dateStr === todayDateStr)) {
      setSelectedDateStr(todayDateStr);
    }
  };

  const getName = (cell: ShiftCell, targetDate?: string) => {
    if (anonymize) return `HP-0${cell.slotNo}`;
    if (cell.slotNo === 10 || cell.memberName === '방안부지원' || cell.unit === 'SUPPORT') {
      const bInfo = getBanganSupportInfo(targetDate || today?.dateStr);
      if (bInfo) {
        return `[순번 ${bInfo.order}] ${bInfo.name}`;
      }
      return '방안부지원 (미배정)';
    }
    return cell.memberName;
  };

  const getShiftBadgeColor = (code: string) => {
    if (code === 'D') return 'bg-sky-100 text-sky-800 border-sky-300';
    if (code === 'A') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (code === 'N' || code === '3N') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (code === '3D' || code === '4D') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (code === '3D*' || code === '4D*' || code === '일근') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // 14 days schedule for selected slot
  const next14Days = schedule.slice(Math.max(0, dayIndex), Math.min(schedule.length, dayIndex + 14));
  const currentMember = today?.shifts.find((s) => s.slotNo === selectedSlot);

  return (
    <div className="space-y-6">
      {/* Date Selector & Banner */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">당일 및 익일 교대조 현황</h2>
            <p className="text-xs text-slate-500">
              선택 일자: <span className="font-semibold text-slate-800">{today?.dateStr}</span> ({today?.holidayName || (today?.isWeekend ? '주말' : '평일')})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Previous Date Button */}
          <button
            onClick={() => handleDateShift(-1)}
            disabled={dayIndex <= 0}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
            title="이전 날짜로 이동 (하루 전)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Date Input */}
          <input
            type="date"
            value={selectedDateStr}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />

          {/* Next Date Button */}
          <button
            onClick={() => handleDateShift(1)}
            disabled={dayIndex >= schedule.length - 1}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
            title="다음 날짜로 이동 (하루 뒤)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Go to Today Button */}
          <button
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors"
            title="오늘 날짜로 이동"
          >
            오늘
          </button>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>커버리지 정상</span>
          </div>
        </div>
      </div>

      {/* Today & Tomorrow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-5 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-200" />
              <span className="font-bold text-sm">오늘 근무표 ({today?.dateStr})</span>
            </div>
            <span className="text-xs bg-brand-800/60 px-2 py-0.5 rounded text-brand-100 font-medium">
              총 6명 근무 / 3명 휴무
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* 3 Unit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>고리 3호기</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">D / A / N 각 1인</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['D', 'A', 'N'].map((targetCode) => {
                  const match = today?.shifts.find(
                    (s) =>
                      (s.unit === '3U' && s.shiftCode === targetCode) ||
                      (targetCode === 'D' && (s.shiftCode === '3D' || s.shiftCode === '3D*'))
                  ) || (targetCode === 'D' && (today?.supportShift?.shiftCode === '3D' || today?.supportShift?.shiftCode === '3D*') ? today?.supportShift : null);

                  return (
                    <div key={targetCode} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{targetCode === 'D' ? '주간 (08~16)' : targetCode === 'A' ? '오후 (16~24)' : '야간 (24~08)'}</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm text-slate-900">{match ? getName(match) : '-'}</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getShiftBadgeColor(match?.shiftCode || '')}`}>
                          {match?.shiftCode}
                        </span>
                      </div>
                      {match?.badge && <span className="text-[10px] text-brand-600 mt-1 truncate">{match.badge}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Unit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>고리 4호기</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">D / A / N 각 1인</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['D', 'A', 'N'].map((targetCode) => {
                  const match = today?.shifts.find(
                    (s) =>
                      (s.unit === '4U' && s.shiftCode === targetCode) ||
                      (targetCode === 'D' && (s.shiftCode === '4D' || s.shiftCode === '4D*'))
                  ) || (targetCode === 'D' && (today?.supportShift?.shiftCode === '4D' || today?.supportShift?.shiftCode === '4D*') ? today?.supportShift : null);

                  return (
                    <div key={targetCode} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{targetCode === 'D' ? '주간 (08~16)' : targetCode === 'A' ? '오후 (16~24)' : '야간 (24~08)'}</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm text-slate-900">{match ? getName(match) : '-'}</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getShiftBadgeColor(match?.shiftCode || '')}`}>
                          {match?.shiftCode}
                        </span>
                      </div>
                      {match?.badge && <span className="text-[10px] text-emerald-600 mt-1 truncate">{match.badge}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Float / Support & Off */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">휴무 (OFF 3인): </span>
                {today?.shifts
                  .filter((s) => s.shiftCode === 'X')
                  .map((s) => getName(s))
                  .join(', ')}
              </div>
              {today?.supportShift && today.supportShift.shiftCode !== 'X' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  지원조: {today.supportShift.shiftCode} ({today.supportShift.badge})
                </span>
              )}
            </div>

            {/* Bang-an-bu Day Support Banner */}
            {(today?.supportShift || todayBangan) && (
              <div className="mt-2 p-3 rounded-xl bg-purple-50/90 border border-purple-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-brand-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    방안
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-purple-950">방안부 Day 교대지원</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-200 text-purple-800">
                        {today?.supportShift?.shiftCode || '일근 지원'}
                      </span>
                    </div>
                    <div className="text-purple-800 mt-0.5">
                      {todayBangan ? (
                        <span>
                          지원자: <strong className="font-extrabold text-purple-950">[순번 {todayBangan.order}] {todayBangan.name}</strong>
                          <span className="text-purple-600 ml-1">({todayBangan.department})</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center space-x-1">
                          <span>⚠️ 지원자 미배정</span>
                          {onOpenBanganTab && (
                            <button
                              onClick={onOpenBanganTab}
                              className="text-purple-700 underline font-bold ml-1 hover:text-purple-900 inline-flex items-center"
                            >
                              <span>순번 지정하기</span>
                              <ArrowRight className="w-3 h-3 ml-0.5" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-purple-700 font-bold bg-white px-2 py-1 rounded-md border border-purple-200 block">
                    {today?.supportShift?.badge || '8+1 지원'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tomorrow Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-300" />
              <span className="font-bold text-sm">내일 근무표 ({tomorrow?.dateStr || '-'})</span>
            </div>
            <span className="text-xs bg-slate-900/60 px-2 py-0.5 rounded text-slate-200 font-medium">
              사전 브리핑
            </span>
          </div>

          <div className="p-5 space-y-4">
            {tomorrow ? (
              <>
                {/* 3 Unit Tomorrow */}
                <div>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 block">
                    고리 3호기
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {['D', 'A', 'N'].map((targetCode) => {
                      const match = tomorrow.shifts.find(
                        (s) =>
                          (s.unit === '3U' && s.shiftCode === targetCode) ||
                          (targetCode === 'D' && (s.shiftCode === '3D' || s.shiftCode === '3D*'))
                      ) || (targetCode === 'D' && (tomorrow.supportShift?.shiftCode === '3D' || tomorrow.supportShift?.shiftCode === '3D*') ? tomorrow.supportShift : null);

                      return (
                        <div key={targetCode} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400">{targetCode} 근무</span>
                          <span className="font-bold text-sm text-slate-900 mt-1">{match ? getName(match) : '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Unit Tomorrow */}
                <div>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 block">
                    고리 4호기
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {['D', 'A', 'N'].map((targetCode) => {
                      const match = tomorrow.shifts.find(
                        (s) =>
                          (s.unit === '4U' && s.shiftCode === targetCode) ||
                          (targetCode === 'D' && (s.shiftCode === '4D' || s.shiftCode === '4D*'))
                      ) || (targetCode === 'D' && (tomorrow.supportShift?.shiftCode === '4D' || tomorrow.supportShift?.shiftCode === '4D*') ? tomorrow.supportShift : null);

                      return (
                        <div key={targetCode} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400">{targetCode} 근무</span>
                          <span className="font-bold text-sm text-slate-900 mt-1">{match ? getName(match) : '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">휴무: </span>
                    {tomorrow.shifts
                      .filter((s) => s.shiftCode === 'X')
                      .map((s) => getName(s))
                      .join(', ')}
                  </div>
                </div>

                {/* Bang-an-bu Day Support Tomorrow */}
                {(tomorrow.supportShift || tomorrowBangan) && (
                  <div className="mt-2 p-3 rounded-xl bg-purple-50/90 border border-purple-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-purple-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        방안
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-purple-950">익일 방안부 Day 교대지원</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-200 text-purple-800">
                            {tomorrow.supportShift?.shiftCode || '일근 지원'}
                          </span>
                        </div>
                        <div className="text-purple-800 mt-0.5">
                          {tomorrowBangan ? (
                            <span>
                              지원자: <strong className="font-extrabold text-purple-950">[순번 {tomorrowBangan.order}] {tomorrowBangan.name}</strong>
                              <span className="text-purple-600 ml-1">({tomorrowBangan.department})</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center space-x-1">
                              <span>⚠️ 지원자 미배정</span>
                              {onOpenBanganTab && (
                                <button
                                  onClick={onOpenBanganTab}
                                  className="text-purple-700 underline font-bold ml-1 hover:text-purple-900 inline-flex items-center"
                                >
                                  <span>순번 지정하기</span>
                                  <ArrowRight className="w-3 h-3 ml-0.5" />
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-purple-700 font-bold bg-white px-2 py-1 rounded-md border border-purple-200 block">
                        {tomorrow.supportShift?.badge || '8+1 지원'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">익일 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Personal 14-Day Calendar Look-up */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">내 14일 근무 일정 및 캘린더 동기화</h3>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(Number(e.target.value))}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => {
                const s = today?.shifts.find((shift) => shift.slotNo === slot);
                const name = s ? getName(s) : `Slot ${slot}`;
                return (
                  <option key={slot} value={slot}>
                    Slot {slot}: {name}
                  </option>
                );
              })}
            </select>

            <button
              onClick={() => {
                if (currentMember) {
                  exportPersonalICalendar(schedule, selectedSlot, getName(currentMember));
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.ics 다운로드</span>
            </button>
          </div>
        </div>

        {/* 14 days grid */}
        <div className="grid grid-cols-2 sm:grid-cols-7 lg:grid-cols-14 gap-2">
          {next14Days.map((d) => {
            const shift = d.shifts.find((s) => s.slotNo === selectedSlot);
            const isToday = d.dateStr === today?.dateStr;
            const code = shift?.shiftCode || 'X';

            return (
              <div
                key={d.dateStr}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between ${isToday ? 'border-brand-500 ring-2 ring-brand-400/20 bg-brand-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {d.dateStr.slice(5)}
                  </span>
                  <span className={`text-[11px] font-bold block ${d.dayOfWeek === 0 ? 'text-red-500' : d.dayOfWeek === 6 ? 'text-blue-500' : 'text-slate-700'}`}>
                    {['일', '월', '화', '수', '목', '금', '토'][d.dayOfWeek]}
                  </span>
                </div>

                <div className="my-2">
                  <span className={`inline-block w-8 h-8 leading-8 rounded-lg text-xs font-black border ${getShiftBadgeColor(code)}`}>
                    {code}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 truncate font-medium">
                  {shift?.badge || (code === 'X' ? '휴무' : shift?.unit || '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
