---
name: game-data-feature
description: Game Data Studio 기능 구현 오케스트레이터. 새 기능 추가, MCP 툴 구현, UI 화면 개발, 밸런싱 로직, 시뮬레이션 수식 등 이 프로젝트의 모든 개발 작업 요청 시 반드시 이 스킬을 사용한다. "구현해줘", "추가해줘", "만들어줘", "수정해줘", "고쳐줘", "다시 해줘", "재실행", "업데이트" 등 개발 요청은 모두 이 스킬로 처리한다.
---

## Phase 0: 컨텍스트 확인

작업 시작 전 기존 상태를 확인한다:

1. `_workspace/` 폴더 존재 여부 확인
   - 없음 → **초기 실행** (Phase 1부터)
   - 있음 + 사용자가 수정/재실행 요청 → **후속 실행** (`_workspace/`의 이전 산출물 참조 후 Phase 1)
   - 있음 + 새 기능 요청 → `_workspace/`를 `_workspace_prev/`로 이동 후 **새 실행**

2. 요청 유형 분류:
   - `schema` — 장르별 스키마 설계
   - `backend` — MCP 핸들러 / API 라우트 / DB repo
   - `ui` — React 컴포넌트 / 화면 구현
   - `balance` — 이상값 감지 / 밸런싱 분석 (analyze_balance 중심)
   - `simulation` — 새 시뮬 엔진 모듈 (코어 TS → API/MCP + UI 2단계)
   - `fullstack` — 백엔드 + UI 동시 구현 (시뮬 코어 불필요 시)

---

## Phase 1: 요청 분석

1. 사용자 요청에서 구현 범위 파악
2. 관련 기존 파일 목록 확인 (Read 또는 find 사용)
3. 구현 계획 수립: 어떤 파일을 신규/수정할지 목록화
4. 간단히 사용자에게 확인: "X, Y, Z 파일을 구현/수정합니다. 진행할까요?"

---

## Phase 2: 병렬 구현 (서브 에이전트)

요청 유형별로 해당 에이전트를 서브 에이전트로 호출한다.

### schema 요청
```
schema-designer 에이전트 (model: "opus")
  → game-schema 스킬 활용
  → 출력: _workspace/01_schema_design.json
```

### backend 요청
```
mcp-implementer 에이전트 (model: "opus")
  → mcp-dev 스킬 활용
  → 출력: 구현 파일들 + _workspace/02_mcp_impl_summary.md
```

### ui 요청
```
ui-builder 에이전트 (model: "opus")
  → gds-ui 스킬 활용
  → wireframe.html 참조
  → 출력: 구현 파일들 + _workspace/03_ui_summary.md
```

### balance 요청
```
balance-engineer 에이전트 (model: "opus")
  → balance-algo 스킬 활용 (이상값 감지, analyze_balance)
  → 출력: 구현 파일들 + _workspace/04_balance_summary.md
```

### simulation 요청 — Stage A → Stage B 2단계 파이프라인
새 시뮬 엔진 모듈(예: GoalSolver, 경제인플레, 난이도 등) 추가 시 이 패턴을 따른다.

**Stage A: 순수 TS 코어 (balance-engineer 단독)**
```
balance-engineer 에이전트 (model: "opus")
  → balance-algo 스킬 활용 (네이티브 TS 시뮬 패턴)
  → 구현 대상: src/lib/simulation/{module}.ts + {module}.test.ts
  → 게이트: npm test 녹색 + npx tsc --noEmit 0 확인 필수
  → 출력:
      _workspace/{N0}_stageA_spec.md  — 결정적 앵커 + shape 정의
      _workspace/{N1}_contract.md     — Stage B shape 계약 (단일 출처)
      _workspace/{N2}_stageA_summary.md
```

**Stage A 완료 후 Stage B 진입 (게이트 통과 시만)**
```
mcp-implementer (background) + ui-builder (background) 병렬 실행
  각자 _workspace/{N1}_contract.md를 단일 출처로 소비
  → mcp-implementer: API route action 추가 + MCP 핸들러
  → ui-builder: SimulationView 유형 추가
  → 출력: _workspace/{N3}_stageB_summary.md
```

계약 파일 소비 원칙: Stage B 에이전트는 계약 파일의 shape/타입을 글자 그대로 사용한다. 재해석·변형 금지.

### fullstack 요청
```
mcp-implementer (background) + ui-builder (background) 병렬 실행
  → 각자 출력 후 Phase 3으로
  (시뮬 코어가 필요하면 simulation 타입 사용)
```

**에이전트 호출 시 반드시 model: "opus" 파라미터를 명시한다.**

---

## Phase 3: QA 검증

구현 완료 후 qa-validator 에이전트를 호출한다.

```
qa-validator 에이전트 (model: "opus", subagent_type: "general-purpose")
  입력:
    - scope: 구현한 기능명
    - files: Phase 2에서 생성/수정한 파일 목록
  출력: _workspace/05_qa_report.md
```

QA 리포트 검토:
- **실패 항목이 있으면**: 해당 에이전트를 재호출해 수정 → QA 재실행
- **경고만 있으면**: 사용자에게 경고 내용 보고 후 진행
- **전체 통과**: Phase 4로

---

## Phase 4: 완료 보고

사용자에게 다음을 보고한다:

```
## 구현 완료: {기능명}

### 변경된 파일
- {파일 경로}: {한 줄 설명}

### 검증 결과
- 통과 {N}건 / 경고 {M}건

### 사용 방법
{간단한 사용 예시}
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 에이전트가 1회 실패 | 재호출 1회 (같은 스펙으로) |
| 에이전트가 2회 연속 실패 | 해당 파트 없이 진행, 보고서에 누락 명시 |
| QA 실패 2회 반복 | 사용자에게 실패 항목 직접 보고, 수동 수정 요청 |
| 파일 충돌 | 기존 파일 백업 후 덮어쓰기, 사용자에게 알림 |

---

## 테스트 시나리오

### 정상 흐름: MCP 툴 추가
1. "export_csv 기능 구현해줘" → backend 분류
2. mcp-implementer 호출 → `src/lib/mcp/handlers/csv-handler.ts` 구현
3. qa-validator 호출 → MCP handler ↔ API 라우트 shape 검증
4. 완료 보고

### 정상 흐름: UI 화면 수정
1. "밸런싱 패널에 차트 추가해줘" → ui 분류
2. wireframe.html 참조 확인
3. ui-builder 호출 → `BalancePanel.tsx` 수정
4. QA → 완료

### 에러 흐름: QA 실패
1. ui-builder가 API shape 불일치 코드 작성
2. qa-validator → 실패 리포트
3. ui-builder 재호출 (실패 항목 명시)
4. QA 재실행 → 통과

---

## 후속 작업 처리

이전 `_workspace/` 산출물이 있으면 해당 에이전트에게 이전 결과 파일 경로를 전달한다.
에이전트 정의에 "이전 산출물이 있으면 읽고 개선점 반영" 지침이 포함되어 있다.

"다시 실행", "재실행", "업데이트", "수정", "보완", "이전 결과 기반으로" 등의 표현은 모두 이 스킬을 트리거한다.
