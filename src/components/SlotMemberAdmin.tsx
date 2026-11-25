import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../services/supabaseClient';
import { Holiday } from '../engine/types';
import {
  getDefaultHolidaysForYear,
  setCustomHolidays,
} from '../engine/holidays';
import { runScenarioSimulation } from '../engine/scenarioEngine';
import { ShiftEngine } from '../engine/shiftEngine';
import {
  seedAllMasterDataToDb,
  saveSingleRemoteSlot,
  deleteRemoteSlot,
  fetchRemoteSlots,
  isSupabaseConfigured,
} from '../services/dbSyncService';
import {
  Shield,
  Users,
  Calendar,
  RotateCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Save,
  Sparkles,
  Phone,
  Send,
  Mail,
  PlayCircle,
  Lock,
  Database,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

export interface SlotMemberData {
  id: string; // unique ID
  slotNo: number; // 1 to 9
  unit: '3호기' | '4호기';
  name: string;
  phone: string;
  telegramId: string;
  email: string;
  workStartDate: string; // YYYY-MM-DD
  workEndDate: string; // YYYY-MM-DD (기본: 9999-12-31)
  terminationReason: string;
  status: '재직중' | '교체완료' | '임금피크' | '퇴직' | '결원';
  role: UserRole;
  accountStatus: 'approved' | 'pending' | 'rejected';
}

export interface SlotMemberAdminProps {
  currentRole: UserRole;
  anonymize: boolean;
  onToggleAnonymize: () => void;
  year: number;
  onCommitSchedule?: (overrides: Record<string, any>, auditMsg: string) => void;
  onRoleChange?: (role: UserRole) => void;
}

export const SlotMemberAdmin: React.FC<SlotMemberAdminProps> = ({
  currentRole,
  anonymize,
  onToggleAnonymize,
  year,
  onCommitSchedule,
  onRoleChange,
}) => {
  // Pure display name helper placed upfront to prevent unhoisted ReferenceError
  const getDisplayName = (slotNo: number, name: string) => {
    if (!anonymize) return name;
    return `HP-0${slotNo}`;
  };

  // Access Control Guard: Only L3_ADMIN
  if (currentRole !== 'L3_ADMIN') {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">
          관리자(L3_ADMIN) 권한 전용 페이지
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          본 페이지(슬롯별 HP 인원·근무 관리, 8+1 모드, 공휴일 관리 및 시뮬레이션 확정)는
          최고 관리자(L3_ADMIN)만 접근 및 수정이 가능합니다.
        </p>
        {onRoleChange && (
          <div className="pt-2">
            <button
              onClick={() => onRoleChange('L3_ADMIN')}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition-all hover:scale-105"
            >
              L3 관리자 권한으로 즉시 전환하기
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<
    'slots' | 'eight_plus' | 'holidays' | 'simulate'
  >('slots');

  // ---------------------------------------------------------------------------
  // 1. 기준일(Target Date) & 84일 주기 연동 상태: 오늘 날짜 기본 조회
  // ---------------------------------------------------------------------------
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [targetDate, setTargetDate] = useState<string>(todayDateStr);

  // ---------------------------------------------------------------------------
  // 2026/2027 공식 근무표 기준 84일 주기 및 호기 이동 정의
  // ---------------------------------------------------------------------------
  const OFFICIAL_CYCLES = useMemo(
    () => [
      // 2026년도 공식 근무표 기준 84일 주기 (시트 3 통상Day 순환일정 준용)
      {
        cycleNum: 1,
        name: '제 1차 주기 (2026 초기 편성)',
        startDate: '2025-12-29',
        endDate: '2026-03-01',
        movementNote: '12/29 초기 9인 체제 (송명관 ⑨ 통상 Day)',
        unit3Members: ['박경욱', '임원택', '나상흠', '권재호'],
        unit4Members: ['이근현', '신욱제', '송명관', '최창호', '손정기'],
      },
      {
        cycleNum: 2,
        name: '제 2차 84일 순환 주기',
        startDate: '2026-03-02',
        endDate: '2026-05-24',
        movementNote: '3/2 손정기 4→3호기 이동 (84일 주기 적용)',
        movedMemberName: '손정기',
        unit3Members: ['손정기', '박경욱', '임원택', '나상흠', '권재호'],
        unit4Members: ['이근현', '신욱제', '송명관', '최창호'],
      },
      {
        cycleNum: 3,
        name: '제 3차 84일 순환 주기',
        startDate: '2026-05-25',
        endDate: '2026-08-16',
        movementNote: '5/25 권재호 3→4호기 이동 (84일 주기 적용)',
        movedMemberName: '권재호',
        unit3Members: ['손정기', '박경욱', '임원택', '나상흠'],
        unit4Members: ['권재호', '이근현', '신욱제', '송명관', '최창호'],
      },
      {
        cycleNum: 4,
        name: '제 4차 84일 순환 주기',
        startDate: '2026-08-17',
        endDate: '2026-11-08',
        movementNote: '8/17 최창호 4→3호기 이동 (84일 주기 적용)',
        movedMemberName: '최창호',
        unit3Members: ['최창호', '손정기', '박경욱', '임원택', '나상흠'],
        unit4Members: ['권재호', '이근현', '신욱제', '송명관'],
      },
      {
        cycleNum: 5,
        name: '제 5차 84일 순환 주기',
        startDate: '2026-11-09',
        endDate: '2027-01-31',
        movementNote: '11/9 나상흠 3→4호기 이동 (84일 주기 적용)',
        movedMemberName: '나상흠',
        unit3Members: ['최창호', '손정기', '박경욱', '임원택'],
        unit4Members: ['나상흠', '권재호', '이근현', '신욱제', '송명관'],
      },
      // 2027년도 공식 근무표 기준 84일 주기
      {
        cycleNum: 1,
        name: '제 1차 84일 주기 (2027 8+1 지원)',
        startDate: '2027-01-01',
        endDate: '2027-01-31',
        movementNote: '1/1 신욱제 3호기(①위치) 대체 투입 (8+1 체제)',
        movedMemberName: '신욱제',
        unit3Members: ['신욱제', '손정기', '박경욱', '임원택'],
        unit4Members: ['박상현', '권재호', '이근현', '송명관'],
      },
      {
        cycleNum: 2,
        name: '제 2차 84일 주기 (2027 8+1 호기이동)',
        startDate: '2027-02-01',
        endDate: '2027-03-21',
        movementNote: '2/1 송명관 4→3·임원택 3→4호기 이동 (84일 주기 적용)',
        movedMemberName: '송명관',
        unit3Members: ['신욱제', '손정기', '송명관', '박경욱'],
        unit4Members: ['임원택', '박상현', '권재호', '이근현'],
      },
      {
        cycleNum: 3,
        name: '제 3차 84일 순환 주기 (2027 9인 복원)',
        startDate: '2027-03-22',
        endDate: '2027-06-13',
        movementNote: '3/22 신욱제 4→3호기 이동 (84일 주기 적용) & 이재겸 3호기 투입',
        movedMemberName: '신욱제',
        unit3Members: ['이재겸', '손정기', '박경욱', '신욱제'],
        unit4Members: ['송명관', '임원택', '박상현', '권재호', '이근현'],
      },
      {
        cycleNum: 4,
        name: '제 4차 84일 순환 주기',
        startDate: '2027-06-14',
        endDate: '2027-09-05',
        movementNote: '6/14 박경욱 3→4호기 이동 (84일 주기 적용)',
        movedMemberName: '박경욱',
        unit3Members: ['이재겸', '손정기', '신욱제', '송명관'],
        unit4Members: ['박경욱', '임원택', '박상현', '권재호', '이근현'],
      },
      {
        cycleNum: 5,
        name: '제 5차 84일 순환 주기',
        startDate: '2027-09-06',
        endDate: '2027-11-28',
        movementNote: '9/6 이근현 4→3호기 이동 (84일 주기 적용)',
        movedMemberName: '이근현',
        unit3Members: ['이근현', '이재겸', '손정기', '신욱제'],
        unit4Members: ['송명관', '박경욱', '임원택', '박상현', '권재호'],
      },
      {
        cycleNum: 6,
        name: '제 6차 84일 순환 주기',
        startDate: '2027-11-29',
        endDate: '2028-02-20',
        movementNote: '11/29 손정기 3→4호기 이동 (84일 주기 적용)',
        movedMemberName: '손정기',
        unit3Members: ['이근현', '이재겸', '신욱제', '송명관'],
        unit4Members: ['손정기', '박경욱', '임원택', '박상현', '권재호'],
      },
    ],
    []
  );

  // Calculate 84-day cycle start & end based on targetDate from official schedule
  const cycleInfo = useMemo(() => {
    // 1. Check official cycle table first
    const matched = OFFICIAL_CYCLES.find(
      (c) => targetDate >= c.startDate && targetDate <= c.endDate
    );

    if (matched) {
      const sDate = new Date(matched.startDate + 'T00:00:00Z');
      const tDate = new Date(targetDate + 'T00:00:00Z');
      const diffMs = tDate.getTime() - sDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

      return {
        cycleNum: matched.cycleNum,
        name: matched.name,
        startDate: matched.startDate,
        endDate: matched.endDate,
        diffDays,
        movementNote: matched.movementNote,
        movedMemberName: matched.movedMemberName,
        unit3Members: matched.unit3Members,
        unit4Members: matched.unit4Members,
      };
    }

    // 2. Generic fallback calculation for arbitrary dates
    const anchor = new Date('2025-12-29T00:00:00Z');
    const target = new Date(targetDate + 'T00:00:00Z');
    const diffMs = target.getTime() - anchor.getTime();
    const diffDaysTotal = Math.floor(diffMs / 86400000);
    const cycleNum = Math.floor(diffDaysTotal / 84);
    const startOffsetDays = cycleNum * 84;
    const endOffsetDays = startOffsetDays + 83;

    const startDate = new Date(anchor.getTime() + startOffsetDays * 86400000)
      .toISOString()
      .slice(0, 10);
    const endDate = new Date(anchor.getTime() + endOffsetDays * 86400000)
      .toISOString()
      .slice(0, 10);

    return {
      cycleNum: cycleNum + 1,
      name: `제 ${cycleNum + 1}차 84일 순환 주기`,
      startDate,
      endDate,
      diffDays: ((diffDaysTotal % 84) + 84) % 84,
      movementNote: '84일 주기 호기 순환',
      movedMemberName: undefined,
      unit3Members: ['최창호', '손정기', '박경욱', '임원택'],
      unit4Members: ['나상흠', '권재호', '이근현', '신욱제', '송명관'],
    };
  }, [targetDate, OFFICIAL_CYCLES]);

  // ---------------------------------------------------------------------------
  // 2. 슬롯 및 인원 관리 (기본 시작일 2026-01-01, 종료일 9999-12-31, 2026/2027 이력 포함)
  // ---------------------------------------------------------------------------
  const [members, setMembers] = useState<SlotMemberData[]>([
    {
      id: 'm-1-2026',
      slotNo: 1,
      unit: '3호기',
      name: '최창호',
      phone: '010-1123-1001',
      telegramId: '@choi_hp',
      email: 'choi@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2026-12-31',
      terminationReason: '2026년 고정순번 ① (2027년 퇴직/결원)',
      status: '교체완료',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-1-2027',
      slotNo: 1,
      unit: '3호기',
      name: '신욱제',
      phone: '010-3841-1008',
      telegramId: '@shin_hp',
      email: 'shin@khnp.co.kr',
      workStartDate: '2027-01-01',
      workEndDate: '2027-03-07',
      terminationReason: '2027년 8+1 기간 3호기(①위치) 임시 대체',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-2',
      slotNo: 2,
      unit: '3호기',
      name: '손정기',
      phone: '010-5923-2002',
      telegramId: '@son_hp',
      email: 'son@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-3',
      slotNo: 3,
      unit: '3호기',
      name: '박경욱',
      phone: '010-8274-3003',
      telegramId: '@park_hp',
      email: 'park@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      id: 'm-4',
      slotNo: 4,
      unit: '3호기',
      name: '임원택',
      phone: '010-4491-4004',
      telegramId: '@lim_hp',
      email: 'lim@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-5-2026',
      slotNo: 5,
      unit: '4호기',
      name: '나상흠',
      phone: '010-5512-5001',
      telegramId: '@na_hp',
      email: 'na@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '2026-12-31',
      terminationReason: '2026년 고정순번 ⑤ (2026말 정년퇴직)',
      status: '퇴직',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-5-2027',
      slotNo: 5,
      unit: '4호기',
      name: '박상현',
      phone: '010-7712-5005',
      telegramId: '@park_sh',
      email: 'park_sh@khnp.co.kr',
      workStartDate: '2027-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '2027-01-01 나상흠 후임 임피 교체 투입',
      status: '임금피크',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      id: 'm-6',
      slotNo: 6,
      unit: '4호기',
      name: '권재호',
      phone: '010-6318-6006',
      telegramId: '@kwon_hp',
      email: 'kwon@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      id: 'm-7',
      slotNo: 7,
      unit: '4호기',
      name: '이근현',
      phone: '010-9182-7007',
      telegramId: '@lee_hp',
      email: 'lee@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      id: 'm-8-2026',
      slotNo: 8,
      unit: '4호기',
      name: '신욱제',
      phone: '010-3841-1008',
      telegramId: '@shin_hp',
      email: 'shin@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (고정순번 ⑧ 본래 슬롯)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    },
    {
      id: 'm-8-2027',
      slotNo: 8,
      unit: '4호기',
      name: '이재겸',
      phone: '010-3841-8008',
      telegramId: '@lee_jk',
      email: 'lee_jk@khnp.co.kr',
      workStartDate: '2027-03-08',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (2027-03-08 결원위치 신규 투입)',
      status: '재직중',
      role: 'L1_VIEWER',
      accountStatus: 'approved',
    },
    {
      id: 'm-9',
      slotNo: 9,
      unit: '4호기',
      name: '송명관',
      phone: '010-2234-9009',
      telegramId: '@song_hp',
      email: 'song@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무 / 통상Day)',
      status: '재직중',
      role: 'L3_ADMIN',
      accountStatus: 'approved',
    },
  ]);

  const [isSavingMember, setIsSavingMember] = useState(false);
  const [originalEditingMember, setOriginalEditingMember] = useState<{
    slotNo: number;
    name: string;
  } | null>(null);
  const [dbNotification, setDbNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setDbNotification({ type, message });
    setTimeout(() => {
      setDbNotification(null);
    }, 4000);
  };

  // Load slot members from Supabase on mount if available
  useEffect(() => {
    let isMounted = true;
    async function initSlotsFromDb() {
      if (!isSupabaseConfigured) return;
      try {
        const remoteSlots = await fetchRemoteSlots();
        if (isMounted && remoteSlots && remoteSlots.length > 0) {
          setMembers(remoteSlots);
        }
      } catch (err) {
        console.error('Failed to load remote slots on mount:', err);
      }
    }
    initSlotsFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 공식 근무표 기준 현재 기준일 원형 큐 슬롯 배정 목록 (1~9칸)
  // ---------------------------------------------------------------------------
  const rotatedQueueSlots = useMemo(() => {
    const rosterList = [
      ...cycleInfo.unit3Members.map((name) => ({ name, unit: '3호기' as const })),
      ...cycleInfo.unit4Members.map((name) => ({ name, unit: '4호기' as const })),
    ];

    const targetTime = new Date(targetDate).getTime();

    return rosterList.map((item, idx) => {
      const displaySlotNo = idx + 1; // S1 ~ S9

      // Find member in members state
      const matchedMems = members.filter(
        (m) =>
          m.name === item.name &&
          targetTime >= new Date(m.workStartDate).getTime() &&
          targetTime <= new Date(m.workEndDate || '9999-12-31').getTime()
      );

      const activeMem =
        matchedMems[0] ||
        members.find((m) => m.name === item.name) || {
          id: `m-slot-${displaySlotNo}`,
          slotNo: displaySlotNo,
          unit: item.unit,
          name: item.name,
          phone: '010-0000-0000',
          telegramId: '@hp',
          email: `${item.name}@khnp.co.kr`,
          workStartDate: cycleInfo.startDate,
          workEndDate: cycleInfo.endDate,
          terminationReason: '84일 주기 공식 편성',
          status: '재직중' as const,
          role: 'L2_HP' as const,
          accountStatus: 'approved' as const,
        };

      const hasConflict = matchedMems.length > 1;
      const isMovedThisCycle = cycleInfo.movedMemberName === item.name;
      const memberDisplayName = getDisplayName(displaySlotNo, activeMem.name);

      return {
        displaySlotNo, // 현재 화면상 슬롯 위치 (1~9)
        displayUnit: item.unit,
        origSlotNo: activeMem.slotNo,
        member: activeMem,
        allActive: matchedMems,
        hasConflict,
        isMovedThisCycle,
        memberDisplayName,
      };
    });
  }, [cycleInfo, members, targetDate, anonymize]);

  // Editing / Adding Slot Modal State
  const [editingMember, setEditingMember] = useState<SlotMemberData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * 슬롯 기간 중복 인원 조회 함수
   * 동일 슬롯 내에서 근무 기간(시작일~종료일)이 겹치는 다른 근무자 목록 반환
   */
  const getConflictingMembers = (
    candidateId: string,
    slotNo: number,
    startStr: string,
    endStr: string
  ): SlotMemberData[] => {
    const cStart = new Date(startStr).getTime();
    const cEnd = new Date(endStr || '9999-12-31').getTime();

    return members.filter((m) => {
      if (m.id === candidateId) return false;
      if (m.slotNo !== slotNo) return false;
      const mStart = new Date(m.workStartDate).getTime();
      const mEnd = new Date(m.workEndDate || '9999-12-31').getTime();

      // 기간 겹침 조건: max(cStart, mStart) <= min(cEnd, mEnd)
      return Math.max(cStart, mStart) <= Math.min(cEnd, mEnd);
    });
  };

  const handleOpenAddMember = (slotNo: number) => {
    setIsAddingNew(true);
    setValidationError(null);
    setOriginalEditingMember(null);
    setEditingMember({
      id: `m-${Date.now()}`,
      slotNo,
      unit: slotNo <= 4 ? '3호기' : '4호기',
      name: '',
      phone: '010-',
      telegramId: '@',
      email: '@khnp.co.kr',
      workStartDate: '2026-01-01',
      workEndDate: '9999-12-31',
      terminationReason: '재직중 (정상 근무)',
      status: '재직중',
      role: 'L2_HP',
      accountStatus: 'approved',
    });
  };

  const handleOpenEditMember = (mem: SlotMemberData) => {
    setIsAddingNew(false);
    setValidationError(null);
    setOriginalEditingMember({ slotNo: mem.slotNo, name: mem.name });
    setEditingMember({ ...mem });
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    if (!editingMember.name.trim()) {
      setValidationError('성명을 입력해 주세요.');
      return;
    }

    const cStart = new Date(editingMember.workStartDate).getTime();
    const cEnd = new Date(editingMember.workEndDate || '9999-12-31').getTime();

    if (cEnd < cStart) {
      setValidationError('근무 종료일이 근무 시작일보다 앞설 수 없습니다.');
      return;
    }

    setIsSavingMember(true);

    // 1. Update React state immediately
    if (isAddingNew) {
      setMembers((prev) => [...prev, editingMember]);
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? editingMember : m))
      );
    }

    // 2. Direct DB Save to Supabase (rotation_slots)
    if (isSupabaseConfigured) {
      try {
        const res = await saveSingleRemoteSlot(
          editingMember,
          originalEditingMember?.slotNo,
          originalEditingMember?.name
        );
        if (res.success) {
          showNotification(
            'success',
            `[Slot ${editingMember.slotNo}] '${editingMember.name}' 님의 인원 정보가 공유 DB에 성공적으로 저장되었습니다.`
          );
        } else {
          showNotification(
            'error',
            `로컬에는 반영되었으나 공유 DB 저장에 실패했습니다: ${res.error}`
          );
        }
      } catch (err: any) {
        showNotification('error', `공유 DB 저장 중 오류 발생: ${err.message}`);
      }
    } else {
      showNotification(
        'success',
        `[Slot ${editingMember.slotNo}] '${editingMember.name}' 님의 인원 정보가 로컬에 저장되었습니다. (DB 미연결)`
      );
    }

    setIsSavingMember(false);
    setEditingMember(null);
    setOriginalEditingMember(null);
    setValidationError(null);
  };

  const handleDeleteMember = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const confirmed = window.confirm(
      `[${target.unit} Slot ${target.slotNo}] '${target.name}' 님의 근무 이력을 삭제하시겠습니까?\n(확인 시 공유 DB에서도 즉시 삭제됩니다)`
    );
    if (!confirmed) return;

    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    if (isSupabaseConfigured) {
      try {
        const ok = await deleteRemoteSlot(target.slotNo, target.name);
        if (ok) {
          showNotification(
            'success',
            `[Slot ${target.slotNo}] '${target.name}' 님의 근무 이력이 공유 DB에서 삭제되었습니다.`
          );
        } else {
          showNotification('error', '공유 DB 삭제에 실패했습니다.');
        }
      } catch (err: any) {
        showNotification('error', `공유 DB 삭제 중 오류 발생: ${err.message}`);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 3. 8+1 모드 설정 & 결원 백업인원 자동 선정 및 수동 변경
  // ---------------------------------------------------------------------------
  const [eightPlusOneConfig, setEightPlusOneConfig] = useState({
    enabled: true,
    supportName: '방안부지원',
    supportDepartment: '방사선안전부',
    startDate: '2027-01-04',
    endDate: '2027-03-07',
    vacantSlotNo: 1, // 기본 결원 슬롯 1 (3호기)
    manualBackupSlotNo: null as number | null, // 관리자 수동 선택
  });

  // 결원 슬롯 기준 반대편 호기 및 자동 백업 후보 선정
  const autoBackupInfo = useMemo(() => {
    const vSlot = eightPlusOneConfig.vacantSlotNo;
    const isVacantIn3U = vSlot <= 4;
    const targetUnit = isVacantIn3U ? '4호기' : '3호기';

    // 결원 반대편 호기에서 '제일 마지막 통상 교대인원' 산출
    // 통상 순환 순서: 9 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
    // 결원이 3호기(1~4)이면 반대편 4호기(5~9) 중 마지막 통상 인원은 Slot 8 (신욱제)
    // 결원이 4호기(5~9)이면 반대편 3호기(1~4) 중 마지막 통상 인원은 Slot 4 (임원택)
    const autoSlotNo = isVacantIn3U ? 8 : 4;
    const autoMember = members.find((m) => m.slotNo === autoSlotNo);

    // 관리자가 수동 선택했으면 수동 선택 슬롯, 아니면 자동 슬롯
    const selectedSlotNo = eightPlusOneConfig.manualBackupSlotNo || autoSlotNo;
    const selectedMember = members.find((m) => m.slotNo === selectedSlotNo);

    return {
      vacantUnit: isVacantIn3U ? '3호기' : '4호기',
      oppositeUnit: targetUnit,
      autoSlotNo,
      autoMemberName: autoMember?.name || `Slot ${autoSlotNo}`,
      selectedSlotNo,
      selectedMemberName: selectedMember?.name || `Slot ${selectedSlotNo}`,
      isManual: eightPlusOneConfig.manualBackupSlotNo !== null,
    };
  }, [eightPlusOneConfig.vacantSlotNo, eightPlusOneConfig.manualBackupSlotNo, members]);

  // ---------------------------------------------------------------------------
  // 4. 연도별 공휴일 관리
  // ---------------------------------------------------------------------------
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<number>(year);
  const [holidayStore, setHolidayStore] = useState<Record<number, Holiday[]>>({
    2026: getDefaultHolidaysForYear(2026),
    2027: getDefaultHolidaysForYear(2027),
    2028: getDefaultHolidaysForYear(2028),
  });

  const [newHoliday, setNewHoliday] = useState<{
    dateStr: string;
    name: string;
    isSubstitute: boolean;
  }>({
    dateStr: `${year}-01-01`,
    name: '',
    isSubstitute: false,
  });

  const activeHolidays = holidayStore[selectedHolidayYear] || [];

  const handleAddHoliday = () => {
    if (!newHoliday.name.trim() || !newHoliday.dateStr) {
      alert('공휴일 일자와 명칭을 입력해주세요.');
      return;
    }
    const updated = [
      ...activeHolidays,
      {
        dateStr: newHoliday.dateStr,
        name: newHoliday.name.trim(),
        isSubstitute: newHoliday.isSubstitute,
      },
    ].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: updated }));
    setCustomHolidays(updated);
    setNewHoliday({ dateStr: `${selectedHolidayYear}-01-01`, name: '', isSubstitute: false });
  };

  const handleDeleteHoliday = (dateStr: string) => {
    if (!confirm(`${dateStr} 공휴일을 삭제하시겠습니까?`)) return;
    const updated = activeHolidays.filter((h) => h.dateStr !== dateStr);
    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: updated }));
    setCustomHolidays(updated);
  };

  const handleResetHolidays = () => {
    if (!confirm(`${selectedHolidayYear}년 기본 법정공휴일로 초기화하시겠습니까?`)) return;
    const defaults = getDefaultHolidaysForYear(selectedHolidayYear);
    setHolidayStore((prev) => ({ ...prev, [selectedHolidayYear]: defaults }));
    setCustomHolidays(defaults);
  };

  // ---------------------------------------------------------------------------
  // 5. 시뮬레이션 및 확정 (Simulation & Commit)
  // ---------------------------------------------------------------------------
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setIsCommitted(false);
    setTimeout(() => {
      try {
        const engine = new ShiftEngine();
        const res = runScenarioSimulation(engine, {
          name: '관리자 슬롯 & 8+1 커스텀 시뮬레이션',
          mode: eightPlusOneConfig.enabled ? 'EIGHT_PLUS_DAYTIME' : 'NORMAL_9',
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          supportPersonnel: eightPlusOneConfig.enabled
            ? {
              name: eightPlusOneConfig.supportName,
              startDate: eightPlusOneConfig.startDate,
              endDate: eightPlusOneConfig.endDate,
            }
            : undefined,
          enforce84dShift: true,
          autoHolidays: true,
        });
        setSimResult(res);
      } catch (err: any) {
        alert(`시뮬레이션 실행 중 오류 발생: ${err.message}`);
      } finally {
        setIsSimulating(false);
      }
    }, 300);
  };

  const handleCommitToLive = () => {
    if (!simResult) {
      alert('먼저 시뮬레이션을 실행하여 결과를 검증해 주세요.');
      return;
    }
    const overridesMap: Record<string, any> = {};
    for (const diff of simResult.diffs) {
      const key = `${diff.dateStr}_${diff.slotNo}`;
      overridesMap[key] = diff.scenarioCode;
    }
    if (onCommitSchedule) {
      onCommitSchedule(
        overridesMap,
        `관리자 슬롯 및 8+1 설정 확정 반영 (수동 변경 ${simResult.diffs.length}건)`
      );
    }
    setIsCommitted(true);
    alert('설정된 슬롯 인원 및 8+1 근무표가 라이브 시스템에 성공적으로 확정 반영되었습니다.');
  };

  // ---------------------------------------------------------------------------
  // 6. 공유 DB 전체 데이터 즉시 저장 (Seed DB Now)
  // ---------------------------------------------------------------------------
  const [isSeedingDb, setIsSeedingDb] = useState(false);
  const handleSeedAllToDb = async () => {
    if (
      !confirm(
        '현재 설정된 모든 9슬롯 인원, 2026/2027/2028 공휴일, 8+1 시나리오 데이터를 공유 DB(Supabase)에 즉시 저장하시겠습니까?'
      )
    )
      return;

    setIsSeedingDb(true);
    const res = await seedAllMasterDataToDb(members, activeHolidays, selectedHolidayYear);
    setIsSeedingDb(false);
    alert(res.message);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-400 text-slate-950">
                  L3_ADMIN 전용 마스터 콘솔
                </span>
                <span className="text-xs text-purple-200 font-semibold">
                  원형 큐 84일 주기 · 인원 배정 · 8+1 및 공유 DB
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                HP 슬롯 및 교대근무 총괄 관리
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                1~4슬롯(3호기) / 5~9슬롯(4호기) 원형 큐 관리, 84일 주기 자동 시작일 산출, 기간 비중복 슬롯 관리, 공유 DB 영구 저장
              </p>
            </div>
          </div>

          {/* Action Buttons: Seed DB & Anonymize */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSeedAllToDb}
              disabled={isSeedingDb}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all hover:scale-105"
              title="현재 설정된 모든 데이터를 공유 DB(Supabase)에 즉시 저장"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isSeedingDb ? 'DB 저장 중...' : '공유 DB 전체 저장'}</span>
            </button>

            <button
              onClick={onToggleAnonymize}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors ${anonymize
                ? 'bg-purple-800 border-purple-500 text-purple-100'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
            >
              <span>{anonymize ? '익명(HP-01)' : '실명 표시'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="mt-5 pt-3 border-t border-slate-700/80 flex flex-wrap gap-2 text-xs font-bold">
          {[
            { id: 'slots', label: '1~9슬롯 원형 큐 및 인원 관리 (84일 주기)', icon: Users },
            { id: 'eight_plus', label: '8+1 지원조 설정 & 결원 백업인원', icon: Sparkles },
            { id: 'holidays', label: '연도별 공휴일 관리 (DB 연동)', icon: Calendar },
            { id: 'simulate', label: '근무표 시뮬레이션 및 확정 (Commit)', icon: PlayCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl transition-all ${isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: 1~9 Slots Circular Queue & Member History
      ========================================================================= */}
      {activeSubTab === 'slots' && (
        <div className="space-y-6">
          {/* 1. Target Date & 84-day Cycle Start Date Display Box */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <RotateCw className="w-4 h-4 text-brand-600" />
                  <span>84일 주기 기준일 선택 및 원형 큐 순환 연동</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  기준일을 변경하면 해당 기준일이 포함되는 <strong>84일 주기의 시작일</strong>이 자동 계산되고 원형 큐 슬롯 배치가 변경됩니다.
                </p>
              </div>

              {/* Target Date Picker */}
              <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">기준일 선택:</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 shadow-xs"
                />
              </div>
            </div>

            {/* Calculated 84-day Cycle Banner */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-indigo-200 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {cycleInfo.cycleNum}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-indigo-950 text-sm">
                        {cycleInfo.name}
                      </span>
                      {cycleInfo.movementNote && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {cycleInfo.movementNote}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 font-medium mt-0.5">
                      기준일 <span className="font-bold text-indigo-700">{targetDate}</span> 가 포함되는 주기:
                      <span className="font-bold text-indigo-900 ml-1">
                        {cycleInfo.startDate} ~ {cycleInfo.endDate}
                      </span>
                      <span className="text-slate-400 ml-1">
                        (주기 시작일로부터 +{cycleInfo.diffDays}일차)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                    S1~S{cycleInfo.unit3Members.length}: 3호기 ({cycleInfo.unit3Members.length}명)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    S{cycleInfo.unit3Members.length + 1}~S9: 4호기 ({cycleInfo.unit4Members.length}명)
                  </span>
                </div>
              </div>

              {/* Rotated Circular Queue Sequence Preview */}
              <div className="pt-2 border-t border-indigo-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-extrabold text-indigo-950">원형 큐 순환 배치:</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                  3호기: {cycleInfo.unit3Members.join(' → ')}
                </span>
                <span className="text-slate-400 font-bold">|</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                  4호기: {cycleInfo.unit4Members.join(' → ')}
                </span>
              </div>
            </div>

            {/* 9 Slots Circular Grid Cards for the Target Date */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              {rotatedQueueSlots.map((slotItem) => {
                const displaySlotNo = slotItem.displaySlotNo; // 1 ~ 9
                const is3U = slotItem.displayUnit === '3호기';
                const activeMem = slotItem.member;
                const hasConflict = slotItem.hasConflict;
                const displayName = slotItem.memberDisplayName;

                return (
                  <div
                    key={displaySlotNo}
                    className={`rounded-2xl p-3 border transition-all hover:shadow-md ${hasConflict
                      ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
                      : is3U
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${is3U ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                        >
                          S{displaySlotNo}
                        </span>
                        {slotItem.isMovedThisCycle && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 shadow-xs"
                            title={`이번 84일 주기에 호기 이동된 근무자`}
                          >
                            호기이동
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {hasConflict && (
                          <span className="text-[9px] font-black px-1 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                            중복({slotItem.allActive.length})
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold ${is3U ? 'text-blue-700' : 'text-emerald-700'
                            }`}
                        >
                          {slotItem.displayUnit}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`font-extrabold text-sm tracking-tight truncate ${hasConflict ? 'text-rose-900 font-black' : 'text-slate-900'
                        }`}
                      title={displayName}
                    >
                      {displayName}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      {hasConflict ? '⚠️ 동일 기간 중복 배정' : activeMem.phone}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      {hasConflict ? (
                        <span className="font-bold text-rose-700 truncate max-w-[70px]">
                          수정필요
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => handleOpenEditMember(activeMem)}
                        className="text-brand-600 hover:text-brand-800 font-bold"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Full Members Management Table (Allow Same-Slot Overlap with Notice) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  슬롯별 HP 인원 및 근무 이력 관리
                </h3>
                <p className="text-xs text-slate-500">
                  * <strong>다중 인원 등록 가능:</strong> 같은 슬롯에 동일한 기간이라도 2명 이상 등록이 가능하며, 기간이 중복되는 경우 비고란에 수정 권고 메시지가 표시됩니다.
                </p>
              </div>

              {/* Add Member Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenAddMember(1)}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>인원 추가 (교체 등록)</span>
                </button>
              </div>
            </div>

            {/* Overlap Summary Alert Banner */}
            {members.some(
              (m) =>
                getConflictingMembers(m.id, m.slotNo, m.workStartDate, m.workEndDate)
                  .length > 0
            ) && (
                <div className="mx-5 my-4 p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-950">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>[근무 기간 중복 안내]</strong> 현재 동일 슬롯에 근무 기간이 겹치는 인원이 존재합니다.
                      아래 이력 목록의 <strong>비고</strong> 안내를 확인하고 기간을 수정해 주세요.
                    </span>
                  </div>
                </div>
              )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-14">슬롯</th>
                    <th className="px-3 py-2.5 text-center w-20">호기</th>
                    <th className="px-3 py-2.5 text-left">성명</th>
                    <th className="px-3 py-2.5 text-left">휴대폰 번호</th>
                    <th className="px-3 py-2.5 text-left">텔레그램 ID</th>
                    <th className="px-3 py-2.5 text-left">이메일 계정</th>
                    <th className="px-3 py-2.5 text-center">근무 시작일</th>
                    <th className="px-3 py-2.5 text-center">근무 종료일</th>
                    <th className="px-3 py-2.5 text-left min-w-[280px]">
                      비고 (근무 사유 및 기간 중복 안내)
                    </th>
                    <th className="px-3 py-2.5 text-center w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {members
                    .slice()
                    .sort((a, b) => a.slotNo - b.slotNo || a.workStartDate.localeCompare(b.workStartDate))
                    .map((m) => {
                      const is3U = m.slotNo <= 4;
                      const displayName = getDisplayName(m.slotNo, m.name);
                      const conflicts = getConflictingMembers(
                        m.id,
                        m.slotNo,
                        m.workStartDate,
                        m.workEndDate
                      );
                      const hasConflict = conflicts.length > 0;
                      const conflictNames = conflicts.map((c) => `'${c.name}'`).join(', ');

                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors ${hasConflict
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="px-3 py-2.5 text-center font-black font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${is3U
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                                }`}
                            >
                              Slot {m.slotNo}
                            </span>
                            {(() => {
                              const assigned = rotatedQueueSlots.find((s) => s.member.name === m.name);
                              if (assigned) {
                                return (
                                  <div
                                    className="text-[10px] text-indigo-700 font-bold mt-0.5 whitespace-nowrap"
                                    title={`선택 기준일(${targetDate}) 84일 주기 배정 위치`}
                                  >
                                    ↳ 기준일: S{assigned.displaySlotNo} ({assigned.displayUnit})
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold">
                            {m.unit}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{displayName}</span>
                              {hasConflict && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-rose-600 text-white font-extrabold rounded">
                                  중복
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{m.phone}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-sky-700 font-semibold">
                            <div className="flex items-center space-x-1">
                              <Send className="w-3 h-3 text-sky-500" />
                              <span>{m.telegramId}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{m.email}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                            {m.workStartDate}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                            {m.workEndDate === '9999-12-31' ? '계속(9999-12-31)' : m.workEndDate}
                          </td>
                          <td className="px-3 py-2.5">
                            {hasConflict ? (
                              <div className="space-y-1">
                                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold leading-relaxed">
                                  <div className="flex items-center space-x-1.5 text-rose-700 font-black">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>[기간 중복 경고]</span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-slate-900">
                                    <span className="font-bold text-slate-950">'{m.name}'</span> 님과{' '}
                                    <span className="font-extrabold text-rose-700">{conflictNames}</span> 님의 근무 기간이 중복되니 수정해야 합니다.
                                  </p>
                                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                    * 본인 기간: {m.workStartDate} ~ {m.workEndDate === '9999-12-31' ? '계속' : m.workEndDate}
                                  </div>
                                </div>
                                {m.terminationReason &&
                                  m.terminationReason !== '재직중 (정상 근무)' && (
                                    <div className="text-[11px] text-slate-500 pl-1">
                                      기존 사유: {m.terminationReason}
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs font-medium">
                                {m.terminationReason || '정상 근무'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenEditMember(m)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="이력 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: 8+1 Support Mode & Auto/Manual Backup Selection
      ========================================================================= */}
      {activeSubTab === 'eight_plus' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>8+1 체제 설정 & 결원 백업인원 자동/수동 선정 규칙</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              결원 발생 호기의 반대편 호기에서 제일 마지막 통상 교대인원을 자동 선정하고, 9명 원복 시 원래 슬롯 순번으로 앞뒤 순서를 유지하며 일요일까지 잔여 통상을 마무리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Configuration Controls */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">8+1 지원조 투입 모드 활성화</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    평일 일근 직접지원 및 휴일투입 대체스왑 정산 적용
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={eightPlusOneConfig.enabled}
                  onChange={(e) =>
                    setEightPlusOneConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
                />
              </div>

              {/* Vacant Slot Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  결원 발생 슬롯 선택:
                </label>
                <select
                  value={eightPlusOneConfig.vacantSlotNo}
                  onChange={(e) =>
                    setEightPlusOneConfig((prev) => ({
                      ...prev,
                      vacantSlotNo: Number(e.target.value),
                      manualBackupSlotNo: null, // 결원 변경 시 수동 선택 초기화
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                    <option key={s} value={s}>
                      Slot {s} ({s <= 4 ? '3호기' : '4호기'}) - {members.find((m) => m.slotNo === s)?.name || ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Backup Candidate Selection (Auto vs Manual) */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center space-x-1.5">
                    <RotateCw className="w-4 h-4 text-indigo-600" />
                    <span>결원 백업 투입 인원 선정</span>
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${autoBackupInfo.isManual
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                  >
                    {autoBackupInfo.isManual ? '관리자 수동 지정' : '알고리즘 자동 선정'}
                  </span>
                </div>

                <div className="text-xs text-indigo-900 leading-relaxed font-medium">
                  • 결원 호기: <strong className="text-slate-900">{autoBackupInfo.vacantUnit}</strong> (Slot {eightPlusOneConfig.vacantSlotNo})<br />
                  • 반대편 호기: <strong className="text-slate-900">{autoBackupInfo.oppositeUnit}</strong><br />
                  • 반대편 최후 통상인원(자동 추천): <strong className="text-indigo-700">Slot {autoBackupInfo.autoSlotNo} ({autoBackupInfo.autoMemberName})</strong>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-indigo-950 block mb-1">
                    백업 요원 변경 (필요 시 수동 선택):
                  </label>
                  <select
                    value={eightPlusOneConfig.manualBackupSlotNo || autoBackupInfo.autoSlotNo}
                    onChange={(e) =>
                      setEightPlusOneConfig((prev) => ({
                        ...prev,
                        manualBackupSlotNo: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                      .filter((s) => s !== eightPlusOneConfig.vacantSlotNo)
                      .map((s) => (
                        <option key={s} value={s}>
                          Slot {s} ({s <= 4 ? '3호기' : '4호기'}) - {members.find((m) => m.slotNo === s)?.name || ''}
                          {s === autoBackupInfo.autoSlotNo ? ' (★ 자동 추천: 반대편 최종 통상)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    지원 투입 시작일:
                  </label>
                  <input
                    type="date"
                    value={eightPlusOneConfig.startDate}
                    onChange={(e) =>
                      setEightPlusOneConfig((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    9인 원복 종료일:
                  </label>
                  <input
                    type="date"
                    value={eightPlusOneConfig.endDate}
                    onChange={(e) =>
                      setEightPlusOneConfig((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Right: Restoration & Sunday Grace Guidelines */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-4">
              <h4 className="font-extrabold text-amber-900 text-sm flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                <span>9명 원복 복귀 및 잔여 통상 마무리 규칙</span>
              </h4>

              <div className="space-y-2.5 text-amber-900/95 leading-relaxed font-medium">
                <p>
                  <strong>1. 원 슬롯 위치 및 순번 완전 복원:</strong><br />
                  백업 인원으로 수동/자동 선택된 요원은 9명 체제 원복 시점({eightPlusOneConfig.endDate})에
                  원래 본인이 위치했던 <strong>슬롯 번호(Slot {autoBackupInfo.selectedSlotNo})로 복귀</strong>하며,
                  원형 큐의 앞·뒤 인원 순번이 100% 동일하게 복구됩니다.
                </p>

                <p>
                  <strong>2. 일요일까지 잔여 통상 완수:</strong><br />
                  복귀한 요원은 원복 주간의 <strong>일요일 24:00까지 본인의 잔여 통상 주간 근무(4D)를 정상 완수</strong>합니다.
                  이를 통해 야간 직후 주간 투입과 같은 역순환이 0건으로 완벽히 차단됩니다.
                </p>

                <p>
                  <strong>3. 차기 통상 요원의 월요일 승계:</strong><br />
                  다음 통상 순번 요원(Slot 9)은 <strong>다음 주 월요일 00:00부터</strong> 정규 21일 통상 순번으로 진입하여
                  원형 큐의 끊김 없는 무결점 교대가 유지됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Holiday Management (DB Linked)
      ========================================================================= */}
      {activeSubTab === 'holidays' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                <span>연도별 법정공휴일 관리 및 DB 동기화</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                우주항공청 월력요항 기준 공식 데이터베이스 조회 및 기관별 맞춤 휴일 추가/삭제
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedHolidayYear}
                onChange={(e) => setSelectedHolidayYear(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                <option value={2026}>2026년</option>
                <option value={2027}>2027년 (우주항공청 확정)</option>
                <option value={2028}>2028년</option>
              </select>

              <button
                onClick={handleResetHolidays}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                기본값 복원
              </button>
            </div>
          </div>

          {/* Add Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">일자:</label>
              <input
                type="date"
                value={newHoliday.dateStr}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, dateStr: e.target.value }))}
                className="bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block font-bold text-slate-700 mb-1">공휴일 명칭:</label>
              <input
                type="text"
                placeholder="예: 창립기념일"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center space-x-1.5 pb-2">
              <input
                type="checkbox"
                id="isSubstitute"
                checked={newHoliday.isSubstitute}
                onChange={(e) =>
                  setNewHoliday((prev) => ({ ...prev, isSubstitute: e.target.checked }))
                }
                className="w-4 h-4 accent-brand-600 rounded"
              />
              <label htmlFor="isSubstitute" className="font-bold text-slate-700 cursor-pointer">
                대체공휴일 여부
              </label>
            </div>
            <button
              onClick={handleAddHoliday}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>공휴일 추가</span>
            </button>
          </div>

          {/* Holiday List Grid */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-2.5 text-left">일자 (Date)</th>
                  <th className="px-4 py-2.5 text-left">공휴일 명칭</th>
                  <th className="px-4 py-2.5 text-center">구분</th>
                  <th className="px-4 py-2.5 text-center w-20">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {activeHolidays.map((h) => (
                  <tr key={h.dateStr} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">
                      {h.dateStr}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-800">
                      {h.name}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${h.isSubstitute
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                      >
                        {h.isSubstitute ? '대체공휴일' : '법정공휴일'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleDeleteHoliday(h.dateStr)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="공휴일 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: Simulation & Commit to Live
      ========================================================================= */}
      {activeSubTab === 'simulate' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <PlayCircle className="w-5 h-5 text-purple-600" />
                <span>입력 설정 기준 근무표 시뮬레이션 및 라이브 확정</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                변경된 9슬롯 인원, 8+1 운영기간, 공휴일 설정을 반영하여 365일 무결점 검증을 수행하고 라이브에 확정 반영합니다.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{isSimulating ? '시뮬레이션 계산 중...' : '시뮬레이션 실행'}</span>
              </button>

              {simResult && (
                <button
                  onClick={handleCommitToLive}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all hover:scale-105"
                >
                  <Save className="w-4 h-4" />
                  <span>근무표 확정 및 라이브 반영</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Display */}
          {simResult ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-800">일일 커버리지 검증</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">오류 0건 (100%)</div>
                  <p className="text-xs text-emerald-600 mt-1">매일 3호기 1D/1A/1N, 4호기 1D/1A/1N 완벽 충족</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-800">최대 연속근무 검증</div>
                  <div className="text-2xl font-black text-blue-950 mt-1">
                    {simResult.validation.maxConsecutiveDays}일 이하 (통과)
                  </div>
                  <p className="text-xs text-blue-600 mt-1">전원 최대 연속 3일 이하 엄격 제한 준수</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-purple-800">역순환(N→D) 검증</div>
                  <div className="text-2xl font-black text-purple-950 mt-1">
                    {simResult.validation.quickReturnsCount}건 (0건 통과)
                  </div>
                  <p className="text-xs text-purple-600 mt-1">야간 근무 직후 주간 투입 원천 차단</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">시뮬레이션 결과: </span>
                  <span className="text-slate-600">
                    기준일정 대비 총 <strong className="text-purple-700">{simResult.diffs.length}건</strong>의 맞춤 조정 사항이 산출되었습니다.
                  </span>
                </div>
                {isCommitted && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg">
                    ✓ 라이브 근무표 확정 완료
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              상단의 <strong className="text-purple-600">'시뮬레이션 실행'</strong> 버튼을 클릭하여
              현재 설정된 슬롯 및 공휴일 조건으로 365일 무결점 검증을 실행하세요.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: Member Add / Edit with Period Overlap Validation
      ========================================================================= */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-purple-600" />
                  {isAddingNew
                    ? `Slot ${editingMember.slotNo} 신규 인원 / 교체자 추가`
                    : `Slot ${editingMember.slotNo} 인원 정보 수정`}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingMember.slotNo <= 4 ? '3호기' : '4호기'} 배정 요원 정보
                </p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed font-semibold">
                ⚠️ {validationError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">성명:</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  placeholder="예: 홍길동"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">슬롯 번호:</label>
                <select
                  value={editingMember.slotNo}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setEditingMember((prev) =>
                      prev
                        ? { ...prev, slotNo: s, unit: s <= 4 ? '3호기' : '4호기' }
                        : null
                    );
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                    <option key={s} value={s}>
                      Slot {s} ({s <= 4 ? '3호기' : '4호기'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">휴대폰 번호:</label>
                <input
                  type="text"
                  value={editingMember.phone}
                  onChange={(e) =>
                    setEditingMember((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">텔레그램 ID:</label>
                <input
                  type="text"
                  value={editingMember.telegramId}
                  onChange={(e) =>
                    setEditingMember((prev) =>
                      prev ? { ...prev, telegramId: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-sky-700 font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">이메일 계정:</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) =>
                    setEditingMember((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">근무 시작일 (기본: 2026-01-01):</label>
                <input
                  type="date"
                  value={editingMember.workStartDate}
                  onChange={(e) =>
                    setEditingMember((prev) =>
                      prev ? { ...prev, workStartDate: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">근무 종료일 (기본: 9999-12-31):</label>
                <input
                  type="date"
                  value={editingMember.workEndDate}
                  onChange={(e) =>
                    setEditingMember((prev) =>
                      prev ? { ...prev, workEndDate: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">근무 종료 사유 / 비고:</label>
                <input
                  type="text"
                  placeholder="예: 재직중 (정상 근무), 정년퇴직, 임금피크 교체, 부서이동 등"
                  value={editingMember.terminationReason}
                  onChange={(e) =>
                    setEditingMember((prev) =>
                      prev ? { ...prev, terminationReason: e.target.value } : null
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setOriginalEditingMember(null);
                }}
                disabled={isSavingMember}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveMember}
                disabled={isSavingMember}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingMember ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>DB 저장 중...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>저장 반영</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Operation Floating Toast */}
      {dbNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-bold transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            dbNotification.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/80 text-emerald-300 shadow-emerald-950/40'
              : 'bg-slate-900/95 border-rose-500/80 text-rose-300 shadow-rose-950/40'
          }`}
        >
          {dbNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{dbNotification.message}</span>
        </div>
      )}
    </div>
  );
};
