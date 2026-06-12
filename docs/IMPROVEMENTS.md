# Game Data Studio — 개선 항목 & 추가 기능 제안

> 작성일: 2026-06-12  
> 출처: Opus 심층 분석 (코드 직접 검증)  
> 상태: Phase 0~3 완료 후 다음 작업 목록

---

## ⚠️ 최우선 발견 (작업 시작 전 필수 확인)

**`npm test` 현재 실패 상태**  
커밋 `3b50c57b chore: 완료된 작업 문서/테스트/워크스페이스 정리`에서 테스트 파일 전체가 삭제됨.  
`src/`에 `*.test.ts` / `*.spec.ts` 0개. vitest.config도 없음.  
MEMORY에 "199 통과" 기록은 과거 사실이며 현재 안전망 = 0.

**복원 대상 (git 히스토리에서):**
- `rng` 시드 결정성
- `stats.wilsonCI` (n=0, k=0, k=n 경계)
- `gacha` 소프트 천장 경계
- `curve/fit` R² 정확도
- `curve/solve` 이분탐색 수렴
- `analyze` 이상값 감지
- `useGridState` 행 상태
- `bins` 히스토그램 구간
- `combat.skills` 전투 스킬

---

## 높음 우선순위 (7개)

### 버그 / 데이터 무결성

#### H-1. 테스트 안전망 복원
- **위치:** `git show 3b50c57b^:<path>` 로 복원
- **문제:** LLM 에이전트가 코어를 수정할 때 회귀를 잡을 방법이 없음
- **해결:** vitest.config 추가 + 코어 테스트 재작성

#### H-2. CSV 라운드트립 데이터 손실
- **위치:** `src/lib/util/csv.ts:6`, `src/app/api/csv/route.ts:14-18`
- **문제:** `line.split(",")` 파서가 따옴표 안 쉼표를 인식 못함. export도 `"..."` 감싸기만 하고 내부 `"`를 `""`로 이스케이프 안 함
- **해결:** RFC 4180 준수 파서/직렬화로 교체

#### H-3. z-score 이상값 감지 수학적 실패
- **위치:** `src/lib/balance/analyze.ts:47`
- **문제:** 모집단 표준편차(÷n) + 이상값 자신 포함 계산 → N<11 테이블에서 danger(z>3) 수학적 불가능. RPG 소표본 테이블에서 거짓 음성 다발
- **해결:** MAD 기반 modified z-score로 교체 (소표본 강건)

#### H-4. simulation POST fallthrough 저장 버그
- **위치:** `src/app/api/simulation/route.ts` 마지막 else
- **문제:** action 미매칭 시 body 전체를 시뮬레이션으로 저장 → 데이터 오염
- **해결:** else 분기에서 `{error: "unknown action"}` 400 반환

### 코드 품질 / UX

#### H-5. DataEditor.tsx 거대 컴포넌트 분리
- **위치:** `src/components/editor/DataEditor.tsx` (1248줄)
- **문제:** 곡선 모달(983-1149), 스냅샷 diff 모달(1199-1245), 메모 모달(1151-1197), 밸런싱 패널(913-963)이 혼재
- **해결:** `CurveModal.tsx`, `SnapshotDiffModal.tsx`, `AnnotationModal.tsx`로 추출

#### H-6. SimulationView.tsx 거대 컴포넌트 + 코드 생성 인라인
- **위치:** `src/components/simulation/SimulationView.tsx` (1371줄, L45-104)
- **문제:** `generateEngineCode`가 5 엔진 × 5 곡선 수식을 컴포넌트 내 하드코딩. 6종 시뮬 패널 혼재
- **해결:** `src/lib/codegen/engineFormula.ts`로 순수 함수 추출, `simulation/panels/`로 모드 분리

#### H-7. SEED_TEMPLATES 이중 정의
- **위치:** `src/app/api/genre-wizard/route.ts:24+` vs `src/lib/genre-seeds.ts`
- **문제:** 위자드가 LLM에 제안하는 스키마와 실제 DB에 생성하는 스키마의 출처가 별개 → 한쪽만 수정 시 조용한 불일치
- **해결:** `genre-wizard` 인라인 정의 삭제, `@/lib/genre-seeds` 단일 출처화

