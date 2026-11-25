-- ==============================================================================
-- RadShift_K34 Supabase Complete Database Setup Script
-- 한수원 HP 교대근무 관리(고리3,4호기) - 공유 데이터베이스 원클릭 설정 스크립트
-- ==============================================================================
-- [사용 방법]
-- 1. https://supabase.com 로그인 후 프로젝트 생성 (지역: Seoul ap-northeast-2)
-- 2. 좌측 메뉴 'SQL Editor' -> 'New query' 클릭
-- 3. 이 파일의 전체 내용을 복사하여 붙여넣고 우측 하단 'Run' 버튼 실행
-- ==============================================================================

-- 1. UUID 확장 기능 활성화
create extension if not exists "uuid-ossp";

-- 2. 기존 테이블 정리 (필요 시 재생성)
drop table if exists public.audit_logs cascade;
drop table if exists public.credit_ledger cascade;
drop table if exists public.shift_overrides cascade;
drop table if exists public.leave_relief_requests cascade;
drop table if exists public.holidays cascade;
drop table if exists public.scenarios cascade;
drop table if exists public.rotation_slots cascade;
drop table if exists public.profiles cascade;

-- ==============================================================================
-- 테이블 생성 (8종)
-- ==============================================================================

-- 1) profiles: 회원 프로필 및 RBAC 권한 (L1 뷰어, L2 HP근무자, L3 관리자)
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  display_name text not null,
  alias_code text not null default 'HP-00', -- HP-01 ~ HP-09 (익명화 모드)
  phone text,
  telegram_id text,
  role text not null check (role in ('L1_VIEWER', 'L2_HP', 'L2_BANGAN', 'L3_ADMIN')) default 'L1_VIEWER',
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'approved',
  slot_no int check (slot_no between 1 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) rotation_slots: 9슬롯 배정 및 상세 근무 이력 (1~4슬롯 3호기, 5~9슬롯 4호기)
create table public.rotation_slots (
  slot_no int not null check (slot_no between 1 and 9),
  unit text not null check (unit in ('3호기', '4호기', '지원')),
  member_name text not null,
  phone text,
  telegram_id text,
  email text,
  work_start_date date not null default '2026-01-01',
  work_end_date date default '9999-12-31',
  termination_reason text default '재직중 (정상 근무)',
  status text not null default '재직중',
  note text,
  updated_at timestamptz not null default now(),
  primary key (slot_no, member_name, work_start_date)
);

-- 3) scenarios: 8+1 지원조 및 9인 운영 시나리오 설정
create table public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mode text not null check (mode in ('NORMAL_9', 'EIGHT_PLUS_DAYTIME')),
  start_date date not null,
  end_date date not null,
  vacant_slot_no int check (vacant_slot_no between 1 and 9),
  temp_cover_slot_no int check (temp_cover_slot_no between 1 and 9),
  support_name text default '방안부지원',
  support_department text default '방사선안전부',
  support_start_date date,
  support_end_date date,
  restore_remaining_days int not null default 14,
  enforce_84d_transfer boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) holidays: 연도별 법정공휴일 및 대체공휴일
create table public.holidays (
  holiday_date date primary key,
  name text not null,
  is_substitute boolean not null default false,
  year int not null
);

-- 5) shift_overrides: 실시간 근무표 2-Layer 수동 변경 및 대근/연차 반영
create table public.shift_overrides (
  cell_key text primary key, -- 예: '2027-01-15_3' (YYYY-MM-DD_SlotNo)
  target_date date not null,
  slot_no int not null check (slot_no between 1 and 9),
  member_name text not null,
  orig_code text not null,
  new_code text not null,
  note text,
  created_by text default '관리자',
  created_at timestamptz not null default now()
);

-- 6) leave_relief_requests: 휴가 및 대근 신청/승인
create table public.leave_relief_requests (
  id uuid primary key default uuid_generate_v4(),
  target_date date not null,
  unit_no int not null check (unit_no in (3, 4)),
  shift_code text not null check (shift_code in ('D', 'A', 'N', '3D', '4D')),
  requester_name text not null,
  requester_slot int not null,
  relief_name text,
  relief_slot int,
  leave_type text not null default '연차',
  reason text not null,
  status text not null check (status in ('OPEN', 'APPROVED', 'REJECTED', 'CANCELLED')) default 'APPROVED',
  created_at timestamptz not null default now()
);

-- 7) credit_ledger: 8+1 및 대근 대체휴무 크레딧 정산 원장
create table public.credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  slot_no int not null check (slot_no between 1 and 9),
  member_name text not null,
  target_date date not null,
  credit_type text not null,
  delta int not null check (delta in (1, -1)),
  memo text,
  created_at timestamptz not null default now()
);

