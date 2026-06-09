import { NextRequest, NextResponse } from "next/server";
import { readProjectMemory, writeProjectMemory } from "@/lib/memory/projectMemory";

// 파일시스템 접근이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json({ content: readProjectMemory(projectId) });
}

export async function PUT(req: NextRequest) {
  const { project_id, content } = await req.json();
  if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  writeProjectMemory(project_id, content ?? "");
  return NextResponse.json({ saved: true });
}
