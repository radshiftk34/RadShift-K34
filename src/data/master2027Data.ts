import rawData from './master2027Data.json';

export interface MasterMemberRow {
  unit: string; // '3', '4', '지원'
  name: string;
  shifts: string[];
}

export interface MasterMonth {
  month: number;
  days: number[];
  dows: string[];
  members: MasterMemberRow[];
  remark: string;
}

export interface MasterScheduleData {
  title: string;
  subtitle: string;
  months: MasterMonth[];
  comparisonTable: string[][];
  creditTable: string[][];
  timelineTable: string[][];
}

export const master2027Data = rawData as MasterScheduleData;

// Name to anonymized slot code mapping
export const MEMBER_ANONYMIZED_MAP: Record<string, string> = {
  '신욱제': 'HP-08',
  '손정기': 'HP-02',
  '박경욱': 'HP-03',
  '임원택': 'HP-04',
  '박상현': 'HP-05',
  '나상흠': 'HP-05',
  '권재호': 'HP-06',
  '이근현': 'HP-07',
  '송명관': 'HP-09',
  '최창호': 'HP-01',
  '이재겸': 'HP-01',
  '방안부지원': '방안부지원',
};

export function getAnonymizedName(name: string, anonymize: boolean): string {
  if (!anonymize) return name;
  return MEMBER_ANONYMIZED_MAP[name] || name;
}

/**
 * Returns exact badge styling matching the official 2027 Excel color scheme:
 * - [주황 3D/4D] 통상Day
 * - [노랑 3D* / 4D*] 평일스왑
 * - [민트 일근] 방안부일근
 * - [파랑 D] 주간/휴일투입
 * - [황갈색 A] 오후
 * - [보라 N/3N] 야간
 * - [연두 X] 대체휴무
 */
export function getExcelBadgeStyle(code: string): string {
  const c = code.trim();
  switch (c) {
    case '3D':
    case '4D':
      return 'bg-[#fde2cb] text-[#8a3800] border-[#f9cb9c] font-bold shadow-xs';
    case '3D*':
    case '4D*':
      return 'bg-[#fef3c7] text-[#92400e] border-[#fde68a] font-bold shadow-xs';
    case '일근':
      return 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0] font-bold shadow-xs';
    case 'D':
      return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd] font-bold';
    case 'A':
      return 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a] font-bold';
    case 'N':
    case '3N':
      return 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff] font-bold';
    case 'X':
      return 'bg-slate-50 text-slate-400 border-slate-200';
    case '연차':
    case '대근':
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    case '':
      return 'bg-transparent text-transparent border-transparent';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
