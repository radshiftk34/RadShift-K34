import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ShiftCode, Holiday } from '../engine/types';
import { SlotMemberData } from '../components/SlotMemberAdmin';

export interface DbStatus {
  isConfigured: boolean;
  isConnected: boolean;
  pingMs?: number;
  url: string;
  message: string;
}

/**
 * Checks connection health with the shared Supabase PostgreSQL database
 */
export async function checkDbConnection(): Promise<DbStatus> {
  const url = import.meta.env.VITE_SUPABASE_URL || '';

  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      url: '미설정 (로컬 메모리 모드)',
      message: '.env 파일에 VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.',
    };
  }

  const start = performance.now();
  try {
    const { error } = await supabase
      .from('rotation_slots')
      .select('slot_no', { count: 'exact', head: true });

    const pingMs = Math.round(performance.now() - start);

    if (error) {
      return {
        isConfigured: true,
        isConnected: false,
        pingMs,
        url,
        message: `DB 연결 실패: ${error.message} (complete_setup.sql 스크립트 실행 여부를 확인하세요)`,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      pingMs,
      url,
      message: `공유 PostgreSQL 데이터베이스에 정상 연결되었습니다. (지연시간: ${pingMs}ms)`,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      url,
      message: `네트워크 또는 엔드포인트 접근 오류: ${err.message}`,
    };
  }
}

/**
 * Fetch 2-Layer manual shift overrides from DB
 */
export async function fetchRemoteOverrides(): Promise<Record<string, ShiftCode>> {
  if (!isSupabaseConfigured) return {};

  try {
    const { data, error } = await supabase.from('shift_overrides').select('*');
    if (error || !data) return {};

    const map: Record<string, ShiftCode> = {};
    for (const row of data) {
      map[row.cell_key] = row.new_code as ShiftCode;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Save single cell override to DB
 */
export async function saveRemoteOverride(
  dateStr: string,
  slotNo: number,
  memberName: string,
  origCode: string,
  newCode: ShiftCode,
  note?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cell_key = `${dateStr}_${slotNo}`;
  try {
    const { error } = await supabase.from('shift_overrides').upsert(
      {
        cell_key,
        target_date: dateStr,
        slot_no: slotNo,
        member_name: memberName,
        orig_code: origCode,
        new_code: newCode,
        note: note || '관리자 수동 조정',
        created_by: '관리자',
      },
      { onConflict: 'cell_key' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch 1~9 Slots & Member Configurations from DB
 */
export async function fetchRemoteSlots(): Promise<SlotMemberData[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('rotation_slots')
      .select('*')
      .order('slot_no', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((r) => ({
      id: `slot-${r.slot_no}-${r.work_start_date || 'default'}`,
      slotNo: r.slot_no,
      unit: r.unit as '3호기' | '4호기',
      name: r.member_name,
      phone: r.phone || '',
      telegramId: r.telegram_id || '',
      email: r.email || '',
      workStartDate: r.work_start_date || '2026-01-01',
      workEndDate: r.work_end_date || '9999-12-31',
      terminationReason: r.termination_reason || '재직중',
      status: (r.status || '재직중') as any,
      role: 'L2_HP',
      accountStatus: 'approved',
    }));
  } catch {
    return null;
  }
}

/**
 * Save Slots & Member Configurations to DB
 */
export async function saveRemoteSlots(slots: SlotMemberData[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const rows = slots.map((s) => ({
    slot_no: s.slotNo,
    unit: s.unit,
    member_name: s.name,
    phone: s.phone,
    telegram_id: s.telegramId,
    email: s.email,
    work_start_date: s.workStartDate,
    work_end_date: s.workEndDate || null,
    termination_reason: s.terminationReason,
    status: s.status,
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error } = await supabase
      .from('rotation_slots')
      .upsert(rows, { onConflict: 'slot_no,member_name' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch Holidays for Year from DB
 */
export async function fetchRemoteHolidays(year: number): Promise<Holiday[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('holiday_date', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((r) => ({
      dateStr: r.holiday_date,
      name: r.name,
      isSubstitute: r.is_substitute,
    }));
  } catch {
    return null;
  }
}

/**
 * Save Holidays to DB
 */
export async function saveRemoteHolidays(year: number, holidays: Holiday[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const rows = holidays.map((h) => ({
    holiday_date: h.dateStr,
    name: h.name,
    is_substitute: Boolean(h.isSubstitute),
    year: year,
  }));

  try {
    const { error } = await supabase
      .from('holidays')
      .upsert(rows, { onConflict: 'holiday_date' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Record Action to Audit Logs
 */
export async function recordRemoteAuditLog(
  actionType: string,
  description: string,
  target?: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from('audit_logs').insert({
      action_type: actionType,
      description: description,
      target: target || null,
    });
  } catch {
    // silent fail for audit logs
  }
}

/**
 * Seed all master data to the shared Supabase DB
 */
export async function seedAllMasterDataToDb(
  slots: SlotMemberData[],
  holidays: Holiday[],
  year: number
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해주세요.',
    };
  }

  try {
    // 1. Slots
    const slotSuccess = await saveRemoteSlots(slots);
    if (!slotSuccess) {
      return { success: false, message: '슬롯 인원 데이터 저장에 실패했습니다.' };
    }

    // 2. Holidays
    const holSuccess = await saveRemoteHolidays(year, holidays);
    if (!holSuccess) {
      return { success: false, message: '공휴일 데이터 저장에 실패했습니다.' };
    }

    // 3. Scenario
    await supabase.from('scenarios').upsert(
      {
        name: '2027년 8+1 방안부 지원 및 9인 원복 시나리오',
        mode: 'EIGHT_PLUS_DAYTIME',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        vacant_slot_no: 1,
        temp_cover_slot_no: 8,
        support_name: '방안부지원',
        support_department: '방사선안전부',
        support_start_date: '2027-01-04',
        support_end_date: '2027-03-07',
        is_active: true,
      },
      { onConflict: 'name' }
    );

    // 4. Audit Log
    await recordRemoteAuditLog(
      'SEED_DATABASE',
      '관리자가 슬롯, 공휴일, 8+1 시나리오 마스터 데이터를 공유 DB에 전체 업로드함'
    );

    return {
      success: true,
      message: '공유 데이터베이스(Supabase)에 모든 슬롯, 공휴일, 시나리오 데이터가 성공적으로 저장되었습니다!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `DB 저장 중 오류 발생: ${err.message}`,
    };
  }
}
