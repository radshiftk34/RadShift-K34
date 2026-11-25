import React from 'react';
import { UserRole } from '../services/supabaseClient';
import versionData from '../../version.json';
import {
  Calendar,
  Shield,
  Users,
  Download,
  Eye,
  EyeOff,
  Bot,
  Sliders,
  Cpu,
  RotateCw,
  FileSpreadsheet,
  Database,
  CalendarCheck,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  year?: number;
  anonymize: boolean;
  onToggleAnonymize: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExportExcel: () => void;
  onOpenVersionModal: () => void;
  isDbConnected?: boolean;
  onOpenDbModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  year = 2026,
  anonymize,
  onToggleAnonymize,
  activeTab,
  onTabChange,
  onExportExcel,
  onOpenVersionModal,
  isDbConnected = false,
  onOpenDbModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Service Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 font-bold text-lg">
              RS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  RadShift_K34
                </span>
                {currentRole === 'L3_ADMIN' && (
                  <button
                    onClick={onOpenVersionModal}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                    title="버전 정보 및 업데이트 내역 보기 (L3 관리자 전용)"
                  >
                    v{versionData.version}
                  </button>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  {year === 2026 ? '2026 정상 9인' : '2027 8+1 지원'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                한수원 고리 3,4호기 방사선관리(HP) 교대근무 관리 시스템
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Anonymize Toggle */}
            <button
              onClick={onToggleAnonymize}
              className={`p-2 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-colors ${anonymize
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              title={anonymize ? '실명으로 보기' : '슬롯코드로 익명화 보기'}
            >
              {anonymize ? (
                <EyeOff className="w-4 h-4 text-purple-600" />
              ) : (
                <Eye className="w-4 h-4 text-slate-500" />
              )}
              <span className="hidden md:inline">
                {anonymize ? '익명(HP-01)' : '실명 표시'}
              </span>
            </button>

            {/* DB Connection Pill */}
            {onOpenDbModal && (
              <button
                onClick={onOpenDbModal}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition-colors ${isDbConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                title="공유 PostgreSQL 데이터베이스(Supabase) 연동 상태 확인 및 설정"
              >
                <Database className="w-3.5 h-3.5" />
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: isDbConnected ? '#10b981' : '#f59e0b' }}
                />
                <span className="hidden sm:inline">
                  {isDbConnected ? 'DB 연결됨' : 'DB 설정'}
                </span>
              </button>
            )}

            {/* Excel Download Button */}
            <button
              onClick={onExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">엑셀(.xlsx)</span>
            </button>

            {/* Role Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1 text-xs">
              <span className="text-slate-500 text-[10px] uppercase font-bold px-1.5 hidden lg:inline">
                권한:
              </span>
              {(['L1_VIEWER', 'L2_HP', 'L3_ADMIN'] as UserRole[]).map((r) => {
                const label =
                  r === 'L1_VIEWER' ? 'L1 뷰어' : r === 'L2_HP' ? 'L2 HP' : 'L3 관리자';
                const isActive = currentRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    className={`px-2 py-1 rounded-md transition-all font-medium ${isActive
                      ? r === 'L3_ADMIN'
                        ? 'bg-purple-600 text-white shadow-sm font-semibold'
                        : 'bg-brand-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-3 border-t border-slate-100 overflow-x-auto py-2">
          {[
            { id: 'matrix', label: '월간 근무표', icon: Sliders, badge: '메인' },
            { id: 'annual', label: '연간 근무표 (엑셀 양식)', icon: FileSpreadsheet, badge: '공식 양식' },
            { id: 'dashboard', label: '오늘/내일 대시보드', icon: Calendar },
            { id: 'leave', label: '휴가·대근 관리', icon: Users, badge: 'Top 3' },
            { id: 'scenario', label: '시뮬레이터 (원형 큐)', icon: RotateCw },
            { id: 'telegram', label: '텔레그램 봇 연동', icon: Bot },
            { id: 'bangan', label: '방안부 일근 지원표', icon: CalendarCheck, badge: '8+1' },
            {
              id: 'members',
              label: '슬롯·인원 및 근무 관리',
              icon: Shield,
              badge: '관리자',
              highlight: currentRole === 'L3_ADMIN',
            },
            ...(currentRole === 'L3_ADMIN'
              ? [
                {
                  id: 'onestep-test',
                  label: '원스텝 종합 진단',
                  icon: Cpu,
                  badge: 'L3 전용',
                  highlight: true,
                },
              ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${isActive
                  ? tab.highlight
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? (tab.highlight ? 'text-white' : 'text-brand-600') : 'text-slate-400'
                    }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${isActive && tab.highlight
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-brand-100 text-brand-800'
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
