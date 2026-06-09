import { NextRequest, NextResponse } from "next/server";
import { generateCurveIntoTable } from "@/lib/curve/apply";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { table_id, level_column, value_column, type, base, factor, count, replace, round } = body;
  if (!table_id || !value_column) return NextResponse.json({ error: "table_id, value_column required" }, { status: 400 });
  const nBase = Number(base), nFactor = Number(factor), nCount = Number(count);
  if (![nBase, nFactor, nCount].every(Number.isFinite) || nCount < 1) {
    return NextResponse.json({ error: "base, factor, count 는 유효한 숫자여야 하고 count ≥ 1 이어야 합니다." }, { status: 400 });
  }
  try {
    const res = generateCurveIntoTable({
      table_id,
      level_column: level_column || "level",
      value_column,
      type: type ?? "power",
      base: nBase,
      factor: nFactor,
      count: nCount,
      round,
      replace,
    });
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
