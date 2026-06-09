# Game Data Studio

게임 수치 데이터 기획 자동화 툴. 스프레드시트 에디터, 밸런싱 분석, 경제 시뮬레이션, AI 대화 인터페이스를 하나의 데스크톱 앱으로 통합합니다.

## 스택

- **프론트엔드**: Next.js 16 (Turbopack) + React 19 + Tailwind CSS v4
- **데스크톱**: Electron 42
- **DB**: SQLite (better-sqlite3, WAL 모드)
- **AI 연동**: MCP (Model Context Protocol) stdio 서버

---

## 실행

> 패키지 매니저는 **npm** (pnpm 사용 금지).

```bash
# 의존성 설치
npm install

# DB 초기화 (최초 1회)
npm run init-db

# 개발 서버 (포트 3001, 기존 프로세스 자동 종료)
npm run dev

# Electron 데스크톱 앱 (Next.js + Electron 동시 실행)
npm run electron:dev

# 단위 테스트
npm test
```

---

## 화면 구성

| 화면 | 설명 |
|------|------|
| 프로젝트 | 게임 프로젝트 생성·선택. 장르 입력 시 스키마 자동 생성 |
| 스키마 | 테이블·컬럼 정의. enum 타입·관계 설정 |
| 데이터 | 스프레드시트 에디터. 행 검색·다중선택·컬럼 숨기기·JSON 내보내기·스냅샷 |
| 밸런싱 | σ 기반 이상값 감지, 분포 차트, 크로스 테이블 비교, 이상값 일괄 보정 |
| 시뮬레이션 | 커스텀 로직 시뮬레이션 저장·실행·비교 |
| 경제 | 재화 수입·지출 시뮬레이션. 시나리오 복수 저장·불러오기 (SQLite) |
| 타입 | 프로젝트 공유 enum 타입 관리 |
| AI 대화 | 자연어로 스키마·데이터 조작. Claude CLI + MCP 브리지 |

---

## MCP 서버

Claude CLI에 등록하면 자연어로 DB를 조작할 수 있습니다.

```bash
claude mcp add --transport stdio game-data-studio -- node --import tsx ./src/lib/mcp/server.ts
```

### 툴 목록

| 그룹 | 툴 |
|------|----|
| 프로젝트 | `list_projects` `create_project` `delete_project` |
| 테이블 | `list_tables` `create_table` `delete_table` |
| 컬럼 | `add_column` `update_column` `remove_column` |
| 행 | `read_rows` `upsert_row` `delete_row` |
| CSV | `import_csv` `export_csv` |
| 관계 | `list_relations` `set_relation` `delete_relation` |
| 타입(enum) | `list_enum_types` `create_enum_type` `update_enum_type` `delete_enum_type` |
| 곡선 | `generate_curve` — linear / power / exponential 성장 곡선 행 자동 생성 |
| 밸런싱 | `analyze_balance` |
| 시뮬레이션 | `run_simulation` `list_simulations` `save_simulation` |
| 스냅샷 | `list_snapshots` `create_snapshot` `restore_snapshot` `delete_snapshot` |
| 프로젝트 메모리 | `get_project_memory` `update_project_memory` |

### 사용 예시

```
# 수집형 RPG 프로젝트 생성 및 스키마 자동 구성
create_project { name: "에픽히어로", genre: "수집형 RPG" }

# 캐릭터 테이블에 스탯 곡선 자동 생성 (레벨 1~100, power 곡선)
generate_curve { table_id: "...", column: "atk", type: "power", from: 100, to: 10000, steps: 100 }

# 밸런스 이상값 분석
analyze_balance { table_id: "..." }
```

---

## 아키텍처

```
src/
├── app/
│   ├── api/              # Next.js REST API 라우트
│   │   ├── balance/      # 밸런싱 분석
│   │   ├── chat/         # Claude CLI 브리지 (AI 대화)
│   │   ├── economy/      # 경제 시나리오 CRUD
│   │   ├── snapshots/    # 테이블 스냅샷
│   │   └── ...           # projects, tables, columns, rows, csv, ...
│   └── page.tsx          # 앱 진입점
├── components/
│   ├── editor/           # DataEditor — 스프레드시트
│   ├── balance/          # BalancePanel — 밸런싱 분석
│   ├── economy/          # EconomySim — 경제 시뮬레이션
│   ├── simulation/       # SimulationView
│   ├── schema/           # SchemaEditor
│   ├── project/          # ProjectList
│   ├── memory/           # MemoryView (프로젝트 메모리)
│   └── types/            # EnumTypeManager
└── lib/
    ├── db/
    │   ├── schema.sql     # 테이블 정의
    │   └── repo/          # DB 접근 레이어 (better-sqlite3 동기 API)
    ├── mcp/
    │   ├── server.ts      # MCP stdio 서버 진입점
    │   └── handlers/      # 도메인별 툴 핸들러
    ├── balance/           # σ 기반 이상값 분석 코어 (테스트 대상)
    ├── curve/             # 성장 곡선 생성 코어 (테스트 대상)
    └── economy/           # 경제 시뮬레이션 코어 (테스트 대상)

data/
├── game-data-studio.db   # SQLite DB (gitignore)
└── project-memory/       # 프로젝트별 AI 맥락 메모 (Markdown)
```

### DB 테이블

| 테이블 | 용도 |
|--------|------|
| `projects` | 게임 프로젝트 |
| `tables` | 프로젝트 내 데이터 테이블 |
| `columns` | 테이블 컬럼 정의 |
| `rows` | 실제 데이터 행 (data: JSON) |
| `relations` | 테이블 간 FK 관계 |
| `enum_types` | 공유 enum 타입 |
| `simulations` | 시뮬레이션 저장 |
| `snapshots` | 테이블 데이터 스냅샷 (버전 히스토리) |
| `economy_scenarios` | 경제 시뮬레이션 시나리오 |

---

## 테스트

```bash
npm test
```

`src/lib/curve`, `src/lib/balance`, `src/lib/economy` 의 순수 코어 로직을 대상으로 vitest 단위 테스트를 실행합니다.
