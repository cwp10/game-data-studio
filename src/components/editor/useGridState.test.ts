import { describe, it, expect } from "vitest";
import { gridReducer, cellsToTSV, tsvToCommands, coerce, type GridState, type Row, type GridColumn } from "./useGridState";

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
    expect(s.undoStack[0][0].before).toBe(10);
    expect(s.undoStack.at(-1)![0].after).toBe(60);
  });

  it("SET_ROWS(bulk)는 undoStack/redoStack 변화 없음", () => {
    const s0: GridState = { rows: [row("a", { hp: 1 })], undoStack: [[{ rowId: "a", col: "hp", before: 0, after: 1 }]], redoStack: [] };
    const s1 = gridReducer(s0, { type: "SET_ROWS", rows: [row("a", { hp: 9 }), row("b", { hp: 5 })] });
    expect(s1.rows).toHaveLength(2);
    expect(s1.rows[0].data.hp).toBe(9);
    expect(s1.undoStack).toBe(s0.undoStack);
    expect(s1.redoStack).toBe(s0.redoStack);
  });

  it("LOAD는 undoStack/redoStack 초기화", () => {
    const s0: GridState = { rows: [row("a")], undoStack: [[{ rowId: "a", col: "hp", before: 0, after: 1 }]], redoStack: [[{ rowId: "a", col: "hp", before: 1, after: 2 }]] };
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

  it("BATCH_UPDATE: 같은 행 여러 col 한꺼번에 반영 + 그룹 1개 push", () => {
    const s0 = init([row("a", { hp: 100, atk: 10 })]);
    const s1 = gridReducer(s0, {
      type: "BATCH_UPDATE",
      cmds: [
        { rowId: "a", col: "hp", before: 100, after: 200 },
        { rowId: "a", col: "atk", before: 10, after: 20 },
      ],
    });
    expect(s1.rows[0].data.hp).toBe(200);
    expect(s1.rows[0].data.atk).toBe(20);
    expect(s1.undoStack).toHaveLength(1);
    expect(s1.undoStack[0]).toHaveLength(2);
  });

  it("BATCH_UPDATE → UNDO: 그룹의 모든 col이 before로 복원(다중셀 함정)", () => {
    const s0 = init([row("a", { hp: 100, atk: 10 })]);
    const s1 = gridReducer(s0, {
      type: "BATCH_UPDATE",
      cmds: [
        { rowId: "a", col: "hp", before: 100, after: 200 },
        { rowId: "a", col: "atk", before: 10, after: 20 },
      ],
    });
    const s2 = gridReducer(s1, { type: "UNDO" });
    expect(s2.rows[0].data.hp).toBe(100);
    expect(s2.rows[0].data.atk).toBe(10);
    expect(s2.redoStack).toHaveLength(1);
    const s3 = gridReducer(s2, { type: "REDO" });
    expect(s3.rows[0].data.hp).toBe(200);
    expect(s3.rows[0].data.atk).toBe(20);
  });

  it("BATCH_UPDATE: 여러 행에 걸친 그룹도 각 행에 반영", () => {
    const s0 = init([row("a", { hp: 1 }), row("b", { hp: 2 })]);
    const s1 = gridReducer(s0, {
      type: "BATCH_UPDATE",
      cmds: [
        { rowId: "a", col: "hp", before: 1, after: 11 },
        { rowId: "b", col: "hp", before: 2, after: 22 },
      ],
    });
    expect(s1.rows[0].data.hp).toBe(11);
    expect(s1.rows[1].data.hp).toBe(22);
    const s2 = gridReducer(s1, { type: "UNDO" });
    expect(s2.rows[0].data.hp).toBe(1);
    expect(s2.rows[1].data.hp).toBe(2);
  });

  it("BATCH_UPDATE 빈 배열은 no-op(스택 변화 없음)", () => {
    const s0 = init([row("a", { hp: 1 })]);
    const s1 = gridReducer(s0, { type: "BATCH_UPDATE", cmds: [] });
    expect(s1).toBe(s0);
  });
});

