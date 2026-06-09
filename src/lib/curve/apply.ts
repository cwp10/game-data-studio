import { listColumns, addColumn } from "../db/repo/columns";
import { clearRows, upsertRow } from "../db/repo/rows";
import { getDb } from "../db/client";
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
  if (level_column === value_column) throw new Error("레벨 컬럼과 값 컬럼은 달라야 합니다.");

  const values = computeCurve(curve);

  // 컬럼 생성 + 행 작성을 한 트랜잭션으로 (부분 실패 시 롤백)
  const tx = getDb().transaction(() => {
    const existing = listColumns(table_id);
    const names = new Set(existing.map((c) => c.name));
    if (!names.has(level_column)) addColumn({ table_id, name: level_column, type: "number", order_index: existing.length });
    if (!names.has(value_column)) addColumn({ table_id, name: value_column, type: "number", order_index: existing.length + 1 });
    if (replace) clearRows(table_id);
    values.forEach((v, i) => {
      upsertRow(table_id, undefined, { [level_column]: i + 1, [value_column]: v });
    });
  });
  tx();
  return { generated: values.length, values };
}
