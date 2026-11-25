import React, { useState, useEffect, useMemo } from 'react';
import {
  master2027Data,
  MasterMonth,
  getAnonymizedName,
  getExcelBadgeStyle,
} from '../data/master2027Data';
import { master2026Data } from '../data/master2026Data';
import {
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface AnnualScheduleViewProps {
  anonymize: boolean;
  onExportExcel: () => void;
  initialYear?: number;
  onYearChange?: (year: number) => void;
}

export const AnnualScheduleView: React.FC<AnnualScheduleViewProps> = ({
  anonymize,
  onExportExcel,
  initialYear = 2026,
  onYearChange,
}) => {
  const [selectedYear, setSelectedYear] = useState<2026 | 2027>(() =>
    initialYear === 2027 ? 2027 : 2026
  );

  useEffect(() => {
    if (initialYear === 2026 || initialYear === 2027) {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);

  const [selectedMonthTab, setSelectedMonthTab] = useState<number | 'ALL'>('ALL');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [showCredit, setShowCredit] = useState<boolean>(true);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);

  const handleYearToggle = (targetYear: 2026 | 2027) => {
    setSelectedYear(targetYear);
    if (onYearChange) {
      onYearChange(targetYear);
    }
  };

  const currentData = selectedYear === 2026 ? master2026Data : master2027Data;

  const isYearConfigured = useMemo(() => {
    if (!currentData || !currentData.months || currentData.months.length === 0) return false;
    return currentData.months.some((m) =>
      m.members && m.members.length > 0 && m.members.some((mem) => mem.shifts && mem.shifts.some((s) => s && s.trim() !== ''))
    );
  }, [currentData]);

  const isMonthConfigured = (m: MasterMonth) => {
    if (!m.members || m.members.length === 0) return false;
    return m.members.some((mem) => mem.shifts && mem.shifts.some((s) => s && s.trim() !== ''));
  };

  const displayedMonths: MasterMonth[] =
    selectedMonthTab === 'ALL'
      ? currentData.months
      : currentData.months.filter((m) => m.month === selectedMonthTab);

  return (
    <div className="space-y-6">
      {/* 1. Official Banner (matching Excel Header) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-400 text-slate-950 flex items-center space-x-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>엑셀 공식 양식 원본</span>
              </span>
              <span className="text-xs text-teal-200 font-medium">
                고리 3,4호기 HP 교대근무 84일 9칸 원형 큐 ({selectedYear}년도)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              {currentData.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-4xl">
              {currentData.subtitle}
            </p>
          </div>

          {/* Action Buttons & Year Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Navigator (Left / Right Arrows & Year Indicator) */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-600/80 space-x-1">
              <button
                onClick={() => handleYearToggle(Math.max(2026, selectedYear - 1) as 2026 | 2027)}
                disabled={selectedYear <= 2026}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="이전 연도 (2026년)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-2 py-0.5 font-black text-sm text-white">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                <span>{selectedYear}년도</span>
              </div>
              <button
                onClick={() => handleYearToggle(Math.min(2027, selectedYear + 1) as 2026 | 2027)}
                disabled={selectedYear >= 2027}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="다음 연도 (2027년)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Year Switcher Pills */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-600/80">
              <button
                onClick={() => handleYearToggle(2026)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedYear === 2026
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2026년 (9인 정상)
              </button>
              <button
                onClick={() => handleYearToggle(2027)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedYear === 2027
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2027년 (8+1 지원)
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>인쇄</span>
            </button>
            <button
              onClick={onExportExcel}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>엑셀(.xlsx) 원본 다운로드</span>
            </button>
          </div>
        </div>

        {/* Color Legend Bar */}
        <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-300 font-bold mr-1 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
            근무 형태 범례:
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fde2cb] text-[#8a3800] border-[#f9cb9c]">
            [주황 3D/4D] 통상Day
          </span>
          {selectedYear === 2027 && (
            <>
              <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border-[#fde68a]">
                [노랑 3D*/4D*] 평일스왑
              </span>
              <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]">
                [민트 일근] 방안부일근
              </span>
            </>
          )}
          <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]">
            [파랑 D] 주간/자체주간
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
      </div>

      {/* Month Navigation Pills */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Year Step Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleYearToggle(Math.max(2026, selectedYear - 1) as 2026 | 2027)}
              disabled={selectedYear <= 2026}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="이전 연도 (2026년)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-slate-800 px-1.5 whitespace-nowrap">
              {selectedYear}년
            </span>
            <button
              onClick={() => handleYearToggle(Math.min(2027, selectedYear + 1) as 2026 | 2027)}
              disabled={selectedYear >= 2027}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="다음 연도 (2027년)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={() => setSelectedMonthTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedMonthTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1~12월 전체 연속 보기
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonthTab(m)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedMonthTab === m
                  ? selectedYear === 2026
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}월
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {selectedMonthTab === 'ALL'
            ? `${selectedYear}년 전체 12개월 매트릭스 렌더링 중`
            : `${selectedYear}년 ${selectedMonthTab}월 단독 보기`}
        </div>
      </div>

      {/* 2. Monthly Matrix Tables (Stacked) */}
      {!isYearConfigured ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-10 text-center space-y-3 my-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-amber-950">
            근무자 설정 미완료 안내
          </h3>
          <p className="text-sm font-bold text-amber-800">
            해당 월 또는 해당 년도는 근무자 설정이 완료되지 않았습니다. 관리자에게 근무자 설정 완료를 요청해주세요
          </p>
          <p className="text-xs text-amber-600">
            [인원·근무 관리] 메뉴에서 슬롯별 근무 인원 배정 및 84일 교대 순환 설정을 완료해야 근무표가 정상적으로 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedMonths.map((m) => {
            if (!isMonthConfigured(m)) {
              return (
                <div
                  key={m.month}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-2"
                >
                  <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="text-sm font-bold text-amber-800">
                    해당 월 또는 해당 년도는 근무자 설정이 완료되지 않았습니다. 관리자에게 근무자 설정 완료를 요청해주세요
                  </p>
                </div>
              );
            }

            return (
              <div
                key={m.month}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
              {/* Month Header Banner */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-8 h-8 rounded-lg text-white font-extrabold flex items-center justify-center text-sm shadow-xs ${
                      selectedYear === 2026 ? 'bg-teal-600' : 'bg-brand-600'
                    }`}
                  >
                    {m.month}
                  </span>
                  <span className="font-bold text-slate-800 text-base">
                    {selectedYear}년 {m.month}월 교대근무표
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({m.days.length}일)
                  </span>
                </div>
                {m.remark && (
                  <div className="text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 max-w-xl truncate hidden lg:block font-medium">
                    {m.remark.split('\n')[0]}
                  </div>
                )}
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200 border-collapse">
                  <thead>
                    {/* Row 1: Day numbers */}
                    <tr className="bg-[#ccfbf1]/50 text-slate-800">
                      <th className="sticky left-0 z-20 bg-[#ccfbf1] px-2 py-1.5 text-center font-bold w-12 border-r border-slate-300">
                        호기
                      </th>
                      <th className="sticky left-12 z-20 bg-[#ccfbf1] px-3 py-1.5 text-left font-bold w-28 border-r border-slate-300 shadow-xs">
                        성명
                      </th>
                      {m.days.map((dayNum, idx) => {
                        const dow = m.dows[idx] || '';
                        const isWeekend = dow === '토' || dow === '일';
                        const isSunday = dow === '일';
                        return (
                          <th
                            key={dayNum}
                            className={`px-1 py-1 text-center font-extrabold min-w-[30px] border-r border-slate-200 ${
                              isSunday
                                ? 'bg-red-100/70 text-red-700'
                                : isWeekend
                                ? 'bg-blue-100/70 text-blue-700'
                                : 'text-slate-800'
                            }`}
                          >
                            {dayNum}
                          </th>
                        );
                      })}
                      <th className="px-4 py-1.5 text-left font-bold bg-[#ccfbf1] text-slate-800 border-l border-slate-300 min-w-[280px]">
                        비 고
                      </th>
                    </tr>

                    {/* Row 2: Days of Week */}
                    <tr className="bg-[#ccfbf1]/30 text-slate-700 border-b border-slate-300">
                      <th className="sticky left-0 z-20 bg-[#ccfbf1]/40 px-2 py-1 text-center font-semibold text-[11px] border-r border-slate-300">
                        -
                      </th>
                      <th className="sticky left-12 z-20 bg-[#ccfbf1]/40 px-3 py-1 text-left font-semibold text-[11px] border-r border-slate-300 shadow-xs">
                        요일
                      </th>
                      {m.dows.map((dow, idx) => {
                        const isSunday = dow === '일';
                        const isSaturday = dow === '토';
                        return (
                          <th
                            key={idx}
                            className={`px-1 py-1 text-center font-bold text-[11px] border-r border-slate-200 ${
                              isSunday
                                ? 'text-red-600 bg-red-50'
                                : isSaturday
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-slate-600'
                            }`}
                          >
                            {dow}
                          </th>
                        );
                      })}
                      <th className="px-4 py-1 text-left font-semibold text-[11px] bg-[#ccfbf1]/40 text-slate-600 border-l border-slate-300">
                        운영 특이사항
                      </th>
                    </tr>
                  </thead>

                  {/* Body: Members */}
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {m.members.map((mem, memIdx) => {
                      const unitLabel =
                        mem.unit === '3'
                          ? '3호기'
                          : mem.unit === '4'
                          ? '4호기'
                          : mem.unit === '지원'
                          ? '지원'
                          : `${mem.unit}호기`;

                      const isUnit3 = mem.unit === '3';
                      const isUnit4 = mem.unit === '4';
                      const isSupport = mem.unit === '지원';

                      const unitBadgeStyle = isUnit3
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : isUnit4
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : isSupport
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

                      const displayName = getAnonymizedName(mem.name, anonymize);

                      return (
                        <tr
                          key={`${mem.name}_${mem.unit}_${memIdx}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Unit Cell */}
                          <td className="sticky left-0 z-10 bg-white px-2 py-1 text-center font-bold border-r border-slate-200">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${unitBadgeStyle}`}
                            >
                              {unitLabel}
                            </span>
                          </td>

                          {/* Name Cell */}
                          <td className="sticky left-12 z-10 bg-white px-3 py-1 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap shadow-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs">{displayName}</span>
                              {mem.name.includes('지원') && (
                                <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                  일근
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Shifts */}
                          {mem.shifts.map((code, sIdx) => {
                            const badgeStyle = getExcelBadgeStyle(code);
                            const dow = m.dows[sIdx];
                            const isSunday = dow === '일';
                            const isSaturday = dow === '토';

                            return (
                              <td
                                key={sIdx}
                                className={`px-0.5 py-1 text-center border-r border-slate-200 ${
                                  isSunday
                                    ? 'bg-red-50/20'
                                    : isSaturday
                                    ? 'bg-blue-50/20'
                                    : ''
                                }`}
                              >
                                {code ? (
                                  <span
                                    className={`inline-block w-6 h-6 leading-6 rounded-md text-[11px] font-black border ${badgeStyle}`}
                                  >
                                    {code}
                                  </span>
                                ) : (
                                  <span className="inline-block w-6 h-6 leading-6 text-slate-300 text-[10px]">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Remark (only for first row or per row) */}
                          <td className="px-3 py-1 text-left text-[11px] text-slate-600 border-l border-slate-200">
                            {memIdx === 0 && m.remark && (
                              <div className="whitespace-pre-line text-amber-900 font-medium">
                                {m.remark}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 3. Bottom Comparison & Settlement Tables (Matching Excel Sheets 2, 3, 4) */}
      <div className="space-y-6 pt-4">
        {/* Section 1: Annual Statistics & Comparison */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setShowComparison((v) => !v)}
            className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h2 className="font-extrabold text-slate-900 text-base">
                {selectedYear === 2026
                  ? '2026년도 고리3,4호기 HP 9인 연간 근무일수 및 근무유형 통계'
                  : '2026년 9인 체제 vs 2027년 확정 시나리오 HP 근무일수 비교표'}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  selectedYear === 2026
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-brand-100 text-brand-800'
                }`}
              >
                {selectedYear === 2026 ? '시트 2 (9인 통계)' : '시트 2 (비교표)'}
              </span>
            </div>
            {showComparison ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>

          {showComparison && (
            <div className="p-5 space-y-5">
              {/* Summary KPI Cards */}
              {selectedYear === 2026 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-teal-700">
                      연간 개인 평균 근무일 / 휴무일
                    </div>
                    <div className="text-2xl font-black text-teal-950 mt-1">
                      243.3일 / 121.7일
                    </div>
                    <p className="text-xs text-teal-600 mt-1">
                      정확히 2/3 근무 · 1/3 휴무 황금비율
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-700">
                      9인 간 연간 근무일 편차
                    </div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">
                      최대 1일 편차
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                      243일 ~ 244일 (전원 균등 부하 실현)
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-blue-700">
                      365일 안전 제약 준수율
                    </div>
                    <div className="text-2xl font-black text-blue-950 mt-1">
                      오류 0건 · 최대 3연속
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      전원 역순환(N→D) 0건 · 365일 100% 커버
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-purple-700">
                      통상 Day 18회전 일정
                    </div>
                    <div className="text-2xl font-black text-purple-950 mt-1">
                      18회전 100% 가동
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      21일 주기 순환 · 84일 호기 이동 완비
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-blue-700">
                      8명 유지인원 평균 근무일
                    </div>
                    <div className="text-2xl font-black text-blue-950 mt-1">
                      243.4일 → 244.0일
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      연간 평균 +0.6일 차이 (사실상 동일)
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-700">
                      2027년 최대 근무일 편차
                    </div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">
                      최대 3일 편차
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                      243일 ~ 246일 (편차 3일 이내 달성)
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-purple-700">
                      방안부 일근 지원 투입 (1/4~3/7)
                    </div>
                    <div className="text-2xl font-black text-purple-950 mt-1">
                      42일 출근 / 21일 OFF
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      직접 29일 + 대체스왑 10일 + 일근 3일
                    </p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-teal-700">
                      2027년 안전 제약 준수율
                    </div>
                    <div className="text-2xl font-black text-teal-950 mt-1">
                      오류 0건 · 최대 3연속
                    </div>
                    <p className="text-xs text-teal-600 mt-1">
                      전원 역순환(N→D) 0건 · 365일 100% 커버
                    </p>
                  </div>
                </div>
              )}

              {/* Detail Table */}
              {selectedYear === 2026 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">HP 요원 (고정순번)</th>
                        <th className="px-2 py-2 text-center font-bold text-teal-900 bg-teal-50/50">
                          총 근무일
                        </th>
                        <th className="px-2 py-2 text-center text-slate-600">총 휴무(X)</th>
                        <th className="px-2 py-2 text-center text-blue-700">자체 주간(D)</th>
                        <th className="px-2 py-2 text-center text-amber-700">3호기 지원(3D)</th>
                        <th className="px-2 py-2 text-center text-orange-700">4호기 지원(4D)</th>
                        <th className="px-2 py-2 text-center text-amber-800">오후(A)</th>
                        <th className="px-2 py-2 text-center text-purple-800">야간(N)</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-800">
                          최대 연속근무
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {master2026Data.comparisonTable.slice(5).map((row, rIdx) => {
                        const isTotal = row[0]?.includes('합계');
                        return (
                          <tr
                            key={rIdx}
                            className={
                              isTotal
                                ? 'bg-slate-100 font-extrabold text-slate-900'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="px-3 py-2 font-bold">{row[0]}</td>
                            <td className="px-2 py-2 text-center font-extrabold text-teal-900 bg-teal-50/30">
                              {row[1]}일
                            </td>
                            <td className="px-2 py-2 text-center font-medium text-slate-600">
                              {row[2]}일
                            </td>
                            <td className="px-2 py-2 text-center text-blue-700 font-semibold">
                              {row[3]}일
                            </td>
                            <td className="px-2 py-2 text-center text-amber-700 font-semibold">
                              {row[4]}일
                            </td>
                            <td className="px-2 py-2 text-center text-orange-700 font-semibold">
                              {row[5]}일
                            </td>
                            <td className="px-2 py-2 text-center text-amber-800 font-semibold">
                              {row[6]}일
                            </td>
                            <td className="px-2 py-2 text-center text-purple-800 font-semibold">
                              {row[7]}일
                            </td>
                            <td className="px-2 py-2 text-center font-bold text-slate-800">
                              {row[8] || '3'}일
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">HP 요원 (고정순번)</th>
                        <th className="px-3 py-2 text-left">구분 / 변동사항</th>
                        <th className="px-2 py-2 text-center bg-blue-50/50">2026 총근무</th>
                        <th className="px-2 py-2 text-center bg-blue-50/50">2026 휴무</th>
                        <th className="px-2 py-2 text-center bg-blue-50/50">2026 주간</th>
                        <th className="px-2 py-2 text-center bg-blue-50/50">2026 오후·야간</th>
                        <th className="px-2 py-2 text-center bg-emerald-50/50 font-bold text-emerald-900">
                          2027 총근무
                        </th>
                        <th className="px-2 py-2 text-center bg-emerald-50/50 font-bold text-emerald-900">
                          2027 휴무
                        </th>
                        <th className="px-2 py-2 text-center bg-emerald-50/50">2027 주간</th>
                        <th className="px-2 py-2 text-center bg-emerald-50/50">2027 오후·야간</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-800">
                          근무일 증감
                        </th>
                        <th className="px-2 py-2 text-center font-bold text-slate-800">
                          최대연속
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {master2027Data.comparisonTable.slice(5).map((row, rIdx) => {
                        const isAverage = row[0]?.includes('평균');
                        const isTotal = row[0]?.includes('합계');
                        const rowStyle = isAverage
                          ? 'bg-amber-50/70 font-bold text-amber-950'
                          : isTotal
                          ? 'bg-slate-100 font-extrabold text-slate-900'
                          : 'hover:bg-slate-50';

                        return (
                          <tr key={rIdx} className={rowStyle}>
                            <td className="px-3 py-2 font-bold">{row[0]}</td>
                            <td className="px-3 py-2 text-slate-600">{row[1]}</td>
                            <td className="px-2 py-2 text-center bg-blue-50/20">{row[2]}</td>
                            <td className="px-2 py-2 text-center bg-blue-50/20">{row[3]}</td>
                            <td className="px-2 py-2 text-center bg-blue-50/20">{row[4]}</td>
                            <td className="px-2 py-2 text-center bg-blue-50/20">{row[5]}</td>
                            <td className="px-2 py-2 text-center bg-emerald-50/30 font-bold text-emerald-900">
                              {row[6]}
                            </td>
                            <td className="px-2 py-2 text-center bg-emerald-50/30 font-bold text-emerald-900">
                              {row[7]}
                            </td>
                            <td className="px-2 py-2 text-center bg-emerald-50/30">{row[8]}</td>
                            <td className="px-2 py-2 text-center bg-emerald-50/30">{row[9]}</td>
                            <td className="px-2 py-2 text-center font-bold text-brand-700">
                              {row[10] ? `${Number(row[10]) > 0 ? '+' : ''}${row[10]}` : '-'}
                            </td>
                            <td className="px-2 py-2 text-center font-bold text-slate-700">
                              {row[11] || '3'}일
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: 8+1 Credit Settlement & Bang-an-bu results (2027 ONLY) */}
        {selectedYear === 2027 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div
              onClick={() => setShowCredit((v) => !v)}
              className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-extrabold text-slate-900 text-base">
                  2027년 8+1 체제 구간(1/1~3/7) 대체휴무 크레딧 정산 및 방안부 지원 실적
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  시트 3 (정산)
                </span>
              </div>
              {showCredit ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>

            {showCredit && (
              <div className="p-5 space-y-6">
                {/* Part 1: Credit settlement table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      1. HP 8인 휴일 Phase-11 투입 및 평일 대체휴무 스왑 정산 (1/1~3/7)
                    </span>
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-left">HP 요원</th>
                          <th className="px-3 py-2 text-left">구간 배치 호기</th>
                          <th className="px-2 py-2 text-center text-blue-700">휴일 투입(+1)</th>
                          <th className="px-2 py-2 text-center text-amber-700">평일 보상(-1)</th>
                          <th className="px-2 py-2 text-center text-purple-700 font-bold">
                            잔여 크레딧
                          </th>
                          <th className="px-2 py-2 text-center">구간 총근무</th>
                          <th className="px-2 py-2 text-center">구간 휴무</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {master2027Data.creditTable.slice(4, 13).map((row, idx) => {
                          const isTotal = row[0]?.includes('합계');
                          return (
                            <tr
                              key={idx}
                              className={
                                isTotal
                                  ? 'bg-slate-100 font-extrabold text-slate-900'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="px-3 py-2 font-bold">{row[0]}</td>
                              <td className="px-3 py-2 text-slate-600">{row[1]}</td>
                              <td className="px-2 py-2 text-center font-semibold text-blue-700">
                                {row[2]}회
                              </td>
                              <td className="px-2 py-2 text-center font-semibold text-amber-700">
                                {row[3]}회
                              </td>
                              <td className="px-2 py-2 text-center font-bold text-purple-800">
                                {row[4] ? `${row[4]}회` : '0회'}
                              </td>
                              <td className="px-2 py-2 text-center font-medium">{row[5]}일</td>
                              <td className="px-2 py-2 text-center font-medium">{row[6]}일</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Part 2: Bang-an-bu support results */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>2. 방안부 지원조 근무 실적 (1/4~3/7, 총 63일)</span>
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-left">근무 유형</th>
                          <th className="px-3 py-2 text-center">일수(일)</th>
                          <th className="px-3 py-2 text-center">비중(%)</th>
                          <th className="px-3 py-2 text-left">비고</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {master2027Data.creditTable.slice(17, 24).map((row, idx) => {
                          const isTotal = row[0]?.includes('합계');
                          const pct = row[2]
                            ? `${(parseFloat(row[2]) * 100).toFixed(1)}%`
                            : '-';
                          return (
                            <tr
                              key={idx}
                              className={
                                isTotal
                                  ? 'bg-purple-50 font-extrabold text-purple-950'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="px-3 py-2 font-bold">{row[0]}</td>
                              <td className="px-3 py-2 text-center font-extrabold text-brand-700">
                                {row[1]}일
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-slate-600">
                                {pct}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{row[3]}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Float Day Timeline & 84-day rotation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setShowTimeline((v) => !v)}
            className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-base">
                {selectedYear === 2026
                  ? master2026Data.timelineTable[0][0]
                  : master2027Data.timelineTable[0][0]}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                {selectedYear === 2026 ? '시트 3 (18회전 타임라인)' : '시트 4 (15회차 타임라인)'}
              </span>
            </div>
            {showTimeline ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>

          {showTimeline && (
            <div className="p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="px-2 py-2 text-center w-14">회차</th>
                      <th className="px-3 py-2 text-left">통상 Day 담당자</th>
                      <th className="px-2 py-2 text-center">시작일</th>
                      <th className="px-2 py-2 text-center">종료일</th>
                      <th className="px-2 py-2 text-center">일수</th>
                      <th className="px-3 py-2 text-left">차기 진입자</th>
                      <th className="px-4 py-2 text-left">
                        {selectedYear === 2026
                          ? '일요일 경계 조정 및 84일 호기 이동'
                          : '전환 규칙 및 84일 호기 이동'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {currentData.timelineTable.slice(2).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-2 text-center font-extrabold">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                            {row[0]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{row[1]}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-600">{row[2]}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-600">{row[3]}</td>
                        <td className="px-2 py-2 text-center font-bold text-indigo-700">{row[4]}일</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{row[5]}</td>
                        <td className="px-4 py-2 text-slate-700 leading-relaxed">{row[6]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
