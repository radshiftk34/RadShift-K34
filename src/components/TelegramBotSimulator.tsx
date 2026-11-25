import React, { useState } from 'react';
import { DaySchedule } from '../engine/types';
import { Bot, Send } from 'lucide-react';

interface TelegramBotSimulatorProps {
  schedule: DaySchedule[];
  anonymize: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  buttons?: { label: string; action: string }[];
  timestamp: string;
}

export const TelegramBotSimulator: React.FC<TelegramBotSimulatorProps> = ({ schedule, anonymize }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: `🤖 [고리 3,4호기 HP 교대근무 봇 @RadShiftBot]\n명령어를 입력하거나 아래 추천 버튼을 탭하세요.\n\n사용 가능 명령어:\n/오늘 , /내일 , /근무 [이름] , /월간 , /비교 , /대근요청`,
      buttons: [
        { label: '📢 /오늘 근무 현황', action: '/오늘' },
        { label: '📅 /내일 근무 사전안내', action: '/내일' },
        { label: '🔄 /대근요청 테스트', action: '/대근요청' },
        { label: '📊 /비교 (2026 vs 2027)', action: '/비교' },
      ],
      timestamp: '07:00',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // User message
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: trimmed,
      timestamp: now,
    };

    let botReplyText = '';
    let buttons: { label: string; action: string }[] | undefined = undefined;

    const today = schedule[0]; // representative today
    const tomorrow = schedule[1];

    if (trimmed === '/오늘') {
      const getUnitText = (unit: '3U' | '4U') => {
        const d = today.shifts.find((s) => (s.unit === unit && s.shiftCode === 'D') || (s.shiftCode === (unit === '3U' ? '3D' : '4D')));
        const a = today.shifts.find((s) => s.unit === unit && s.shiftCode === 'A');
        const n = today.shifts.find((s) => s.unit === unit && (s.shiftCode === 'N' || s.shiftCode === '3N'));
        return `D: ${d ? getName(d.slotNo, d.memberName) : '-'} | A: ${a ? getName(a.slotNo, a.memberName) : '-'} | N: ${n ? getName(n.slotNo, n.memberName) : '-'}`;
      };

      botReplyText = `📢 [${today.dateStr} 당일 교대조 현황]\n\n🔹 고리 3호기:\n${getUnitText('3U')}\n\n🔹 고리 4호기:\n${getUnitText('4U')}\n\n🏖️ 휴무(X): ${today.shifts.filter((s) => s.shiftCode === 'X').map((s) => getName(s.slotNo, s.memberName)).join(', ')}\n\n✅ 일일 커버리지: 정상 (6인 근무 / 3인 휴무)`;
      buttons = [
        { label: '내일 근무 보기', action: '/내일' },
        { label: '웹앱 전체보기', action: 'WEBAPP_OPEN' },
      ];
    } else if (trimmed === '/내일') {
      botReplyText = `📅 [${tomorrow?.dateStr} 익일 근무 사전 안내]\n\n3호기 및 4호기 D/A/N 배치가 완료되었습니다.\n교대 시간 15분 전 인수인계를 준비해 주시기 바랍니다.`;
    } else if (trimmed === '/비교') {
      botReplyText = `📊 [2026년 9인 vs 2027년 8+1 비교 요약]\n\n- 2026년: 9인 정상 21일 통상 순환 (연속근무 <= 3일, 역순환 0건)\n- 2027년: 결원 대체 후 방안부 지원조 투입 및 3/8 9인 복원 완료`;
    } else if (trimmed === '/대근요청') {
      botReplyText = `🚨 [대근 요청 공지]\n신청자: 손정기 (Slot 2)\n일시: 2027-01-15 (금) D 근무\n사유: 개인 연차 신청 (연장수당 OT 정산)\n\n⭐ 시스템 자동 추천 Top 3:\n1. 박경욱 (Slot 3, Phase-11 대휴적립 최우선)\n2. 임원택 (Slot 4)\n3. 나상흠 (Slot 5)`;
      buttons = [
        { label: '✋ 제가 대근할게요', action: 'ACCEPT_RELIEF' },
        { label: '특정인 지목', action: 'ASSIGN_TARGET' },
        { label: '취소', action: 'CANCEL' },
      ];
    } else if (trimmed === 'ACCEPT_RELIEF') {
      botReplyText = `🎉 [대근 확정 공지]\n박경욱(Slot 3) 님이 2027-01-15 손정기 님의 D 대근을 수락하였습니다.\n제약조건 검증 결과: 정상 (연속근무 3일 이하, 역순환 0건)\n관리자 승인 완료되어 근무표에 자동 반영되었습니다!`;
    } else {
      botReplyText = `명령어 '${trimmed}' 을(를) 인식했습니다.\n/오늘 , /내일 , /근무 [이름] , /월간 , /비교 , /대근요청 중 하나를 입력해 주세요.`;
    }

    const botMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: 'bot',
      text: botReplyText,
      buttons,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputText('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
        {/* Telegram Header */}
        <div className="bg-[#24A1DE] px-5 py-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center space-x-1.5">
                <span>한수원 고리 3,4호기 HP 단톡방</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xs text-white/80">@RadShiftBot 양방향 연동 봇</p>
            </div>
          </div>
          <div className="text-xs bg-white/10 px-3 py-1 rounded-full font-semibold">
            Supabase Webhook
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#EFEFEF]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm whitespace-pre-wrap text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#EEFFDE] text-slate-900 rounded-tr-none'
                    : 'bg-white text-slate-900 rounded-tl-none'
                }`}
              >
                {m.text}

                {/* Inline Buttons */}
                {m.buttons && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {m.buttons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCommand(btn.action)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#24A1DE] text-xs font-bold border border-blue-200/60 transition-all flex items-center space-x-1"
                      >
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inputText && handleCommand(inputText)}
            placeholder="명령어 입력 (/오늘, /내일, /대근요청)..."
            className="flex-1 text-xs px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24A1DE] bg-slate-50"
          />
          <button
            onClick={() => inputText && handleCommand(inputText)}
            className="p-2.5 bg-[#24A1DE] hover:bg-[#208fcf] text-white rounded-xl shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
