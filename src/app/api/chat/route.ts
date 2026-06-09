import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { getTable } from "@/lib/db/repo/tables";
import { addMessage, listMessages, clearMessages } from "@/lib/db/repo/chat";

// 프로젝트 대화 이력 로드
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listMessages(projectId));
}

// 프로젝트 대화 이력 초기화
export async function DELETE(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  clearMessages(projectId);
  return NextResponse.json({ cleared: true });
}

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

  // 사용자 메시지 즉시 저장
  addMessage({ project_id, table_id, role: "user", content: message });

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

      // 영속화용: 어시스턴트 텍스트 + 툴 호출을 순서대로 수집
      const transcript: { role: "assistant" | "tool"; content: string; tool_name?: string }[] = [];
      const parseLine = (line: string) => {
        let o: Record<string, unknown>;
        try { o = JSON.parse(line); } catch { return; }
        if (o.type === "assistant") {
          const content = (o.message as { content?: unknown[] })?.content ?? [];
          for (const b of content as { type: string; text?: string; name?: string }[]) {
            if (b.type === "text" && b.text?.trim()) {
              transcript.push({ role: "assistant", content: b.text });
            } else if (b.type === "tool_use" && b.name?.startsWith(`mcp__${SERVER}__`)) {
              // 내부 메커니즘(ToolSearch 등)은 제외하고 실제 game-data 툴만, 짧은 이름으로 저장
              const short = b.name.replace(`mcp__${SERVER}__`, "");
              transcript.push({ role: "tool", content: short, tool_name: short });
            }
          }
        }
      };

      let buf = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) { send(`data: ${line}\n\n`); parseLine(line); }
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
        if (buf.trim()) { send(`data: ${buf}\n\n`); parseLine(buf); }
        // 수집한 어시스턴트/툴 메시지를 순서대로 영속화
        for (const t of transcript) {
          addMessage({ project_id, table_id, role: t.role, content: t.content, tool_name: t.tool_name });
        }
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