-- 8) audit_logs: 관리자 조작 감사 로그 (Audit Trail)
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_name text not null default '관리자',
  action_type text not null,
  description text not null,
  target text,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 초기 기초 데이터 (Seed Data)
-- ==============================================================================

-- 1) 슬롯 1~9 초기 데이터 (1~4: 3호기, 5~9: 4호기, 2026년 정상 체제 및 2027년 교체 이력 포함)
insert into public.rotation_slots (slot_no, unit, member_name, phone, telegram_id, email, work_start_date, work_end_date, termination_reason, status) values
  (1, '3호기', '최창호', '010-1123-1001', '@choi_hp', 'choi@khnp.co.kr', '2026-01-01', '2026-12-31', '2026년 고정순번 ① (2027년 퇴직/결원)', '교체완료'),
  (1, '3호기', '신욱제', '010-3841-1008', '@shin_hp', 'shin@khnp.co.kr', '2027-01-01', '2027-03-07', '2027년 8+1 기간 3호기(①위치) 임시 대체', '재직중'),
  (2, '3호기', '손정기', '010-5923-2002', '@son_hp', 'son@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무)', '재직중'),
  (3, '3호기', '박경욱', '010-8274-3003', '@park_hp', 'park@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무)', '재직중'),
  (4, '3호기', '임원택', '010-4491-4004', '@lim_hp', 'lim@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무)', '재직중'),
  (5, '4호기', '나상흠', '010-5512-5001', '@na_hp', 'na@khnp.co.kr', '2026-01-01', '2026-12-31', '2026년 고정순번 ⑤ (2026말 정년퇴직)', '퇴직'),
  (5, '4호기', '박상현', '010-7712-5005', '@park_sh', 'park_sh@khnp.co.kr', '2027-01-01', '9999-12-31', '2027-01-01 나상흠(퇴직) 후임 임피 교체', '임금피크'),
  (6, '4호기', '권재호', '010-6318-6006', '@kwon_hp', 'kwon@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무)', '재직중'),
  (7, '4호기', '이근현', '010-9182-7007', '@lee_hp', 'lee@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무)', '재직중'),
  (8, '4호기', '신욱제', '010-3841-1008', '@shin_hp', 'shin@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (고정순번 ⑧ 본래 슬롯)', '재직중'),
  (8, '4호기', '이재겸', '010-3841-8008', '@lee_jk', 'lee_jk@khnp.co.kr', '2027-03-08', '9999-12-31', '2027-03-08 결원위치 신규 투입', '재직중'),
  (9, '4호기', '송명관', '010-2234-9009', '@song_hp', 'song@khnp.co.kr', '2026-01-01', '9999-12-31', '재직중 (정상 근무 / 통상Day)', '재직중');

-- 2) 시나리오 (2026년 정상 9인 체제 & 2027년 8+1 지원 체제)
insert into public.scenarios (name, mode, start_date, end_date, vacant_slot_no, temp_cover_slot_no, support_name, support_department, support_start_date, support_end_date, is_active) values
  ('2026년 9인 정상 운영 시나리오', 'NORMAL_9', '2026-01-01', '2026-12-31', null, null, null, null, null, null, true),
  ('2027년 8+1 방안부 지원 및 9인 원복 시나리오', 'EIGHT_PLUS_DAYTIME', '2027-01-01', '2027-12-31', 1, 8, '방안부지원', '방사선안전부', '2027-01-04', '2027-03-07', true);

