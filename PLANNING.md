# Game Data Studio — 기획 문서

> 게임 수치 데이터 기획 자동화 툴  
> 최종 업데이트: 2026-06-09

**관련 파일**
- 📄 `PLANNING.md` — 이 문서 (기획 전체)
- 🖼 `wireframe.html` — UI 와이어프레임 5개 화면 (브라우저에서 열기)

---

## 1. 프로젝트 개요

### 한 줄 정의
수집형/방치형 RPG에 최적화된 **게임 데이터 자동화 툴**. AI가 기획자 업무(스탯 설계·밸런싱·시뮬레이션·수식 도출)를 자동화한다.

### 목적
- 기획자가 수작업으로 하던 수치 데이터 작업을 AI로 자동화
- 테이블 간 관계를 기반으로 시뮬레이션 → Unity C# 수식 산출
- 장르 무관 범용 확장 가능한 구조

### 사용 환경
- 개인 내부 툴 (혼자 사용, 배포 없음)
- macOS (Apple Silicon MacBook)
- 새 게임 프로젝트 개발에 사용 (쩔구 키우기 제외)

### 참고 레포
- `https://github.com/cwp10/image-generator` (sprite-forge)
- **패턴만 참고** — 코드 재사용/fork 아님
- 참고 항목: MCP 서버 구조, DB 패턴, Electron + Next.js 연동 방식

---

## 2. 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| 데스크탑 래핑 | Electron | macOS 전용 |
| UI 프레임워크 | Next.js + Tailwind CSS | sprite-forge 동일 패턴 |
| 언어 | TypeScript | 전체 |
| DB | SQLite (better-sqlite3) | WAL 모드 + FK 활성화 |
| MCP | @modelcontextprotocol/sdk | stdio 서버 |
| AI | Claude CLI (헤드리스 백그라운드) | UI가 메인, CLI는 백그라운드 |
| ID 생성 | nanoid | sprite-forge 동일 |
| CSV 처리 | papaparse 또는 직접 구현 | 임포트/익스포트 |

---

## 3. 아키텍처

```
[Electron UI]
     ↕ IPC
[Next.js App]
     ↕ API Routes (REST)
[Next.js API]
     ↕               ↕
[SQLite DB]    [Claude CLI - 헤드리스]
(WAL 공유)          ↕ MCP stdio
               [MCP 서버 (server.ts)]
                     ↕
               [SQLite DB 공유]
```

### 핵심 원칙
- UI가 메인 인터페이스, Claude CLI는 백그라운드 헤드리스 프로세스
- Next.js와 MCP 서버가 SQLite 파일을 WAL 모드로 공유
- MCP 서버는 `node --import tsx ./src/lib/mcp/server.ts` 로 실행
- `data/mcp.json` 으로 Claude CLI에 MCP 서버 등록

---

## 4. 폴더 구조 (목표)

```
game-data-studio/
├── electron/
│   ├── main.js          # Electron 메인 프로세스
│   └── preload.js
├── src/
│   ├── app/
│   │   ├── page.tsx     # 앱 진입점
│   │   └── api/
│   │       ├── projects/         # 프로젝트 CRUD
│   │       ├── tables/           # 테이블 CRUD
│   │       ├── rows/             # 행 CRUD
│   │       ├── columns/          # 컬럼 관리
│   │       ├── relations/        # 관계 설정
│   │       ├── csv/              # 임포트/익스포트
│   │       ├── balance/          # 밸런싱 분석
│   │       └── simulation/       # 시뮬레이션
│   ├── components/
│   │   ├── project/     # 프로젝트 홈 컴포넌트
│   │   ├── schema/      # 스키마 에디터
│   │   ├── editor/      # 데이터 에디터
│   │   ├── balance/     # 밸런싱 패널
│   │   └── simulation/  # 시뮬레이션
│   └── lib/
│       ├── mcp/
│       │   ├── server.ts          # MCP stdio 서버 진입점
│       │   └── handlers/          # 툴별 핸들러 분리
│       │       ├── project-handler.ts
│       │       ├── table-handler.ts
│       │       ├── row-handler.ts
│       │       ├── csv-handler.ts
│       │       ├── balance-handler.ts
│       │       └── simulation-handler.ts
│       ├── db/
│       │   ├── client.ts          # DB 연결 (WAL + FK)
│       │   ├── schema.sql         # DDL
│       │   ├── migrate.ts         # 마이그레이션
│       │   └── repo/              # 테이블별 CRUD
│       │       ├── projects.ts
│       │       ├── tables.ts
│       │       ├── columns.ts
│       │       ├── rows.ts
│       │       ├── relations.ts
│       │       └── simulations.ts
│       └── util/
│           ├── ids.ts             # nanoid
│           └── paths.ts           # 경로 상수
├── scripts/
│   └── init-db.ts       # DB 초기화
├── data/
│   └── mcp.json         # Claude CLI MCP 설정
└── CLAUDE.md
```

