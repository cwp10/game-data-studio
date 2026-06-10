---
name: game-schema
description: 게임 장르별 DB 스키마 설계 패턴. 수집형 RPG, 방치형 RPG 등 장르에 맞는 테이블/컬럼/관계 구조를 제공한다. "스키마 설계", "테이블 구조", "장르별 데이터 모델", "어떤 테이블이 필요해" 등 게임 데이터 모델링 요청 시 반드시 이 스킬을 사용한다.
---

> **RPG 6종 전용.** 지원 장르 코드: `collection_rpg`, `idle_rpg`, `mmorpg`, `battle_rpg`, `roguelike_rpg`, `srpg`.
> 테이블·컬럼 사양의 단일 출처는 `game-data-feature/_workspace/00_genre_contract.md §5`다. 충돌 시 계약이 우선한다.

작업 시작 시 해당 장르 파일을 읽는다:
- `references/genres/collection_rpg.md` — 수집형 RPG
- `references/genres/idle_rpg.md` — 방치형 RPG
- `references/genres/mmorpg.md` — MMORPG
- `references/genres/battle_rpg.md` — 턴제/액션 RPG
- `references/genres/roguelike_rpg.md` — 로그라이크 RPG
- `references/genres/srpg.md` — 전략 SRPG

## 공통 규칙

- `id`: TEXT (nanoid, PRIMARY KEY) — `create_table`이 자동 생성
- 수치: number (INTEGER/REAL), 텍스트 분류: string (TEXT), 플래그: boolean (INTEGER 0/1)
- `created_at`, `updated_at`: INTEGER (epoch ms)
- FK 컬럼명은 `<target>_id` 패턴

## 하이브리드 성장 구조 (전 장르 공통)

성장하는 엔티티는 **메타 테이블 + `<entity>_levels` 전개 테이블** 두 층.

- **메타**: 등급·속성·`base_*` 기본 스탯 + `growth_type` (linear/power/exponential). 디자이너가 직접 채우는 원천 데이터.
- **전개**: `(<entity>_id, level, hp, atk, …)` 레벨별 실제 값. 반드시 `generate_curve`로 산출 — 손으로 채우지 않는다.

흐름: 메타의 `base_hp` + `growth_type` → `generate_curve` → 전개 테이블 레벨별 `hp`.

예외:
- `roguelike_rpg`: 곡선 대신 `floor_scaling`(층별 배율, `floor_no` 키 — FK 아님)
- `srpg`: `growth_*`(%) 성장률 기반 전개, `growth_type` 미사용

## MCP 호출 시퀀스 패턴

메타 테이블 → 전개 테이블 순으로 생성. FK 대상 테이블이 먼저여야 한다.

```typescript
// 1. 프로젝트 생성
create_project({ name: "ProjectZ", genre: "collection_rpg" })

// 2. 테이블 생성 (FK 대상 먼저)
create_table({ project_id, name: "skills", description: "스킬 정의" })
create_table({ project_id, name: "characters", description: "캐릭터 메타" })
create_table({ project_id, name: "character_levels", description: "레벨별 전개" })

// 3. 컬럼 추가
add_column({ table_id: chars_id, name: "base_hp", type: "number" })
add_column({ table_id: chars_id, name: "growth_type", type: "string" })
add_column({ table_id: chars_id, name: "skill_1_id", type: "string" })
add_column({ table_id: levels_id, name: "character_id", type: "string" })
add_column({ table_id: levels_id, name: "level", type: "number" })
add_column({ table_id: levels_id, name: "hp", type: "number" })

// 4. 관계 설정 (장르 파일의 "관계" 표 그대로)
set_relation({ from_table_id: chars_id, from_column: "skill_1_id",
               to_table_id: skills_id, to_column: "id" })
set_relation({ from_table_id: levels_id, from_column: "character_id",
               to_table_id: chars_id, to_column: "id" })

// 5. 전개 채우기
generate_curve({ table_id: levels_id, /* base, growth_type, level 범위 */ })
```

## 설계 원칙

- 계약 §5 테이블·컬럼을 글자까지 그대로 사용한다 — 임의 추가·재명명 금지.
- 수치 컬럼은 grade/role로 그룹화 가능하게 — 밸런싱 비교용.
- `roguelike_rpg`의 `floor_scaling.floor_no`는 값이 같아도 FK가 아님. `set_relation` 금지.
- `srpg`의 `classes.promote_to_id`는 자기참조 — NULL이면 최고 병종.
- 관계가 복잡해지면 junction 테이블 대신 JSON 컬럼 고려 (SQLite 특성).
