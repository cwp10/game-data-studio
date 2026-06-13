import { NextRequest, NextResponse } from "next/server";
import { createTable, deleteTable, listTables } from "@/lib/db/repo/tables";
import { addColumn } from "@/lib/db/repo/columns";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listTables(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const table = createTable(body);
  if (body.columns?.length) {
    const cols = body.columns.map((c: { name: string; type: string; description?: string }, i: number) =>
      addColumn({ table_id: table.id, name: c.name, type: c.type as "string" | "number" | "boolean", description: c.description, order_index: i })
    );
    return NextResponse.json({ table, columns: cols }, { status: 201 });
  }
  return NextResponse.json(table, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("table_id");
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  deleteTable(tableId);
  return NextResponse.json({ deleted: true });
}
