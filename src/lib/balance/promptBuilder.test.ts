import { describe, it, expect } from "vitest";
import { buildBalanceReportPrompt, type PromptBuilderInput } from "./promptBuilder";

const base = (overrides: Partial<PromptBuilderInput> = {}): PromptBuilderInput => ({
  projectName: "테스트 RPG",
  genre: "수집형 RPG",
  tables: [{ name: "characters" }, { name: "skills" }],
  analyzeResults: [],
  ...overrides,
});

describe("buildBalanceReportPrompt", () => {
  it("returns a string", () => {
    const out = buildBalanceReportPrompt(base());
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("includes project name, genre and table names in the header", () => {
    const out = buildBalanceReportPrompt(base());
    expect(out).toContain("테스트 RPG");
    expect(out).toContain("수집형 RPG");
    expect(out).toContain("characters");
    expect(out).toContain("skills");
  });

  it("marks empty analyzeResults with '분석된 컬럼 없음'", () => {
    const out = buildBalanceReportPrompt(base({ analyzeResults: [] }));
    expect(out).toContain("분석된 컬럼 없음");
  });

  it("shows '이상값 없음' for a column with empty anomalies", () => {
    const out = buildBalanceReportPrompt(
      base({
        analyzeResults: [
          { column: "hp", mean: 100, stddev: 10, min: 80, max: 120, anomalies: [] },
        ],
      })
    );
    expect(out).toContain("hp");
    expect(out).toContain("이상값 없음");
  });

  it("includes danger anomaly label and value in the prompt", () => {
    const out = buildBalanceReportPrompt(
      base({
        analyzeResults: [
          {
            column: "atk",
            mean: 50,
            stddev: 15,
            min: 10,
            max: 999,
            anomalies: [
              { label: "보스몹", value: 999, z_score: 4.2, severity: "danger" },
            ],
          },
        ],
      })
    );
    expect(out).toContain("보스몹");
    expect(out).toContain("999");
    expect(out).toContain("danger");
  });

  it("renders '미지정' when genre is null", () => {
    const out = buildBalanceReportPrompt(base({ genre: null }));
    expect(out).toContain("미지정");
    expect(out).toContain("**장르:** 미지정");
  });

  it("contains the four request items and Korean response instruction", () => {
    const out = buildBalanceReportPrompt(base());
    expect(out).toContain("1.");
    expect(out).toContain("2.");
    expect(out).toContain("3.");
    expect(out).toContain("4.");
    expect(out).toContain("한국어로 간결하게 작성해주세요.");
  });
});