describe("coerce", () => {
  it("number 컬럼은 숫자 변환, 비숫자는 원문 유지", () => {
    expect(coerce("number", "42")).toBe(42);
    expect(coerce("number", "abc")).toBe("abc");
    expect(coerce("string", "42")).toBe("42");
  });
});

describe("cellsToTSV", () => {
  const cols: GridColumn[] = [
    { name: "id", type: "string" },
    { name: "hp", type: "number" },
    { name: "atk", type: "number" },
  ];
  const rows: Row[] = [
    row("a", { id: "a", hp: 100, atk: 10 }),
    row("b", { id: "b", hp: 200, atk: 20 }),
  ];

  it("단일행 다열", () => {
    expect(cellsToTSV(rows, cols, { r0: 0, r1: 0, c0: 1, c1: 2 })).toBe("100\t10");
  });

  it("다행 다열", () => {
    expect(cellsToTSV(rows, cols, { r0: 0, r1: 1, c0: 1, c1: 2 })).toBe("100\t10\n200\t20");
  });

  it("범위가 역순이어도 정규화", () => {
    expect(cellsToTSV(rows, cols, { r0: 1, r1: 0, c0: 2, c1: 1 })).toBe("100\t10\n200\t20");
  });
});

describe("tsvToCommands", () => {
  const cols: GridColumn[] = [
    { name: "id", type: "string" },
    { name: "hp", type: "number" },
    { name: "atk", type: "number" },
    { name: "name", type: "string" },
  ];
  const rows: Row[] = [
    row("a", { id: "a", hp: 100, atk: 10, name: "x" }),
    row("b", { id: "b", hp: 200, atk: 20, name: "y" }),
  ];

  it("단일행 다열 매핑 + number/string 타입 변환", () => {
    const cmds = tsvToCommands("999\t88\tfoo", { rowIndex: 0, colIndex: 1 }, rows, cols);
    expect(cmds).toEqual([
      { rowId: "a", col: "hp", before: 100, after: 999 },
      { rowId: "a", col: "atk", before: 10, after: 88 },
      { rowId: "a", col: "name", before: "x", after: "foo" },
    ]);
  });

  it("다행 매핑", () => {
    const cmds = tsvToCommands("1\n2", { rowIndex: 0, colIndex: 1 }, rows, cols);
    expect(cmds).toEqual([
      { rowId: "a", col: "hp", before: 100, after: 1 },
      { rowId: "b", col: "hp", before: 200, after: 2 },
    ]);
  });

  it("행/열 경계 초과분은 clip(자동 생성 없음)", () => {
    // 앵커가 마지막 행·끝에서 두번째 열, 2행×2열 붙여넣기 → 1셀만 매핑
    const cmds = tsvToCommands("5\t6\n7\t8", { rowIndex: 1, colIndex: 3 }, rows, cols);
    expect(cmds).toEqual([{ rowId: "b", col: "name", before: "y", after: "5" }]);
  });

  it("id 컬럼은 붙여넣기 대상에서 제외", () => {
    const cmds = tsvToCommands("zzz\t9", { rowIndex: 0, colIndex: 0 }, rows, cols);
    expect(cmds).toEqual([{ rowId: "a", col: "hp", before: 100, after: 9 }]);
  });

  it("후행 개행(스프레드시트 복사)은 아래 행에 phantom write 하지 않음", () => {
    const cmds = tsvToCommands("100\t200\n", { rowIndex: 0, colIndex: 1 }, rows, cols);
    expect(cmds.some((c) => c.rowId === "b")).toBe(false);
    expect(cmds).toEqual([{ rowId: "a", col: "atk", before: 10, after: 200 }]);
  });

  it("before===after 셀은 제외", () => {
    const cmds = tsvToCommands("100\t99", { rowIndex: 0, colIndex: 1 }, rows, cols);
    expect(cmds).toEqual([{ rowId: "a", col: "atk", before: 10, after: 99 }]);
  });
});