---

## 중간 우선순위 (17개)

### 기능 구멍

#### M-1. solveCurve base≤0 가드 과잉
- **위치:** `src/lib/curve/solve.ts`
- **문제:** linear/quadratic/logarithmic에도 `base<=0 → solved:false` 적용. `value=10×(level-1)` 같은 정상 케이스 실패
- **해결:** 가드를 power/exponential에만 적용

#### M-2. 전투/DPS speed가 빈도 미반영
- **위치:** `src/lib/simulation/combat.ts`, `src/lib/simulation/dps.ts`
- **문제:** speed가 행동 순서만 결정, 빈도 동일. DPS는 per-hit 데미지(초당 아님)
- **해결:** combat sub-turn 큐, dps에 attackSpeed 반영

#### M-3. 가챠 시뮬 가중치·픽업 미반영
- **위치:** `src/lib/simulation/gacha.ts`
- **문제:** 단순 베르누이. DB엔 `weight`·`is_rate_up` 컬럼 있으나 시뮬 무시
- **해결:** `pool: {item, weight, rateUp}[]` 파라미터 추가

#### M-4. 스냅샷 복원 트랜잭션 없음
- **위치:** `src/lib/mcp/handlers/snapshot-handler.ts`
- **문제:** N delete + M insert 트랜잭션 없음 → 중간 실패 시 부분 복원으로 데이터 파손
- **해결:** `db.transaction()`으로 래핑

#### M-5. 곡선 자동 선택 R² 공간 혼재
- **위치:** `src/app/api/simulation/route.ts` 자동 선택 로직
- **문제:** linear R²(원본 공간) vs power/exp R²(로그 공간) 직접 비교 → power/exp 편향 선택
- **해결:** 비교 전 원본 공간 R²로 재계산 또는 AIC 비교

### 성능

#### M-6. projects GET N+1 쿼리
- **위치:** `src/app/api/projects/route.ts`
- **문제:** 프로젝트 × 테이블마다 행 COUNT 개별 호출. 전 행을 JS로 로드 후 카운트
- **해결:** `SELECT table_id, COUNT(*) FROM rows GROUP BY table_id` 단일 쿼리

#### M-7. FK 검증 limit 1000 잘림
- **위치:** `src/lib/db/repo/rows.ts:28`, FK 검증 경로
- **문제:** `readRows` 기본 limit 1000 → 초과 테이블 검증 조용히 누락
- **해결:** 전수 조사 경로에 `limit: Infinity` 또는 전용 `readAllRows`

#### M-8. 데이터 그리드 가상화 부재
- **위치:** `src/components/editor/DataEditor.tsx:770`
- **문제:** 전 행 DOM 렌더 + 클라이언트 전수 substring 검색. 200레벨 곡선 테이블에서 지연
- **해결:** 서버 페이지네이션(`readRows` limit/offset 이미 지원) 또는 자체 windowing

### UX

#### M-9. prompt()/confirm() 사용
- **위치:** `DataEditor.tsx:575` (스냅샷 이름), `DataEditor.tsx:188, 583` (삭제 확인)
- **문제:** 브라우저 기본 다이얼로그. Electron에서 투박. 이미 Modal 컴포넌트 존재
- **해결:** 기존 `Modal`/`Input` 컴포넌트로 교체

#### M-10. 컬럼 정렬·필터 부재
- **위치:** `DataEditor.tsx` 헤더
- **문제:** 검색이 전 컬럼 substring 단일 입력뿐. "SSR 등급만 보기", "atk 내림차순" 불가
- **해결:** 헤더 클릭 정렬, enum 체크박스 / number 범위 필터

#### M-11. 스키마 변경 undo 없음
- **위치:** `SchemaEditor.tsx`
- **문제:** 행 데이터는 undo/redo 정교하나 컬럼 추가/삭제/타입 변경 되돌리기 불가
- **해결:** 스키마 변경 전 자동 스냅샷 또는 영향 행 수 표시 확인 모달

