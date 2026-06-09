import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";
import { analyzeColumns } from "@/lib/balance/analyze";

export async function POST(req: NextRequest) {
  const { table_id, columns, group_by } = await req.json();
  const targetCols: string[] = columns ?? listColumns(table_id).filter((c) => c.type === "number").map((c) => c.name);
  const rows = readRows(table_id);
  return NextResponse.json(analyzeColumns(rows, targetCols, group_by));
}
