import { NextRequest, NextResponse } from "next/server";
import { generateCurveIntoTable } from "@/lib/curve/apply";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { table_id, level_column, value_column, type, base, factor, count, replace, round } = body;
  if (!table_id || !value_column) return NextResponse.json({ error: "table_id, value_column required" }, { status: 400 });
  try {
    const res = generateCurveIntoTable({
      table_id,
      level_column: level_column || "level",
      value_column,
      type: type ?? "power",
      base: Number(base),
      factor: Number(factor),
      count: Number(count),
      round,
      replace,
    });
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
