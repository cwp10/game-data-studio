import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { resolveClaudeBin } from "@/lib/util/claude";

// claude 헤드리스 호출이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// claude -p --output-format json 으로 호출하고 assistant 최종 텍스트를 반환
function runClaude(prompt: string, system: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = resolveClaudeBin();
    // MCP/툴 없이 순수 텍스트 생성만 (strict-mcp-config 로 외부 MCP 서버 미로드)
    const child = spawn(bin, ["-p", "--output-format", "json", "--strict-mcp-config", "--append-system-prompt", system], {
      cwd: process.cwd(),
      env: process.env,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.stderr.on("data", (c: Buffer) => (err += c.toString()));
    child.on("error", reject);
    child.on("close", () => {
      try {
        const o = JSON.parse(out);
        resolve(typeof o.result === "string" ? o.result : out);
      } catch {
        reject(new Error("claude 응답 파싱 실패: " + (err || out).slice(0, 300)));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// 응답 텍스트에서 JSON 객체만 추출 (코드펜스/서두 제거)
function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

export async function POST(req: NextRequest) {
  const { choices = [], finish = false } = await req.json();
  const path = (choices as string[]).filter(Boolean);

  const system = [
    "너는 게임 수치 데이터 기획 온보딩 도우미다.",
    "사용자가 만들 게임의 장르·게임성을 단계적으로 좁힌다.",
    "반드시 JSON 객체 하나만 출력한다. 마크다운, 코드펜스, 설명 문장 금지.",
  ].join("\n");

  const prompt = finish
    ? [
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(없음)"}`,
        "이 컨셉으로 게임 수치 데이터 프로젝트를 만든다. 장르에 핵심적인 테이블 4~8개와 각 컬럼을 설계해라.",
        "컬럼 type은 string | number | boolean 중 하나. 정확히 다음 JSON만 출력:",
        `{"type":"plan","name":"<프로젝트명 제안>","genre":"${path.join(" · ") || "게임"}","description":"<2~3문장 컨셉>","tables":[{"name":"<영문 snake_case>","description":"<설명>","columns":[{"name":"<영문>","type":"string","description":"<설명>"}]}]}`,
      ].join("\n")
    : [
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(시작)"}`,
        "다음 단계로 게임성을 더 구체화할 선택지 4~6개를 제시해라. 보통 2~4단계면 충분하다.",
        "정확히 다음 JSON만 출력:",
        `{"type":"choices","question":"<이번 단계 질문>","options":[{"label":"<선택지>","hint":"<한 줄 설명>"}],"canFinish":<지금 만들어도 될 만큼 구체적이면 true, 아니면 false>}`,
      ].join("\n");

  try {
    const text = await runClaude(prompt, system);
    return NextResponse.json(extractJSON(text));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
