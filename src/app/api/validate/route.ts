import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";
import { validateRows, type ColumnSpec } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { table_id } = await req.json();
  if (!table_id) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  const specs: ColumnSpec[] = listColumns(table_id).map((c) => ({
    name: c.name,
    type: c.type,
    constraints: c.constraints ?? undefined,
  }));
  const rows = readRows(table_id).map((r) => ({ id: r.id, data: r.data }));
  return NextResponse.json(validateRows(rows, specs));
}
