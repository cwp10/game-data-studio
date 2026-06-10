// analyze_balance 통계 결과 → /api/chat 챗 브리지용 밸런싱 리포트 프롬프트 빌더 (순수 함수)

export interface PromptAnomaly {
  label: string;
  value: number;
  z_score: number;
  severity: "danger" | "warn";
}

export interface PromptColumnResult {
  column: string;
  mean: number;
  stddev: number;
  min: number;
  max: number;
  anomalies: PromptAnomaly[];
}

export interface PromptBuilderInput {
  projectName: string;
  genre: string | null;
  tables: Array<{ name: string }>;
  analyzeResults: PromptColumnResult[];
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function buildBalanceReportPrompt(input: PromptBuilderInput): string {
  const { projectName, genre, tables, analyzeResults } = input;
  const genreLabel = genre ?? "미지정";
  const tableNames = tables.map((t) => t.name).join(", ") || "(없음)";

  const lines: string[] = [];
  lines.push("게임 밸런스 분석 리포트를 작성해주세요.");
  lines.push("");
  lines.push(`**프로젝트:** ${projectName}`);
  lines.push(`**장르:** ${genreLabel}`);
  lines.push(`**테이블:** ${tableNames}`);
  lines.push("");
  lines.push("**통계 분석 결과:**");

  if (analyzeResults.length === 0) {
    lines.push("- 분석된 컬럼 없음");
  } else {
    for (const col of analyzeResults) {
      lines.push(
        `- ${col.column}: mean=${fmt(col.mean)}, stddev=${fmt(col.stddev)}, min=${fmt(col.min)}, max=${fmt(col.max)}`
      );
      if (col.anomalies.length === 0) {
        lines.push("  - 이상값 없음");
      } else {
        for (const a of col.anomalies) {
          lines.push(
            `  - 이상값: ${a.label} (value=${fmt(a.value)}, z_score=${fmt(a.z_score)}, severity=${a.severity})`
          );
        }
      }
    }
  }

  lines.push("");
  lines.push("**요청사항:**");
  lines.push(`1. 각 이상값이 왜 문제인지 장르(${genreLabel}) 맥락에서 설명`);
  lines.push(`2. 장르(${genreLabel}) 표준 대비 권장 범위 제안`);
  lines.push("3. 우선 수정 항목 (danger → warn 순)");
  lines.push("4. 전반적인 밸런스 진단 요약");
  lines.push("");
  lines.push("한국어로 간결하게 작성해주세요.");

  return lines.join("\n");
}
