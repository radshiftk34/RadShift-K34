import React, { useState } from 'react';
import { UserRole } from '../services/supabaseClient';
import { Shield, Users, Eye, History, Check, X } from 'lucide-react';

export interface MemberProfile {
  id: string;
  email: string;
  name: string;
  slotNo: number;
  unit: '3U' | '4U' | 'FLOAT';
  role: UserRole;
  status: 'approved' | 'pending' | 'rejected';
  telegramId?: string;
  joinedAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actionType: 'OVERRIDE_SHIFT' | 'APPROVE_USER' | 'ASSIGN_RELIEF' | 'SCENARIO_COMMIT';
  description: string;
  target: string;
}

interface MemberManagementProps {
  currentRole: UserRole;
  anonymize: boolean;
  onToggleAnonymize: () => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  currentRole,
  anonymize,
  onToggleAnonymize,
}) => {
  const [members, setMembers] = useState<MemberProfile[]>([
    { id: '1', email: 'choi@khnp.co.kr', name: '최창호', slotNo: 1, unit: '4U', role: 'L1_VIEWER', status: 'approved', telegramId: '@choi_hp', joinedAt: '2025-12-01' },
    { id: '2', email: 'son@khnp.co.kr', name: '손정기', slotNo: 2, unit: '4U', role: 'L2_HP', status: 'approved', telegramId: '@son_hp', joinedAt: '2025-12-01' },
    { id: '3', email: 'park@khnp.co.kr', name: '박경욱', slotNo: 3, unit: '3U', role: 'L1_VIEWER', status: 'approved', telegramId: '@park_hp', joinedAt: '2025-12-01' },
    { id: '4', email: 'lim@khnp.co.kr', name: '임원택', slotNo: 4, unit: '3U', role: 'L2_HP', status: 'approved', telegramId: '@lim_hp', joinedAt: '2025-12-01' },
    { id: '5', email: 'na@khnp.co.kr', name: '나상흠', slotNo: 5, unit: '3U', role: 'L1_VIEWER', status: 'approved', telegramId: '@na_hp', joinedAt: '2025-12-01' },
    { id: '6', email: 'kwon@khnp.co.kr', name: '권재호', slotNo: 6, unit: '3U', role: 'L1_VIEWER', status: 'approved', telegramId: '@kwon_hp', joinedAt: '2025-12-01' },
    { id: '7', email: 'lee@khnp.co.kr', name: '이근현', slotNo: 7, unit: '4U', role: 'L1_VIEWER', status: 'approved', telegramId: '@lee_hp', joinedAt: '2025-12-01' },
    { id: '8', email: 'shin@khnp.co.kr', name: '신욱제', slotNo: 8, unit: '4U', role: 'L1_VIEWER', status: 'approved', telegramId: '@shin_hp', joinedAt: '2025-12-01' },
    { id: '9', email: 'song@khnp.co.kr', name: '송명관', slotNo: 9, unit: 'FLOAT', role: 'L3_ADMIN', status: 'approved', telegramId: '@song_hp', joinedAt: '2025-12-01' },
    { id: '10', email: 'lee_new@khnp.co.kr', name: '이재겸', slotNo: 1, unit: '3U', role: 'L1_VIEWER', status: 'pending', telegramId: '@lee_new_hp', joinedAt: '2027-03-01' },
    { id: '11', email: 'park_sh@khnp.co.kr', name: '박상현', slotNo: 5, unit: '3U', role: 'L1_VIEWER', status: 'pending', telegramId: '@park_sh', joinedAt: '2027-01-01' },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: 'log-1',
      timestamp: '2026-11-25 18:20:10',
      actorName: '송명관 (관리자)',
      actorRole: 'L3_ADMIN',
      actionType: 'OVERRIDE_SHIFT',
      description: '2027-01-15 박경욱 연차 및 손정기 대근 승인',
      target: 'Slot 3 -> 연차, Slot 2 -> D',
    },
    {
      id: 'log-2',
      timestamp: '2026-11-25 17:45:00',
      actorName: '송명관 (관리자)',
      actorRole: 'L3_ADMIN',
      actionType: 'APPROVE_USER',
      description: '신규 직원 이재겸 계정 승인 및 Slot 1 배정',
      target: '이재겸 (lee_new@khnp.co.kr)',
    },
    {
      id: 'log-3',
      timestamp: '2026-11-25 16:30:22',
      actorName: '임원택 (교대조장)',
      actorRole: 'L2_HP',
      actionType: 'ASSIGN_RELIEF',
      description: '2027-02-04 긴급 대근 요청 등록',
      target: '3호기 야간 공백 커버',
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    if (currentRole !== 'L3_ADMIN') {
      alert('승인 권한이 없습니다. (관리자 L3_ADMIN 권한 필요)');
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    const targetMember = members.find((m) => m.id === id);
    if (targetMember) {
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actorName: '현재 관리자',
          actorRole: currentRole,
          actionType: 'APPROVE_USER',
          description: `회원 [${targetMember.name}] 가입 상태 ${newStatus === 'approved' ? '승인' : '반려'}`,
          target: targetMember.email,
        },
        ...prev,
      ]);
    }
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    if (currentRole !== 'L3_ADMIN') {
      alert('권한 변경은 최고 관리자(L3_ADMIN)만 가능합니다.');
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  };

  const getDisplayName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const pendingCount = members.filter((m) => m.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Security Toggle */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              인원 배정 및 접근 통제(RBAC) 관리
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  승인 대기 {pendingCount}건
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              한수원 고리 3,4호기 방사선관리(HP) 9슬롯 배정 및 계정 승인제(L1/L2/L3)·감사 로그
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleAnonymize}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              anonymize
                ? 'bg-purple-100 border-purple-300 text-purple-800'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{anonymize ? '익명화 모드 ON (HP-01~09)' : '실명 표시 모드'}</span>
          </button>
        </div>
      </div>

      {/* 9 Slots Configuration Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h3 className="font-extrabold text-slate-900 text-base">고정 9슬롯 교대조 및 계정 승인 현황</h3>
          </div>
          <span className="text-xs text-slate-500">
            * DB단 RLS(Row Level Security) 정책으로 승인(approved)된 사용자만 교대근무표 열람 가능
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
              <tr>
                <th className="py-3 px-4">슬롯</th>
                <th className="py-3 px-4">성명 / 코드</th>
                <th className="py-3 px-4">소속 호기</th>
                <th className="py-3 px-4">이메일</th>
                <th className="py-3 px-4">텔레그램 ID</th>
                <th className="py-3 px-4">접근 권한 (RBAC)</th>
                <th className="py-3 px-4">승인 상태</th>
                <th className="py-3 px-4 text-center">관리 조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                    Slot {m.slotNo}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {getDisplayName(m.slotNo, m.name)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        m.unit === '3U'
                          ? 'bg-blue-100 text-blue-800'
                          : m.unit === '4U'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {m.unit === '3U' ? '3호기' : m.unit === '4U' ? '4호기' : '통상 Day'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{m.email}</td>
                  <td className="py-3.5 px-4 text-sky-600 font-mono">{m.telegramId || '-'}</td>
                  <td className="py-3.5 px-4">
                    {currentRole === 'L3_ADMIN' ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="L1_VIEWER">L1 뷰어</option>
                        <option value="L2_HP">L2 HP 근무자</option>
                        <option value="L2_BANGAN">L2 방안부 담당자</option>
                        <option value="L3_ADMIN">L3 총괄관리자</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        {m.role === 'L3_ADMIN'
                          ? 'L3 총괄관리자'
                          : m.role === 'L2_BANGAN'
                          ? 'L2 방안부 담당자'
                          : m.role === 'L2_HP'
                          ? 'L2 HP 근무자'
                          : 'L1 뷰어'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        m.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : m.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {m.status === 'approved' ? '승인됨 (approved)' : m.status === 'pending' ? '승인 대기 (pending)' : '반려됨'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {m.status === 'pending' ? (
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'approved')}
                          className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" /> 승인
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'rejected')}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-300 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> 반려
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">정상 연동</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-slate-900 text-base">관리자 근무표 수정 및 승인 감사 로그 (Audit Trail)</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">총 {auditLogs.length}건 기록</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold mt-0.5 ${
                    log.actionType === 'OVERRIDE_SHIFT'
                      ? 'bg-amber-100 text-amber-800'
                      : log.actionType === 'APPROVE_USER'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {log.actionType}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{log.description}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    대상: <span className="font-mono text-brand-700">{log.target}</span> | 실행자: {log.actorName} ({log.actorRole})
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