---

## 5. DB 스키마

```sql
-- game-data-studio SQLite schema
-- id: nanoid 문자열, timestamp: epoch ms (INTEGER)
-- WAL 모드 + FK는 client.ts 에서 활성화

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  genre       TEXT,              -- 'collection_rpg' | 'idle_rpg' | 'custom'
  description TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tables (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS columns (
  id           TEXT PRIMARY KEY,
  table_id     TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('string','number','boolean')),
  order_index  INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rows (
  id         TEXT PRIMARY KEY,
  table_id   TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,   -- JSON: { col_name: value, ... }
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS relations (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_table_id   TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  from_column     TEXT NOT NULL,
  to_table_id     TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  to_column       TEXT NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS simulations (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  input_tables TEXT,          -- JSON 배열: 참조 테이블 id 목록
  result      TEXT,           -- JSON: 시뮬레이션 결과 캐시
  formula_cs  TEXT,           -- Unity C# 수식 산출물
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tables_project ON tables(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_table ON columns(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rows_table ON rows(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_relations_project ON relations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulations_project ON simulations(project_id);
```

---

## 6. MCP 툴 목록

MCP 서버 (`src/lib/mcp/server.ts`) 에 구현할 툴 전체 목록.  
응답 형태는 sprite-forge 패턴 동일: `{ content: [{type:'text', text:...}], structuredContent: {...} }`

### 프로젝트
| 툴 | 설명 |
|----|------|
| `list_projects` | 전체 프로젝트 목록 반환 |
| `create_project` | 새 프로젝트 생성. genre 입력 시 Claude가 풀 스키마 자동 생성 |
| `delete_project` | 프로젝트 및 하위 데이터 전체 삭제 |

### 테이블
| 툴 | 설명 |
|----|------|
| `list_tables` | 프로젝트 내 테이블 목록 |
| `create_table` | 테이블 생성 (컬럼 정의 포함 가능) |
| `delete_table` | 테이블 삭제 |

### 컬럼 (동적 스키마)
| 툴 | 설명 |
|----|------|
| `add_column` | 컬럼 추가 (name, type: string/number/boolean) |
| `remove_column` | 컬럼 삭제 |

### 행 CRUD
| 툴 | 설명 |
|----|------|
| `read_rows` | 행 조회. 필터/정렬/페이징 지원 |
| `upsert_row` | 행 삽입 또는 수정 |
| `delete_row` | 행 삭제 |

### CSV
| 툴 | 설명 |
|----|------|
| `import_csv` | 로컬 CSV 파일 임포트. 스키마 충돌 시 자동 머지 (신규 컬럼 추가) |
| `export_csv` | 테이블을 CSV로 익스포트. 관계 FK를 flatten 옵션 지원 |

### 관계
| 툴 | 설명 |
|----|------|
| `set_relation` | 테이블 간 FK 관계 설정 |
| `list_relations` | 프로젝트 내 전체 관계 목록 |
| `delete_relation` | 관계 삭제 |

### 밸런싱
| 툴 | 설명 |
|----|------|
| `analyze_balance` | 선택 컬럼 통계(평균/표준편차/이상값) 계산 후 컨텍스트 반환. 이상값 자동 감지 포함 |

### 시뮬레이션
| 툴 | 설명 |
|----|------|
| `run_simulation` | 관계 테이블 JOIN 연산 → 수식 도출 → Unity C# 코드 산출 |
| `list_simulations` | 저장된 시뮬레이션 목록 |
| `save_simulation` | 시뮬레이션 결과(수식 포함) 저장 |

---

## 7. UI 화면 구성 (5개)

좌측 아이콘 사이드바로 화면 전환.

### 화면 1 — 프로젝트 홈
- 프로젝트 카드 그리드 (이름, 장르, 테이블 수, 행 수, 이상값 건수)
- 새 프로젝트 생성 버튼 → 모달 (이름, 장르 선택)
- 장르 선택 시 Claude가 풀 스키마 자동 생성

### 화면 2 — 스키마 에디터
- 좌측: 테이블 목록 + 추가 버튼
- 메인: 선택 테이블의 컬럼 목록 (이름/타입/참조/설명)
- 컬럼 추가/삭제, 타입 변경
- 하단: 관계 목록 및 설정

