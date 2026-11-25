import React, { useState } from 'react';
import {
  master2027Data,
  MasterMonth,
  getAnonymizedName,
  getExcelBadgeStyle,
} from '../data/master2027Data';
import {
  Download,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AnnualScheduleViewProps {
  anonymize: boolean;
  onExportExcel: () => void;
}

export const AnnualScheduleView: React.FC<AnnualScheduleViewProps> = ({
  anonymize,
  onExportExcel,
}) => {
  const [selectedMonthTab, setSelectedMonthTab] = useState<number | 'ALL'>('ALL');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [showCredit, setShowCredit] = useState<boolean>(true);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);

  const displayedMonths: MasterMonth[] =
    selectedMonthTab === 'ALL'
      ? master2027Data.months
      : master2027Data.months.filter((m) => m.month === selectedMonthTab);

  return (
    <div className="space-y-6">
      {/* 1. Official Banner (matching Excel Header) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-400 text-slate-950 flex items-center space-x-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>엑셀 공식 양식</span>
              </span>
              <span className="text-xs text-teal-200 font-medium">
                고리 3,4호기 HP 교대근무 84일 9칸 원형 큐
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              {master2027Data.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-4xl">
              {master2027Data.subtitle}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
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
          <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border-[#fde68a]">
            [노랑 3D*/4D*] 평일스왑
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]">
            [민트 일근] 방안부일근
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]">
            [파랑 D] 휴일투입/주간
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
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
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
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}월
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {selectedMonthTab === 'ALL'
            ? '전체 12개월 매트릭스 렌더링 중'
            : `2027년 ${selectedMonthTab}월 단독 보기`}
        </div>
      </div>

      {/* 2. Monthly Matrix Tables (Stacked) */}
      <div className="space-y-6">
        {displayedMonths.map((m) => {
          return (
            <div
              key={m.month}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Month Header Banner */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                    {m.month}
                  </span>
                  <span className="font-bold text-slate-800 text-base">
                    2027년 {m.month}월 교대근무표
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
                          : '';

                      const unitColor =
                        mem.unit === '3'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : mem.unit === '4'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200';

                      const displayName = getAnonymizedName(mem.name, anonymize);

                      return (
                        <tr
                          key={`${mem.name}_${memIdx}`}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {/* Unit Cell */}
                          <td className="sticky left-0 z-10 bg-white px-2 py-2 text-center font-bold border-r border-slate-200">
                            {unitLabel && (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${unitColor}`}
                              >
                                {mem.unit}
                              </span>
                            )}
                          </td>

                          {/* Name Cell */}
                          <td className="sticky left-12 z-10 bg-white px-3 py-2 font-bold text-slate-900 border-r border-slate-200 shadow-xs whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              {unitLabel && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  [{mem.unit}호]
                                </span>
                              )}
                              <span>{displayName}</span>
                            </div>
                          </td>

                          {/* Shifts for each day */}
                          {mem.shifts.map((code, dayIdx) => {
                            const badgeStyle = getExcelBadgeStyle(code);
                            const dow = m.dows[dayIdx] || '';
                            const isSunday = dow === '일';
                            const isSaturday = dow === '토';

                            return (
                              <td
                                key={dayIdx}
                                className={`px-0.5 py-1 text-center border-r border-slate-200 ${
                                  !code && isSunday
                                    ? 'bg-red-50/20'
                                    : !code && isSaturday
                                    ? 'bg-blue-50/20'
                                    : ''
                                }`}
                              >
                                {code ? (
                                  <span
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] border leading-none ${badgeStyle}`}
                                  >
                                    {code}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Remarks on first row, or span */}
                          {memIdx === 0 ? (
                            <td
                              rowSpan={m.members.length}
                              className="px-3 py-2 align-top text-xs text-slate-700 bg-amber-50/30 border-l border-slate-300 min-w-[280px]"
                            >
                              {m.remark ? (
                                <div className="space-y-1.5">
                                  {m.remark.split('\n').map((line, lIdx) => (
                                    <div
                                      key={lIdx}
                                      className="flex items-start space-x-1.5 text-slate-800 leading-relaxed font-medium"
                                    >
                                      <span className="text-amber-600 font-bold">•</span>
                                      <span>{line.replace(/^[○•-]\s*/, '')}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">특이사항 없음</span>
                              )}
                            </td>
                          ) : null}
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

      {/* 3. Bottom Comparison & Settlement Tables (Matching Excel Sheets 2, 3, 4) */}
      <div className="space-y-6 pt-4">
        {/* Section 1: 2026 vs 2027 Comparison */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setShowComparison((v) => !v)}
            className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h2 className="font-extrabold text-slate-900 text-base">
                2026년 9인 체제 vs 2027년 확정 시나리오 HP 근무일수 비교표
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-brand-100 text-brand-800">
                시트 2
              </span>
            </div>
            {showComparison ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>

          {showComparison && (
            <div className="p-5 space-y-5">
              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700">8명 유지인원 평균 근무일</div>
                  <div className="text-2xl font-black text-blue-950 mt-1">243.4일 → 244.0일</div>
                  <p className="text-xs text-blue-600 mt-1">연간 평균 +0.6일 차이 (사실상 동일)</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-700">2027년 최대 근무일 편차</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">최대 3일 편차</div>
                  <p className="text-xs text-emerald-600 mt-1">243일 ~ 246일 (편차 3일 이내 달성)</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-purple-700">방안부 일근 지원 투입 (1/4~3/7)</div>
                  <div className="text-2xl font-black text-purple-950 mt-1">42일 출근 / 21일 OFF</div>
                  <p className="text-xs text-purple-600 mt-1">직접 29일 + 대체스왑 10일 + 일근 3일</p>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-teal-700">2027년 안전 제약 준수율</div>
                  <div className="text-2xl font-black text-teal-950 mt-1">오류 0건 · 최대 3연속</div>
                  <p className="text-xs text-teal-600 mt-1">전원 역순환(N→D) 0건 · 365일 100% 커버</p>
                </div>
              </div>

              {/* Detail Table */}
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
                      <th className="px-2 py-2 text-center bg-emerald-50/50 font-bold text-emerald-900">2027 총근무</th>
                      <th className="px-2 py-2 text-center bg-emerald-50/50 font-bold text-emerald-900">2027 휴무</th>
                      <th className="px-2 py-2 text-center bg-emerald-50/50">2027 주간</th>
                      <th className="px-2 py-2 text-center bg-emerald-50/50">2027 오후·야간</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-800">근무일 증감</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-800">최대연속</th>
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
            </div>
          )}
        </div>

        {/* Section 2: 8+1 Credit Settlement & Bang-an-bu results */}
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
                시트 3
              </span>
            </div>
            {showCredit ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>

          {showCredit && (
            <div className="p-5 space-y-6">
              {/* Part 1: Credit settlement table */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>1. HP 8인 휴일 Phase-11 투입 및 평일 대체휴무 스왑 정산 (1/1~3/7)</span>
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">HP 요원</th>
                        <th className="px-3 py-2 text-left">구간 배치 호기</th>
                        <th className="px-2 py-2 text-center text-blue-700">휴일 투입(+1)</th>
                        <th className="px-2 py-2 text-center text-amber-700">평일 보상(-1)</th>
                        <th className="px-2 py-2 text-center text-purple-700 font-bold">잔여 크레딧</th>
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
                            className={isTotal ? 'bg-slate-100 font-extrabold text-slate-900' : 'hover:bg-slate-50'}
                          >
                            <td className="px-3 py-2 font-bold">{row[0]}</td>
                            <td className="px-3 py-2 text-slate-600">{row[1]}</td>
                            <td className="px-2 py-2 text-center font-semibold text-blue-700">{row[2]}회</td>
                            <td className="px-2 py-2 text-center font-semibold text-amber-700">{row[3]}회</td>
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
                        const pct = row[2] ? `${(parseFloat(row[2]) * 100).toFixed(1)}%` : '-';
                        return (
                          <tr
                            key={idx}
                            className={isTotal ? 'bg-purple-50 font-extrabold text-purple-950' : 'hover:bg-slate-50'}
                          >
                            <td className="px-3 py-2 font-bold">{row[0]}</td>
                            <td className="px-3 py-2 text-center font-extrabold text-brand-700">{row[1]}일</td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-600">{pct}</td>
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

        {/* Section 3: 15 Float Day Timeline & 84-day rotation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setShowTimeline((v) => !v)}
            className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-base">
                2027년도 통상 Day 고정순번 일정 및 84일 주기 호기 이동(3·4호기) 타임라인
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                시트 4 (15회차)
              </span>
            </div>
            {showTimeline ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
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
                      <th className="px-4 py-2 text-left">전환 규칙 및 84일 호기 이동</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {master2027Data.timelineTable.slice(3).map((row, idx) => (
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
