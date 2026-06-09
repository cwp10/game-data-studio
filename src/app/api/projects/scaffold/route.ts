import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/db/repo/projects";
import { createTable } from "@/lib/db/repo/tables";
import { addColumn } from "@/lib/db/repo/columns";

interface PlanColumn { name: string; type?: string; description?: string }
interface PlanTable { name: string; description?: string; columns?: PlanColumn[] }

const TYPES = new Set(["string", "number", "boolean", "enum"]);

export async function POST(req: NextRequest) {
  const { name, genre, description, tables } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = createProject({ name: name.trim(), genre, description });
  for (const t of (tables ?? []) as PlanTable[]) {
    if (!t?.name?.trim()) continue;
    const table = createTable({ project_id: project.id, name: t.name.trim(), description: t.description });
    (t.columns ?? []).forEach((c, i) => {
      if (!c?.name?.trim()) return;
      try {
        addColumn({ table_id: table.id, name: c.name.trim(), type: (TYPES.has(c.type ?? "") ? c.type : "string") as "string" | "number" | "boolean" | "enum", description: c.description, order_index: i });
      } catch { /* 중복 컬럼 등은 무시 */ }
    });
  }
  return NextResponse.json(project, { status: 201 });
}
