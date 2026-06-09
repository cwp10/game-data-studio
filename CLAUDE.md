# Game Data Studio — CLAUDE.md

## 개요
게임 수치 데이터 기획 자동화 툴. Electron + Next.js + SQLite + MCP 서버.

## 실행 명령

```bash
pnpm init-db          # DB 초기화 (최초 1회)
pnpm dev              # Next.js 개발 서버 (포트 3000)
pnpm mcp              # MCP 서버 단독 실행 (테스트용)
pnpm electron:dev     # Electron + Next.js 동시 실행
```

## MCP 서버 등록
```bash
claude mcp add --transport stdio game-data-studio -- node --import tsx ./src/lib/mcp/server.ts
# 또는 data/mcp.json을 Claude CLI에 등록
```

## MCP 툴 목록
- **프로젝트**: list_projects, create_project, delete_project
- **테이블**: list_tables, create_table, delete_table
- **컬럼**: add_column, remove_column
- **행**: read_rows, upsert_row, delete_row
- **CSV**: import_csv, export_csv
- **관계**: list_relations, set_relation, delete_relation
- **밸런싱**: analyze_balance
- **시뮬레이션**: run_simulation, list_simulations, save_simulation

## 아키텍처
- DB: `data/game-data-studio.db` (WAL 모드, FK 활성화)
- API Routes: `src/app/api/` (Next.js REST)
- MCP 서버: `src/lib/mcp/server.ts` (stdio)
- UI: `src/components/` (5개 화면)

## 프로젝트 생성 + 스키마 자동 생성 흐름
1. `create_project { name, genre }` 호출
2. 장르에 맞는 테이블/컬럼을 `create_table` + `add_column` 으로 생성
3. 예: 수집형 RPG → characters, skills, items, stages, drop_tables, gacha_tables 등

---

## 하네스: Game Data Studio

**목표:** 기능 구현 요청을 schema-designer / mcp-implementer / ui-builder / balance-engineer / qa-validator 에이전트 팀으로 자동화한다.

**트리거:** 기능 구현, MCP 툴 추가, UI 화면 개발, 밸런싱/시뮬레이션 로직 등 개발 작업 요청 시 `game-data-feature` 스킬을 사용하라. 단순 질문이나 코드 설명은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-09 | 초기 구성 | 전체 | PLANNING.md + wireframe.html 기반 하네스 구축 |
