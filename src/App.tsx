import { useState, useMemo } from 'react';
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
import { exportScheduleToExcel } from './utils/excelExport';

export default function App() {
  const engine = useMemo(() => new ShiftEngine(), []);

  // Pre-generate full schedules
  const schedule2026 = useMemo(() => engine.generateSchedule('2026-01-01', '2026-12-31'), [engine]);
  const schedule2027 = useMemo(() => engine.generateSchedule('2027-01-01', '2027-12-31'), [engine]);

  // UI State
  const [year, setYear] = useState<number>(2027);
  const [activeTab, setActiveTab] = useState<string>('matrix');
  const [currentRole, setCurrentRole] = useState<UserRole>('L3_ADMIN');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // Pre-authenticated for review
  const [anonymize, setAnonymize] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<Record<string, ShiftCode>>({});
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);

  const activeSchedule = year === 2026 ? schedule2026 : schedule2027;

  // Handlers
  const handleApplyOverride = (key: string, newCode: ShiftCode) => {
    setOverrides((prev) => ({ ...prev, [key]: newCode }));
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
        onRoleChange={(role) => {
          setCurrentRole(role);
          if (role !== 'L3_ADMIN' && activeTab === 'members') {
            setActiveTab('matrix');
          }
        }}
        year={year}
        onYearChange={setYear}
        anonymize={anonymize}
        onToggleAnonymize={() => setAnonymize((v) => !v)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportExcel={handleExportExcel}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
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
            <button
              onClick={() => setIsVersionModalOpen(true)}
              className="ml-2 text-brand-600 hover:text-brand-800 underline font-semibold"
            >
              버전 v1.3.0 (업데이트 내역)
            </button>
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

      {/* Version Modal */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
    </div>
  );
}
