import { NextRequest, NextResponse } from "next/server";
import { listSnapshots, createSnapshot, deleteSnapshot } from "@/lib/db/repo/snapshots";
import { readRows, upsertRow, deleteRow } from "@/lib/db/repo/rows";
import { diffSnapshots } from "@/lib/snapshot/diff";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("table_id");
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  return NextResponse.json(listSnapshots(tableId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "diff") {
    const { table_id, snapshot_a_id, snapshot_b_id } = body;
    const snaps = listSnapshots(table_id);
    const snapA = snaps.find((s) => s.id === snapshot_a_id);
    const snapB = snaps.find((s) => s.id === snapshot_b_id);
    if (!snapA || !snapB) return NextResponse.json({ error: "snapshot not found" }, { status: 404 });
    const rowsA = JSON.parse(snapA.data);
    const rowsB = JSON.parse(snapB.data);
    const diff = diffSnapshots(rowsA, rowsB);
    return NextResponse.json({
      snapshotA: { id: snapA.id, name: snapA.name, created_at: snapA.created_at },
      snapshotB: { id: snapB.id, name: snapB.name, created_at: snapB.created_at },
      diff,
    });
  }
  if (body.action === "restore") {
    const { table_id, snapshot_id } = body;
    const snap = listSnapshots(table_id).find((s) => s.id === snapshot_id);
    if (!snap) return NextResponse.json({ error: "not found" }, { status: 404 });
    const rows: Array<{ id: string; data: Record<string, unknown> }> = JSON.parse(snap.data);
    const existing = readRows(table_id);
    for (const r of existing) deleteRow(r.id);
    for (const r of rows) upsertRow(table_id, r.id, r.data);
    return NextResponse.json({ restored: rows.length });
  }
  // create
  const { table_id, name } = body;
  if (!table_id || !name) return NextResponse.json({ error: "table_id, name required" }, { status: 400 });
  const rows = readRows(table_id);
  return NextResponse.json(createSnapshot(table_id, name, rows), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { snapshot_id } = await req.json();
  deleteSnapshot(snapshot_id);
  return NextResponse.json({ deleted: true });
}
