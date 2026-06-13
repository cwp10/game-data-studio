import { useReducer } from "react";

export interface Row { id: string; data: Record<string, unknown>; }
export interface GridColumn { name: string; type: "string" | "number" | "boolean" | "enum"; }

export type CellCmd = { rowId: string; col: string; before: unknown; after: unknown };
// 행 삭제 undo용: 삭제 전 행 데이터와 rows 배열 내 위치를 보존.
export type RowsDeleteCmd = { kind: "rows_delete"; rows: Row[]; indices: number[] };
// 스택 엔트리 = CellCmd 그룹(셀 편집) 또는 RowsDeleteCmd(행 삭제).
export type StackEntry = CellCmd[] | RowsDeleteCmd;

export type GridState = { rows: Row[]; undoStack: StackEntry[]; redoStack: StackEntry[] };

export type GridAction =
  | { type: "LOAD"; rows: Row[] }
  | { type: "APPEND"; row: Row }
  | { type: "DELETE_BY_IDS"; ids: string[] }
  | { type: "DELETE_WITH_UNDO"; deletedRows: Row[]; deletedIndices: number[] }
  | { type: "UPDATE_CELL"; rowId: string; col: string; before: unknown; after: unknown }
  | { type: "BATCH_UPDATE"; cmds: CellCmd[] }
  | { type: "SET_ROWS"; rows: Row[] }
  | { type: "UNDO" }
  | { type: "REDO" };

const UNDO_LIMIT = 50;

const setCell = (rows: Row[], rowId: string, col: string, value: unknown): Row[] =>
  rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r));

// 그룹의 모든 cmd를 한 방향(before|after)으로 적용. 같은 행 여러 col이면 합쳐서 1회 갱신.
const applyGroup = (rows: Row[], group: CellCmd[], dir: "before" | "after"): Row[] => {
  const byRow = new Map<string, Record<string, unknown>>();
  for (const c of group) byRow.set(c.rowId, { ...(byRow.get(c.rowId) ?? {}), [c.col]: c[dir] });
  return rows.map((r) => (byRow.has(r.id) ? { ...r, data: { ...r.data, ...byRow.get(r.id)! } } : r));
};

// 삭제된 행들을 원래 위치에 순서대로 삽입. indices 오름차순 정렬 후 splice.
const insertRows = (rows: Row[], toInsert: { row: Row; index: number }[]): Row[] => {
  const sorted = [...toInsert].sort((a, b) => a.index - b.index);
  const result = [...rows];
  for (let i = 0; i < sorted.length; i++) {
    result.splice(Math.min(sorted[i].index, result.length), 0, sorted[i].row);
  }
  return result;
};

export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "LOAD":
      return { rows: action.rows, undoStack: [], redoStack: [] };

    case "APPEND":
      return { ...state, rows: [...state.rows, action.row] };

    case "DELETE_BY_IDS": {
      const ids = new Set(action.ids);
      return { ...state, rows: state.rows.filter((r) => !ids.has(r.id)) };
    }

    case "DELETE_WITH_UNDO": {
      const ids = new Set(action.deletedRows.map((r) => r.id));
      const entry: RowsDeleteCmd = { kind: "rows_delete", rows: action.deletedRows, indices: action.deletedIndices };
      return {
        rows: state.rows.filter((r) => !ids.has(r.id)),
        undoStack: [...state.undoStack, entry].slice(-UNDO_LIMIT),
        redoStack: [],
      };
    }

    case "UPDATE_CELL": {
      const group: CellCmd[] = [{ rowId: action.rowId, col: action.col, before: action.before, after: action.after }];
      return {
        rows: setCell(state.rows, action.rowId, action.col, action.after),
        undoStack: [...state.undoStack, group].slice(-UNDO_LIMIT),
        redoStack: [],
      };
    }

    case "BATCH_UPDATE": {
      if (action.cmds.length === 0) return state;
      return {
        rows: applyGroup(state.rows, action.cmds, "after"),
        undoStack: [...state.undoStack, action.cmds].slice(-UNDO_LIMIT),
        redoStack: [],
      };
    }

    case "SET_ROWS":
      return { ...state, rows: action.rows };

    case "UNDO": {
      const entry = state.undoStack.at(-1);
      if (!entry) return state;
      if (!Array.isArray(entry)) {
        // 행 삭제 undo: 원래 위치에 행 복구
        const toInsert = entry.rows.map((row, i) => ({ row, index: entry.indices[i] }));
        return {
          rows: insertRows(state.rows, toInsert),
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, entry],
        };
      }
      return {
        rows: applyGroup(state.rows, entry, "before"),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, entry],
      };
    }

    case "REDO": {
      const entry = state.redoStack.at(-1);
      if (!entry) return state;
      if (!Array.isArray(entry)) {
        // 행 삭제 redo: 다시 삭제
        const ids = new Set(entry.rows.map((r) => r.id));
        return {
          rows: state.rows.filter((r) => !ids.has(r.id)),
          undoStack: [...state.undoStack, entry],
          redoStack: state.redoStack.slice(0, -1),
        };
      }
      return {
        rows: applyGroup(state.rows, entry, "after"),
        undoStack: [...state.undoStack, entry],
        redoStack: state.redoStack.slice(0, -1),
      };
    }

    default:
      return state;
  }
}

