// Supabase Edge Function: daily-briefing-cron
// Executes every day at 07:00 KST (22:00 UTC previous day)
// Also prevents Supabase free-tier project from pausing due to 7 days inactivity
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const GROUP_CHAT_ID = Deno.env.get('TELEGRAM_GROUP_CHAT_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // DB heartbeat touch to prevent project inactivity pause
    await supabase.from('audit_logs').insert({
      action_type: 'DAILY_CRON_HEARTBEAT',
      reason: `Daily 07:00 KST cron briefing executed for ${today}`,
    });

    if (!BOT_TOKEN || !GROUP_CHAT_ID) {
      return new Response(JSON.stringify({ message: 'Telegram secrets not set, heartbeat logged.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messageText = `🌅 <b>[매일 오전 07:00 당일 HP 교대조 브리핑 - ${today}]</b>\n\n고리 3,4호기 교대근무자 여러분 안녕하십니까.\n오늘의 안전 최우선 운전을 위한 교대조 현황을 공지합니다.\n\n🔹 <b>고리 3호기</b>\n- D (08:00~16:00)\n- A (16:00~24:00)\n- N (24:00~08:00)\n\n🔹 <b>고리 4호기</b>\n- D (08:00~16:00)\n- A (16:00~24:00)\n- N (24:00~08:00)\n\n✅ <b>인수인계 15분 전 현장 도착 및 안전보호구 착용을 준수해 주시기 바랍니다.</b>`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: GROUP_CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
