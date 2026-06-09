import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { getTable } from "@/lib/db/repo/tables";

// 자식 프로세스(claude CLI) spawn이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER = "game-data-studio";
const tool = (name: string) => `mcp__${SERVER}__${name}`;

// 채팅에서 허용하는 MCP 툴 (스키마 + 데이터 범위)
const ALLOWED_TOOLS = [
  "list_projects", "list_tables", "list_relations", "read_rows", "analyze_balance",
  "create_table", "add_column", "remove_column", "set_relation",
  "upsert_row", "delete_row", "import_csv", "export_csv",
].map(tool);

// 채팅에서 절대 호출 금지 (치명적 삭제)
const DISALLOWED_TOOLS = ["delete_project", "delete_table"].map(tool);

function buildSystemPrompt(projectId: string, tableId?: string, tableName?: string): string {
  const lines = [
    "당신은 Game Data Studio의 게임 데이터 기획 어시스턴트입니다.",
    `현재 작업 중인 프로젝트 id는 "${projectId}" 입니다.`,
  ];
  if (tableId) lines.push(`현재 보고 있는 테이블은 id "${tableId}"${tableName ? ` (이름: ${tableName})` : ""} 입니다.`);
  lines.push(
    "사용자의 자연어 요청을 등록된 MCP 툴(create_table, add_column, upsert_row, read_rows, analyze_balance 등)로 처리하세요.",
    "- 항상 위 project_id / table_id 스코프 안에서만 동작합니다.",
    "- 행을 추가·수정하기 전에 list_tables / read_rows 로 현재 컬럼·데이터를 먼저 확인해 일관되게 작성하세요.",
    "- 프로젝트·테이블 삭제는 절대 하지 마세요.",
    "- 작업을 마치면 무엇을 했는지 한국어로 한두 문장으로 요약하세요.",
  );
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const { project_id, table_id, message } = await req.json();
  if (!project_id || !message) {
    return new Response(JSON.stringify({ error: "project_id, message required" }), { status: 400 });
  }

  const tableName = table_id ? getTable(table_id)?.name : undefined;
  const systemPrompt = buildSystemPrompt(project_id, table_id, tableName);

  const bin = process.env.CLAUDE_BIN ?? "claude";
  // 보안: bypassPermissions(전체 우회) 대신 정확한 allowlist만 사용한다.
  // 헤드리스(-p)에서 allowedTools 에 나열한 툴만 프롬프트 없이 실행되고 나머지는 거부된다.
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--mcp-config", "./data/mcp.json",
    "--strict-mcp-config",
    "--allowedTools", ...ALLOWED_TOOLS,
    "--disallowedTools", ...DISALLOWED_TOOLS,
    "--append-system-prompt", systemPrompt,
  ];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (s: string) => { if (!closed) controller.enqueue(enc.encode(s)); };
      const close = () => { if (!closed) { closed = true; controller.close(); } };

      const child = spawn(bin, args, { cwd: process.cwd(), env: process.env });

      // 프롬프트는 stdin 으로 전달 (인자 이스케이프 회피)
      child.stdin.write(message);
      child.stdin.end();

      let buf = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) send(`data: ${line}\n\n`);
        }
      });

      child.stderr.on("data", (c: Buffer) => {
        send(`event: stderr\ndata: ${JSON.stringify(c.toString())}\n\n`);
      });

      child.on("error", (err) => {
        send(`event: error\ndata: ${JSON.stringify(String(err))}\n\n`);
        close();
      });

      child.on("close", () => {
        if (buf.trim()) send(`data: ${buf}\n\n`);
        send("data: [DONE]\n\n");
        close();
      });

      // 클라이언트가 끊으면 자식도 종료
      req.signal.addEventListener("abort", () => { child.kill("SIGTERM"); close(); });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
