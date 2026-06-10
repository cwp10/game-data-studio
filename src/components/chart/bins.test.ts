import { describe, it, expect } from "vitest";
import { computeBins } from "./bins";

describe("computeBins — 공유 빈", () => {
  it("빈 입력(series=[]) → 안전", () => {
    const r = computeBins([], 10);
    expect(r.binEdges).toEqual([]);
    expect(r.seriesCounts).toEqual([]);
  });

  it("시리즈는 있으나 값이 전부 비어있음 → 빈 경계, 빈 카운트", () => {
    const r = computeBins([[], []], 10);
    expect(r.binEdges).toEqual([]);
    expect(r.seriesCounts).toEqual([[], []]);
  });

  it("전부 동일값 → 단일 빈 (span 0 방어)", () => {
    const r = computeBins([[5, 5, 5, 5]], 10);
    expect(r.binEdges).toEqual([5, 5]);
    expect(r.seriesCounts).toEqual([[4]]);
  });

  it("binCount 준수 — binEdges 길이 = binCount+1, 카운트 길이 = binCount", () => {
    const r = computeBins([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], 5);
    expect(r.binEdges).toHaveLength(6);
    expect(r.seriesCounts[0]).toHaveLength(5);
  });

  it("value === max 는 마지막 빈에 귀속 (phantom 빈 금지)", () => {
    // min=0 max=10 bins=5 width=2. 값 10 → floor(10/2)=5 → 마지막 빈(4)으로 클램프.
    const r = computeBins([[0, 10]], 5);
    expect(r.seriesCounts[0]).toHaveLength(5);
    expect(r.seriesCounts[0][0]).toBe(1); // 값 0 → 첫 빈
    expect(r.seriesCounts[0][4]).toBe(1); // 값 10(=max) → 마지막 빈
  });

  it("다중 시리즈 — 공유 경계 정렬(두 시리즈 binEdges 동일) + 카운트 합 보존", () => {
    const a = [0, 1, 2, 3];
    const b = [6, 7, 8, 9]; // 다른 범위지만 글로벌 0~9 경계 공유
    const r = computeBins([a, b], 3);
    // 단일 호출이므로 binEdges는 하나 — 두 시리즈가 같은 경계를 쓴다는 의미.
    expect(r.binEdges).toHaveLength(4);
    expect(r.binEdges[0]).toBe(0);
    expect(r.binEdges[3]).toBe(9);
    // 카운트 합 == 각 시리즈 유한값 개수
    expect(r.seriesCounts[0].reduce((s, c) => s + c, 0)).toBe(4);
    expect(r.seriesCounts[1].reduce((s, c) => s + c, 0)).toBe(4);
    // 시리즈 a(0~3)는 앞쪽 빈, b(6~9)는 뒤쪽 빈에 분포
    expect(r.seriesCounts[0][0]).toBeGreaterThan(0);
    expect(r.seriesCounts[1][2]).toBeGreaterThan(0);
  });

  it("비숫자(NaN/Infinity) 제거 후 버킷팅", () => {
    const r = computeBins([[1, 2, NaN, Infinity, 3]], 2);
    expect(r.seriesCounts[0].reduce((s, c) => s + c, 0)).toBe(3);
  });
});
