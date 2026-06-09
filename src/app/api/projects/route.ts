import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db/repo/projects";
import { listTables } from "@/lib/db/repo/tables";
import { readRows } from "@/lib/db/repo/rows";
import { listColumns } from "@/lib/db/repo/columns";

// 테이블의 number 컬럼별 z-score > 2 이상값 개수
function countAnomalies(tableId: string): number {
  const rows = readRows(tableId);
  const numberCols = listColumns(tableId).filter((c) => c.type === "number");
  let count = 0;
  for (const col of numberCols) {
    const nums = rows.map((r) => r.data[col.name]).filter((v): v is number => typeof v === "number");
    if (nums.length < 2) continue;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const stddev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
    if (stddev === 0) continue;
    count += nums.filter((v) => Math.abs(v - mean) / stddev > 2).length;
  }
  return count;
}

export async function GET() {
  const projects = listProjects();
  const data = projects.map((p) => {
    const tables = listTables(p.id);
    let rowCount = 0;
    let anomalyCount = 0;
    for (const t of tables) {
      rowCount += readRows(t.id).length;
      anomalyCount += countAnomalies(t.id);
    }
    return { ...p, table_count: tables.length, row_count: rowCount, anomaly_count: anomalyCount };
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = createProject(body);
  return NextResponse.json(project, { status: 201 });
}
