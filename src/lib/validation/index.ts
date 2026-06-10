// 컬럼 제약(min/max/required/unique) 기반 행 데이터 검증 — 위반 목록 산출.
// balance/analyze.ts의 analyzeColumns→anomalies 패턴 미러(통계 대신 제약). 순수 함수, 의존성 0.

export interface ColumnConstraint {
  min?: number; // number 컬럼: value < min → 위반
  max?: number; // number 컬럼: value > max → 위반
  required?: boolean; // value 비어있음(null/undefined/"") → 위반
  unique?: boolean; // 같은 컬럼 내 값 중복 → 위반(중복된 모든 행)
}

export interface ColumnSpec {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  constraints?: ColumnConstraint;
}

export interface ValidationRow {
  id: string;
  data: Record<string, unknown>;
}

export interface Violation {
  row_id: string;
  column: string;
  rule: "min" | "max" | "required" | "unique";
  value: unknown;
  message: string;
}

export interface ValidationOutput {
  violations: Violation[];
  total: number;
}

// 값이 "비어있음"인가 — null/undefined/빈 문자열. (number 0, boolean false는 비어있음 아님.)
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function validateRows(rows: ValidationRow[], columns: ColumnSpec[]): ValidationOutput {
  const violations: Violation[] = [];

  for (const col of columns) {
    const c = col.constraints;
    if (!c) continue; // 제약 없는 컬럼은 검사 안 함 → 기본 무해

    for (const row of rows) {
      const value = row.data[col.name];

      // required: 비어있으면 위반
      if (c.required && isEmpty(value)) {
        violations.push({
          row_id: row.id,
          column: col.name,
          rule: "required",
          value,
          message: `${col.name} 값이 필요합니다`,
        });
      }

      // min/max: number 컬럼 + 유한 숫자일 때만 (NaN 비교 금지)
      if ((c.min !== undefined || c.max !== undefined) && col.type === "number" && typeof value === "number" && Number.isFinite(value)) {
        if (c.min !== undefined && value < c.min) {
          violations.push({
            row_id: row.id,
            column: col.name,
            rule: "min",
            value,
            message: `${col.name}(${value})이(가) 최솟값 ${c.min}보다 작습니다`,
          });
        }
        if (c.max !== undefined && value > c.max) {
          violations.push({
            row_id: row.id,
            column: col.name,
            rule: "max",
            value,
            message: `${col.name}(${value})이(가) 최댓값 ${c.max}보다 큽니다`,
          });
        }
      }
    }

    // unique: 같은 컬럼에서 동일 값(빈값 제외)이 2개 이상이면 그 모든 행에 위반
    if (c.unique) {
      const counts = new Map<unknown, number>();
      for (const row of rows) {
        const value = row.data[col.name];
        if (isEmpty(value)) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      for (const row of rows) {
        const value = row.data[col.name];
        if (isEmpty(value)) continue;
        if ((counts.get(value) ?? 0) >= 2) {
          violations.push({
            row_id: row.id,
            column: col.name,
            rule: "unique",
            value,
            message: `${col.name} 값 "${String(value)}"이(가) 중복됩니다`,
          });
        }
      }
    }
  }

  return { violations, total: violations.length };
}
