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
