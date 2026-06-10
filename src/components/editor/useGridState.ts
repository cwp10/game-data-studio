import { useReducer } from "react";

export interface Row { id: string; data: Record<string, unknown>; }

export type CellCmd = { rowId: string; col: string; before: unknown; after: unknown };
export type GridState = { rows: Row[]; undoStack: CellCmd[]; redoStack: CellCmd[] };

export type GridAction =
  | { type: "LOAD"; rows: Row[] }
  | { type: "APPEND"; row: Row }
  | { type: "DELETE_BY_IDS"; ids: string[] }
  | { type: "UPDATE_CELL"; rowId: string; col: string; before: unknown; after: unknown }
  | { type: "SET_ROWS"; rows: Row[] }
  | { type: "UNDO" }
  | { type: "REDO" };

const UNDO_LIMIT = 50;

const setCell = (rows: Row[], rowId: string, col: string, value: unknown): Row[] =>
  rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r));

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

    case "UPDATE_CELL": {
      const cmd: CellCmd = { rowId: action.rowId, col: action.col, before: action.before, after: action.after };
      return {
        rows: setCell(state.rows, action.rowId, action.col, action.after),
        undoStack: [...state.undoStack, cmd].slice(-UNDO_LIMIT),
        redoStack: [],
      };
    }

    case "SET_ROWS":
      return { ...state, rows: action.rows };

    case "UNDO": {
      const cmd = state.undoStack.at(-1);
      if (!cmd) return state;
      return {
        rows: setCell(state.rows, cmd.rowId, cmd.col, cmd.before),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cmd],
      };
    }

    case "REDO": {
      const cmd = state.redoStack.at(-1);
      if (!cmd) return state;
      return {
        rows: setCell(state.rows, cmd.rowId, cmd.col, cmd.after),
        undoStack: [...state.undoStack, cmd],
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
  undoTop: CellCmd | null;
  redoTop: CellCmd | null;
  load(rows: Row[]): void;
  append(row: Row): void;
  deleteByIds(ids: string[]): void;
  updateCell(rowId: string, col: string, before: unknown, after: unknown): void;
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
    updateCell: (rowId, col, before, after) => dispatch({ type: "UPDATE_CELL", rowId, col, before, after }),
    setRows: (rows) => dispatch({ type: "SET_ROWS", rows }),
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
  };
}
