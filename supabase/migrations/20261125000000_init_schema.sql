-- ==============================================================================
-- RadShift_K34 Supabase Database Schema
-- 한수원 HP 교대근무 관리(고리3,4호기)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. profiles table (Auth profile & role management)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  alias_code text not null default 'HP-00', -- HP-01 ~ HP-09 for anonymization
  role text not null check (role in ('L1_VIEWER', 'L2_HP', 'L3_ADMIN')) default 'L1_VIEWER',
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  slot_no int check (slot_no between 1 and 9),
  telegram_user_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. rotation_slots table (9 fixed slots & effective date range)
create table if not exists public.rotation_slots (
  slot_no int not null check (slot_no between 1 and 9),
  member_name text not null,
  effective_from date not null,
  effective_to date,
  note text,
  primary key (slot_no, effective_from)
);

-- 3. scenarios table (8+1 & 9-person scenario configuration)
create table if not exists public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mode text not null check (mode in ('NORMAL_9', 'EIGHT_PLUS_DAYTIME')),
  start_date date not null,
  end_date date not null,
  vacant_slot_no int check (vacant_slot_no between 1 and 9),
  temp_cover_slot_no int check (temp_cover_slot_no between 1 and 9),
  support_name text,
  support_start_date date,
  support_end_date date,
  restore_remaining_days int not null default 14,
  enforce_84d_transfer boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. holidays table (Official Korean holidays)
create table if not exists public.holidays (
  holiday_date date primary key,
  name text not null,
  is_substitute boolean not null default false,
  year int not null
);

-- 5. leave_relief_requests table (Leave & Relief Requests)
create table if not exists public.leave_relief_requests (
  id uuid primary key default uuid_generate_v4(),
  target_date date not null,
  unit_no int not null check (unit_no in (3, 4)),
  shift_code text not null check (shift_code in ('D', 'A', 'N', '3D', '4D')),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  relief_id uuid references public.profiles(id) on delete set null,
  leave_type text not null check (leave_type in ('연차', '병가', '교육', '공가', '대휴', '경조')),
  reason text not null,
  comp_type text not null check (comp_type in ('OT_PAY', 'SWAP_CREDIT')),
  status text not null check (status in ('OPEN', 'CANDIDATE_ACCEPTED', 'APPROVED', 'REJECTED', 'CANCELLED')) default 'OPEN',
  telegram_message_id bigint,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. shift_overrides table (2-Layer manual shift override)
create table if not exists public.shift_overrides (
  id uuid primary key default uuid_generate_v4(),
  target_date date not null,
  slot_no int not null check (slot_no between 1 and 9),
  member_name text not null,
  orig_code text not null,
  new_code text not null,
  badge_label text,
  request_id uuid references public.leave_relief_requests(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. credit_ledger table (Compensatory leave credit transactions)
create table if not exists public.credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  slot_no int not null check (slot_no between 1 and 9),
  target_date date not null,
  credit_type text not null check (credit_type in ('HOLIDAY_P11_COVER', 'WEEKDAY_SWAP_COMP', 'RELIEF_SWAP')),
  delta int not null check (delta in (1, -1)),
  memo text,
  created_at timestamptz not null default now()
);

-- 8. audit_logs table (Admin action audit trail)
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all 8 tables
alter table public.profiles enable row level security;
alter table public.rotation_slots enable row level security;
alter table public.scenarios enable row level security;
alter table public.holidays enable row level security;
alter table public.leave_relief_requests enable row level security;
alter table public.shift_overrides enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.audit_logs enable row level security;

-- Helper functions for RLS checks
create or replace function public.is_approved()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'L3_ADMIN'
  );
$$;

-- PROFILES policies
create policy "Allow user to read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Allow approved users to read all profiles"
  on public.profiles for select
  using (public.is_approved());

create policy "Allow user to insert own profile on signup"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Allow user to update own display info"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Allow admin to manage all profiles"
  on public.profiles for all
  using (public.is_admin());

-- ROTATION_SLOTS, SCENARIOS, HOLIDAYS policies (Read for approved, Write for admin)
create policy "Read rotation_slots for approved users"
  on public.rotation_slots for select
  using (public.is_approved());

create policy "Admin manage rotation_slots"
  on public.rotation_slots for all
  using (public.is_admin());

create policy "Read scenarios for approved users"
  on public.scenarios for select
  using (public.is_approved());

create policy "Admin manage scenarios"
  on public.scenarios for all
  using (public.is_admin());

create policy "Read holidays for approved users"
  on public.holidays for select
  using (public.is_approved());

create policy "Admin manage holidays"
  on public.holidays for all
  using (public.is_admin());

-- LEAVE_RELIEF_REQUESTS policies
create policy "Read leave requests for approved users"
  on public.leave_relief_requests for select
  using (public.is_approved());

create policy "Insert leave request for approved L2/L3 users"
  on public.leave_relief_requests for insert
  with check (
    public.is_approved() and
    auth.uid() = requester_id
  );

create policy "Update leave request for requester or relief or admin"
  on public.leave_relief_requests for update
  using (
    public.is_admin() or
    (public.is_approved() and (auth.uid() = requester_id or auth.uid() = relief_id))
  );

-- SHIFT_OVERRIDES, CREDIT_LEDGER, AUDIT_LOGS policies
create policy "Read shift_overrides for approved users"
  on public.shift_overrides for select
  using (public.is_approved());

create policy "Admin manage shift_overrides"
  on public.shift_overrides for all
  using (public.is_admin());

create policy "Read credit_ledger for approved users"
  on public.credit_ledger for select
  using (public.is_approved());

create policy "Admin manage credit_ledger"
  on public.credit_ledger for all
  using (public.is_admin());

create policy "Read audit_logs for approved users"
  on public.audit_logs for select
  using (public.is_approved());

create policy "Admin manage audit_logs"
  on public.audit_logs for all
  using (public.is_admin());
