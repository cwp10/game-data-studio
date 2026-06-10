import { describe, it, expect } from "vitest";
import { gridReducer, type GridState, type Row } from "./useGridState";

const row = (id: string, data: Record<string, unknown> = {}): Row => ({ id, data });
const init = (rows: Row[] = []): GridState => ({ rows, undoStack: [], redoStack: [] });

describe("gridReducer", () => {
  it("UPDATE_CELL: rows에 after 반영 + undoStack 길이 1", () => {
    const s0 = init([row("a", { hp: 100 })]);
    const s1 = gridReducer(s0, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 200 });
    expect(s1.rows[0].data.hp).toBe(200);
    expect(s1.undoStack).toHaveLength(1);
    expect(s1.redoStack).toHaveLength(0);
  });

  it("UPDATE_CELL → UNDO: before로 복원 + redoStack 1, undoStack 0", () => {
    const s0 = init([row("a", { hp: 100 })]);
    const s1 = gridReducer(s0, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 200 });
    const s2 = gridReducer(s1, { type: "UNDO" });
    expect(s2.rows[0].data.hp).toBe(100);
    expect(s2.undoStack).toHaveLength(0);
    expect(s2.redoStack).toHaveLength(1);
  });

  it("UNDO → REDO: after로 재적용", () => {
    const s0 = init([row("a", { hp: 100 })]);
    const s1 = gridReducer(s0, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 200 });
    const s2 = gridReducer(s1, { type: "UNDO" });
    const s3 = gridReducer(s2, { type: "REDO" });
    expect(s3.rows[0].data.hp).toBe(200);
    expect(s3.undoStack).toHaveLength(1);
    expect(s3.redoStack).toHaveLength(0);
  });

  it("연속 편집 후 UNDO 여러 번 → 역순 복원", () => {
    let s = init([row("a", { hp: 100 })]);
    s = gridReducer(s, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 200 });
    s = gridReducer(s, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 200, after: 300 });
    expect(s.rows[0].data.hp).toBe(300);
    s = gridReducer(s, { type: "UNDO" });
    expect(s.rows[0].data.hp).toBe(200);
    s = gridReducer(s, { type: "UNDO" });
    expect(s.rows[0].data.hp).toBe(100);
    expect(s.undoStack).toHaveLength(0);
    expect(s.redoStack).toHaveLength(2);
  });

  it("undoStack 50 초과 시 가장 오래된 것 제거(길이 50 유지)", () => {
    let s = init([row("a", { hp: 0 })]);
    for (let i = 0; i < 60; i++) {
      s = gridReducer(s, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: i, after: i + 1 });
    }
    expect(s.undoStack).toHaveLength(50);
    // 가장 오래된 것이 버려졌으므로 top은 마지막 편집, bottom은 11번째 편집(before:10)
    expect(s.undoStack[0].before).toBe(10);
    expect(s.undoStack.at(-1)!.after).toBe(60);
  });

  it("SET_ROWS(bulk)는 undoStack/redoStack 변화 없음", () => {
    const s0: GridState = { rows: [row("a", { hp: 1 })], undoStack: [{ rowId: "a", col: "hp", before: 0, after: 1 }], redoStack: [] };
    const s1 = gridReducer(s0, { type: "SET_ROWS", rows: [row("a", { hp: 9 }), row("b", { hp: 5 })] });
    expect(s1.rows).toHaveLength(2);
    expect(s1.rows[0].data.hp).toBe(9);
    expect(s1.undoStack).toBe(s0.undoStack);
    expect(s1.redoStack).toBe(s0.redoStack);
  });

  it("LOAD는 undoStack/redoStack 초기화", () => {
    const s0: GridState = { rows: [row("a")], undoStack: [{ rowId: "a", col: "hp", before: 0, after: 1 }], redoStack: [{ rowId: "a", col: "hp", before: 1, after: 2 }] };
    const s1 = gridReducer(s0, { type: "LOAD", rows: [row("x"), row("y")] });
    expect(s1.rows).toHaveLength(2);
    expect(s1.undoStack).toHaveLength(0);
    expect(s1.redoStack).toHaveLength(0);
  });

  it("새 UPDATE_CELL은 redoStack clear", () => {
    const s0 = init([row("a", { hp: 100 })]);
    const s1 = gridReducer(s0, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 200 });
    const s2 = gridReducer(s1, { type: "UNDO" }); // redoStack 1
    expect(s2.redoStack).toHaveLength(1);
    const s3 = gridReducer(s2, { type: "UPDATE_CELL", rowId: "a", col: "hp", before: 100, after: 150 });
    expect(s3.redoStack).toHaveLength(0);
    expect(s3.rows[0].data.hp).toBe(150);
  });
});
