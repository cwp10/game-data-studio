# Game Data Studio 전면 고도화 계획

> 작성일: 2026-06-10 · 최종 업데이트: 2026-06-11
> 근거: indiebalancing(velog @dj258255 7편) 분석 — 설문 실측 데이터는 `docs/research/indiebalancing/SURVEY-DATA.md`
> 결정: **RPG 전용 온보딩(Phase 0)** → 에디터 UX(Phase 1) → 밸런싱/시뮬(Phase 2). 시뮬은 **네이티브 엔진 주력 + 장르별 특화**

---

## 현재 상태 (2026-06-11)

| Phase | 항목 | 상태 |
|-------|------|------|
| Phase 0 | RPG 온보딩 재편 (P0-1~P0-4) | ✅ 완료 |
| Phase 1 | 에디터 UX 고도화 (P1-0~P1-5) | ✅ 완료 |
| Phase 2 | 밸런싱/시뮬 전체 (P2-1~P2-10) | ✅ 완료 |
| P3-1 | AI 밸런싱 리포트 (BalancePanel + `/api/chat` 브리지) | ✅ 완료 |
| P3-2 | 데이터 유효성·FK 무결성 | ✅ 완료 |
| P3-3 | JSON export | ✅ 완료 |
| P3-4-E | 곡선 확장(logarithmic·quadratic) + fit.ts | ✅ 완료 |
| P3-4-F | 버전 히스토리 diff (스냅샷 비교) | ✅ 완료 |
| P3-4 S-Curve | S-Curve(로지스틱) 6번째 곡선 유형 | ✅ 완료 |
| P3-5 | 수치 근거 메모 (annotations) | ✅ 완료 |
| **P3-4-G** | **xlsx import + 다국어 텍스트 테이블** | ⬜ 미완료 |
| **P3-6** | **레퍼런스 데이터셋 (장르별 표준 수치)** | ⬜ 미완료 |

> 현재 테스트: 205 passes · tsc 0 · 최신 커밋: `dff3fa4a`

---

## 1. 배경 (Context)

velog 시리즈 7편(@dj258255)은 **"indiebalancing"** — 우리 Game Data Studio와 **동일 도메인(게임 밸런스 데이터 스프레드시트)의 경쟁 제품** 개발기다. 시장조사(2,200명 오픈카톡, 12명 응답)로 검증한 기능 우선순위와, 실전에서 부딪힌 기술 구현(IME·성능·undo/redo·전투 시뮬)이 담겨 있다. 이를 분석해 **우리 제품에 선별 적용**한다.

### 핵심 전제
1. **우리의 moat는 MCP + AI 대화 브리지 + 영속 SQLite + 스키마/관계다.** indiebalancing은 클라이언트 스프레드시트에 불과하다. 목표는 "기능 패리티"가 아니라 **검증된 아이디어만 선별 차용**.
2. **가장 시급한 발견은 정확성 버그**다. 우리 셀 에디터(`DataEditor.tsx:451`)는 한글 조합 중 Enter가 셀을 저장해버린다(IME composition 가드 부재, 코드로 확정). 한국 사용자 대상 제품에서 이건 기능 누락이 아니라 **버그**다.

### 제품 포커스 결정 (RPG 전용)
프로젝트 온보딩을 **RPG 전용으로 좁힌다.** 인디 RPG(수집형·방치형·MMORPG·턴제/액션)에 집중해 스키마와 시뮬을 **장르 특화**한다. 비RPG 장르(시뮬·퍼즐·액션·전략·교육·스포츠)는 온보딩에서 제거. 이렇게 장르가 좁혀져야 "장르를 고르면 그 장르의 스키마 + 주력 시뮬이 함께 제안되는" 흐름이 성립한다. → 상세 **§4 Phase 0**.

### indiebalancing 시장조사 결과 (설문 n=12 실측 — 원자료 `docs/research/indiebalancing/`)
- **최대 페인: "밸런스 검증 어려움" 83.3%(10/12)** 압도적 1위 → 밸런싱/시뮬이 제품 핵심 가치(정조준).
- 도구 현황: 엑셀/구글시트 75%, 엔진 에디터 41.7%, **전용 툴 0%(시장 공백)**.
- 개발 장르(복수): **로그라이크 50%(1위)**, RPG 턴제/액션 41.7%, 시뮬/경영 41.7%, 방치형 33.3% → **RPG 6종에 로그라이크 포함이 데이터로 적중**(시뮬/경영 41.7%는 RPG 전용 결정에 따라 비대상 — 확장 후보로만 기록).
- 사용 의향 부정 0%, 무료 50%+써보고판단 41.7%. 가격: 무료 50%/기능 좋으면 상관없음 25%(서버형 기능엔 지불) → Open Core 근거.
- 기능 우선순위(본문): 1.스프레드시트 UI > 2.엔진 연동 > 3.시각화 > 4.DPS/EHP/TTK > 5.몬테카를로. 타겟: 1~5인 인디팀(전담 밸런서 부재, VBA 역량 낮음).

