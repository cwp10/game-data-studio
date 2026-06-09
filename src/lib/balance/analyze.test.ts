import { describe, it, expect } from "vitest";
import { analyzeColumns, type AnalyzeRow } from "./analyze";

const rowsHp = (vals: { name: string; hp: number }[]): AnalyzeRow[] =>
  vals.map((v, i) => ({ id: `r${i}`, data: { name: v.name, hp: v.hp } }));

describe("analyzeColumns", () => {
  it("computes mean / min / max", () => {
    const { results } = analyzeColumns(rowsHp([{ name: "a", hp: 10 }, { name: "b", hp: 20 }, { name: "c", hp: 30 }]), ["hp"]);
    expect(results).toHaveLength(1);
    expect(results[0].mean).toBeCloseTo(20);
    expect(results[0].min).toBe(10);
    expect(results[0].max).toBe(30);
  });

  it("flags a strong outlier as danger (z > 3)", () => {
    const rows = rowsHp([...Array.from({ length: 15 }, (_, i) => ({ name: `n${i}`, hp: 100 + i })), { name: "out", hp: 1000 }]);
    const { results, total_anomalies } = analyzeColumns(rows, ["hp"]);
    expect(total_anomalies).toBeGreaterThanOrEqual(1);
    const outlier = results[0].anomalies.find((a) => a.label === "out");
    expect(outlier).toBeDefined();
    expect(outlier!.severity).toBe("danger");
    expect(outlier!.z_score).toBeGreaterThan(3);
  });

  it("ignores non-number values and needs >= 2 values", () => {
    expect(analyzeColumns([{ id: "x", data: { name: "solo", hp: 5 } }], ["hp"]).results).toHaveLength(0);
    const rows: AnalyzeRow[] = [
      { id: "a", data: { name: "A", hp: "notnum" } },
      { id: "b", data: { name: "B", hp: 10 } },
      { id: "c", data: { name: "C", hp: 12 } },
    ];
    expect(analyzeColumns(rows, ["hp"]).results[0].mean).toBe(11); // only B, C
  });

  it("uses name as anomaly label, falls back to row id", () => {
    const rows: AnalyzeRow[] = [
      { id: "ra", data: { hp: 1 } },
      { id: "rb", data: { hp: 1 } },
    ];
    const { results } = analyzeColumns(rows, ["hp"]);
    expect(results).toHaveLength(1); // no anomalies but stats computed
  });

  it("splits stats by group_by", () => {
    const rows: AnalyzeRow[] = [
      { id: "1", data: { grade: "SR", hp: 10 } },
      { id: "2", data: { grade: "SR", hp: 20 } },
      { id: "3", data: { grade: "R", hp: 100 } },
      { id: "4", data: { grade: "R", hp: 120 } },
    ];
    const { results } = analyzeColumns(rows, ["hp"], "grade");
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.column).sort()).toEqual(["hp [R]", "hp [SR]"]);
  });
});
