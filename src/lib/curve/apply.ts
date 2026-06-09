import { listColumns, addColumn } from "../db/repo/columns";
import { clearRows, upsertRow } from "../db/repo/rows";
import { computeCurve, CurveParams } from "./generate";

export interface GenerateCurveInput extends CurveParams {
  table_id: string;
  level_column: string; // 예: "level"
  value_column: string; // 예: "exp"
  replace?: boolean;    // 기존 행 전체 대체 여부
}

// 곡선 값을 계산해 테이블 행으로 기록한다. 필요한 컬럼은 number로 자동 생성.
export function generateCurveIntoTable(input: GenerateCurveInput): { generated: number; values: number[] } {
  const { table_id, level_column, value_column, replace, ...curve } = input;

  const existing = listColumns(table_id);
  const names = new Set(existing.map((c) => c.name));
  if (!names.has(level_column)) addColumn({ table_id, name: level_column, type: "number", order_index: existing.length });
  if (!names.has(value_column)) addColumn({ table_id, name: value_column, type: "number", order_index: existing.length + 1 });

  const values = computeCurve(curve);
  if (replace) clearRows(table_id);
  values.forEach((v, i) => {
    upsertRow(table_id, undefined, { [level_column]: i + 1, [value_column]: v });
  });
  return { generated: values.length, values };
}
