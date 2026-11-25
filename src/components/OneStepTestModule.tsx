import React, { useState, useEffect, useMemo } from 'react';
import { ShiftEngine } from '../engine/shiftEngine';
import { runAllDiagnostics, FullDiagnosticSuiteReport } from '../engine/testRunner';
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';

interface OneStepTestModuleProps {
  engine: ShiftEngine;
}

export const OneStepTestModule: React.FC<OneStepTestModuleProps> = ({ engine }) => {
  const [report, setReport] = useState<FullDiagnosticSuiteReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const executeDiagnostics = async () => {
    setIsRunning(true);
    // Short tick so UI shows running state smoothly
    setTimeout(async () => {
      const rep = await runAllDiagnostics(engine);
      setReport(rep);
      setIsRunning(false);
    }, 250);
  };

  // Run automatically on initial mount
  useEffect(() => {
    executeDiagnostics();
  }, [engine]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const categories = useMemo(() => {
    if (!report) return ['ALL'];
    const cats = Array.from(new Set(report.results.map((r) => r.category)));
    return ['ALL', ...cats];
  }, [report]);

  const filteredResults = useMemo(() => {
    if (!report) return [];
    if (selectedCategory === 'ALL') return report.results;
    return report.results.filter((r) => r.category === selectedCategory);
  }, [report, selectedCategory]);

  const handleDownloadMarkdown = () => {
    if (!report) return;
    let md = `# RadShift_K34 원스텝 종합 진단 검증 보고서\n\n`;
    md += `- **진단 일시**: ${report.timestamp}\n`;
    md += `- **총 테스트 수**: ${report.totalTests}건\n`;
    md += `- **통과(PASS)**: ${report.passedTests}건\n`;
    md += `- **실패(FAIL)**: ${report.failedTests}건\n`;
    md += `- **총 소요 시간**: ${report.totalDurationMs} ms\n\n`;
    md += `## 상세 테스트 결과 내역\n\n`;

    report.results.forEach((r, i) => {
      md += `### ${i + 1}. [${r.id}] ${r.name} (${r.category}) - ${r.isPassed ? '✅ PASS' : '❌ FAIL'}\n`;
      md += `- **설명**: ${r.description}\n`;
      md += `- **실행 시간**: ${r.durationMs} ms\n`;
      md += `- **결과**: ${r.details}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RadShift_K34_Diagnostic_Report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RadShift_K34_Diagnostic_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              원스텝 종합 진단 및 전체 기능 전수 검증 모듈
              {report && report.failedTests === 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  전체 통과 (무결점 100%)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              2026/2027 365일 규칙엔진, 9칸 원형 큐 회전 수학, 대근 추천 공식, 실시간 제약 검증, 엑셀/iCal 생성 및 텔레그램 봇을 클릭 한 번으로 전수 진단합니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={executeDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? '진단 실행 중...' : '원스텝 전체 진단 재실행'}</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            disabled={!report}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
            title="진단 보고서 마크다운(.md) 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>보고서 (.md)</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            disabled={!report}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
            title="진단 보고서 JSON 다운로드"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 block">총 진단 테스트 항목</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {report.totalTests} <span className="text-xs font-normal text-slate-500">개 항목</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-600 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 통과 (PASS)
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {report.passedTests} <span className="text-xs font-normal text-emerald-600">/ {report.totalTests}</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 block">실패 (FAIL)</span>
            <span className={`text-2xl font-black mt-1 block ${report.failedTests > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {report.failedTests} <span className="text-xs font-normal text-slate-500">건</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 block">총 진단 소요 시간</span>
            <span className="text-2xl font-black text-purple-700 mt-1 block font-mono">
              {report.totalDurationMs} <span className="text-xs font-normal text-slate-500">ms</span>
            </span>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'ALL' ? '전체 항목 보기' : cat}
          </button>
        ))}
      </div>

      {/* Test Results List */}
      <div className="space-y-3">
        {filteredResults.map((t) => {
          const isExpanded = expandedId === t.id;

          return (
            <div
              key={t.id}
              className={`bg-white rounded-xl border transition-all overflow-hidden ${
                t.isPassed ? 'border-slate-200 hover:border-slate-300' : 'border-rose-300 bg-rose-50/20'
              }`}
            >
              <div
                onClick={() => toggleExpand(t.id)}
                className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {t.isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {t.id}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">| {t.category}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                    <p className="text-xs font-medium text-slate-700 mt-1.5 flex items-center gap-1">
                      <span className="font-bold">검증 결과:</span> {t.details}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-slate-400">{t.durationMs} ms</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                      t.isPassed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    {t.isPassed ? 'PASS' : 'FAIL'}
                  </span>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable Diagnostics Drawer */}
              {isExpanded && t.diagnostics && (
                <div className="p-4 bg-slate-900 text-slate-200 border-t border-slate-200 font-mono text-[11px] overflow-x-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs font-bold text-slate-400">
                    <span>진단 상세 텔레메트리 데이터 (JSON)</span>
                    <span>{t.id} Diagnostics</span>
                  </div>
                  <pre className="text-emerald-400 leading-relaxed">
                    {JSON.stringify(t.diagnostics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