### 아키텍처

#### M-12. mutating 라우트 try/catch 누락
- **위치:** `balance`, `rows`, `relations`, `projects`, `tables` POST
- **문제:** 예외 시 HTML 500 반환 → 클라이언트 JSON 파싱 실패
- **해결:** `withErrorBoundary(handler)` 래퍼 도입

#### M-13. 에러 상태 코드 불일치
- **문제:** 동일 유형(DB 제약) 오류가 400 또는 500 혼재. DELETE 성공 응답도 204/`{deleted}`/`{restored}` 혼재
- **해결:** 제약 위반=400, 서버 오류=500. DELETE=204 또는 `{deleted:true}` 중 하나로 통일

#### M-14. API 라우트 보일러플레이트 반복
- **문제:** `searchParams.get("project_id")` + null 체크 패턴 15회+, 에러 형식 6회+
- **해결:** `src/lib/util/http.ts`에 `requireParam`, `errorResponse` 유틸

#### M-15. enum 입력 DB 레벨 검증 없음
- **위치:** `src/lib/db/repo/rows.ts:41`
- **문제:** MCP/채팅 경로로 enum 정의 외 값, number 컬럼에 문자열 입력 가능
- **해결:** `upsertRow` 시 타입 강제 변환(number 컬럼은 Number() 시도)

---

## 낮음 우선순위 (6개)

- **L-1.** 일괄 편집(선택 범위 수식 적용 "×1.1") — `DataEditor.tsx` 컨텍스트 메뉴
- **L-2.** 강화 비용 누적 계산기 (성공률 포함 기대 재화/시도 횟수)
- **L-3.** rows.data JSON blob → SQLite json_extract 인덱스 (장기 아키텍처)
- **L-4.** 보안 이슈 3종 (CSV filename 헤더, 경로 traversal, 무인증) — 로컬 Electron 툴이라 실질 위험 낮음
- **L-5.** enum 컬럼 → DB generated column 승격 (장기)
- **L-6.** 보일러플레이트 에러 래퍼 (M-14와 연동)

---

## 추가 기능 제안 (6개)

### F-1. [높음] 진척도 페이싱 시뮬레이터
- **내용:** "N일차에 몇 레벨/스테이지/재화" 타임라인 산출
- **구현:** 기존 `difficulty` + `economy` + `curve` 코어 조합, 신규 의존성 0
- **임팩트:** 콘텐츠 소진 속도·페이 게이트 위치 결정

### F-2. [중간] 재화 싱크/소스 대시보드
- **내용:** `min_balance`, `ROI`, `burn_rate`, `days_to_positive` 지표 + 소스/싱크 분해 차트
- **구현:** `economy/project.ts` EcoResult 확장

### F-3. [중간] soft-cap / piecewise 곡선
- **내용:** 다이미니싱 리턴(`base×(1−e^(−k·L))`), 구간별 piecewise
- **구현:** `generate.ts` 타입 추가, `fit.ts`·`solve.ts`·엔진 코드 생성 동반

### F-4. [중간] PvP 매치메이킹 / 티어 분포 시뮬
- **내용:** 전력 분포 + 매칭 규칙 → 티어별 기대 승률·승급 속도 몬테카를로
- **구현:** `winRateMatrix` 확장

### F-5. [중간] 밸런스 변경 영향 자동 추적
- **내용:** 저장된 시뮬을 스냅샷에 바인딩 → 데이터 변경 시 before/after 자동 비교
- **구현:** `simulations` + `snapshots` 테이블 연결

### F-6. [낮음] 강화/합성 비용 누적 계산기
- **내용:** 레벨별 비용·성공률 컬럼 → 기대 누적 비용·분산

---

## 권장 착수 순서

```
1. H-1 테스트 복원   → 2. H-4 simulation fallthrough 수정
3. H-2 CSV 파서 수정 → 4. H-3 z-score 수정
5. H-5/H-6 컴포넌트 분리 → 6. H-7 SEED_TEMPLATES 단일화
7. F-1 진척도 페이싱 시뮬 (가장 가치 높은 신기능)
```
