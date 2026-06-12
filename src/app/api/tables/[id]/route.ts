import { NextRequest, NextResponse } from "next/server";
import { deleteTable, getTable, updateTable } from "@/lib/db/repo/tables";
import { listColumns } from "@/lib/db/repo/columns";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const table = getTable(id);
  if (!table) return NextResponse.json({ error: "not found" }, { status: 404 });
  const columns = listColumns(id);
  return NextResponse.json({ table, columns });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getTable(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const body = await req.json();
    const table = updateTable(id, { name: body?.name, description: body?.description });
    return NextResponse.json({ table });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTable(id);
  return NextResponse.json({ deleted: true });
}
