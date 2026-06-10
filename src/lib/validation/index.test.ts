import { describe, it, expect } from "vitest";
import { validateRows, type ColumnSpec, type ValidationRow } from "./index";

const rows = (vals: Array<[id: string, data: Record<string, unknown>]>): ValidationRow[] =>
  vals.map(([id, data]) => ({ id, data }));

describe("validateRows — min/max", () => {
  const cols: ColumnSpec[] = [{ name: "hp", type: "number", constraints: { min: 10, max: 100 } }];

  it("boundary value (== min) is valid", () => {
    const { violations, total } = validateRows(rows([["r1", { hp: 10 }]]), cols);
    expect(violations).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("value below min → rule:min, 1 violation", () => {
    const { violations } = validateRows(rows([["r1", { hp: 9 }]]), cols);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("min");
    expect(violations[0].row_id).toBe("r1");
    expect(violations[0].column).toBe("hp");
    expect(violations[0].value).toBe(9);
  });

  it("boundary value (== max) is valid; above max → rule:max", () => {
    expect(validateRows(rows([["r1", { hp: 100 }]]), cols).violations).toHaveLength(0);
    const { violations } = validateRows(rows([["r1", { hp: 101 }]]), cols);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("max");
  });

  it("non-numeric value skips min/max (no NaN comparison)", () => {
    const { violations } = validateRows(rows([["r1", { hp: "abc" }]]), cols);
    expect(violations).toHaveLength(0);
  });

  it("min/max ignored when column type is not number", () => {
    const strCols: ColumnSpec[] = [{ name: "hp", type: "string", constraints: { min: 10 } }];
    expect(validateRows(rows([["r1", { hp: 5 }]]), strCols).violations).toHaveLength(0);
  });
});

describe("validateRows — required", () => {
  const cols: ColumnSpec[] = [{ name: "name", type: "string", constraints: { required: true } }];

  it('empty string / null / undefined → required violation', () => {
    expect(validateRows(rows([["r1", { name: "" }]]), cols).violations[0].rule).toBe("required");
    expect(validateRows(rows([["r2", { name: null }]]), cols).violations[0].rule).toBe("required");
    expect(validateRows(rows([["r3", {}]]), cols).violations[0].rule).toBe("required"); // undefined
  });

  it("number 0 and boolean false are valid (not empty)", () => {
    const numCol: ColumnSpec[] = [{ name: "v", type: "number", constraints: { required: true } }];
    const boolCol: ColumnSpec[] = [{ name: "v", type: "boolean", constraints: { required: true } }];
    expect(validateRows(rows([["r1", { v: 0 }]]), numCol).violations).toHaveLength(0);
    expect(validateRows(rows([["r2", { v: false }]]), boolCol).violations).toHaveLength(0);
  });
});

describe("validateRows — unique", () => {
  const cols: ColumnSpec[] = [{ name: "code", type: "string", constraints: { unique: true } }];

  it("[a,b,a] → both 'a' rows violate (2), 'b' 0", () => {
    const { violations } = validateRows(
      rows([
        ["r1", { code: "a" }],
        ["r2", { code: "b" }],
        ["r3", { code: "a" }],
      ]),
      cols
    );
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.rule === "unique")).toBe(true);
    expect(violations.map((v) => v.row_id).sort()).toEqual(["r1", "r3"]);
  });

  it("all unique → 0 violations", () => {
    const { violations } = validateRows(rows([["r1", { code: "a" }], ["r2", { code: "b" }]]), cols);
    expect(violations).toHaveLength(0);
  });

  it("empty values excluded from uniqueness", () => {
    const { violations } = validateRows(rows([["r1", { code: "" }], ["r2", { code: "" }]]), cols);
    expect(violations).toHaveLength(0);
  });
});

describe("validateRows — general", () => {
  it("no constraints → 0 violations", () => {
    const cols: ColumnSpec[] = [{ name: "hp", type: "number" }];
    expect(validateRows(rows([["r1", { hp: 99999 }], ["r2", { hp: -1 }]]), cols).violations).toHaveLength(0);
  });

  it("empty value: only required fires, min/max skipped", () => {
    const cols: ColumnSpec[] = [{ name: "hp", type: "number", constraints: { required: true, min: 10 } }];
    const { violations } = validateRows(rows([["r1", { hp: "" }]]), cols);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("required");
  });

  it("total === violations.length", () => {
    const cols: ColumnSpec[] = [
      { name: "hp", type: "number", constraints: { min: 10 } },
      { name: "code", type: "string", constraints: { unique: true, required: true } },
    ];
    const out = validateRows(
      rows([
        ["r1", { hp: 5, code: "x" }],
        ["r2", { hp: 50, code: "x" }],
        ["r3", { hp: 50, code: "" }],
      ]),
      cols
    );
    expect(out.total).toBe(out.violations.length);
    expect(out.total).toBeGreaterThan(0);
  });
});
