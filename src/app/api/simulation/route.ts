import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";
import { listSimulations, saveSimulation } from "@/lib/db/repo/simulations";
import { getTable } from "@/lib/db/repo/tables";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listSimulations(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "run") {
    const snapshot: Record<string, unknown> = {};
    for (const tid of body.input_tables ?? []) {
      const table = getTable(tid);
      if (table) snapshot[tid] = { table, columns: listColumns(tid), rows: readRows(tid, { limit: 200 }) };
    }
    return NextResponse.json({ snapshot, target_columns: body.target_columns ?? [] });
  }
  return NextResponse.json(saveSimulation(body), { status: 201 });
}
