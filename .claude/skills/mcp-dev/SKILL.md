---
name: mcp-dev
description: Game Data Studio MCP 핸들러, DB repo, Next.js API 라우트 구현 가이드. "MCP 툴 추가", "핸들러 구현", "API 라우트 작성", "DB repo 작성", "import_csv 구현", "run_simulation 구현" 등 백엔드 코드 작성 요청 시 반드시 이 스킬을 사용한다.
---

## 프로젝트 레이어 구조

```
DB repo (src/lib/db/repo/*.ts)
  ↓ 직접 호출
MCP 핸들러 (src/lib/mcp/handlers/*-handler.ts)
  ↓ 등록
MCP 서버 (src/lib/mcp/server.ts)

API 라우트 (src/app/api/**/*.ts)
  ↓ DB repo 직접 호출 (MCP 우회)
```

MCP와 API 라우트는 모두 DB repo를 직접 사용한다. 서로 호출하지 않는다.

---

## DB Client 패턴

`src/lib/db/client.ts` — WAL + FK 활성화 (이미 구현됨, 수정 금지)

```typescript
import Database from 'better-sqlite3'
import path from 'path'

const dbPath = process.env.GDS_DATA_DIR
  ? path.join(process.env.GDS_DATA_DIR, 'game-data-studio.db')
  : path.join(process.cwd(), 'data', 'game-data-studio.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
```

---

## DB Repo 패턴

```typescript
// src/lib/db/repo/characters.ts
import { db } from '../client'
import { nanoid } from 'nanoid'

export interface Character {
  id: string
  table_id: string
  data: string  // JSON
  order_index: number
  created_at: number
  updated_at: number
}

export function getRows(tableId: string): Character[] {
  return db.prepare('SELECT * FROM rows WHERE table_id = ? ORDER BY order_index').all(tableId) as Character[]
}

export function upsertRow(tableId: string, data: Record<string, unknown>, existingId?: string): string {
  const id = existingId ?? nanoid()
  const now = Date.now()
  db.prepare(`
    INSERT INTO rows (id, table_id, data, order_index, created_at, updated_at)
    VALUES (?, ?, ?, (SELECT COALESCE(MAX(order_index)+1,0) FROM rows WHERE table_id=?), ?, ?)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
  `).run(id, tableId, JSON.stringify(data), tableId, now, now)
  return id
}

export function deleteRow(id: string): void {
  db.prepare('DELETE FROM rows WHERE id = ?').run(id)
}
```

---

## MCP 핸들러 패턴

```typescript
// src/lib/mcp/handlers/row-handler.ts
import { z } from 'zod'
import { getRows, upsertRow, deleteRow } from '../../db/repo/rows'

export const readRowsSchema = z.object({
  table_id: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export async function handleReadRows(args: z.infer<typeof readRowsSchema>) {
  try {
    const rows = getRows(args.table_id)
    const sliced = args.limit ? rows.slice(args.offset ?? 0, (args.offset ?? 0) + args.limit) : rows
    return {
      content: [{ type: 'text' as const, text: `${sliced.length}행 조회됨` }],
      structuredContent: { rows: sliced, total: rows.length },
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `에러: ${(err as Error).message}` }],
    }
  }
}
```

## MCP 서버 등록 패턴

```typescript
// src/lib/mcp/server.ts (추가 방법)
import { readRowsSchema, handleReadRows } from './handlers/row-handler'

server.tool('read_rows', '행 조회. 필터/페이징 지원', readRowsSchema.shape, handleReadRows)
```

---

## Next.js API 라우트 패턴

```typescript
// src/app/api/rows/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRows, upsertRow, deleteRow } from '@/lib/db/repo/rows'

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get('table_id')
  if (!tableId) return NextResponse.json({ error: 'table_id required' }, { status: 400 })

  try {
    const rows = getRows(tableId)
    return NextResponse.json({ rows })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // ... upsertRow 호출
}
```

---

## CSV 핸들러 구현 가이드

```typescript
// import_csv 핵심 로직
import { parse } from 'papaparse'

export async function handleImportCsv(args: { table_id: string; csv_content: string }) {
  const { data, meta } = parse(args.csv_content, { header: true, skipEmptyLines: true })

  // 기존 컬럼과 비교해 신규 컬럼 자동 추가
  const existingCols = getColumns(args.table_id).map(c => c.name)
  const newCols = meta.fields?.filter(f => !existingCols.includes(f)) ?? []
  for (const col of newCols) {
    addColumn(args.table_id, col, inferType(col, data))
  }

  // 행 삽입
  const ids = data.map(row => upsertRow(args.table_id, row as Record<string, unknown>))
  return {
    content: [{ type: 'text' as const, text: `${ids.length}행 임포트 완료` }],
    structuredContent: { imported: ids.length, new_columns: newCols },
  }
}

function inferType(col: string, data: unknown[]): 'string' | 'number' | 'boolean' {
  const sample = (data as Record<string, string>[])[0]?.[col]
  if (sample === 'true' || sample === 'false') return 'boolean'
  if (!isNaN(Number(sample))) return 'number'
  return 'string'
}
```

---

## 에러 처리 규칙

| 상황 | MCP 반환 | API 반환 |
|------|---------|---------|
| 필수 파라미터 없음 | `isError: true` + 메시지 | 400 |
| 존재하지 않는 ID | `isError: true` + 메시지 | 404 |
| DB 에러 | `isError: true` + 에러 메시지 | 500 |
| FK 위반 | `isError: true` + 관계 설명 | 422 |

---

## 자주 참조하는 타입

```typescript
// src/lib/db/types.ts 기준
type ColumnType = 'string' | 'number' | 'boolean'

interface Column { id: string; table_id: string; name: string; type: ColumnType; order_index: number }
interface Row { id: string; table_id: string; data: string; order_index: number }
interface Relation { id: string; project_id: string; from_table_id: string; from_column: string; to_table_id: string; to_column: string }
```
