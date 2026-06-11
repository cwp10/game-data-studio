import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/db/repo/projects";
import { createTable } from "@/lib/db/repo/tables";
import { addColumn } from "@/lib/db/repo/columns";
import { SEED_TEMPLATES, type SeedTable } from "@/lib/genre-seeds";

interface PlanColumn { name: string; type?: string; description?: string }
interface PlanTable { name: string; description?: string; columns?: PlanColumn[] }

const TYPES = new Set(["string", "number", "boolean", "enum"]);

function applyColumns(tableId: string, columns: Array<{ name: string; type: string; description?: string }>) {
  columns
    .filter((c) => c?.name?.trim() && c.name.trim().toLowerCase() !== "id")
    .forEach((c, i) => {
      try {
        addColumn({
          table_id: tableId,
          name: c.name.trim(),
          type: (TYPES.has(c.type ?? "") ? c.type : "string") as "string" | "number" | "boolean" | "enum",
          description: c.description,
          order_index: i + 1,
        });
      } catch { /* 중복 컬럼 무시 */ }
    });
}

export async function POST(req: NextRequest) {
  const { name, genre, description, tables, genreCodes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = createProject({ name: name.trim(), genre, description });

  if (Array.isArray(genreCodes) && genreCodes.length > 0) {
    // 장르 코드 기반: seed templates 병합 (테이블명 기준 중복 제거)
    const merged = new Map<string, SeedTable>();
    for (const code of genreCodes as string[]) {
      for (const t of SEED_TEMPLATES[code] ?? []) {
        if (!merged.has(t.name)) merged.set(t.name, t);
      }
    }
    for (const t of merged.values()) {
      const table = createTable({ project_id: project.id, name: t.name });
      applyColumns(table.id, t.columns);
    }
  } else {
    // 기존 플랜 기반 (AI wizard 경로 호환)
    for (const t of (tables ?? []) as PlanTable[]) {
      if (!t?.name?.trim()) continue;
      const table = createTable({ project_id: project.id, name: t.name.trim(), description: t.description });
      applyColumns(table.id, (t.columns ?? []).map((c) => ({ name: c.name ?? "", type: c.type ?? "string", description: c.description })));
    }
  }

  return NextResponse.json(project, { status: 201 });
}
