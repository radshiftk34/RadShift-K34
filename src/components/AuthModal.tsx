import React, { useState } from 'react';
import { UserRole } from '../services/supabaseClient';
import { Lock } from 'lucide-react';

interface AuthModalProps {
  currentRole: UserRole;
  isLoggedIn: boolean;
  onLogin: (role: UserRole) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentRole,
  isLoggedIn,
  onLogin,
  onLogout,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);

  if (isLoggedIn) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-slate-500 font-medium">로그인 계정:</span>
        <span className="font-bold text-slate-900">
          {currentRole === 'L3_ADMIN'
            ? '관리자 (L3)'
            : currentRole === 'L2_BANGAN'
            ? '방안부 담당자 (L2)'
            : currentRole === 'L2_HP'
            ? 'HP 근무자 (L2)'
            : '일반 조회자 (L1)'}
        </span>
        <button
          onClick={onLogout}
          className="text-xs text-red-600 hover:text-red-700 underline font-semibold ml-2"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">RadShift_K34 로그인</h2>
          <p className="text-xs text-slate-500">
            [원전 보안 원칙] 비인가 접근 차단을 위해 관리자 승인제(RBAC) 및 Row Level Security를 적용합니다.
          </p>
        </div>

        {/* Quick Role Selection for Demo & Evaluation */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-700 block">체험할 권한 선택:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { role: 'L1_VIEWER', label: 'L1 뷰어', desc: '조회 전용' },
              { role: 'L2_HP', label: 'L2 HP', desc: '휴가/대근' },
              { role: 'L2_BANGAN', label: 'L2 방안부', desc: '일근지원표' },
              { role: 'L3_ADMIN', label: 'L3 관리자', desc: '전체 편집' },
            ].map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => setSelectedRole(item.role as UserRole)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  selectedRole === item.role
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">한수원 사번 이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@khnp.co.kr"
              className="w-full text-xs font-medium px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs font-medium px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
        </div>

        <button
          onClick={() => onLogin(selectedRole)}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all text-xs"
        >
          {selectedRole === 'L3_ADMIN' ? '관리자 승인 모드로 접속' : `${selectedRole} 권한으로 로그인`}
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          신규 가입 시 status = 'pending' 상태로 생성되며 관리자 승인 후 접근이 허용됩니다.
        </p>
      </div>
    </div>
  );
};
