import { describe, it, expect } from "vitest";
import { axisMaxes, normalizeSeries, polarPoint } from "./radar";

describe("axisMaxes — 축별 독립 max", () => {
  it("주어진 max 가 있으면 그 값을 사용", () => {
    const axes = [{ label: "hp", max: 10000 }, { label: "atk" }];
    const series = [{ name: "a", color: "#000", values: [5000, 600] }];
    expect(axisMaxes(axes, series)).toEqual([10000, 600]);
  });

  it("max 미지정 → 전체 시리즈에 걸친 축별 최대값(축마다 독립)", () => {
    const axes = [{ label: "hp" }, { label: "crit" }];
    const series = [
      { name: "a", color: "#000", values: [5000, 0.1] },
      { name: "b", color: "#111", values: [4000, 0.2] },
    ];
    // hp 축 max=5000(a), crit 축 max=0.2(b) — 축마다 다른 시리즈가 최대
    expect(axisMaxes(axes, series)).toEqual([5000, 0.2]);
  });

  it("값이 전부 0/음수 → max 0 (NaN 금지)", () => {
    const axes = [{ label: "x" }];
    const series = [{ name: "a", color: "#000", values: [0] }];
    expect(axisMaxes(axes, series)).toEqual([0]);
  });
});

describe("normalizeSeries — 0~1 정규화", () => {
  it("축별 max 로 나눠 0~1", () => {
    // hp 5000/5000=1, def 125/250=0.5, crit 0.1/0.2=0.5
    expect(normalizeSeries([5000, 125, 0.1], [5000, 250, 0.2])).toEqual([1, 0.5, 0.5]);
  });

  it("max=0 가드 → 0 (NaN 아님)", () => {
    const r = normalizeSeries([3, 5], [0, 10]);
    expect(r[0]).toBe(0);
    expect(Number.isNaN(r[0])).toBe(false);
    expect(r[1]).toBe(0.5);
  });

  it("max 초과값은 1 로 클램프", () => {
    expect(normalizeSeries([300], [250])).toEqual([1]);
  });

  it("축이 hp 에 지배되지 않음 — 각 축 독립 정규화 확인", () => {
    // raw 라면 hp(5000) 옆에서 crit(0.2)은 0에 가깝게 보임. 정규화 후엔 둘 다 1.
    const r = normalizeSeries([5000, 0.2], [5000, 0.2]);
    expect(r).toEqual([1, 1]);
  });
});

describe("polarPoint — 극좌표 앵커", () => {
  const cx = 100, cy = 100, radius = 50;

  it("축 0 은 12시 방향(위쪽): norm=1 → (cx, cy-radius)", () => {
    const p = polarPoint(1, 0, 4, cx, cy, radius);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(50, 6);
  });

  it("n=4 축 1 은 3시 방향(오른쪽): norm=1 → (cx+radius, cy)", () => {
    const p = polarPoint(1, 1, 4, cx, cy, radius);
    expect(p.x).toBeCloseTo(150, 6);
    expect(p.y).toBeCloseTo(100, 6);
  });

  it("norm=0 → 중심", () => {
    const p = polarPoint(0, 2, 4, cx, cy, radius);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(100, 6);
  });

  it("반지름 스케일: norm=0.5 → 반지름 절반", () => {
    const p = polarPoint(0.5, 0, 4, cx, cy, radius);
    expect(p.y).toBeCloseTo(75, 6); // cy - 0.5*radius
  });
});
