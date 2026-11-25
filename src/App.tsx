import { useState, useMemo, useEffect, useCallback } from 'react';
import { ShiftEngine } from './engine/shiftEngine';
import { ShiftCode } from './engine/types';
import { UserRole } from './services/supabaseClient';
import { Header } from './components/Header';
import { TodayDashboard } from './components/TodayDashboard';
import { MonthlyMatrix } from './components/MonthlyMatrix';
import { AnnualScheduleView } from './components/AnnualScheduleView';
import { LeaveReliefModal } from './components/LeaveReliefModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { TelegramBotSimulator } from './components/TelegramBotSimulator';
import { SlotMemberAdmin } from './components/SlotMemberAdmin';
import { OneStepTestModule } from './components/OneStepTestModule';
import { AuthModal } from './components/AuthModal';
import { VersionModal } from './components/VersionModal';
import versionData from '../version.json';
import { DbConnectionModal } from './components/DbConnectionModal';
import { exportScheduleToExcel } from './utils/excelExport';
import {
  checkDbConnection,
  fetchRemoteOverrides,
  saveRemoteOverride,
} from './services/dbSyncService';

export default function App() {
  const engine = useMemo(() => new ShiftEngine(), []);

  // Pre-generate full schedules
  const schedule2026 = useMemo(() => engine.generateSchedule('2026-01-01', '2026-12-31'), [engine]);
  const schedule2027 = useMemo(() => engine.generateSchedule('2027-01-01', '2027-12-31'), [engine]);

  // UI State: Default to current year (2026 or 2027) based on today's real date
  const defaultYear = useMemo(() => {
    const curYear = new Date().getFullYear();
    return curYear === 2027 ? 2027 : 2026;
  }, []);
  const [year, setYear] = useState<number>(defaultYear);
  const [activeTab, setActiveTab] = useState<string>('matrix');
  const [currentRole, setCurrentRole] = useState<UserRole>('L3_ADMIN');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // Pre-authenticated for review
  const [anonymize, setAnonymize] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<Record<string, ShiftCode>>({});
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // Initial DB connection & sync
  const refreshRemoteData = useCallback(() => {
    checkDbConnection().then((res) => {
      setIsDbConnected(res.isConnected);
      if (res.isConnected) {
        fetchRemoteOverrides().then((remoteOverrides) => {
          if (Object.keys(remoteOverrides).length > 0) {
            setOverrides((prev) => ({ ...prev, ...remoteOverrides }));
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    refreshRemoteData();
  }, [refreshRemoteData]);

  const activeSchedule = year === 2026 ? schedule2026 : schedule2027;

  // Handlers
  const handleApplyOverride = (key: string, newCode: ShiftCode, note?: string) => {
    setOverrides((prev) => ({ ...prev, [key]: newCode }));
    // Asynchronously persist to remote Supabase if connected
    const [dateStr, slotNoStr] = key.split('_');
    if (dateStr && slotNoStr) {
      saveRemoteOverride(dateStr, parseInt(slotNoStr, 10), '', '', newCode, note);
    }
  };

  const handleResetOverrides = () => {
    setOverrides({});
  };

  const handleApplyRelief = (
    targetDate: string,
    requesterSlot: number,
    reliefSlot: number,
    _reason: string
  ) => {
    // Override requester with '연차' (X) and relief with D/A/N
    const requesterKey = `${targetDate}_${requesterSlot}`;
    const reliefKey = `${targetDate}_${reliefSlot}`;
    const day = activeSchedule.find((d) => d.dateStr === targetDate);
    const reqShift = day?.shifts.find((s) => s.slotNo === requesterSlot);
    const origCode = reqShift?.shiftCode || 'D';

    setOverrides((prev) => ({
      ...prev,
      [requesterKey]: '연차' as ShiftCode,
      [reliefKey]: origCode,
    }));
  };

  const handleExportExcel = () => {
    exportScheduleToExcel(schedule2026, schedule2027, year);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        year={year}
        anonymize={anonymize}
        onToggleAnonymize={() => setAnonymize((v) => !v)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportExcel={handleExportExcel}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
        isDbConnected={isDbConnected}
        onOpenDbModal={() => setIsDbModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'matrix' && (
          <MonthlyMatrix
            schedule={activeSchedule}
            year={year}
            currentRole={currentRole}
            anonymize={anonymize}
            overrides={overrides}
            onApplyOverride={handleApplyOverride}
            onResetOverrides={handleResetOverrides}
            onYearChange={setYear}
            onOpenAnnualView={() => setActiveTab('annual')}
          />
        )}

        {activeTab === 'annual' && (
          <AnnualScheduleView
            anonymize={anonymize}
            onExportExcel={handleExportExcel}
            initialYear={year}
            onYearChange={setYear}
          />
        )}

        {activeTab === 'dashboard' && (
          <TodayDashboard
            schedule={activeSchedule}
            anonymize={anonymize}
            year={year}
          />
        )}

        {activeTab === 'leave' && (
          <LeaveReliefModal
            schedule={activeSchedule}
            anonymize={anonymize}
            currentRole={currentRole}
            onApplyRelief={handleApplyRelief}
          />
        )}

        {activeTab === 'scenario' && (
          <ScenarioSimulator
            schedule2026={schedule2026}
            schedule2027={schedule2027}
            anonymize={anonymize}
            onApplyScenarioToLive={(newOverrides) => setOverrides((prev) => ({ ...prev, ...newOverrides }))}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramBotSimulator
            schedule={activeSchedule}
            anonymize={anonymize}
          />
        )}

        {activeTab === 'members' && (
          <SlotMemberAdmin
            currentRole={currentRole}
            anonymize={anonymize}
            onToggleAnonymize={() => setAnonymize((v) => !v)}
            year={year}
            onCommitSchedule={(newOverrides) =>
              setOverrides((prev) => ({ ...prev, ...newOverrides }))
            }
            onRoleChange={setCurrentRole}
          />
        )}

        {activeTab === 'onestep-test' && (
          <OneStepTestModule engine={engine} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            <span className="font-semibold text-slate-700">RadShift_K34</span> | 한국수력원자력 고리 3,4호기 HP 교대근무 관리 시스템
            {currentRole === 'L3_ADMIN' && (
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="ml-2 text-brand-600 hover:text-brand-800 underline font-semibold"
                title="시스템 버전 정보 및 업데이트 내역 (L3 관리자 전용)"
              >
                버전 v{versionData.version} (업데이트 내역)
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <AuthModal
              currentRole={currentRole}
              isLoggedIn={isLoggedIn}
              onLogin={(role) => {
                setCurrentRole(role);
                setIsLoggedIn(true);
              }}
              onLogout={() => setIsLoggedIn(false)}
            />
          </div>
        </div>
      </footer>

      {/* Version Modal (L3 관리자 전용) */}
      {currentRole === 'L3_ADMIN' && (
        <VersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
        />
      )}

      {/* DB Connection Modal */}
      <DbConnectionModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onRefreshData={refreshRemoteData}
      />
    </div>
  );
}
