import React, { useState, useMemo } from 'react';
import { DaySchedule } from '../engine/types';
import { UserRole } from '../services/supabaseClient';
import {
  BanganWorker,
  BanganDayAssignment,
  loadBanganWorkers,
  saveBanganWorkers,
  loadBanganAssignments,
  saveBanganAssignments,
  loadBanganConfig,
  saveBanganConfig,
  generateBanganWorkdayList,
} from '../services/banganScheduleService';
import {
  UserCheck,
  Plus,
  Trash2,
  Save,
  RotateCw,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface BanganSupportAdminProps {
  schedule2027: DaySchedule[];
  currentRole: UserRole;
  onRefreshTodayDashboard?: () => void;
}

export const BanganSupportAdmin: React.FC<BanganSupportAdminProps> = ({
  schedule2027,
  currentRole,
  onRefreshTodayDashboard,
}) => {
  // 1. Config state (start / end dates for 8+1 mode)
  const [config, setConfig] = useState(() => loadBanganConfig());

  // 2. Worker pool state
  const [workers, setWorkers] = useState<BanganWorker[]>(() => loadBanganWorkers());
  const [newWorkerName, setNewWorkerName] = useState<string>('');
  const [newWorkerDept, setNewWorkerDept] = useState<string>('방사선안전부');

  // 3. Assignments state (dateStr -> workerOrder)
  const [assignments, setAssignments] = useState<Record<string, number>>(() => loadBanganAssignments());

  // 4. Feedback / Saved status
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Read-only or editable based on role
  const isEditable = currentRole === 'L3_ADMIN';

  // Compute workday list based on config and schedule
  const workdayList: BanganDayAssignment[] = useMemo(() => {
    return generateBanganWorkdayList(
      config.startDate,
      config.endDate,
      schedule2027,
      workers,
      assignments
    );
  }, [config.startDate, config.endDate, schedule2027, workers, assignments]);

  // Worker assignment counts for fair distribution inspection
  const workerStats = useMemo(() => {
    const counts: Record<number, number> = {};
    workers.forEach((w) => (counts[w.order] = 0));
    workdayList.forEach((item) => {
      if (item.workerOrder && counts[item.workerOrder] !== undefined) {
        counts[item.workerOrder] += 1;
      }
    });
    return counts;
  }, [workers, workdayList]);

  const assignedCount = useMemo(() => {
    return workdayList.filter((item) => item.workerOrder !== null).length;
  }, [workdayList]);

  // Handler: Add worker
  const handleAddWorker = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newWorkerName.trim();
    if (!trimmed) {
      alert('근무가능자 이름을 입력해주세요.');
      return;
    }
    const nextOrder = workers.length + 1;
    const newWorker: BanganWorker = {
      order: nextOrder,
      name: trimmed,
      department: newWorkerDept.trim() || '방사선안전부',
    };
    const updated = [...workers, newWorker];
    setWorkers(updated);
    saveBanganWorkers(updated);
    setNewWorkerName('');
  };

  // Handler: Delete worker and re-index
  const handleDeleteWorker = (orderToDelete: number) => {
    if (!confirm(`순번 ${orderToDelete}번 근무자를 목록에서 삭제하시겠습니까?`)) return;

    // Filter out and re-index
    const remaining = workers
      .filter((w) => w.order !== orderToDelete)
      .map((w, idx) => ({ ...w, order: idx + 1 }));

    // Re-map existing assignments
    const newAssignments: Record<string, number> = {};
    Object.entries(assignments).forEach(([dateStr, order]) => {
      if (order === orderToDelete) {
        // Unassign deleted worker
      } else if (order > orderToDelete) {
        newAssignments[dateStr] = order - 1; // shift down order
      } else {
        newAssignments[dateStr] = order;
      }
    });

    setWorkers(remaining);
    saveBanganWorkers(remaining);
    setAssignments(newAssignments);
    saveBanganAssignments(newAssignments);
  };

  // Handler: Move worker order up/down
  const handleMoveWorker = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workers.length) return;

    const list = [...workers];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((w, idx) => ({ ...w, order: idx + 1 }));
    setWorkers(reordered);
    saveBanganWorkers(reordered);

    // Note: User can re-assign or run auto-cycle
  };

  // Handler: Set single day assignment
  const handleSetDayOrder = (dateStr: string, orderVal: string) => {
    const num = parseInt(orderVal, 10);
    const updated = { ...assignments };
    if (isNaN(num) || num <= 0 || num > workers.length) {
      delete updated[dateStr];
    } else {
      updated[dateStr] = num;
    }
    setAssignments(updated);
  };

  // Handler: Auto-fill cyclical assignments (1, 2, 3... 1, 2, 3...)
  const handleAutoFillCycle = () => {
    if (workers.length === 0) {
      alert('먼저 상단에서 근무가능자를 1명 이상 등록해주세요.');
      return;
    }
    if (
      !confirm(
        `총 ${workdayList.length}일의 일근 근무일에 대해 1번(${workers[0].name})부터 ${workers.length}번까지 순서대로 자동 순환 배정하시겠습니까?`
      )
    ) {
      return;
    }

    const updated: Record<string, number> = {};
    workdayList.forEach((day, idx) => {
      const order = (idx % workers.length) + 1;
      updated[day.dateStr] = order;
    });

    setAssignments(updated);
    saveBanganAssignments(updated);
    setSaveSuccessMessage('모든 일근 근무일에 대해 순환 자동 배정이 적용되었습니다.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
    if (onRefreshTodayDashboard) onRefreshTodayDashboard();
  };

  // Handler: Reset assignments
  const handleResetAssignments = () => {
    if (!confirm('모든 근무일의 지원자 배정을 초기화하시겠습니까?')) return;
    setAssignments({});
    saveBanganAssignments({});
    setSaveSuccessMessage('배정이 초기화되었습니다.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
    if (onRefreshTodayDashboard) onRefreshTodayDashboard();
  };

  // Handler: Save everything
  const handleSaveAll = () => {
    saveBanganWorkers(workers);
    saveBanganAssignments(assignments);
    saveBanganConfig(config);

    setSaveSuccessMessage('방안부 일근 지원 근무표가 성공적으로 저장되었습니다! (대시보드 실시간 반영)');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
    if (onRefreshTodayDashboard) onRefreshTodayDashboard();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-700 to-brand-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold text-slate-900">
                  8+1 방안부 일근 교대지원 근무표 관리
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                  8+1 지원 체제
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                결원(김대호 임피 등) 발생 시 방사선안전부(방안부) 직원의 주간(Day) 교대근무 지원 일정 및 순번을 관리합니다.
              </p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-700">8+1 운영기간:</span>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
              disabled={!isEditable}
              className="px-2 py-1 border border-slate-300 rounded font-semibold text-slate-800 bg-white"
            />
            <span className="text-slate-400 font-bold">~</span>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig((prev) => ({ ...prev, endDate: e.target.value }))}
              disabled={!isEditable}
              className="px-2 py-1 border border-slate-300 rounded font-semibold text-slate-800 bg-white"
            />
          </div>
        </div>

        {/* Info Alert Box */}
        <div className="mt-4 p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-purple-950">
              [운영 규칙] 8+1 모드 방안부 지원 순번 매핑 가이드
            </p>
            <p className="text-purple-800">
              1. <strong>상단 근무가능자 등록</strong>: 지원 가능한 방안부 직원 성명을 추가하면 고유 순번(1, 2, 3...)이 자동 부여됩니다.<br />
              2. <strong>근무일 순번 입력</strong>: 시작일과 종료일 사이의 <strong>평일 일근 근무일(월~금, 공휴일 제외)</strong>에 지원자 순번(1, 2, 3...)을 입력하면 해당 직원이 자동 매핑됩니다.<br />
              3. <strong>대시보드 실시간 표출</strong>: 저장된 지원자 정보는 <strong>당일 및 익일 대시보드</strong>에 실시간으로 표시됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: Top Worker Pool Management */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              1. 방안부 Day 지원 근무가능자 풀 (순번 1, 2, 3... 부여)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              총 {workers.length}명 등록
            </span>
          </div>
        </div>

        {/* Worker Add Form */}
        {isEditable && (
          <form onSubmit={handleAddWorker} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">새 근무가능자 등록:</span>
            <input
              type="text"
              placeholder="직원 성명 (예: 홍길동)"
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
            <input
              type="text"
              placeholder="소속 부서"
              value={newWorkerDept}
              onChange={(e) => setNewWorkerDept(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white w-32"
            />
            <button
              type="submit"
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>근무자 추가 (순번 #{workers.length + 1})</span>
            </button>
          </form>
        )}

        {/* Worker Pool Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {workers.map((worker, idx) => (
            <div
              key={worker.order}
              className="p-3 rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-purple-600 text-white shadow-xs">
                    순번 {worker.order}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    배정 {workerStats[worker.order] || 0}일
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm">{worker.name}</div>
                <div className="text-[11px] text-slate-500">{worker.department || '방사선안전부'}</div>
              </div>

              {isEditable && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveWorker(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px]"
                      title="순번 올리기"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWorker(idx, 'DOWN')}
                      disabled={idx === workers.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px]"
                      title="순번 내리기"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorker(worker.order)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    title="근무자 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Workday Schedule List & Order Assignment */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Actions & Stats Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <span>2. 8+1 모드 일근 근무일(월~금, 공휴일 제외) 지원 배정 목록</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              순번을 입력하면 상단에 설정된 직원이 자동으로 지정되며, 오늘/내일 대시보드에 표출됩니다.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
              총 일근 근무일: {workdayList.length}일
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-bold border ${
                assignedCount === workdayList.length
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              배정 완료: {assignedCount} / {workdayList.length}일
            </span>
          </div>
        </div>

        {/* Toolbar: Auto-cycle and Save */}
        {isEditable && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFillCycle}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
                title="1번부터 N번까지 순서대로 자동 순환 배정"
              >
                <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                <span>1, 2, 3... 순환 자동 배정</span>
              </button>
              <button
                type="button"
                onClick={handleResetAssignments}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <span>배정 초기화</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-700 to-brand-600 hover:from-purple-800 hover:to-brand-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>방안부 지원표 저장 (대시보드 실시간 반영)</span>
            </button>
          </div>
        )}

        {/* Workday Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-extrabold">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">No.</th>
                <th className="px-3 py-2.5 text-left">근무 일자</th>
                <th className="px-2 py-2.5 text-center">요일</th>
                <th className="px-3 py-2.5 text-left">교대 지원 대상 및 호기</th>
                <th className="px-3 py-2.5 text-left w-48">지원자 순번 지정</th>
                <th className="px-3 py-2.5 text-left">배정된 지원자 성명</th>
                <th className="px-3 py-2.5 text-center w-20">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {workdayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    선택된 기간({config.startDate} ~ {config.endDate}) 내에 해당하는 평일 일근 근무일이 없습니다.
                  </td>
                </tr>
              ) : (
                workdayList.map((day, idx) => {
                  const isAssigned = day.workerOrder !== null && day.workerName !== '';
                  return (
                    <tr
                      key={day.dateStr}
                      className={`hover:bg-slate-50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Row No */}
                      <td className="px-3 py-2 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2 font-extrabold text-slate-900">
                        {day.dateStr}
                      </td>

                      {/* Day of Week */}
                      <td className="px-2 py-2 text-center font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            day.dayOfWeek === '월'
                              ? 'bg-blue-50 text-blue-700'
                              : day.dayOfWeek === '금'
                              ? 'bg-amber-50 text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {day.dayOfWeek}요일
                        </span>
                      </td>

                      {/* Shift Support Target */}
                      <td className="px-3 py-2">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                              day.shiftCode === '3D'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : day.shiftCode === '4D'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-purple-100 text-purple-800 border-purple-300'
                            }`}
                          >
                            {day.shiftCode}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {day.unitSupportType}
                          </span>
                        </div>
                      </td>

                      {/* Worker Order Input */}
                      <td className="px-3 py-2">
                        {isEditable ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min={1}
                              max={workers.length}
                              value={day.workerOrder || ''}
                              onChange={(e) => handleSetDayOrder(day.dateStr, e.target.value)}
                              placeholder="순번"
                              className="w-16 px-2 py-1 border border-slate-300 rounded font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            <select
                              value={day.workerOrder || ''}
                              onChange={(e) => handleSetDayOrder(day.dateStr, e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            >
                              <option value="">(미배정)</option>
                              {workers.map((w) => (
                                <option key={w.order} value={w.order}>
                                  #{w.order} {w.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-700">
                            {day.workerOrder ? `순번 ${day.workerOrder}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Worker Name Display */}
                      <td className="px-3 py-2">
                        {isAssigned ? (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="font-black text-emerald-900">
                              [순번 {day.workerOrder}]
                            </span>
                            <span className="font-bold text-emerald-950">
                              {day.workerName}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-400">
                            미배정 (순번 필요)
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-2 text-center">
                        {isAssigned ? (
                          <span className="inline-flex items-center text-emerald-600 font-bold">
                            <CheckCircle2 className="w-4 h-4 mr-0.5" />
                            완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-amber-500 font-bold">
                            <AlertCircle className="w-4 h-4 mr-0.5" />
                            대기
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
