import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db/repo/projects";
import { listTables } from "@/lib/db/repo/tables";
import { readRows } from "@/lib/db/repo/rows";

export async function GET() {
  const projects = listProjects();
  const data = projects.map((p) => {
    const tables = listTables(p.id);
    const rowCount = tables.reduce((sum, t) => sum + readRows(t.id).length, 0);
    return { ...p, table_count: tables.length, row_count: rowCount };
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = createProject(body);
  return NextResponse.json(project, { status: 201 });
}
