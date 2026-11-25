import React, { useState, useEffect } from 'react';
import { checkDbConnection, DbStatus } from '../services/dbSyncService';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Check,
} from 'lucide-react';

interface DbConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const DbConnectionModal: React.FC<DbConnectionModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setIsLoading(true);
    const res = await checkDbConnection();
    setStatus(res);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySqlGuide = () => {
    const sqlGuidePath = 'supabase/complete_setup.sql';
    navigator.clipboard.writeText(
      `-- Supabase SQL Editor에서 실행할 스크립트는 프로젝트 내 ${sqlGuidePath} 파일에 저장되어 있습니다.`
    );
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                공유 PostgreSQL 데이터베이스(Supabase) 연동 상태
              </h3>
              <p className="text-xs text-slate-500">
                발전소 교대근무자 전원 실시간 동기화 및 2-Layer 영구 저장소
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            status?.isConnected
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : status?.isConfigured
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {status?.isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle
                  className={`w-6 h-6 shrink-0 mt-0.5 ${
                    status?.isConfigured ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {status?.isConnected
                    ? '공유 데이터베이스에 정상 연결되었습니다.'
                    : status?.isConfigured
                    ? 'DB 엔드포인트 응답 오류'
                    : '공유 DB 미설정 (현재 로컬 메모리 모드)'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {status?.message || '연결 상태를 진단 중입니다...'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white shadow-xs border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0 ml-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>연결 재검사</span>
            </button>
          </div>

          {/* Connection Details */}
          <div className="mt-4 pt-3 border-t border-current/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="opacity-70 font-medium">연결 호스트: </span>
              <span className="font-mono font-bold truncate block mt-0.5">
                {status?.url || 'VITE_SUPABASE_URL'}
              </span>
            </div>
            <div>
              <span className="opacity-70 font-medium">네트워크 지연시간 (Ping): </span>
              <span className="font-mono font-bold block mt-0.5">
                {status?.pingMs !== undefined ? `${status.pingMs} ms` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Step Setup Guide */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
            <Server className="w-4 h-4 text-brand-600" />
            <span>공유 데이터베이스(Supabase) 3분 연동 4단계 가이드</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            {/* Step 1 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="flex-1">
                <span className="font-bold text-slate-900">Supabase 무료 계정 생성 및 프로젝트 생성</span>
                <p className="text-slate-500 mt-0.5">
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 font-bold underline inline-flex items-center space-x-1"
                  >
                    <span>https://supabase.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  접속 후 무료 프로젝트 생성 (Region: Seoul ap-northeast-2 선택)
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    원클릭 테이블 생성 스크립트 실행
                  </span>
                  <button
                    onClick={handleCopySqlGuide}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-brand-700 border border-brand-200 rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-xs"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? '복사됨!' : 'SQL 경로 복사'}</span>
                  </button>
                </div>
                <p className="text-slate-500 mt-0.5">
                  Supabase 대시보드 좌측 <strong className="text-slate-700">[SQL Editor]</strong>에 프로젝트의{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px] text-purple-700">
                    supabase/complete_setup.sql
                  </code>{' '}
                  내용을 붙여넣고 [Run] 실행
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="flex-1">
                <span className="font-bold text-slate-900">API 키 복사 및 .env 파일 생성</span>
                <p className="text-slate-500 mt-0.5">
                  Supabase 좌측 하단 <strong className="text-slate-700">[Project Settings] → [API]</strong>에서{' '}
                  <span className="font-mono text-brand-700">Project URL</span> 및{' '}
                  <span className="font-mono text-brand-700">anon public key</span>를 복사하여 프로젝트 루트의{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> 파일에 입력
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div className="flex-1">
                <span className="font-bold text-slate-900">start.bat 재실행 후 완료</span>
                <p className="text-slate-500 mt-0.5">
                  로컬 서비스를 재실행하면 본 창에 <span className="font-bold text-emerald-600">'정상 연결됨'</span> 초록색 불이 켜지며 모든 기기에서 데이터가 실시간 연동됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            * GitHub 공개 저장소 배포 시 비밀번호/실명 노출 없이 안전하게 보호됩니다.
          </div>
          <div className="flex items-center space-x-2">
            {onRefreshData && status?.isConnected && (
              <button
                onClick={() => {
                  onRefreshData();
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                DB 데이터 불러오기
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
