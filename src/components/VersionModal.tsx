import React from 'react';
import versionData from '../../version.json';
import { ExternalLink, GitCommit, Layers, Tag, X } from 'lucide-react';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base">버전 및 시스템 업데이트 관리</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white/20 text-white">
                  v{versionData.version}
                </span>
              </div>
              <p className="text-xs text-brand-100">{versionData.serviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Build Meta Box */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">현재 버전</span>
              <span className="font-black text-brand-700 text-sm block mt-0.5">v{versionData.version}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">릴리즈 일자</span>
              <span className="font-bold text-slate-800 text-sm block mt-0.5">{versionData.releaseDate}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">빌드 번호</span>
              <span className="font-bold text-slate-800 text-sm block mt-0.5">#{versionData.buildNumber}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">GitHub 연동</span>
              <a
                href={versionData.repository}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand-600 hover:text-brand-800 text-sm flex items-center space-x-1 mt-0.5"
              >
                <span>저장소 방문</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Updates List Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>누적 업데이트 내역 (Changelog History)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">자동 생성 스크립트 연동</span>
          </div>

          {versionData.updates.map((update, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 text-sm">v{update.version}</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      update.type === 'major'
                        ? 'bg-purple-100 text-purple-800'
                        : update.type === 'minor'
                        ? 'bg-brand-100 text-brand-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {update.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{update.date}</span>
                </div>
              </div>

              <div className="font-bold text-xs text-slate-800">{update.title}</div>

              {/* Highlights */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {update.highlights.map((h, i) => (
                  <div key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1 text-slate-400">
            <GitCommit className="w-3.5 h-3.5" />
            <span>최신 커밋: {versionData.gitCommit}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
