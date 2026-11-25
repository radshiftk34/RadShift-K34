# Changelog

이 프로젝트의 모든 주요 업데이트 내역은 본 문서에 기록됩니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 규격과 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [1.0.0] - 2026-11-25

### 주요 내용 (Highlights)
- **2026년 9인 정상 체제 및 2027년 8+1 방안부 지원 시나리오 무결점 엔진 구현**
- 2026년 및 2027년 365일 전수 단위 테스트 통과 (일일 커버리지 오류 0건, 최대 연속근무 3일 이하, 역순환 0건)
- 고정 9슬롯 및 표 행 위치 불변 원칙 준수
- 2027년 대한민국 법정공휴일/대체공휴일 24일 DB 탑재

### Added (신규 기능)
- `src/engine/shiftEngine.ts`: 순수 TypeScript 결정론적 교대근무 엔진 (21일 통상 블록, 일요 경계일 조정 유형 1~3, 84일 호기 이동, 8인 결원 대체, 8+1 방안부 지원, 9인 복원 잔여 14일 통상)
- `src/engine/holidays.ts`: 2026년 및 2027년 우주항공청 월력요항 기준 공휴일 DB
- `src/engine/__tests__/shiftEngine.test.ts`: Vitest 기반 2026/2027 365일 전수 검증 테스트 슈트 (13개 테스트 전원 통과)
- `src/components/TodayDashboard.tsx`: 오늘/내일 교대조 현황 카드, 일일 커버리지 검증 배지, 개인별 14일 캘린더 조회
- `src/components/MonthlyMatrix.tsx`: 2-Layer 월간 매트릭스 편집기 (L3 관리자 셀 탭 퀵 팔레트, Diff 미리보기 및 초기화)
- `src/components/LeaveReliefModal.tsx`: 휴가 신청 및 알고리즘 기반 대근자 자동 추천 Top 3 모달
- `src/components/ScenarioSimulator.tsx`: 2026 vs 2027 연간 통계 비교표 및 8+1 타임라인
- `src/components/TelegramBotSimulator.tsx`: 텔레그램 단톡방 대화 및 `[제가 대근할게요]` 인라인 버튼 시뮬레이터
- `src/components/VersionModal.tsx`: 앱 내 실시간 버전 및 누적 업데이트 내역 조회 모달
- `src/utils/excelExport.ts`: 원본 양식 엑셀(.xlsx) 시트 3종 내보내기 (월별 근무표, 비교표, 크레딧 정산표)
- `src/utils/icsExport.ts`: 개인별 모바일 캘린더 동기화 (.ics iCalendar)
- `scripts/release.mjs`: semver 기반 자동 버전 bump 및 CHANGELOG/릴리즈 노트 생성 스크립트
- `supabase/migrations/`: PostgreSQL 테이블 8종 스키마, 엄격한 RLS 정책, 초기 9슬롯 및 시나리오 시드 데이터
- `supabase/functions/`: Deno Edge Functions (`telegram-webhook`, `daily-briefing-cron`)
- `.github/workflows/deploy.yml`: GitHub Actions를 통한 GitHub Pages 자동 빌드 및 배포 파이프라인

### Security (보안)
- Public GitHub 배포 시 소스코드 내 실명, 텔레그램 봇 토큰, Service Role Key 노출 방지 (로그인 전 빈 화면 유지)
- Supabase Auth 승인제 (`status = 'approved'`) 및 PostgreSQL Row Level Security 적용
- 관리자 토글형 실명 / 슬롯코드(HP-01~HP-09) 익명화 뷰 지원
