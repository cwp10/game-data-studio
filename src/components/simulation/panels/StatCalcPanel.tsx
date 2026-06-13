"use client";
import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Input, SectionLabel, Select } from "@/components/ui";
import { finalStat } from "@/lib/gamefn";
import { computeCurve } from "@/lib/curve/generate";
import { Column, RowWithData, Table, num } from "./types";

// ════════════════════════════════════════════════════════════════════
// P2-2 스탯 계산기 — number 타입 컬럼 전체 자동 감지
// 전개 테이블(level 컬럼 보유): 해당 level 행 스탯 × 강화.
// 메타 테이블: base_* + growth 파라미터 있으면 computeCurve × 강화.
// ════════════════════════════════════════════════════════════════════
export function StatCalcPanel({ tables }: { tables: Table[] }) {
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [rowId, setRowId] = useState("");
  const [statCols, setStatCols] = useState<string[]>([]);
  const [levelCol, setLevelCol] = useState("");
  const [level, setLevel] = useState(50);
  const [enhanceStage, setEnhanceStage] = useState(0);
  const [bonusPct, setBonusPct] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const isExpanded = !!levelCol;

  useEffect(() => {
    if (!tableId) { setRows([]); setRowId(""); setStatCols([]); setLevelCol(""); return; }
    setError(null);
    fetch(`/api/tables/${tableId}`)
      .then((r) => r.json())
      .then((d) => {
        const cols: Column[] = d.columns ?? [];
        const lvl = cols.find((c) => c.type === "number" && c.name.toLowerCase() === "level");
        const lvlName = lvl?.name ?? "";
        setLevelCol(lvlName);
        // level 컬럼만 제외하고 number 타입 컬럼 전체를 스탯으로 사용
        setStatCols(cols.filter((c) => c.type === "number" && c.name !== lvlName).map((c) => c.name));
      })
      .catch((e) => setError(String(e)));
    fetch(`/api/rows?table_id=${tableId}`)
      .then((r) => r.json())
      .then((d: RowWithData[]) => { setRows(Array.isArray(d) ? d : []); setRowId(""); })
      .catch((e) => setError(String(e)));
  }, [tableId]);

  const selectedRow = rows.find((r) => r.id === rowId);

  const enhanceMult = 1 + enhanceStage * (bonusPct / 100);

  const result = useMemo(() => {
    if (statCols.length === 0) return null;

    const statAt = (row: RowWithData | undefined, levelMult: number, enhanceMult: number) => {
      if (!row) return null;
      const out: Record<string, number> = {};
      for (const col of statCols) {
        out[col] = Math.round(finalStat(num(row.data[col]), levelMult, enhanceMult));
      }
      return out;
    };

    if (isExpanded) {
      const rowAt = (lv: number) => rows.find((r) => num(r.data[levelCol]) === lv);
      const r1 = rowAt(1);
      const rN = rowAt(level) ?? selectedRow;
      if (!rN) return null;
      return {
        baseLabel: "Lv1",
        finalLabel: `Lv${level}`,
        base: statAt(r1, 1, enhanceMult),
        final: statAt(rN, 1, enhanceMult),
      };
    }

    if (!selectedRow) return null;
    const factor = num(selectedRow.data["growth_factor"]);
    const ctype = String(selectedRow.data["growth_type"] ?? "");
    const levelMult =
      factor > 0 && (ctype === "linear" || ctype === "power" || ctype === "exponential")
        ? computeCurve({ type: ctype, base: 1, factor, count: level, round: false })[level - 1] ?? 1
        : 1;
    return {
      baseLabel: "+0강",
      finalLabel: `+${enhanceStage}강`,
      base: statAt(selectedRow, levelMult, 1),
      final: statAt(selectedRow, levelMult, enhanceMult),
    };
  }, [isExpanded, rows, selectedRow, levelCol, statCols, level, enhanceMult, enhanceStage]);

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
            <div className="text-[11px] text-[#6b6b77] mb-1.5">
              행 {isExpanded && <span className="text-[#8b5cf6]">· 전개 테이블</span>}
            </div>
            <Select value={rowId} onChange={(e) => setRowId(e.target.value)} disabled={!tableId}>
              <option value="">— 선택 —</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">
              레벨{isExpanded ? " (전개 행 조회)" : " (곡선 보정)"}
            </div>
            <Input
              type="number"
              min={1}
              value={level}
              onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">강화 단계</div>
            <Input
              type="number"
              min={0}
              value={enhanceStage}
              onChange={(e) => setEnhanceStage(Math.max(0, Number(e.target.value) || 0))}
              placeholder="+0강"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">단계당 보너스 (%)</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={bonusPct}
              onChange={(e) => setBonusPct(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="flex flex-col justify-end pb-0.5">
            <div className="text-[10px] text-[#6b6b77] mb-1">강화 배율 (계산값)</div>
            <div className="text-[14px] font-medium text-[#c4b5fd]">
              ×{enhanceMult.toFixed(2)}
              {enhanceStage > 0 && (
                <span className="text-[11px] text-[#6b6b77] ml-1.5">
                  +{Math.round((enhanceMult - 1) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {statCols.length > 0 && (
          <div className="text-[10px] text-[#4a4a55]">
            스탯 컬럼 <span className="text-[#9a9aa3]">{statCols.length}개</span>
            {" — "}{statCols.join(", ")}
            {levelCol && <span className="ml-2 text-[#8b5cf6]">/ 레벨: {levelCol}</span>}
          </div>
        )}
      </div>

      {result && result.base && result.final && (
        <>
          <SectionLabel>비교 — {result.baseLabel} vs {result.finalLabel}</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            {statCols.map((col) => {
              const b = result.base![col] ?? 0;
              const f = result.final![col] ?? 0;
              const delta = b > 0 ? Math.round((f / b - 1) * 100) : 0;
              return (
                <div key={col} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3">
                  <div className="text-[11px] text-[#6b6b77] mb-1">{col}</div>
                  <div className="text-[22px] font-medium text-[#ededed] leading-tight">{f.toLocaleString()}</div>
                  <div className="text-[11px] text-[#6b6b77] mt-1.5">{result.baseLabel} {b.toLocaleString()}</div>
                  {delta !== 0 && (
                    <div className={`text-[11px] mt-0.5 font-medium ${delta > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                      {delta > 0 ? "+" : ""}{delta}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {tableId && !result && (
        <div className="text-[11px] text-[#6b6b77]">행을 선택하면 스탯을 계산합니다.</div>
      )}
    </>
  );
}
