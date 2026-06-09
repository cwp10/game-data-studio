import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db/repo/projects";
import { listTables } from "@/lib/db/repo/tables";

export async function GET() {
  const projects = listProjects();
  const data = projects.map((p) => ({ ...p, table_count: listTables(p.id).length }));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = createProject(body);
  return NextResponse.json(project, { status: 201 });
}
