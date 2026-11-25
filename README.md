# RadShift_K34 (한수원 고리 3,4호기 HP 교대근무 관리 시스템)

한국수력원자력(한수원) 고리 3,4호기 방사선관리(HP) 교대근무자 전용 스케줄링 및 무결점 교대근무 관리 시스템입니다.

---

## 🌟 핵심 특징

1. **무결점 결정론적 알고리즘 (수학적 검증 완료)**
   - **2026년 9인 정상 체제(365일)** 및 **2027년 8+1 지원 -> 9인 원복 시나리오(365일)** 전수 시뮬레이션
   - 일일 3호기(D, A, N=1), 4호기(D, A, N=1) **커버리지 오류 0건**
   - 전원 **최대 연속근무 3일 이하** 철저 준수
   - **역순환(Quick Return: N/A 직후 D) 0건**
   - **고정 9슬롯 및 근무표 행 불변 원칙**

2. **반응형 모바일/PC PWA (GitHub Pages 무료 정적 배포)**
   - React 19 + Vite + TypeScript + Tailwind CSS
   - 엑셀(.xlsx) 원본 양식 4종 내보내기 (월별 매트릭스, 2026 vs 2027 비교표, 크레딧 정산표)
   - 개인별 `.ics` (iCalendar) 스마트폰 캘린더 연동

3. **Supabase 서버리스 백엔드 및 Row Level Security (RLS)**
   - 관리자 승인제 RBAC (L1 뷰어, L2 HP 근무자, L3 관리자)
   - 절대 보안 원칙: Public 저장소 배포 시 소스코드 내 실명/시크릿 하드코딩 배제, 로그인 전 빈 인증 화면 유지
   - 실명 <-> 슬롯코드(HP-01~HP-09) 익명화 토글 지원

4. **텔레그램 단톡방 양방향 연동 봇**
   - 단톡방 명령어: `/오늘`, `/내일`, `/근무 [이름]`, `/월간`, `/비교`, `/대근요청`
   - 인터랙티브 인라인 버튼: `[제가 대근할게요]` 클릭 시 제약 검증 후 관리자 승인 자동 전달
   - 매일 오전 07:00 (KST) 당일 교대조 자동 브리핑 (Supabase 7일 인액티브 방지 겸용)

---

## 🚀 빠른 시작

### 1. 로컬 개발 환경 실행
```bash
# 의존성 설치
npm install

# 단위 테스트 실행 (2026/2027 365일 전수 검증)
npm test

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 📑 프로젝트 구조

```
RadShift_K34/
├── docs/
│   └── SPECIFICATION.md          # 프로그램 상세 명세서 (SRS & 아키텍처)
├── src/
│   ├── engine/
│   │   ├── types.ts              # 핵심 타입 정의
│   │   ├── holidays.ts           # 2026 & 2027 법정공휴일/대체공휴일 DB
│   │   ├── shiftEngine.ts        # 결정론적 21일/84일 교대근무 엔진
│   │   └── __tests__/
│   │       └── shiftEngine.test.ts # 2026/2027 365일 단위 테스트
│   ├── components/
│   │   ├── Header.tsx            # 상단 헤더 & 모드/권한 토글
│   │   ├── TodayDashboard.tsx    # 오늘/내일 교대조 & 14일 캘린더
│   │   ├── MonthlyMatrix.tsx     # 2-Layer 월간 매트릭스 편집기
│   │   ├── LeaveReliefModal.tsx  # 휴가 신청 & 대근자 Top 3 추천
│   │   ├── ScenarioSimulator.tsx # 2026 vs 2027 비교 & 8+1 타임라인
│   │   ├── TelegramBotSimulator.tsx # 텔레그램 단톡방 대화 시뮬레이터
│   │   └── AuthModal.tsx         # 승인제 로그인 모달
│   ├── services/
│   │   └── supabaseClient.ts     # Supabase 클라이언트
│   └── utils/
│       ├── excelExport.ts        # .xlsx 엑셀 내보내기 엔진
│       └── icsExport.ts          # .ics 캘린더 내보내기 엔진
├── supabase/
│   ├── migrations/               # PostgreSQL 테이블 8종 및 RLS 정책
│   └── functions/                # Deno Edge Functions (telegram-webhook, daily-briefing-cron)
└── .github/workflows/deploy.yml  # GitHub Pages 자동 배포 CI/CD
```