### 기존 「시뮬레이션 기획」과의 정합성 (흡수)
기존 PLAN.md는 "**게임 엔진을 실행하지 않고 앱 안에서 수치를 미리 확인·검증한다. C# 코드 출력은 필요 없음**"을 목표로, 시뮬 4유형(스탯 계산기 / 전투 / 가챠 / 성장 곡선)을 우선순위로 정의했다. 본 계획은 이를 **Phase 2에 그대로 흡수**한다. 따라서:
- **신규 시뮬의 1차 결과물은 "앱 내 수치 확인"** (네이티브 TS 엔진). C# export는 필수가 아님.
- 기존 `run_simulation`(snapshot→Claude C# 생성)은 **삭제하지 않고 "엔진 코드 export" 보조 기능으로 격하 유지**. 주력은 네이티브 엔진이다.

---

## 2. 의도적으로 제외 (scope 보호)

- **비RPG 장르 온보딩**: RPG 전용 집중을 위해 제거(§4 Phase 0).
- **글 #3의 드래그 성능 최적화(rafThrottle/DOM 직접조작/will-change/Set O(1))**: 우리는 셀 드래그 선택 자체가 없다. 존재하지 않는 기능의 최적화는 차용 대상이 아니다. 셀 선택은 먼저 단순하게 구현하고, 실측 후에만 최적화한다(글 #4 본인 결론: "premature optimization 금지, 즉시 동기화").
- **전역 토스트로 `alert()` 전면 교체**: 별도의 더 넓은 스코프. Phase 1 자동저장 표시기는 로컬 status bar로만.
- **70개 게임 함수를 70개 MCP 툴로 노출**: 순수 TS 라이브러리로 두고 시뮬 엔진이 소비.
- **셀 수식 엔진 / 시트 간 참조(스프레드시트 함수)**: SQLite 영속·정적값·MCP 변경 모델과 근본 충돌(= 다른 제품). 채택하지 않고 **미래 탐색 과제**로만 남김(§11 Phase 3 메모).

---

## 3. 조직 원칙 (Phase 2 전반)

신규 백엔드 기능은 기존 검증 패턴을 따른다:

> **순수 코어 `src/lib/<domain>/` (+ colocated `*.test.ts`) → 얇은 API 라우트(UI용) → 얇은 MCP 핸들러(AI/moat용).**

`src/lib/balance/analyze.ts`가 API와 MCP에 동시 소비되는 것이 이미 검증된 선례다. **의존성 추가 0개 원칙**(차트 self-SVG, RNG/Wilson CI/solver 자체 구현).

---

## 4. Phase 0 — RPG 중심 온보딩 재편 (가장 먼저)

> **결정**: 온보딩을 RPG 전용으로 집중. 4개 하위 장르(수집형/방치형/MMORPG/턴제·액션)를 1차 카드로 제공하고, 장르 선택 시 **검증된 스키마 템플릿 + 장르별 주력 시뮬 세트**를 함께 제안한다. 이게 잡혀야 Phase 2 시뮬도 장르 맥락에서 의미를 가진다.

### 대상 RPG 하위 장르 (6종, 모두 1차 포함 — **완전 RPG 전용, 자유입력 없음**)
| 코드 | 장르 | 핵심 스키마(요약) | 템플릿 상태 |
|------|------|------------------|------------|
| `collection_rpg` | 수집형 RPG | characters·skills·items·stages·drop_tables·gacha_tables | ✅ 기존 검증 |
| `idle_rpg` | 방치형 RPG | heroes·buildings·enemies·quests·economy_config·offline_rewards | ✅ 기존 검증 |
| `mmorpg` | MMORPG | classes·skills·equipment·enhance_table·monsters·dungeons·market_items·pvp_tiers | 🆕 §12 부록 설계 |
| `battle_rpg` | 턴제/액션 RPG | characters·skills·equipment·elements·enemies·chapters·exp_curves | 🆕 §12 부록 설계 |
| `roguelike_rpg` | 로그라이크 RPG | characters·items·synergies·enemies·floors·events·shop_items·run_modifiers | 🆕 §12 부록 설계 |
| `srpg` | SRPG (전략) | units·classes·weapons·weapon_triangle·terrain·maps | 🆕 §12 부록 설계 |

### 성장 데이터 구조 — **하이브리드(확정)**
모든 장르 공통으로 **메타 테이블 + `<entity>_levels` 전개 테이블** 패턴을 쓴다.
- **메타 테이블**(예: `characters`): 등급·속성·`base_*` 기본 스탯 + 성장 곡선 파라미터(타입/계수).
- **전개 테이블**(예: `character_levels`): `(entity_id, level, hp, atk, def, …)` 레벨별 실제 전개값. **`generate_curve`로 산출**(현재 동작과 정확히 일치 — 별도 테이블에 레벨별 행 생성).
- **이점**: 메타/수치 분리 + 스프레드시트에서 전개값 직접 확인·편집 + 비선형 수동 보정 자유. 스탯 계산기(P2-2)는 전개 테이블을 조회.

### 장르 ↔ 주력 시뮬 매핑 (★=핵심 / ○=중요 / △=보조)
| 시뮬레이션 | 수집형 | 방치형 | MMORPG | 턴제/액션 | 로그라이크 | SRPG |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| 가챠 (P2-4) | ★ | △ | ○강화 | – | – | – |
| 경제+인플레이션 (P2-7) | ○ | ★ | ★ | △ | △ | – |
| 전투 (P2-3) | ★ | ○자동 | ○레이드 | ★ | ★런 | ★ |
| 스탯 계산기 (P2-2) | ★ | ○ | ○ | ★ | ○ | ★ |
| DPS 분산 (P2-5) | ○ | △ | ★레이드 | ★ | ★빌드 | ○ |
| 난이도/플레이타임 (P2-8) | ○ | ★ | △ | ★ | ★층 | ★ |
| PvP 승률 매트릭스 (P2-10) | △ | – | ★ | △ | – | ○ |

> 이 매핑이 "RPG 장르에 맞춰 시뮬도 설계"의 구현 근거다. 장르를 고르면 해당 ★/○ 시뮬이 우선 노출된다.
> 로그라이크=런/층 스케일링·아이템 시너지 빌드 중심, SRPG=유닛 성장·무기 상성·맵별 난이도 중심.

### P0-1. 장르 선택 L1을 RPG 하위 장르로 교체 (**완전 RPG 전용, 자유입력 제거**)
- **무엇**: 현재 8개 대분류(RPG/시뮬/퍼즐/액션/전략/방치형·캐주얼/교육/스포츠) → **RPG 6개 하위 장르 카드**로 교체. 비RPG 및 **자유입력 제거**.
- **파일**: `src/components/project/ProjectWizard.tsx:12-25` L1 정의 교체. 옵션 6개(collection_rpg/idle_rpg/mmorpg/battle_rpg/roguelike_rpg/srpg). `custom` 자유입력 입력란(`156-159`) 제거.
- **확장 정책**: 신규 RPG 변종이 필요하면 자유입력이 아니라 **카드 추가**로 대응(템플릿 품질 보장).
- **난이도**: 낮음.

### P0-2. 장르별 스키마 템플릿 정비 (AI 제안 시드, 하이브리드 성장)
- **무엇**: AI 제안의 품질·일관성을 위해 6개 장르 각각의 핵심 테이블 템플릿을 시드로 보유. **모든 장르에 하이브리드(메타 + `_levels` 전개) 패턴 적용.**
- **기존**: `game-schema` 스킬에 **수집형·방치형 검증 템플릿 존재**(단, 하이브리드 전개 테이블 패턴으로 정비 — 기존 `balance_curves`를 `character_levels` 전개 테이블로 대체/보강).
- **신규**: `mmorpg`·`battle_rpg`·`roguelike_rpg`·`srpg` 템플릿 추가 — **상세 설계는 §12 부록 확정본** 사용.
- **파일**: `.claude/skills/game-schema/SKILL.md`에 §12 부록 4종 + 하이브리드 공통 규칙 반영. `.claude/agents/schema-designer.md`를 RPG 6종 전문으로 정비.
- **구현 시**: 실제 SKILL.md 작성·MCP 시퀀스 산출은 `schema-designer` 에이전트로 위임(§12 부록을 입력 사양으로).

### P0-3. genre-wizard 프롬프트를 RPG 온보딩으로 재구성 + 템플릿 시드 주입
- **무엇**: `/api/genre-wizard`의 system/user 프롬프트를 RPG 4종 중심으로 재작성. `finish=true` 시 **선택 장르의 검증 템플릿을 프롬프트에 시드로 주입**해 AI가 그 위에서 보강·특화하도록(빈손 생성 대비 품질·일관성↑).
- **파일**: `src/app/api/genre-wizard/route.ts:49-67` 프롬프트 재구성. 장르 코드별 시드 테이블 셋을 상수로 보유(스킬 템플릿과 동기화).
- **난이도**: 중간.

### P0-4. 장르 ↔ 주력 시뮬 안내 노출
- **무엇**: 장르 선택/미리보기 단계에서 "이 장르의 주력 시뮬레이션"(위 매핑)을 함께 안내. scaffold 후 시뮬 화면이 해당 장르 시뮬을 우선 노출(시뮬 화면 연동은 Phase 2에서).
- **파일**: `ProjectWizard.tsx` 미리보기(`100-134`)에 주력 시뮬 안내 추가. genre 메타데이터(`projects.genre`)에 장르 코드 저장(이미 TEXT 컬럼 존재).

---

## 5. Phase 1 — 데이터 에디터 UX 고도화 (우선순위 순)

### P1-0. `useGridState` 리듀서 토대
- **무엇**: DataEditor의 grid 상태(`rows`, `activeCell`, `selection`, `undoStack`, `redoStack`)를 `useReducer` 커스텀 훅으로 통합.
- **파일**: 신규 `src/components/editor/useGridState.ts` + `useGridState.test.ts`.
- **이유**: 순수 리듀서라 undo/redo·클립보드 셰이핑을 브라우저 없이 vitest로 단위 테스트 가능. 상태가 DataEditor에 완전 로컬 → **zustand 불필요**. stale-closure 버그류를 구조적으로 제거.
- **난이도**: 중간. 기존 useState 마이그레이션은 점진 적용 가능.

### P1-1. IME(한글) 버그 수정 — ⭐ 최우선, 정확성 버그
- **핵심 1줄**: `DataEditor.tsx:451`을 `if (e.key === "Enter" && !e.nativeEvent.isComposing) saveCell(...)`로. 이것만으로 핵심 버그 차단.
- **견고화(글 #5)**: 텍스트 input 분기(`DataEditor.tsx:444-452`)만 uncontrolled `defaultValue` + `isComposingRef`(compositionStart/End 추적)로 전환. 이때 `saveCell`이 `editVal`(라인 450) 대신 input ref/event에서 값을 읽도록 함께 수정.
- **건드리지 않음**: enum `<select>` 분기(`434-443`)는 IME 무관.
- **난이도**: 가드 1줄 낮음, uncontrolled 견고화 중간. 리스크 낮음.

### P1-2. `useEscapeKey` 공통 훅 + Modal ESC 통일
- **무엇**: 모든 모달 ESC로 닫힘. 현재 `ui.tsx:108-118` Modal은 backdrop 클릭만 있고 ESC 핸들러 없음(확인됨).
- **파일**: 신규 `src/components/useEscapeKey.ts`(useEffect keydown 등록/해제) → `ui.tsx` Modal에서 호출.
- **난이도**: 낮음.

### P1-3. Undo/Redo 명령 스택 (셀 단위, 최대 50)
- **단축키**: Ctrl+Z / Ctrl+Shift+Z.
- **스코프(확정)**: **셀 편집만 1차**. 행 추가/삭제 undo는 후속(스코프 보호). **curve-gen·snapshot-restore·CSV import·applyAllAnomalies는 제외**(벌크 op).
- **설계**: 명령 = `{ rowId, col, before, after }`. undo는 **반드시 `/api/rows` POST로 라운드트립**(DB가 source of truth) + functional `setRows`. 스택은 useGridState 리듀서 내부, `saveCell`이 커맨드 push.
- **리스크**: API 라운드트립 누락 시 DB-UI 불일치 → 리듀서 액션이 항상 POST를 동반하도록 강제.

### P1-4. 셀 단위 선택 + 클립보드 복붙 (단순 구현)
- **무엇**: activeCell 모델(P1-0) 위 셀 클릭/범위 선택, Ctrl+C/V.
- **설계**: 복사 = **TSV**(Excel/구글시트 양방향 호환). N셀 붙여넣기 = **1 undo 엔트리**. 키보드 네비(방향키/Tab)는 activeCell 위 얇은 후속(필수 아님 → 스코프 확장 자제).
- **재사용**: `navigator.clipboard`(`SimulationView.tsx:128` 선례), selectedRowIds 패턴.
- **성급한 최적화 금지**: rafThrottle/DOM 직접조작 미도입.

### P1-5. 자동저장 "저장됨" 표시기 (로컬)
- **무엇**: 셀 저장 시 status bar(`DataEditor.tsx:585`)에 saving→saved(2s 후 idle) 트랜지언트 표시.
- **설계**: DataEditor 로컬 `saveState`. `saveCell` 진입 시 saving, 완료 시 saved.
- **난이도**: 낮음.

### P1-6. (후순위, 1차 범위 밖) 열 너비 리사이즈 / 헤더 클릭 전체선택
- **확정**: 1차 스코프 제외. activeCell·undo 안정화 후 여력 있을 때 진행.

---

## 6. Phase 2 — 밸런싱/시뮬 기능 확장

> 기존 「시뮬레이션 기획」의 4유형(스탯 계산기·전투·가챠·성장 곡선)을 흡수. 1차 결과물은 **앱 내 수치 확인**(네이티브 TS 엔진).
> **장르 특화**: 각 시뮬의 장르별 우선도는 §4 Phase 0 매핑 참조. 구현은 4개 장르를 고루 커버하도록 배치(가챠=수집형, 경제=방치/MMO, 전투/DPS=턴제·MMO).

### P2-1. 게임 특화 함수 + 스탯 계산 라이브러리
- **파일**: 신규 `src/lib/gamefn/index.ts` + test. DPS/EHP/TTK/DAMAGE 등 순수 함수 + **스탯 계산식**(`최종 스탯 = 기본값 × 레벨 성장 보정 × 강화 보정`, 기존 기획 #1). 시뮬 엔진이 소비.
- **MCP 노출(확정)**: `compute_metric` 툴은 **노출하지 않음**. gamefn은 순수 라이브러리로만 두고 시뮬 엔진이 직접 소비(필요 생기면 그때 1개 추가).
- **테스트**: 함수별 알려진 입력/출력 단위 테스트.

### P2-2. 스탯 계산기 (기존 기획 #1) — 전 장르 공통
- **무엇**: "레벨 50, 강화 +7일 때 최종 스탯" — 캐릭터/레벨/강화 입력 → ATK/DEF/HP 출력, 조건별 비교(Lv1 vs Lv50).
- **데이터 구조 — 하이브리드(확정)**: 메타 테이블 `base_*` + 강화 보정으로 임의 레벨 즉석 계산, **또는** `<entity>_levels` 전개 테이블(generate_curve 산출)에서 직접 조회. 계산기는 전개 테이블 우선, 없으면 곡선 파라미터로 산출. (§4 성장 구조 참조)
- **파일**: `src/lib/gamefn` 소비 + `SimulationView.tsx` 신규 "스탯 계산기" 유형. `computeCurve`(curve/generate.ts) 연동.

### P2-3. 네이티브 전투 시뮬 엔진 (기존 기획 #2 + 몬테카를로) — 1차: 단순 교환 전투
- **장르 주력**: 턴제/액션 ★, 수집형 ★, MMORPG(레이드 DPS 체크) ○.
- **무엇**: 결정론적 턴제 전투(승/패·소요 턴·HP 추이) + **몬테카를로(1k~100k) + Wilson 95% CI**, 1:1 / N:N. **1차 스코프는 단순 데미지 교환 전투**(스킬 없음 — 스킬은 P2-3b로 분리).
- **파일**:
  - `src/lib/simulation/rng.ts` — **mulberry32 시드 PRNG**(필수: `Math.random`은 시드 불가→테스트가 아무것도 단언 못 함) + test(고정 시드 재현).
  - `src/lib/simulation/stats.ts` — Wilson CI(`denom=1+z²/n`, `center=(p̂+z²/2n)/denom`, `margin=(z/denom)·√(p̂(1−p̂)/n+z²/4n²)`) + test 앵커 **n=100,k=50 → ~[0.404, 0.596]**.
  - `src/lib/simulation/combat.ts` — gamefn 소비, 시드 RNG로 전투 반복, 승률+CI+HP추이+**전투 로그(턴별 이벤트 배열)** 반환 + test(고정 시드 결정적).
  - API: `src/app/api/simulation/route.ts`에 `action:"montecarlo"` 추가.
  - MCP: `simulation-handler.ts`에 `run_combat_simulation` 툴. 기존 `run_simulation`(snapshot→C#)은 **엔진 코드 export 보조 기능으로 유지**.
  - UI: `SimulationView.tsx`에 네이티브 결과(승률 막대 + CI + HP 추이 차트) 섹션 + **전투 로그 패널 + 로그 export(CSV/JSON)** 버튼.
- **전투 로그 export(indiebalancing)**: combat.ts가 반환하는 로그 배열을 기존 CSV export 패턴(`/api/csv`·export 유틸)으로 다운로드. 1회 대표 전투 로그 기준.
- **재사용**: `saveSimulation` repo(result JSON), ContentHeader/CsCodeBlock, LineChart, CSV export 유틸.

### P2-3b. 전투 스킬 시스템 (2차 확장, 엔진 안정화 후)
- **무엇**: indiebalancing MVP의 지원 스킬 — **힐 / 무적 / 부활 / 범위 공격 / 크리티컬 표시**.
- **설계**: P2-3 combat.ts에 **스킬 효과 훅**(턴마다 적용되는 effect 파이프라인)을 확장. 스킬 데이터는 skills 테이블에서 읽음. 1차 엔진이 결정적으로 검증된 뒤 착수(스코프 보호 — 처음부터 넣지 않는다).
- **파일**: `combat.ts` 확장 + `combat.skills.test.ts`. UI: 스킬 토글/결과에 스킬 발동 로그.

### P2-4. 가챠 시뮬레이션 (기존 기획 #3)
- **장르 주력**: 수집형 ★, MMORPG(장비 강화 응용) ○.
- **무엇**: "SSR 3%면 평균 몇 번?" — 가챠 테이블(확률) + 횟수(예 10,000) 입력 → 평균 획득 횟수·확률 분포·**천장(pity) 반영**.
- **파일**: 신규 `src/lib/simulation/gacha.ts`(P2-3의 rng/stats 재사용) + test. API `action:"gacha"`, MCP `run_gacha_simulation` 툴. UI: SimulationView 신규 유형 + Histogram(P2-9).
- **재사용**: gacha_tables 스키마, rng.ts, Histogram.

### P2-5. DPS 분산 분석 (indiebalancing MVP)
- **장르 주력**: 턴제/액션 ★, MMORPG(레이드) ★, 수집형 ○.
- **무엇**: 데미지 롤(분산·크리티컬)을 몬테카를로로 굴려 **데미지 분포**를 보고, **빌드 간 비교**(예: 빌드 A vs B의 DPS 분포 겹쳐 보기).
- **파일**: 신규 `src/lib/simulation/dps.ts`(rng.ts·gamefn 재사용 — DAMAGE/DPS 함수) + test(고정 시드 결정적). API `action:"dps"`, MCP `run_dps_simulation` 툴. UI: SimulationView 신규 유형 + Histogram(다중 시리즈 빌드 비교).
- **재사용**: rng.ts, gamefn(P2-1), Histogram.

### P2-6. Goal Solver (목표 역산)
- **무엇**: "Lv50에서 exp=1,000,000" 목표 → 곡선 파라미터 역산.
- **설계**: 단조 곡선 위 **이분탐색(bisection)**, 최적화 라이브러리 미도입.
- **파일**: 신규 `src/lib/curve/solve.ts` + test. API `src/app/api/curve/route.ts`에 `action:"solve"`. MCP `curve-handler.ts`에 `solve_curve` 툴. UI: DataEditor 곡선 모달(`597-661`)에 "목표값으로 역산".
- **재사용**: `computeCurve`(generate.ts), `generateCurveIntoTable`(apply.ts).

### P2-7. 경제 시뮬 고도화 — 인플레이션/디플레이션 (indiebalancing MVP)
- **장르 주력**: 방치형 ★, MMORPG(거래소) ★.
- **무엇**: 현재 `economy/project.ts`는 정적 선형 모델(고정 금액 수입/지출)뿐. **시간에 따른 재화 가치 변동율**(인플레이션/디플레이션)을 반영해 실질 잔액·물가 추이를 예측.
- **설계**: `EcoEntry`에 선택적 `growth`(주기별 증감율) 필드 추가, `projectEconomy`가 일별 누적 시 변동율 적용. 후방호환(기본 0 = 기존 동작 그대로).
- **파일**: `src/lib/economy/project.ts` 확장 + 기존 `project.test.ts`에 인플레이션 케이스 추가. UI: `EconomySim.tsx`에 변동율 입력 + 실질잔액 시리즈.
- **재사용**: 기존 projectEconomy 구조, LineChart.

### P2-8. 난이도 곡선 / 플레이타임 예측 (indiebalancing MVP)
- **장르 주력**: 방치형 ★, 턴제/액션 ★.
- **무엇**: stages 테이블 기반 **스테이지별 난이도** 표시 + 전투 엔진의 소요 턴을 활용한 **예상 플레이타임** 추정.
- **설계**: P2-3 combat.ts를 스테이지마다 1:1로 돌려 평균 소요 턴 → **턴당 시간 기본 1턴=1초**(UI에서 조정 가능)로 플레이타임 환산. 난이도 = 플레이어 권장 스탯 대비 적 스탯 비율.
- **파일**: 신규 `src/lib/simulation/difficulty.ts`(combat.ts 재사용) + test. API `action:"difficulty"`. UI: SimulationView 신규 유형(스테이지별 난이도·플레이타임 표 + LineChart).
- **재사용**: stages 스키마, combat.ts, LineChart.

### P2-9. 차트 확장 (성장 곡선 기존 #4 + 레이더/히스토그램)
- **결정: 자체 SVG.** recharts는 d3 의존을 끌어오는데 `LineChart.tsx` 60줄이 충분함을 입증 → 의존성 최소화·기존 패턴 준수와 충돌. SVG로 확정.
- **파일**: 신규 `src/components/chart/RadarChart.tsx`(능력치 비교, 극좌표 폴리곤), `src/components/chart/Histogram.tsx`(가챠/DPS 분포 막대, 다중 시리즈). LineChart SVG 패턴·CHART_PALETTE 미러. 성장 곡선 뷰어는 기존 LineChart 재사용. 순수 UI → 수동 확인.
- **선행성 주의**: Histogram은 P2-4(가챠)·P2-5(DPS)가 소비하므로, 해당 시뮬보다 **먼저 또는 함께** 구현.

### P2-10. 밸런싱 확장 (파워커브/상관/승률 매트릭스) — 후순위
- **장르 주력**: MMORPG(직업 PvP 승률 매트릭스) ★.
- `analyze.ts` 확장 또는 신규 `src/lib/balance/correlate.ts`. 코어+test 먼저, API/MCP 재노출은 P2-3/6 안정화 후.

---

## 7. 공통 인프라 결정

- **상태관리**: `useReducer` 커스텀 훅(`useGridState`), **zustand 미도입**. 결합 상태지만 DataEditor 완전 로컬 → 전역 store 부당. 리듀서가 stale-closure 버그류 제거 + undo/redo 단위 테스트 가능화.
- **자동저장 표시기**: 로컬 status bar `saveState`. 전역 토스트는 별도 스코프.
- **의존성 추가**: 0개.

---

## 8. 검증 방법

### Phase 0
- 앱 시나리오: 프로젝트 생성 → **RPG 4종 카드만 노출(비RPG 없음)** → 장르 선택 시 해당 템플릿 기반 스키마 제안 → **주력 시뮬 안내 표시** → scaffold 후 테이블 생성 확인.
- 4개 장르 각각 1회씩 생성해 **핵심 테이블이 템플릿대로** 나오는지 확인(특히 신규 mmorpg/battle_rpg).

### Phase 1
- `npm test`로 `useGridState` 리듀서(undo/redo, 클립보드 TSV 셰이핑) 단위 테스트.
- 앱 시나리오:
  1. 한글 입력 중 Enter → 조합만 확정(셀 저장 안 됨)
  2. Ctrl+Z로 셀 값 복원(+ DB 재조회 시 일치)
  3. 셀 복사 → Excel 붙여넣기 정렬 유지
  4. ESC로 모든 모달 닫힘
  5. 셀 저장 시 "저장됨" 표시

### Phase 2
- `npm test`로 `rng`(고정 시드 재현)·`stats`(Wilson 앵커 n=100,k=50)·`combat`(결정적)·`gacha`·`dps`(결정적)·`difficulty`·`economy`(인플레이션 케이스)·`gamefn`·`solve`.
- MCP 스모크: `run_combat_simulation`/`run_gacha_simulation`/`run_dps_simulation`/`solve_curve` 호출.
- 앱 시나리오: 스탯 계산기 결과 확인, 시뮬 화면 승률+CI 표시 + **전투 로그 export(CSV)**, 가챠 분포 히스토그램, **DPS 분포 빌드 비교(다중 시리즈)**, **경제 인플레이션 실질잔액 곡선**, **난이도·예상 플레이타임 표**, 곡선 모달 목표 역산→테이블 반영, 레이더 차트 렌더.

---

## 9. 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/components/project/ProjectWizard.tsx` | Phase 0 — L1 RPG 4종 카드(12-25), 미리보기+주력시뮬 안내(100-134) |
| `src/app/api/genre-wizard/route.ts` | Phase 0 — RPG 온보딩 프롬프트 + 장르 템플릿 시드 주입(49-67), 자유입력 제거 |
| `.claude/skills/game-schema/SKILL.md` | Phase 0 — 신규 4종(mmorpg/battle_rpg/roguelike_rpg/srpg) + 하이브리드 전개 패턴 (§12 부록 기준) |
| `.claude/agents/schema-designer.md` | Phase 0 — RPG 6종 전문으로 정비 |
| `src/components/editor/DataEditor.tsx` | Phase 1 전반 — IME 가드(451), 셀 편집 분기(434-452), saveCell(129-137) |
| `src/components/editor/useGridState.ts` (신규) | Phase 1 상태/undo·redo 토대 + test |
| `src/components/useEscapeKey.ts` (신규) | Modal ESC 통일 |
| `src/components/ui.tsx` | Modal ESC(108-118) |
| `src/lib/simulation/{rng,stats,combat,gacha,dps,difficulty}.ts` (신규) | Phase 2 네이티브 시뮬 코어 + test (combat은 P2-3b에서 스킬 확장) |
| `src/lib/gamefn/index.ts` (신규) | 게임 특화 함수 + 스탯 계산 라이브러리 + test |
| `src/lib/economy/project.ts` (확장) | 인플레이션/디플레이션 변동율 반영 (후방호환) |
| `src/lib/curve/solve.ts` (신규) | Goal Solver (generate.ts/apply.ts 재사용) |
| `src/components/chart/{RadarChart,Histogram}.tsx` (신규) | 차트 확장 (LineChart 패턴 미러) |
| `src/components/simulation/SimulationView.tsx` | 스탯 계산기/전투/가챠/DPS/난이도 유형 + 전투 로그 export |

---

## 10. 착수 순서 권고

**전체 순서: Phase 0(RPG 온보딩) → Phase 1(에디터 UX) → Phase 2(시뮬) → Phase 3(추가, 보류).**
단, **IME 1줄 가드(`DataEditor.tsx:451`)는 Phase와 무관하게 즉시 적용**(최고 ROI, 한국 사용자 정확성 버그). **Phase 3(§11)는 critical path가 아니며 Phase 1/2 안정화 후 진행.**

- **Phase 0**: P0-1(L1 RPG 카드) → P0-2(mmorpg/battle_rpg 템플릿) → P0-3(genre-wizard 프롬프트+시드) → P0-4(주력 시뮬 안내).
- **Phase 1**: P1-1(IME) → P1-0(리듀서) → P1-2(ESC) → P1-3(undo) → P1-4(클립보드) → P1-5(저장표시기).
- **Phase 2**: P2-1(함수/스탯식) → P2-2(스탯 계산기, 데이터 구조 A/B 결정 선행) → P2-9 차트 일부(Histogram 선행) → P2-3(전투 1차 + 로그 export) → P2-4(가챠) → P2-5(DPS 분산) → P2-6(Goal Solver) → P2-7(경제 인플레이션) → P2-8(난이도/플레이타임) → P2-3b(전투 스킬 2차 확장) → P2-9 나머지(RadarChart) → P2-10(밸런싱 확장).

> 순서 메모: Histogram(P2-9)은 가챠·DPS가 소비하므로 그 전에 만든다. **전투 스킬(P2-3b)은 1차 전투 엔진이 결정적으로 검증된 뒤** 착수해 scope를 보호한다.

---

## 11. Phase 3 — 추가 기능

> Phase 0/1/2 전체 완료. Phase 3 대부분 구현 완료 — 미완료 항목은 **P3-4-G, P3-6** 2개.

### ✅ P3-1. AI 밸런싱 리포트 (완료)
- `analyze_balance` 결과 → `promptBuilder.ts` → `/api/chat` SSE 스트림 → BalancePanel "AI 리포트" 버튼.

### ✅ P3-2. 데이터 유효성·FK 무결성 (완료)
- 컬럼 제약(min/max·required·unique) + 위반 셀 하이라이트. FK 깨진 참조 검출 + 행 삭제 경고.
- 파일: `src/lib/validation/`, `src/lib/db/repo/columns.ts`, `SchemaEditor.tsx`, `DataEditor.tsx`.

### ✅ P3-3. JSON 데이터 export (완료)
- `/api/csv?format=json` — 테이블 데이터 JSON 배열 export. DataEditor export 버튼에 JSON 옵션.

### ✅ P3-4-E. 곡선 확장 + 피팅 (완료)
- `generate.ts`: logarithmic·quadratic·s_curve(로지스틱) 추가 (총 6종). 파라미터: range/rate/midpoint.
- `fit.ts`: 전 6종 닫힌형 OLS/logit 선형화. `solve.ts`: s_curve early return(unsupported).
- DataEditor 모달: 타입별 입력 분기, 역산 disable, 피팅 결과 반영.
- 곡선별 RPG 용처: `docs/research/indiebalancing/SURVEY-DATA.md` 참조.

### ✅ P3-4-F. 버전 히스토리 diff (완료)
- `src/lib/snapshot/diff.ts`: 두 스냅샷 간 added/removed/changed 행 비교.
- DataEditor GitCompare 버튼 → 색상 코딩 diff 모달.

### ✅ P3-5. 수치 근거 메모 (완료)
- `annotations` 테이블 + API + MCP(`add_annotation`/`get_annotations`/`delete_annotation`).
- DataEditor: 행별 StickyNote 아이콘 → 메모 모달.

---

### ⬜ P3-4-G. xlsx import + 다국어 텍스트 테이블 (미완료)
- **무엇**: import 포맷 확장(xlsx), RPG 현지화 텍스트 테이블 패턴.
- **주의**: xlsx 파싱은 외부 라이브러리(xlsx/exceljs) 필요 — 의존성 추가 0 원칙과 충돌. 구현 전 접근법 결정 필요.
- **파일**: `/api/csv` 확장 또는 신규 route. DataEditor import 버튼에 xlsx 옵션.

### ⬜ P3-6. 레퍼런스 데이터셋 (미완료)
- **무엇**: 장르별 **표준 수치 예시(유명 게임 벤치마크)** 제공 → 신규 기획 시 비교 기준. RPG 6종 템플릿(§12 부록)과 연계.
- **성격**: 코드보다 데이터·문서 작업. 시드 데이터 JSON 또는 `docs/` 레퍼런스 + scaffold 시 참고값 주입.
- **파일**: `data/reference/` 또는 `docs/reference/`. 신규 프로젝트 scaffold API에 참고값 연결.

### 보류·제외 메모
- **엔진 C# 코드 생성**: **나중에 결정**(JSON/CSV 데이터 export로 충분한지 검증 후 판단). 기존 「시뮬레이션 기획」의 "C# 출력 불필요" 입장 유지하며, 변경 시 명시 결정.
- **셀 수식 엔진(C)**: 채택 안 함 — SQLite 영속·MCP 모델과 근본 충돌(§2). 미래 탐색 과제.

---

## 12. 부록 — RPG 6종 스키마 템플릿 (확정본)

> 공통 규칙: 모든 테이블 `id`(string, nanoid PK). **하이브리드 성장 = 메타 테이블 + `<entity>_levels` 전개 테이블**(generate_curve 산출). 전개 테이블 공통 컬럼 `(<entity>_id, level, hp, atk, def, …)`. 이 부록이 P0-2 구현 시 `game-schema` SKILL.md와 `schema-designer`의 입력 사양이다.

### 기존 2종 보강 (하이브리드 정비)
- **collection_rpg**: 기존 7테이블 유지 + `character_levels`(character_id, level, hp, atk, def, spd) 전개 테이블 추가. 기존 `balance_curves`(multiplier)는 메타의 곡선 파라미터로 흡수.
- **idle_rpg**: 기존 6테이블 유지 + `hero_levels`(hero_id, level, dps, upgrade_cost) 전개 테이블 추가.

### mmorpg (MMORPG)
| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `classes` | 직업 메타 | name, role(tank/dps/healer), base_hp, base_atk, base_def, resource_type, growth_type |
| `class_levels` | 전개 | class_id→classes, level, hp, atk, def, mp |
| `skills` | 스킬 | class_id→classes, name, type, damage_ratio, cooldown, mp_cost, range |
| `equipment` | 장비 | name, slot(weapon/armor/accessory), grade, stat_type, stat_value, enhance_max |
| `enhance_table` | 강화 곡선 | enhance_level, success_rate(0~1), cost_gold, stat_bonus |
| `monsters` | 몬스터/보스 | name, type(normal/elite/raid), hp, atk, def, exp, gold |
| `dungeons` | 던전/레이드 | name, type(dungeon/raid), recommend_cp, boss_monster_id→monsters, party_size |
| `market_items` | 거래소(경제) | equipment_id→equipment, base_price, supply, demand |
| `pvp_tiers` | PvP 티어 | tier_name, mmr_min, mmr_max, reward_gold |

### battle_rpg (턴제/액션 RPG)
| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `characters` | 캐릭터 메타 | name, element, role, base_hp, base_atk, base_def, base_spd, crit_rate, growth_type |
| `character_levels` | 전개 | character_id→characters, level, hp, atk, def, spd |
| `skills` | 스킬 | character_id→characters, name, type(active/passive), damage_ratio, sp_cost, element, target(single/all) |
| `equipment` | 장비 | name, slot, stat_type, stat_value |
| `elements` | 속성 상성표 | attacker_element, defender_element, multiplier |
| `enemies` | 적/보스 | name, element, hp, atk, def, spd, is_boss |
| `chapters` | 챕터/스테이지 | name, chapter_no, stage_no, recommend_level, enemy_id→enemies, exp_reward |
| `exp_curves` | 경험치 곡선 | level, exp_required |

### roguelike_rpg (로그라이크 RPG)
> 성장 축이 레벨보다 **런/층 스케일링 + 아이템 시너지 빌드**. 전개 테이블은 `floor_scaling`(층별 적 스탯 배율).
| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `characters` | 플레이 캐릭터 | name, base_hp, base_atk, base_speed, starting_item_id→items |
| `items` | 유물/아이템 | name, rarity(common/rare/epic/legendary), effect_type, effect_value, synergy_tag |
| `synergies` | 시너지 세트 | synergy_tag, pieces_required, bonus_type, bonus_value |
| `enemies` | 적 | name, hp, atk, behavior, is_elite |
| `floors` | 층/방 | floor_no, room_type(combat/elite/shop/boss/treasure), enemy_count |
| `floor_scaling` | 전개/스케일링 | floor_no, hp_mult, atk_mult (generate_curve 산출) |
| `events` | 랜덤 이벤트 | name, floor_min, probability, reward_type, risk_type |
| `shop_items` | 상점 | item_id→items, base_price, appear_rate |
| `run_modifiers` | 저주/축복 | name, type(boon/curse), stat_affected, modifier |

### srpg (전략 RPG)
> **성장률(growth rate)** 이 핵심. 전개=`unit_levels`. 그리드 전투는 무기 상성·지형 보정.
| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `units` | 유닛 메타 | name, class_id→classes, base_hp, base_atk, base_def, base_mov, base_range, growth_hp/atk/def(%) |
| `unit_levels` | 전개 | unit_id→units, level, hp, atk, def |
| `classes` | 병종 | name, tier, move_type(infantry/cavalry/flying), promote_to_id→classes |
| `weapons` | 무기 | name, type(sword/lance/axe/bow/magic), might, hit, weight, range_min, range_max |
| `weapon_triangle` | 무기 상성 | attacker_type, defender_type, hit_bonus, damage_bonus |
| `terrain` | 지형 | name, def_bonus, avoid_bonus, move_cost |
| `maps` | 전투 맵 | name, chapter_no, width, height, turn_limit, objective(rout/seize/survive) |

> 각 장르의 주력 시뮬은 §4 매핑 참조. 신규 4종은 P0-2 착수 시 `schema-designer`가 이 부록을 입력으로 SKILL.md·MCP 시퀀스를 산출한다.
