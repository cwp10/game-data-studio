// FK 무결성 — relations(set_relation 정의) 기반 깨진 참조 검출 + 참조하는 행 조회.
// 순수 읽기 함수, 의존성 0. detect/조회만 — cascade/auto-fix/orphan cleanup 없음.

export interface RelationSpec {
  from_table_id: string;
  from_column: string;
  to_table_id: string;
  to_column: string;
}

export type RowsByTable = Record<string, { id: string; data: Record<string, unknown> }[]>;

export interface BrokenRef {
  from_table_id: string;
  from_row_id: string;
  from_column: string;
  value: unknown; // 참조했지만 대상에 없는 값
  to_table_id: string;
  to_column: string;
}

export interface ReferencingRow {
  table_id: string;
  row_id: string;
  column: string;
}

// 값이 "비어있음"인가 — null/undefined/빈 문자열. (number 0, boolean false는 비어있음 아님.)
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function findBrokenRefs(relations: RelationSpec[], rowsByTable: RowsByTable): BrokenRef[] {
  const broken: BrokenRef[] = [];

  for (const rel of relations) {
    // to_table 키가 아예 없으면(테이블 자체 부재) 판단 불가 → skip (over-flag 방지).
    // 키는 있으나 빈 배열([])이면 진짜 0행 테이블 → 모든 비어있지 않은 from 값이 broken.
    if (!(rel.to_table_id in rowsByTable)) continue;
    const fromRows = rowsByTable[rel.from_table_id];
    if (!fromRows) continue;

    const toValues = new Set<unknown>();
    for (const r of rowsByTable[rel.to_table_id]) {
      toValues.add(r.data[rel.to_column]);
    }

    for (const row of fromRows) {
      const v = row.data[rel.from_column];
      if (isEmpty(v)) continue; // 참조 없음 = 정상
      if (!toValues.has(v)) {
        broken.push({
          from_table_id: rel.from_table_id,
          from_row_id: row.id,
          from_column: rel.from_column,
          value: v,
          to_table_id: rel.to_table_id,
          to_column: rel.to_column,
        });
      }
    }
  }

  return broken;
}

export function findReferencingRows(
  targetTableId: string,
  targetRow: { id: string; data: Record<string, unknown> },
  relations: RelationSpec[],
  rowsByTable: RowsByTable,
): ReferencingRow[] {
  const result: ReferencingRow[] = [];

  for (const rel of relations) {
    if (rel.to_table_id !== targetTableId) continue;

    const targetVal = targetRow.data[rel.to_column];
    if (isEmpty(targetVal)) continue; // 참조 키가 비어있으면 아무도 못 가리킴

    const fromRows = rowsByTable[rel.from_table_id];
    if (!fromRows) continue;

    for (const row of fromRows) {
      if (row.data[rel.from_column] === targetVal) {
        result.push({ table_id: rel.from_table_id, row_id: row.id, column: rel.from_column });
      }
    }
  }

  return result;
}
