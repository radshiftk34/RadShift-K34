import React, { useState } from 'react';
import { DaySchedule } from '../engine/types';
import { handleTelegramCommand } from '../engine/telegramDispatcher';
import { Bot, Send, BellRing } from 'lucide-react';

interface TelegramBotSimulatorProps {
  schedule: DaySchedule[];
  anonymize: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  buttons?: Array<{ label: string; callbackData: string }>;
  timestamp: string;
}

export const TelegramBotSimulator: React.FC<TelegramBotSimulatorProps> = ({ schedule, anonymize }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: `🤖 [한수원 고리 3,4호기 HP 교대근무 공식 텔레그램 봇 @RadShiftK34_Bot]\n\n단톡방 양방향 명령어를 입력하거나 아래 인라인 버튼을 탭하세요.\n\n명령어 안내:\n• /오늘 - 당일 3,4호기 D/A/N 및 통상Day 브리핑\n• /내일 - 익일 교대조 사전안내\n• /근무 [이름] - 대상자 14일 근무표 조회\n• /대근요청 [날짜] [사유] - 대근 신청 및 Top 3 추천 카드\n• /비교 - 2026 vs 2027 연간 비교\n• /월간 [YYYY-MM] - 월간 가동 통계`,
      buttons: [
        { label: '📢 /오늘 근무 현황', callbackData: '/오늘' },
        { label: '📅 /내일 근무 사전안내', callbackData: '/내일' },
        { label: '🔄 /대근요청 2027-01-15 연차', callbackData: '/대근요청 2027-01-15 연차' },
        { label: '📊 /비교 (2026 vs 2027)', callbackData: '/비교' },
      ],
      timestamp: '오전 07:00',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const sendCommand = (cmdText: string) => {
    if (!cmdText.trim()) return;
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // 1. User message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: cmdText,
      timestamp: now,
    };

    // 2. Bot reply from dispatcher
    let botReplyMsg: ChatMessage;
    if (cmdText.startsWith('accept_relief_')) {
      const parts = cmdText.split('_');
      const date = parts[2];
      const slot = parts[3];
      botReplyMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🎉 [대근 수락 확정 알림]\nSlot ${slot} 님이 [${date}] 대근을 수락하였습니다.\n• 실시간 제약 검증: 통과 (연속근무 3일 이하, 역순환 0건)\n• 관리자 자동 승인 완료되어 현업 근무표에 즉시 반영되었습니다!`,
        timestamp: now,
      };
    } else {
      const resp = handleTelegramCommand(cmdText, schedule, anonymize);
      botReplyMsg = {
        id: resp.id,
        sender: 'bot',
        text: resp.text,
        buttons: resp.buttons,
        timestamp: now,
      };
    }

    setMessages((prev) => [...prev, userMsg, botReplyMsg]);
    setInputText('');
  };

  const handleCronBriefing = () => {
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const resp = handleTelegramCommand('/오늘', schedule, anonymize);
    const cronMsg: ChatMessage = {
      id: `cron-${Date.now()}`,
      sender: 'bot',
      text: `⏰ [오전 07:00 KST 정기 자동 브리핑 (Daily Cron)]\n\n${resp.text}`,
      buttons: resp.buttons,
      timestamp: now,
    };
    setMessages((prev) => [...prev, cronMsg]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              텔레그램 단톡방 양방향 봇 시뮬레이터 (@RadShiftK34_Bot)
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                Webhook & Cron 연동
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Supabase Edge Function(telegram-webhook & daily-briefing-cron)과 대화형 텔레그램 모바일 UI 시뮬레이션
            </p>
          </div>
        </div>

        <button
          onClick={handleCronBriefing}
          className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-brand-600 text-white rounded-xl text-xs font-bold hover:brightness-105 shadow-sm flex items-center gap-1.5"
        >
          <BellRing className="w-4 h-4" /> 매일 07:00 정기 브리핑 발송 테스트
        </button>
      </div>

      {/* Simulated Mobile Telegram Screen */}
      <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl border-4 border-slate-700 max-w-md mx-auto flex flex-col h-[640px]">
        {/* Mock Telegram Header */}
        <div className="bg-slate-800/90 backdrop-blur rounded-2xl p-3 mb-3 flex items-center justify-between text-white border border-slate-700">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center font-black text-sm">
              HP
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-100">고리 3,4호기 HP 단톡방</h3>
              <p className="text-[10px] text-sky-300">9 members, 1 bot online</p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE
          </span>
        </div>

        {/* Message History Area */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                  {m.text}
                </div>

                {/* Inline Buttons */}
                {m.buttons && m.buttons.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                    {m.buttons.map((b, i) => (
                      <button
                        key={i}
                        onClick={() => sendCommand(b.callbackData)}
                        className="w-full text-center py-1.5 px-2 bg-slate-700/80 hover:bg-slate-700 text-sky-300 rounded-lg text-[10px] font-bold border border-slate-600 transition-colors"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1 text-right font-mono ${
                    m.sender === 'user' ? 'text-sky-200' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mock Telegram Input Bar */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCommand(inputText)}
            placeholder="명령어 입력 (/오늘, /근무, /대근요청)..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            onClick={() => sendCommand(inputText)}
            className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
