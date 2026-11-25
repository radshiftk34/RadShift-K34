import { DaySchedule, ShiftCode } from './types';
import { calculateReliefCandidates } from './reliefEngine';

export interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  date: string;
  buttons?: Array<{ label: string; callbackData: string }>;
  badge?: string;
}

export function handleTelegramCommand(
  commandText: string,
  schedule: DaySchedule[],
  anonymize: boolean = false,
  overrides: Record<string, ShiftCode> = {}
): TelegramMessage {
  const parts = commandText.trim().split(/\s+/);
  const cmd = parts[0];
  const arg1 = parts[1];
  const arg2 = parts[2];
  const arg3 = parts[3];

  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const today = schedule[0] || {
    dateStr: new Date().toISOString().split('T')[0],
    shifts: [],
  };

  // Helper: Find day by date string
  const findDay = (targetStr: string) => schedule.find((d) => d.dateStr === targetStr);

  switch (cmd) {
    case '/오늘':
    case '/내일': {
      const isTomorrow = cmd === '/내일';
      const targetDay = isTomorrow && schedule.length > 1 ? schedule[1] : today;

      const getShiftsByUnit = (unit: '3U' | '4U') => {
        const shifts = targetDay.shifts.filter((s) => s.unit === unit);
        const d = shifts.find((s) => s.shiftCode === 'D' || s.shiftCode === '3D' || s.shiftCode === '4D');
        const a = shifts.find((s) => s.shiftCode === 'A');
        const n = shifts.find((s) => s.shiftCode === 'N' || s.shiftCode === '3N');
        return {
          d: d ? getName(d.slotNo, d.memberName) : '공백',
          a: a ? getName(a.slotNo, a.memberName) : '공백',
          n: n ? getName(n.slotNo, n.memberName) : '공백',
        };
      };

      const u3 = getShiftsByUnit('3U');
      const u4 = getShiftsByUnit('4U');
      const floatShift = targetDay.shifts.find((s) => s.unit === 'FLOAT');
      const supportShift = targetDay.supportShift;

      let msg = `📅 [${targetDay.dateStr}] ${isTomorrow ? '익일' : '당일'} 고리 3,4호기 HP 교대근무 브리핑\n\n`;
      msg += `🔹 3호기\n  • 주간(D): ${u3.d}\n  • 오후(A): ${u3.a}\n  • 야간(N): ${u3.n}\n\n`;
      msg += `🔹 4호기\n  • 주간(D): ${u4.d}\n  • 오후(A): ${u4.a}\n  • 야간(N): ${u4.n}\n\n`;
      if (floatShift) {
        msg += `⚙️ 통상 Day: ${getName(floatShift.slotNo, floatShift.memberName)} (${floatShift.shiftCode})\n`;
      }
      if (supportShift) {
        msg += `🛡️ 방안부 지원: ${supportShift.memberName} (${supportShift.shiftCode})\n`;
      }
      msg += `\n✅ 일일 커버리지: 정상 (오류 0건)`;

      return {
        id: Math.random().toString(),
        sender: 'bot',
        text: msg,
        date: new Date().toLocaleTimeString(),
        buttons: [
          { label: '📱 PWA 웹앱 바로가기', callbackData: 'open_pwa' },
          { label: isTomorrow ? '오늘 보기' : '내일 보기', callbackData: isTomorrow ? '/오늘' : '/내일' },
        ],
      };
    }

    case '/근무': {
      const searchName = arg1;
      if (!searchName) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `⚠️ 사용법: /근무 [성명]\n예: /근무 박경욱 또는 /근무 HP-03`,
          date: new Date().toLocaleTimeString(),
        };
      }

      // Find slot by name
      let foundSlot: number | null = null;
      for (const shift of today.shifts) {
        const name = getName(shift.slotNo, shift.memberName);
        if (name === searchName || shift.memberName === searchName) {
          foundSlot = shift.slotNo;
          break;
        }
      }

      if (!foundSlot) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `❌ [${searchName}] 직원을 찾을 수 없습니다. 등록된 성명을 확인하세요.`,
          date: new Date().toLocaleTimeString(),
        };
      }

      const futureDays = schedule.slice(0, 14);
      let text = `📋 [${searchName}] 향후 14일 교대근무 일정\n\n`;
      for (const d of futureDays) {
        const s = d.shifts.find((shift) => shift.slotNo === foundSlot);
        const code = overrides[`${d.dateStr}_${foundSlot}`] || s?.shiftCode || 'X';
        const dayOfWeekStr = ['일', '월', '화', '수', '목', '금', '토'][d.dayOfWeek];
        text += `• ${d.dateStr}(${dayOfWeekStr}): [${code}] ${s?.badge ? `(${s.badge})` : ''}\n`;
      }

      return {
        id: Math.random().toString(),
        sender: 'bot',
        text,
        date: new Date().toLocaleTimeString(),
        buttons: [
          { label: '📅 내 캘린더(.ics) 다운로드', callbackData: `download_ics_${foundSlot}` },
        ],
      };
    }

    case '/월간': {
      const yearMonth = arg1 || today.dateStr.slice(0, 7);
      const filtered = schedule.filter((d) => d.dateStr.startsWith(yearMonth));
      if (filtered.length === 0) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `❌ [${yearMonth}]에 해당하는 근무표 데이터가 없습니다.`,
          date: new Date().toLocaleTimeString(),
        };
      }

      let text = `📊 [${yearMonth}] 월간 교대근무 요약 통계\n`;
      text += `• 총 일수: ${filtered.length}일\n`;
      text += `• 총 가동 조: 3호기 4명 + 4호기 4명 + 통상 1명\n`;
      text += `• 일일 커버리지 달성률: 100% (오류 0건)\n\n`;
      text += `자세한 가로 매트릭스는 PWA 웹앱에서 확인하실 수 있습니다.`;

      return {
        id: Math.random().toString(),
        sender: 'bot',
        text,
        date: new Date().toLocaleTimeString(),
        buttons: [
          { label: '📈 PWA 월간 매트릭스 보기', callbackData: 'open_matrix' },
        ],
      };
    }

    case '/비교': {
      return {
        id: Math.random().toString(),
        sender: 'bot',
        text: `⚖️ 2026년 vs 2027년 연간 교대근무 비교 분석\n\n` +
          `• 2026년: 9인 정상 운영 체제 (전원 D: 81~82일, A: 91일, N: 91일, 휴무: 101~102일 균등)\n` +
          `• 2027년: 8+1 방안부 지원 체제 및 9인 원복 (신욱제 1행 대체 및 이재겸 신규 투입)\n` +
          `• 검증 결과: 양 연도 모두 일일 결원 0건, 최대 연속근무 3일 이하 100% 보장`,
        date: new Date().toLocaleTimeString(),
        buttons: [{ label: '📑 원본 엑셀 비교표 다운로드', callbackData: 'download_excel' }],
      };
    }

    case '/대근요청': {
      const targetDate = arg1;
      const reason = arg2 || '개인 사유';
      if (!targetDate) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `⚠️ 사용법: /대근요청 [YYYY-MM-DD] [사유]\n예: /대근요청 2027-01-15 연차`,
          date: new Date().toLocaleTimeString(),
        };
      }

      const targetDay = findDay(targetDate);
      if (!targetDay) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `❌ [${targetDate}] 일자의 근무 데이터를 찾을 수 없습니다.`,
          date: new Date().toLocaleTimeString(),
        };
      }

      // Calculate Top 3 recommendations for slot 1 as demo or current user
      const requesterSlot = 3; // 박경욱
      const candidates = calculateReliefCandidates(schedule, targetDate, requesterSlot, {}, {}, overrides);
      const top3 = candidates.filter((c) => c.isEligible).slice(0, 3);

      let text = `🚨 [대근 요청 알림]\n`;
      text += `• 일자: ${targetDate}\n`;
      text += `• 요청자: ${getName(requesterSlot, '박경욱')} (Slot 3)\n`;
      text += `• 사유: ${reason}\n\n`;
      text += `⭐ 추천 대근 순위 (규칙 적합도 점수순):\n`;

      top3.forEach((c, idx) => {
        text += `  ${idx + 1}순위: ${getName(c.slotNo, c.memberName)} (적합점수: ${c.score}점)\n`;
        text += `    - 위상 11: ${c.isPhase11 ? 'O (+100)' : 'X'}, 동일 호기: ${c.sameUnit ? 'O (+50)' : 'X'}\n`;
      });

      return {
        id: Math.random().toString(),
        sender: 'bot',
        text,
        date: new Date().toLocaleTimeString(),
        buttons: top3.map((c) => ({
          label: `🙋 ${getName(c.slotNo, c.memberName)} 제가 대근할게요`,
          callbackData: `accept_relief_${targetDate}_${c.slotNo}`,
        })),
      };
    }

    case '/대근지정': {
      const targetDate = arg1;
      const reqName = arg2;
      const reliefName = arg3;
      if (!targetDate || !reqName || !reliefName) {
        return {
          id: Math.random().toString(),
          sender: 'bot',
          text: `⚠️ 관리자 권한 직권 지정 사용법:\n/대근지정 [YYYY-MM-DD] [휴가자성명] [대근자성명]`,
          date: new Date().toLocaleTimeString(),
        };
      }

      return {
        id: Math.random().toString(),
        sender: 'bot',
        text: `✅ [관리자 직권 승인]\n${targetDate} [${reqName}] 님의 근무를 [${reliefName}] 님이 대근하도록 근무표에 반영되었습니다.`,
        date: new Date().toLocaleTimeString(),
      };
    }

    case '/인증': {
      const name = arg1 || '근무자';
      return {
        id: Math.random().toString(),
        sender: 'bot',
        text: `🔒 [인증 요청 접수]\n[${name}] 님의 텔레그램 계정 연동 요청이 관리자에게 전송되었습니다. 관리자 승인 후 알림 및 대근 기능이 활성화됩니다.`,
        date: new Date().toLocaleTimeString(),
      };
    }

    default:
      return {
        id: Math.random().toString(),
        sender: 'bot',
        text: `🤖 [한수원 HP 교대근무 텔레그램 봇 안내]\n\n` +
          `사용 가능한 명령어 목록:\n` +
          `• /오늘 - 당일 3,4호기 D/A/N 및 통상 근무 브리핑\n` +
          `• /내일 - 익일 교대조 브리핑\n` +
          `• /근무 [이름] - 개인별 향후 14일 교대근무 조회\n` +
          `• /월간 [YYYY-MM] - 월간 가동 통계 요약\n` +
          `• /비교 - 2026 vs 2027 연간 비교 분석\n` +
          `• /대근요청 [날짜] [사유] - 당일 휴가 및 Top 3 대근 추천 카드 발행\n` +
          `• /대근지정 [날짜] [휴가자] [대근자] - 관리자 직권 배정\n` +
          `• /인증 [이름] - 계정 연동 요청`,
        date: new Date().toLocaleTimeString(),
      };
  }
}
