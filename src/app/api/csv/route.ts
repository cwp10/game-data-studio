import { NextRequest, NextResponse } from "next/server";
import { addColumn, listColumns } from "@/lib/db/repo/columns";
import { readRows, upsertRow } from "@/lib/db/repo/rows";
import { getTable } from "@/lib/db/repo/tables";
import { parseCSV, serializeCSV } from "@/lib/util/csv";

export async function POST(req: NextRequest) {
  const { action, table_id, csv_content } = await req.json();

  if (action === "export") {
    const cols = listColumns(table_id);
    const rows = readRows(table_id);
    const headers = cols.map((c) => c.name);
    const body = rows.map((r) => cols.map((c) => String(r.data[c.name] ?? "")));
    return new NextResponse(serializeCSV(headers, body), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${table_id}.csv"` },
    });
  }

  // import
  if (!table_id || !csv_content) return NextResponse.json({ error: "table_id, csv_content required" }, { status: 400 });
  const { headers, rows } = parseCSV(csv_content);
  const existingCols = listColumns(table_id);
  const existingNames = new Set(existingCols.map((c) => c.name));

  for (const h of headers) {
    if (!existingNames.has(h)) {
      const sample = rows[0]?.[headers.indexOf(h)] ?? "";
      const type = sample !== "" && !isNaN(Number(sample)) ? "number" : "string";
      addColumn({ table_id, name: h, type, order_index: existingCols.length });
    }
  }

  let imported = 0;
  for (const row of rows) {
    const data: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const val = row[i] ?? "";
      data[h] = val !== "" && !isNaN(Number(val)) ? Number(val) : val;
    });
    upsertRow(table_id, undefined, data);
    imported++;
  }
  return NextResponse.json({ imported, headers });
}