-- 3) 대한민국 법정공휴일 및 대체공휴일 (2026년 20일 + 2027년 24일)
insert into public.holidays (holiday_date, name, is_substitute, year) values
  -- 2026년 공휴일
  ('2026-01-01', '신정', false, 2026),
  ('2026-02-16', '설날 연휴', false, 2026),
  ('2026-02-17', '설날', false, 2026),
  ('2026-02-18', '설날 연휴', false, 2026),
  ('2026-03-01', '3·1절', false, 2026),
  ('2026-03-02', '3·1절 대체공휴일', true, 2026),
  ('2026-05-01', '근로자의 날', false, 2026),
  ('2026-05-05', '어린이날', false, 2026),
  ('2026-05-24', '부처님오신날', false, 2026),
  ('2026-05-25', '부처님오신날 대체공휴일', true, 2026),
  ('2026-06-03', '지방선거', false, 2026),
  ('2026-06-06', '현충일', false, 2026),
  ('2026-08-15', '광복절', false, 2026),
  ('2026-08-17', '광복절 대체공휴일', true, 2026),
  ('2026-09-24', '추석 연휴', false, 2026),
  ('2026-09-25', '추석', false, 2026),
  ('2026-09-26', '추석 연휴', false, 2026),
  ('2026-10-03', '개천절', false, 2026),
  ('2026-10-05', '개천절 대체공휴일', true, 2026),
  ('2026-10-09', '한글날', false, 2026),
  ('2026-12-25', '성탄절', false, 2026),
  -- 2027년 공휴일
  ('2027-01-01', '신정', false, 2027),
  ('2027-02-06', '설날 연휴', false, 2027),
  ('2027-02-07', '설날', false, 2027),
  ('2027-02-08', '설날 연휴', false, 2027),
  ('2027-02-09', '설날 대체공휴일', true, 2027),
  ('2027-03-01', '3·1절', false, 2027),
  ('2027-05-01', '근로자의 날', false, 2027),
  ('2027-05-03', '근로자의 날 대체공휴일', true, 2027),
  ('2027-05-05', '어린이날', false, 2027),
  ('2027-05-13', '부처님오신날', false, 2027),
  ('2027-06-06', '현충일', false, 2027),
  ('2027-07-17', '제헌절', false, 2027),
  ('2027-07-19', '제헌절 대체공휴일', true, 2027),
  ('2027-08-15', '광복절', false, 2027),
  ('2027-08-16', '광복절 대체공휴일', true, 2027),
  ('2027-09-14', '추석 연휴', false, 2027),
  ('2027-09-15', '추석', false, 2027),
  ('2027-09-16', '추석 연휴', false, 2027),
  ('2027-10-03', '개천절', false, 2027),
  ('2027-10-04', '개천절 대체공휴일', true, 2027),
  ('2027-10-09', '한글날', false, 2027),
  ('2027-10-11', '한글날 대체공휴일', true, 2027),
  ('2027-12-25', '성탄절', false, 2027),
  ('2027-12-27', '성탄절 대체공휴일', true, 2027);

-- ==============================================================================
-- 권한 및 보안 정책 (Row Level Security): 웹앱 및 교대근무자 전원 조회 및 관리자 수정 허용
-- ==============================================================================

-- 1) 테이블 기본 권한 부여 (Supabase anon, authenticated 역할)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on routines to anon, authenticated;

-- 2) RLS 활성화
alter table public.profiles enable row level security;
alter table public.rotation_slots enable row level security;
alter table public.scenarios enable row level security;
alter table public.holidays enable row level security;
alter table public.shift_overrides enable row level security;
alter table public.leave_relief_requests enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.audit_logs enable row level security;

-- 조회 정책: 웹앱을 사용하는 교대근무자 및 뷰어는 근무표 및 슬롯 조회 허용
drop policy if exists "Allow read profiles" on public.profiles;
create policy "Allow read profiles" on public.profiles for select using (true);

drop policy if exists "Allow read rotation_slots" on public.rotation_slots;
create policy "Allow read rotation_slots" on public.rotation_slots for select using (true);

drop policy if exists "Allow read scenarios" on public.scenarios;
create policy "Allow read scenarios" on public.scenarios for select using (true);

drop policy if exists "Allow read holidays" on public.holidays;
create policy "Allow read holidays" on public.holidays for select using (true);

drop policy if exists "Allow read shift_overrides" on public.shift_overrides;
create policy "Allow read shift_overrides" on public.shift_overrides for select using (true);

drop policy if exists "Allow read leave_relief_requests" on public.leave_relief_requests;
create policy "Allow read leave_relief_requests" on public.leave_relief_requests for select using (true);

drop policy if exists "Allow read credit_ledger" on public.credit_ledger;
create policy "Allow read credit_ledger" on public.credit_ledger for select using (true);

drop policy if exists "Allow read audit_logs" on public.audit_logs;
create policy "Allow read audit_logs" on public.audit_logs for select using (true);

-- 수정/저장 정책: 웹앱 연동 키(anon key)를 통한 원활한 동기화 허용
drop policy if exists "Allow write rotation_slots" on public.rotation_slots;
create policy "Allow write rotation_slots" on public.rotation_slots for all using (true) with check (true);

drop policy if exists "Allow write shift_overrides" on public.shift_overrides;
create policy "Allow write shift_overrides" on public.shift_overrides for all using (true) with check (true);

drop policy if exists "Allow write holidays" on public.holidays;
create policy "Allow write holidays" on public.holidays for all using (true) with check (true);

drop policy if exists "Allow write scenarios" on public.scenarios;
create policy "Allow write scenarios" on public.scenarios for all using (true) with check (true);

drop policy if exists "Allow write leave_relief_requests" on public.leave_relief_requests;
create policy "Allow write leave_relief_requests" on public.leave_relief_requests for all using (true) with check (true);

drop policy if exists "Allow write audit_logs" on public.audit_logs;
create policy "Allow write audit_logs" on public.audit_logs for all using (true) with check (true);