export interface GridApi {
  rows: Row[];
  canUndo: boolean;
  canRedo: boolean;
  undoTop: StackEntry | null;
  redoTop: StackEntry | null;
  load(rows: Row[]): void;
  append(row: Row): void;
  deleteByIds(ids: string[]): void;
  deleteWithUndo(deletedRows: Row[], deletedIndices: number[]): void;
  updateCell(rowId: string, col: string, before: unknown, after: unknown): void;
  batchUpdate(cmds: CellCmd[]): void;
  setRows(rows: Row[]): void;
  undo(): void;
  redo(): void;
}

export function useGridState(): GridApi {
  const [state, dispatch] = useReducer(gridReducer, { rows: [], undoStack: [], redoStack: [] });
  return {
    rows: state.rows,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    undoTop: state.undoStack.at(-1) ?? null,
    redoTop: state.redoStack.at(-1) ?? null,
    load: (rows) => dispatch({ type: "LOAD", rows }),
    append: (row) => dispatch({ type: "APPEND", row }),
    deleteByIds: (ids) => dispatch({ type: "DELETE_BY_IDS", ids }),
    deleteWithUndo: (deletedRows, deletedIndices) => dispatch({ type: "DELETE_WITH_UNDO", deletedRows, deletedIndices }),
    updateCell: (rowId, col, before, after) => dispatch({ type: "UPDATE_CELL", rowId, col, before, after }),
    batchUpdate: (cmds) => dispatch({ type: "BATCH_UPDATE", cmds }),
    setRows: (rows) => dispatch({ type: "SET_ROWS", rows }),
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
  };
}

// number 컬럼 코어션 (saveCell·tsvToCommands 공용). 숫자로 못 바꾸면 원문 유지.
export function coerce(type: GridColumn["type"], raw: string): unknown {
  return type === "number" ? (isNaN(Number(raw)) ? raw : Number(raw)) : raw;
}

// 선택 범위(행 idx 범위 × col idx 범위)를 TSV로. 행=\n, 열=\t. 값은 String(data[col] ?? "").
export function cellsToTSV(
  rows: Row[],
  columns: GridColumn[],
  range: { r0: number; r1: number; c0: number; c1: number },
): string {
  const r0 = Math.min(range.r0, range.r1), r1 = Math.max(range.r0, range.r1);
  const c0 = Math.min(range.c0, range.c1), c1 = Math.max(range.c0, range.c1);
  const lines: string[] = [];
  for (let r = r0; r <= r1; r++) {
    const row = rows[r];
    if (!row) continue;
    const cells: string[] = [];
    for (let c = c0; c <= c1; c++) {
      const col = columns[c];
      cells.push(col ? String(row.data[col.name] ?? "") : "");
    }
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

// TSV를 anchor(좌상단 행 idx·col idx) 기준으로 그리드에 매핑한 CellCmd[].
// 경계 clip(행/열 자동 생성 금지). id 등 편집 불가 컬럼은 제외. before===after 셀 제외.
export function tsvToCommands(
  tsv: string,
  anchor: { rowIndex: number; colIndex: number },
  rows: Row[],
  columns: GridColumn[],
): CellCmd[] {
  const cmds: CellCmd[] = [];
  // 스프레드시트는 복사 시 끝에 줄바꿈을 붙인다 → 그대로 split하면 빈 행이 아래 행에 phantom write 됨. 후행 개행 제거.
  const normalized = tsv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");
  const matrix = normalized.split("\n").map((line) => line.split("\t"));
  for (let dr = 0; dr < matrix.length; dr++) {
    const row = rows[anchor.rowIndex + dr];
    if (!row) continue; // 행 경계 초과 clip
    const cells = matrix[dr];
    for (let dc = 0; dc < cells.length; dc++) {
      const col = columns[anchor.colIndex + dc];
      if (!col) continue; // 열 경계 초과 clip
      if (col.name === "id") continue; // 편집 불가 컬럼 제외
      const after = coerce(col.type, cells[dc]);
      const before = row.data[col.name];
      if (Object.is(before, after)) continue;
      cmds.push({ rowId: row.id, col: col.name, before, after });
    }
  }
  return cmds;
}
