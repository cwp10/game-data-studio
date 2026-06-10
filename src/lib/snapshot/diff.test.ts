import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";

describe("diffSnapshots", () => {
  it("동일 스냅샷 → all zeros, rows=[]", () => {
    const snap = [
      { id: "r1", data: { name: "slime", hp: 10 } },
      { id: "r2", data: { name: "goblin", hp: 20 } },
    ];
    const res = diffSnapshots(snap, snap);
    expect(res).toEqual({ added: 0, removed: 0, changed: 0, rows: [] });
  });

  it("행 추가 → added:1", () => {
    const a = [{ id: "r1", data: { name: "slime", hp: 10 } }];
    const b = [
      { id: "r1", data: { name: "slime", hp: 10 } },
      { id: "r2", data: { name: "goblin", hp: 20 } },
    ];
    const res = diffSnapshots(a, b);
    expect(res.added).toBe(1);
    expect(res.removed).toBe(0);
    expect(res.changed).toBe(0);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual({
      row_id: "r2",
      type: "added",
      before: null,
      after: { name: "goblin", hp: 20 },
      changedKeys: [],
    });
  });

  it("행 제거 → removed:1", () => {
    const a = [
      { id: "r1", data: { name: "slime", hp: 10 } },
      { id: "r2", data: { name: "goblin", hp: 20 } },
    ];
    const b = [{ id: "r1", data: { name: "slime", hp: 10 } }];
    const res = diffSnapshots(a, b);
    expect(res.removed).toBe(1);
    expect(res.added).toBe(0);
    expect(res.changed).toBe(0);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual({
      row_id: "r2",
      type: "removed",
      before: { name: "goblin", hp: 20 },
      after: null,
      changedKeys: [],
    });
  });

  it("값 변경 (hp 다름) → changed:1, changedKeys:['hp']", () => {
    const a = [{ id: "r1", data: { name: "slime", hp: 10 } }];
    const b = [{ id: "r1", data: { name: "slime", hp: 15 } }];
    const res = diffSnapshots(a, b);
    expect(res.changed).toBe(1);
    expect(res.added).toBe(0);
    expect(res.removed).toBe(0);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual({
      row_id: "r1",
      type: "changed",
      before: { name: "slime", hp: 10 },
      after: { name: "slime", hp: 15 },
      changedKeys: ["hp"],
    });
  });

  it("혼합 (추가 1 + 제거 1 + 변경 1) → 각 카운트 맞음", () => {
    const a = [
      { id: "r1", data: { name: "slime", hp: 10 } }, // changed
      { id: "r2", data: { name: "goblin", hp: 20 } }, // removed
      { id: "r3", data: { name: "orc", hp: 30 } }, // unchanged
    ];
    const b = [
      { id: "r1", data: { name: "slime", hp: 12 } }, // changed
      { id: "r3", data: { name: "orc", hp: 30 } }, // unchanged
      { id: "r4", data: { name: "dragon", hp: 100 } }, // added
    ];
    const res = diffSnapshots(a, b);
    expect(res.added).toBe(1);
    expect(res.removed).toBe(1);
    expect(res.changed).toBe(1);
    expect(res.rows).toHaveLength(3);

    const changed = res.rows.find((r) => r.type === "changed");
    expect(changed?.row_id).toBe("r1");
    expect(changed?.changedKeys).toEqual(["hp"]);

    const removed = res.rows.find((r) => r.type === "removed");
    expect(removed?.row_id).toBe("r2");

    const added = res.rows.find((r) => r.type === "added");
    expect(added?.row_id).toBe("r4");
  });
});
