export interface RowDiff {
  row_id: string;
  type: "added" | "removed" | "changed";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedKeys: string[];
}

export interface DiffResult {
  added: number;
  removed: number;
  changed: number;
  rows: RowDiff[];
}

// a=이전 스냅샷, b=이후 스냅샷. 행 id 기준으로 added/removed/changed 분류한다.
export function diffSnapshots(
  a: Array<{ id: string; data: Record<string, unknown> }>,
  b: Array<{ id: string; data: Record<string, unknown> }>
): DiffResult {
  const mapA = new Map(a.map((r) => [r.id, r.data]));
  const mapB = new Map(b.map((r) => [r.id, r.data]));

  const rows: RowDiff[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  // a에 있는 행: removed 또는 changed
  for (const [id, dataA] of mapA) {
    const dataB = mapB.get(id);
    if (dataB === undefined) {
      rows.push({ row_id: id, type: "removed", before: dataA, after: null, changedKeys: [] });
      removed++;
      continue;
    }
    const keys = new Set([...Object.keys(dataA), ...Object.keys(dataB)]);
    const changedKeys: string[] = [];
    for (const k of keys) {
      if (JSON.stringify(dataA[k]) !== JSON.stringify(dataB[k])) changedKeys.push(k);
    }
    if (changedKeys.length > 0) {
      rows.push({ row_id: id, type: "changed", before: dataA, after: dataB, changedKeys });
      changed++;
    }
  }

  // b에만 있는 행: added
  for (const [id, dataB] of mapB) {
    if (!mapA.has(id)) {
      rows.push({ row_id: id, type: "added", before: null, after: dataB, changedKeys: [] });
      added++;
    }
  }

  return { added, removed, changed, rows };
}
