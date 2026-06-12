"use client";
import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Input, SectionLabel, Select } from "@/components/ui";
import { finalStat } from "@/lib/gamefn";
import { computeCurve } from "@/lib/curve/generate";
import { Column, RowWithData, Table, guessCol, num } from "./types";

// ════════════════════════════════════════════════════════════════════
// P2-2 스탯 계산기 (API 불필요 — 클라이언트 gamefn)
// 전개 테이블(level 컬럼 보유) 우선: 해당 level 행 스탯 × 강화.
// 없으면 메타 base_* + (곡선 파라미터 있으면 computeCurve) × 강화.
// ════════════════════════════════════════════════════════════════════
export function StatCalcPanel({ tables }: { tables: Table[] }) {
  const [tableId, setTableId] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [rowId, setRowId] = useState("");
  const [atkCol, setAtkCol] = useState("");
  const [defCol, setDefCol] = useState("");
  const [hpCol, setHpCol] = useState("");
  const [levelCol, setLevelCol] = useState("");
  const [level, setLevel] = useState(50);
  const [enhance, setEnhance] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const isExpanded = !!levelCol;

  // 테이블 선택 → 컬럼/행 로드 + ATK/DEF/HP/level 추정
  useEffect(() => {
    if (!tableId) { setColumns([]); setRows([]); setRowId(""); return; }
    setError(null);
    fetch(`/api/tables/${tableId}`)
      .then((r) => r.json())
      .then((d) => {
        const cols: Column[] = d.columns ?? [];
        setColumns(cols);
        setAtkCol(guessCol(cols, ["atk", "attack", "power"]));
        setDefCol(guessCol(cols, ["def", "defense", "armor"]));
        setHpCol(guessCol(cols, ["hp", "health", "life"]));
        const lvl = cols.find((c) => c.type === "number" && c.name.toLowerCase() === "level");
        setLevelCol(lvl?.name ?? "");
      })
      .catch((e) => setError(String(e)));
    fetch(`/api/rows?table_id=${tableId}`)
      .then((r) => r.json())
      .then((d: RowWithData[]) => { setRows(Array.isArray(d) ? d : []); setRowId(""); })
      .catch((e) => setError(String(e)));
  }, [tableId]);

  const selectedRow = rows.find((r) => r.id === rowId);

  // 비교 결과: { 기준값(Lv1 또는 강화×1), 선택값(LvN 또는 강화×N) }
  const result = useMemo(() => {
    if (isExpanded) {
      // 전개 테이블: level==1 행과 level==N 행을 직접 조회 → 강화만 적용
      const rowAt = (lv: number) => rows.find((r) => num(r.data[levelCol]) === lv);
      const r1 = rowAt(1);
      const rN = rowAt(level) ?? selectedRow;
      if (!rN) return null;
      const stat = (row: RowWithData | undefined, mult: number) =>
        row ? {
          atk: Math.round(finalStat(num(row.data[atkCol]), 1, mult)),
          def: Math.round(finalStat(num(row.data[defCol]), 1, mult)),
          hp: Math.round(finalStat(num(row.data[hpCol]), 1, mult)),
        } : null;
      return {
        baseLabel: "Lv1",
        finalLabel: `Lv${level}`,
        base: stat(r1, enhance),
        final: stat(rN, enhance),
      };
    }
    // 메타 테이블: base_* 그대로 × 강화. (곡선 파라미터 없음 → levelMult=1)
    // computeCurve 는 테이블이 곡선 파라미터(base/factor/type)를 직접 보유할 때만 사용.
    if (!selectedRow) return null;
    const baseAtk = num(selectedRow.data[atkCol]);
    const baseDef = num(selectedRow.data[defCol]);
    const baseHp = num(selectedRow.data[hpCol]);
    // 곡선 파라미터(growth_factor + growth_type) 보유 시 레벨 보정 산출
    const factor = num(selectedRow.data["growth_factor"]);
    const ctype = String(selectedRow.data["growth_type"] ?? "");
    const levelMult = (factor > 0 && (ctype === "linear" || ctype === "power" || ctype === "exponential"))
      ? computeCurve({ type: ctype, base: 1, factor, count: level, round: false })[level - 1] ?? 1
      : 1;
    return {
      baseLabel: "강화 ×1",
      finalLabel: `강화 ×${enhance}`,
      base: { atk: Math.round(finalStat(baseAtk, levelMult, 1)), def: Math.round(finalStat(baseDef, levelMult, 1)), hp: Math.round(finalStat(baseHp, levelMult, 1)) },
      final: { atk: Math.round(finalStat(baseAtk, levelMult, enhance)), def: Math.round(finalStat(baseDef, levelMult, enhance)), hp: Math.round(finalStat(baseHp, levelMult, enhance)) },
    };
  }, [isExpanded, rows, selectedRow, levelCol, atkCol, defCol, hpCol, level, enhance]);

  return (
    <>
      {error && <div className="text-[11px] text-[#f87171] mb-3">{error}</div>}
      <SectionLabel><Calculator size={11} className="inline mr-1 -mt-0.5" />최종 스탯 계산</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">테이블</div>
            <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
              <option value="">— 선택 —</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">행 {isExpanded && <span className="text-[#8b5cf6]">· 전개 테이블</span>}</div>
            <Select value={rowId} onChange={(e) => setRowId(e.target.value)} disabled={!tableId}>
              <option value="">— 선택 —</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>)}
            </Select>
          </div>
        </div>

        {columns.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {([["ATK", atkCol, setAtkCol], ["DEF", defCol, setDefCol], ["HP", hpCol, setHpCol]] as const).map(([label, val, setter]) => (
              <div key={label}>
                <div className="text-[11px] text-[#6b6b77] mb-1.5">{label} 컬럼</div>
                <Select value={val} onChange={(e) => setter(e.target.value)}>
                  <option value="">—</option>
                  {columns.filter((c) => c.type === "number").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">레벨{isExpanded ? " (전개 행 조회)" : " (곡선 보정)"}</div>
            <Input type="number" min={1} value={level} onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">강화 배율</div>
            <Input type="number" min={0} step={0.1} value={enhance} onChange={(e) => setEnhance(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
      </div>

      {result && result.base && result.final && (
        <>
          <SectionLabel>비교 — {result.baseLabel} vs {result.finalLabel}</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            {([["ATK", "atk"], ["DEF", "def"], ["HP", "hp"]] as const).map(([label, key]) => {
              const b = result.base![key];
              const f = result.final![key];
              const delta = b > 0 ? Math.round((f / b - 1) * 100) : 0;
              return (
                <div key={label} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3">
                  <div className="text-[11px] text-[#6b6b77] mb-1">{label}</div>
                  <div className="text-[22px] font-medium text-[#ededed] leading-tight">{f.toLocaleString()}</div>
                  <div className="text-[11px] text-[#6b6b77] mt-1.5">{result.baseLabel} {b.toLocaleString()}</div>
                  {delta !== 0 && <div className={`text-[11px] mt-0.5 font-medium ${delta > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{delta > 0 ? "+" : ""}{delta}%</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {tableId && !result && <div className="text-[11px] text-[#6b6b77]">행과 ATK/DEF/HP 컬럼을 선택하세요.</div>}
    </>
  );
}