### 화면 3 — 데이터 에디터
- 좌측: 테이블 목록
- 메인: 스프레드시트 형태 행 편집
- 이상값 셀 하이라이팅 (빨강=이상, 노랑=경고)
- 상단 툴바: 행 추가/삭제, CSV 임포트/익스포트, AI 분석
- 하단 패널: AI 밸런싱 제안 + 통계

### 화면 4 — 밸런싱 패널
- 상단: 전체 현황 메트릭 카드 (전체 데이터, 이상값, 경고, 밸런스 점수)
- 이상값 목록 (심각도/이름/설명/현재값/수정 버튼)
- 등급별 분포 차트 (bar chart)
- 전체 AI 분석 버튼

### 화면 5 — 시뮬레이션
- 좌측: 시뮬레이션 목록 + 새 시뮬레이션
- 메인: 입력 조건 (참조 테이블/컬럼 선택) + AI 수식 도출 버튼
- 결과: Unity C# 코드 블록 + 검증 케이스 표
- C# 복사 버튼, 재실행 버튼
- 저장된 시뮬레이션 재사용 가능

---

## 8. 핵심 동작 흐름

### 8-1. 프로젝트 생성 & 스키마 자동 생성
```
UI: 새 프로젝트 → 장르 입력 (예: "수집형 RPG")
  → Claude CLI (백그라운드)
  → MCP: create_project → create_table × N → add_column × N
  → SQLite에 풀 스키마 저장
  → UI: 스키마 에디터로 이동, 생성된 테이블 표시
  → 사용자가 컬럼 추가/삭제로 커스터마이징
```

### 8-2. CSV 임포트 & 이상값 감지
```
UI: CSV 임포트 버튼 → 파일 선택
  → MCP: import_csv (스키마 충돌 시 자동 머지)
  → MCP: analyze_balance (자동 이상값 감지)
  → UI: 이상값 셀 하이라이팅 + 밸런싱 패널 뱃지 업데이트
```

### 8-3. AI 밸런싱 3단계
```
1단계 (자동): 셀 저장 시 이상값 자동 감지 → 하이라이팅
2단계 (수동): AI 분석 버튼 → 수치 제안 + 이유 표시
3단계 (수동): 상세 분석 → 서술형 밸런스 코멘트
```

### 8-4. 시뮬레이션 → C# 수식 산출
```
UI: 시뮬레이션 화면 → 참조 테이블/컬럼 선택
  → MCP: run_simulation
  → Claude: 테이블 데이터 분석 → 수식 도출
  → 결과: Unity C# 코드 + 검증 케이스
  → MCP: save_simulation (재사용을 위해 저장)
  → UI: C# 복사 버튼으로 게임 엔진에 적용
```

---

## 9. data/mcp.json

```json
{
  "mcpServers": {
    "game-data-studio": {
      "command": "node",
      "args": ["--import", "tsx", "./src/lib/mcp/server.ts"],
      "env": {
        "GDS_DATA_DIR": "./data",
        "NODE_OPTIONS": "--max-old-space-size=4096"
      }
    }
  }
}
```

---

## 10. MVP 범위 vs Post-MVP

### MVP (지금 만들 것)
- [x] Electron + Next.js 기본 앱 구조
- [x] SQLite 스키마 + DB 초기화
- [x] MCP 서버 (전체 툴 목록)
- [x] 5개 UI 화면 기본 구현
- [x] 프로젝트 생성 + 스키마 자동 생성
- [x] 데이터 에디터 (CRUD)
- [x] CSV 임포트/익스포트 (자동 머지)
- [x] 이상값 자동 감지
- [x] AI 밸런싱 제안 (3단계)
- [x] 시뮬레이션 + Unity C# 수식 산출

### Post-MVP (나중에)
- [x] 경험치/재화 성장 곡선 자동 생성
- [x] 경제 흐름 시뮬레이션 (30일 플레이 수익 예측)
- [x] 테이블 초안 자동 생성 (장르 기반 확장) — AI 프로젝트 마법사로 구현
- [x] 시뮬레이션 결과 차트 시각화

---

## 11. 개발 시작 순서 (권장)

1. `pnpm init` + 패키지 설치 (Next.js, Electron, better-sqlite3, @modelcontextprotocol/sdk)
2. `scripts/init-db.ts` — DB 스키마 생성
3. `src/lib/mcp/server.ts` — MCP 서버 기본 구조 + 전체 툴 스켈레톤
4. `src/lib/db/repo/` — 각 테이블 CRUD 함수
5. MCP 핸들러 구현 (project → table → row → csv → balance → simulation 순)
6. Next.js API Routes 구현
7. UI 컴포넌트 구현 (화면 순서대로)
8. Electron main.js 연결
9. `data/mcp.json` 등록 후 Claude Code에서 MCP 테스트
