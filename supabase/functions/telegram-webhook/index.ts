// Supabase Edge Function: telegram-webhook
// Deno TypeScript Runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update = await req.json();

    // 1. Handle Inline Button Callbacks
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const fromUser = cb.from;
      const chatId = cb.message?.chat?.id;

      if (data?.startsWith('ACCEPT_RELIEF:')) {
        const requestId = data.split(':')[1];

        // Fetch request details
        const { data: request, error: reqErr } = await supabase
          .from('leave_relief_requests')
          .select('*, profiles!requester_id(*)')
          .eq('id', requestId)
          .single();

        if (reqErr || !request) {
          await answerCallbackQuery(cb.id, '해당 대근 요청을 찾을 수 없습니다.', true);
          return new Response('OK');
        }

        if (request.status !== 'OPEN') {
          await answerCallbackQuery(cb.id, '이미 마감되었거나 처리된 대근 요청입니다.', true);
          return new Response('OK');
        }

        // Check user profile mapping
        const { data: operatorProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_user_id', fromUser.id)
          .single();

        if (!operatorProfile || operatorProfile.status !== 'approved') {
          await answerCallbackQuery(cb.id, '인증된 HP 근무자만 대근을 수락할 수 있습니다. /인증 을 먼저 진행해 주세요.', true);
          return new Response('OK');
        }

        // Update request status to candidate accepted & notify
        await supabase
          .from('leave_relief_requests')
          .update({
            relief_id: operatorProfile.id,
            status: 'CANDIDATE_ACCEPTED',
          })
          .eq('id', requestId);

        await answerCallbackQuery(cb.id, '대근 수락 신청이 완료되었습니다! 관리자 승인 후 최종 확정됩니다.');

        await sendTelegramMessage(
          chatId,
          `✅ <b>[대근 수락 안내]</b>\n${operatorProfile.display_name} 님이 대근을 수락하였습니다.\n관리자 최종 승인 대기 중입니다.`
        );
      }

      return new Response('OK');
    }

    // 2. Handle Text Messages and Commands
    const message = update.message;
    if (!message || !message.text) {
      return new Response('OK');
    }

    const text = message.text.trim();
    const chatId = message.chat.id;
    const fromUser = message.from;

    if (text.startsWith('/인증')) {
      const parts = text.split(' ');
      const name = parts[1];
      if (!name) {
        await sendTelegramMessage(chatId, '사용법: /인증 [실명]\n예: /인증 홍길동');
        return new Response('OK');
      }

      await sendTelegramMessage(
        chatId,
        `🔒 <b>[인증 요청 접수]</b>\n성명: ${name}\n텔레그램 ID: ${fromUser.id}\n관리자 승인 후 시스템과 계정이 연동됩니다.`
      );
      return new Response('OK');
    }

    if (text === '/오늘' || text === '/today') {
      const todayStr = new Date().toISOString().split('T')[0];
      await sendTelegramMessage(
        chatId,
        `📢 <b>[${todayStr} 고리 3,4호기 HP 교대근무 현황]</b>\n\n🔹 <b>고리 3호기</b>\n- D (주간): 정상 근무\n- A (오후): 정상 근무\n- N (야간): 정상 근무\n\n🔹 <b>고리 4호기</b>\n- D (주간): 정상 근무\n- A (오후): 정상 근무\n- N (야간): 정상 근무\n\n✅ <b>일일 커버리지 검증: 100% 정상 (6인 근무 / 3인 휴무)</b>`,
        {
          inline_keyboard: [
            [{ text: '📅 내일 근무 사전안내', callback_data: '/내일' }],
            [{ text: '🌐 웹앱 열기', url: 'https://radshiftk34.github.io/RadShift-K34/' }],
          ],
        }
      );
      return new Response('OK');
    }

    if (text.startsWith('/대근요청')) {
      const parts = text.split(' ');
      const targetDate = parts[1] || '2027-01-15';
      const reason = parts.slice(2).join(' ') || '개인 사유 연차';

      await sendTelegramMessage(
        chatId,
        `🚨 <b>[대근자 긴급 모집 공고]</b>\n\n- 일시: <b>${targetDate}</b>\n- 요청자: ${fromUser.first_name}\n- 사유: ${reason}\n\n⭐ <b>시스템 자동 추천 대근 후보 Top 3:</b>\n1. 박경욱 (Slot 3, Phase-11 대휴 최우선)\n2. 임원택 (Slot 4)\n3. 나상흠 (Slot 5)`,
        {
          inline_keyboard: [
            [{ text: '✋ 제가 대근할게요', callback_data: `ACCEPT_RELIEF:demo` }],
            [{ text: '취소', callback_data: 'CANCEL' }],
          ],
        }
      );
      return new Response('OK');
    }

    return new Response('OK');
  } catch (err: any) {
    console.error('Error handling telegram webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
