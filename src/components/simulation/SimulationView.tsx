"use client";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Copy, Sparkles, Save, Plus, Swords, Calculator, FileDown } from "lucide-react";
import { Btn, ContentHeader, CsCodeBlock, Input, PanelHeader, PillTab, SectionLabel, Select, Tooltip } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { finalStat } from "@/lib/gamefn";
import { computeCurve } from "@/lib/curve/generate";

interface Table { id: string; name: string; }
interface Column { id: string; name: string; type: string; }
interface Simulation { id: string; name: string; description: string | null; formula_cs: string | null; input_tables: string | null; }
interface RowWithData { id: string; data: Record<string, unknown>; }

// ── 전투 계약 (21_combat_contract.md) ──────────────────────────────
interface Unit { name: string; hp: number; atk: number; def: number; speed: number; critRate?: number; critMult?: number; }
interface HpTracePoint { turn: number; attackerHp: number; defenderHp: number; }
interface CombatLogEntry { turn: number; actor: string; target: string; damage: number; crit: boolean; remainingHp: number; }
interface CombatResult {
  iterations: number;
  winRate: number;
  ci: { center: number; low: number; high: number };
  avgTurns: number;
  hpTrace: HpTracePoint[];
  log: CombatLogEntry[];
}

type Mode = "saved" | "stat" | "combat";

// 컬럼명에서 ATK/DEF/HP/SPEED 후보를 추정 (base_atk, atk_total, atk 등 모두 매칭)
function guessCol(cols: Column[], keys: string[]): string {
  const nums = cols.filter((c) => c.type === "number");
  // 정확/접미 우선 → 부분 일치
  for (const k of keys) {
    const exact = nums.find((c) => c.name.toLowerCase() === k);
    if (exact) return exact.name;
  }
  for (const k of keys) {
    const part = nums.find((c) => c.name.toLowerCase().includes(k));
    if (part) return part.name;
  }
  return "";
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function SimulationView({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<Mode>("saved");
  const [tables, setTables] = useState<Table[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Record<string, Column[]>>({});
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [formula, setFormula] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then(setTables);
    fetch(`/api/simulation?project_id=${projectId}`).then((r) => r.json()).then(setSimulations);
  }, [projectId]);

  useEffect(() => {
    if (selectedSimId) {
      const sim = simulations.find((s) => s.id === selectedSimId);
      if (sim?.formula_cs) setFormula(sim.formula_cs);
      else setFormula("");
      setSnapshot(null);
    } else {
      setFormula("");
      setSnapshot(null);
      setSelectedTables([]);
      setSelectedCols([]);
    }
  }, [selectedSimId, simulations]);

  const loadTableCols = async (tid: string) => {
    if (tableColumns[tid]) return;
    const d = await fetch(`/api/tables/${tid}`).then((r) => r.json());
    setTableColumns((prev) => ({ ...prev, [tid]: d.columns ?? [] }));
  };

  const toggleTable = (tid: string) => {
    if (selectedTables.includes(tid)) {
      setSelectedTables((prev) => prev.filter((t) => t !== tid));
    } else {
      setSelectedTables((prev) => [...prev, tid]);
      loadTableCols(tid);
    }
  };

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  };

  const runSim = async () => {
    setLoading(true);
    const res = await fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run", project_id: projectId, input_tables: selectedTables, target_columns: selectedCols }),
    });
    const d = await res.json();
    setSnapshot(d.snapshot);
    setFormula("// 데이터 스냅샷이 로드되었습니다.\n// Claude에게 이 시뮬레이션 결과를 바탕으로 Unity C# 수식을 도출해달라고 요청하세요.\n// MCP 툴: run_simulation → save_simulation");
    setLoading(false);
  };

  const saveSim = async () => {
    const name = prompt("시뮬레이션 이름:");
    if (!name) return;
    const s = await fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, name, input_tables: selectedTables, formula_cs: formula }),
    }).then((r) => r.json());
    setSimulations((prev) => [s, ...prev]);
  };

  const selectedSim = simulations.find((s) => s.id === selectedSimId);

  // 스냅샷에서 수식 검증용 샘플 입력 행 추출 (첫 입력 테이블 기준 상위 3행)
  const sampleCases = (() => {
    const firstTid = selectedTables[0];
    if (!snapshot || !firstTid) return [];
    const snap = (snapshot as Record<string, { rows?: { data: Record<string, unknown> }[] }>)[firstTid];
    if (!snap?.rows) return [];
    const cols = selectedCols.filter((c) => c.startsWith(`${firstTid}.`)).map((c) => c.split(".").slice(1).join("."));
    if (cols.length === 0) return [];
    return snap.rows.slice(0, 3).map((r) => ({
      label: String(r.data.name ?? r.data.id ?? "행"),
      values: cols.map((cn) => `${cn} ${typeof r.data[cn] === "number" ? (r.data[cn] as number).toLocaleString() : r.data[cn] ?? "—"}`).join(" · "),
    }));
  })();

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 좌측 시뮬레이션 목록 (저장된 시뮬 보존) */}
      <div className="w-[170px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
        <PanelHeader>
          시뮬레이션
          <button className="text-[#6b6b77] hover:text-[#ededed] transition-colors" onClick={() => { setMode("saved"); setSelectedSimId(null); }}><Plus size={13} /></button>
        </PanelHeader>
        <div className="overflow-auto flex-1">
          {simulations.map((s) => (
            <div
              key={s.id}
              onClick={() => { setMode("saved"); setSelectedSimId(s.id); }}
              className={`px-3 py-2.5 cursor-pointer border-l-2 ${mode === "saved" && selectedSimId === s.id ? "bg-[#1e1e24] border-[#8b5cf6]" : "border-transparent hover:bg-[#1e1e24]"}`}
            >
              <div className="text-xs font-medium text-[#ededed]">{s.name}</div>
              {s.description && <div className="text-[11px] text-[#6b6b77] mt-0.5">{s.description}</div>}
            </div>
          ))}
          <div className="px-3 py-2.5 text-xs text-[#4a4a55] cursor-pointer hover:bg-[#1e1e24]" onClick={() => { setMode("saved"); setSelectedSimId(null); }}>
            ＋ 새 시뮬레이션
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContentHeader title={mode === "stat" ? "스탯 계산기" : mode === "combat" ? "전투 시뮬레이션" : (selectedSim?.name ?? "새 시뮬레이션")}>
          <PillTab
            tabs={[{ id: "saved", label: "저장된 시뮬" }, { id: "stat", label: "스탯 계산기" }, { id: "combat", label: "전투 시뮬" }]}
            active={mode}
            onChange={(m) => setMode(m as Mode)}
          />
          {mode === "saved" && (
            <>
              <Tooltip label="재실행"><Btn onClick={() => setSelectedSimId(null)}><RotateCcw size={11} /></Btn></Tooltip>
              <Tooltip label="C# 코드 복사"><Btn variant="success" onClick={() => formula && navigator.clipboard.writeText(formula)}><Copy size={11} /></Btn></Tooltip>
            </>
          )}
        </ContentHeader>

        <div className="flex-1 overflow-auto p-5">
          {mode === "saved" && (
            <>
              {!selectedSimId && (
                <>
                  <SectionLabel>입력 조건</SectionLabel>
                  <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                    <div className="text-xs text-[#9a9aa3] leading-relaxed mb-2.5">참조할 테이블과 컬럼을 선택하고 AI 수식 도출을 클릭하세요.</div>
                    <div className="text-[11px] text-[#6b6b77] mb-1.5">테이블 선택</div>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {tables.map((t) => (
                        <span
                          key={t.id}
                          onClick={() => toggleTable(t.id)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer ${selectedTables.includes(t.id) ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                    {selectedTables.length > 0 && (
                      <>
                        <div className="text-[11px] text-[#6b6b77] mb-1.5">컬럼 선택</div>
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {selectedTables.flatMap((tid) =>
                            (tableColumns[tid] ?? []).filter((c) => c.type === "number").map((c) => {
                              const key = `${tid}.${c.name}`;
                              return (
                                <span
                                  key={key}
                                  onClick={() => toggleCol(key)}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer ${selectedCols.includes(key) ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}
                                >
                                  {tables.find((t) => t.id === tid)?.name}.{c.name}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                    <Btn variant="primary" onClick={runSim} disabled={loading || selectedTables.length === 0}>
                      <Sparkles size={11} />{loading ? "로딩 중..." : "AI 수식 도출"}
                    </Btn>
                  </div>
                </>
              )}

              <SectionLabel>도출된 수식</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-[#2a2a2f] flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#ededed]">Unity C#</span>
                  {selectedSim?.formula_cs && <span className="text-[10px] text-[#4ade80] font-medium">✓ 저장됨</span>}
                </div>
                <CsCodeBlock code={selectedSim?.formula_cs ?? formula ?? "// 시뮬레이션을 실행하면 Unity C# 수식이 여기에 표시됩니다."} />
                {sampleCases.length > 0 && (
                  <div className="border-t border-[#2a2a2f] px-4 py-3">
                    <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-wide mb-2">테스트 케이스 — 샘플 입력</div>
                    <div className="space-y-1">
                      {sampleCases.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] gap-3">
                          <span className="text-[#6b6b77] flex-shrink-0">{c.label}</span>
                          <span className="text-[#9a9aa3] font-medium text-right">{c.values}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {snapshot && (
                <div className="bg-[#1c1200] border border-[#f59e0b]/20 rounded-xl px-4 py-3 text-[11px] text-[#f59e0b] flex items-start gap-2 leading-relaxed">
                  <span className="flex-shrink-0">⚠</span>
                  <span>데이터 스냅샷이 로드되었습니다. Claude Code에서 MCP <code className="bg-[#0f0f10] px-1 rounded">run_simulation</code> 툴로 C# 수식을 도출하고 <code className="bg-[#0f0f10] px-1 rounded">save_simulation</code>으로 저장하세요.</span>
                </div>
              )}

              {snapshot && (
                <div className="mt-3 flex gap-2">
                  <Btn variant="primary" onClick={saveSim}><Save size={11} />저장</Btn>
                </div>
              )}
            </>
          )}

          {mode === "stat" && <StatCalculator tables={tables} />}
          {mode === "combat" && <CombatSim tables={tables} />}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// P2-2 스탯 계산기 (API 불필요 — 클라이언트 gamefn)
// 전개 테이블(level 컬럼 보유) 우선: 해당 level 행 스탯 × 강화.
// 없으면 메타 base_* + (곡선 파라미터 있으면 computeCurve) × 강화.
// ════════════════════════════════════════════════════════════════════
function StatCalculator({ tables }: { tables: Table[] }) {
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

// ════════════════════════════════════════════════════════════════════
// P2-3 전투 시뮬 (montecarlo API)
// ════════════════════════════════════════════════════════════════════
const EMPTY_UNIT: Unit = { name: "", hp: 5000, atk: 600, def: 250, speed: 110, critRate: 0, critMult: 1.5 };

function UnitForm({ title, unit, onChange, tables }: { title: string; unit: Unit; onChange: (u: Unit) => void; tables: Table[] }) {
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);

  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => setCols(d.columns ?? []));
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // 행 선택 시 추정 컬럼으로 Unit 프리필
  const prefill = (rid: string) => {
    const row = rows.find((r) => r.id === rid);
    if (!row) return;
    onChange({
      name: String(row.data.name ?? row.data.id ?? "유닛"),
      hp: num(row.data[guessCol(cols, ["hp", "health"])]),
      atk: num(row.data[guessCol(cols, ["atk", "attack", "power"])]),
      def: num(row.data[guessCol(cols, ["def", "defense", "armor"])]),
      speed: num(row.data[guessCol(cols, ["spd", "speed"])]) || 100,
      critRate: num(row.data[guessCol(cols, ["crit_rate", "critrate"])]) / 100 || 0,
      critMult: num(row.data[guessCol(cols, ["crit_dmg", "critmult", "crit_mult"])]) / 100 || 1.5,
    });
  };

  const set = (k: keyof Unit, v: number | string) => onChange({ ...unit, [k]: v });

  return (
    <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
      <div className="text-[12px] font-semibold text-[#ededed] mb-2.5">{title}</div>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">행에서 불러오기…</option>
          {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value="" onChange={(e) => prefill(e.target.value)} disabled={!tableId}>
          <option value="">— 행 선택 —</option>
          {rows.map((r) => <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <Input placeholder="이름" value={unit.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {([["HP", "hp"], ["ATK", "atk"], ["DEF", "def"], ["속도", "speed"]] as const).map(([label, k]) => (
            <div key={k}>
              <div className="text-[10px] text-[#6b6b77] mb-1">{label}</div>
              <Input type="number" value={unit[k] as number} onChange={(e) => set(k, Number(e.target.value) || 0)} />
            </div>
          ))}
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1">치명타율 (0~1)</div>
            <Input type="number" step={0.01} min={0} max={1} value={unit.critRate ?? 0} onChange={(e) => set("critRate", Number(e.target.value) || 0)} />
          </div>
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1">치명타 배율</div>
            <Input type="number" step={0.1} value={unit.critMult ?? 1.5} onChange={(e) => set("critMult", Number(e.target.value) || 1.5)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CombatSim({ tables }: { tables: Table[] }) {
  const [attacker, setAttacker] = useState<Unit>({ ...EMPTY_UNIT, name: "공격자" });
  const [defender, setDefender] = useState<Unit>({ ...EMPTY_UNIT, name: "방어자" });
  const [iterations, setIterations] = useState(1000);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "montecarlo", attacker: [attacker], defender: [defender], iterations, seed }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as CombatResult);
    } catch (e) {
      console.error("[montecarlo]", e);
      setError(e instanceof Error ? e.message : "전투 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 로그 export — DataEditor CSV/JSON 다운로드 패턴 재사용
  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  const exportCsv = () => {
    if (!result) return;
    const header = "turn,actor,target,damage,crit,remainingHp";
    const body = result.log.map((l) => `${l.turn},${l.actor},${l.target},${l.damage},${l.crit},${l.remainingHp}`).join("\n");
    download(`${header}\n${body}`, "combat_log.csv", "text/csv");
  };
  const exportJson = () => {
    if (!result) return;
    download(JSON.stringify(result.log, null, 2), "combat_log.json", "application/json");
  };

  const hpChart = result && result.hpTrace.length >= 2 ? {
    series: [
      { name: attacker.name || "공격자", color: "#8b5cf6", values: result.hpTrace.map((p) => p.attackerHp) },
      { name: defender.name || "방어자", color: "#f59e0b", values: result.hpTrace.map((p) => p.defenderHp) },
    ],
    xLabels: result.hpTrace.map((p) => `T${p.turn}`),
  } : null;

  return (
    <>
      <SectionLabel><Swords size={11} className="inline mr-1 -mt-0.5" />유닛 구성 (1:1)</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <UnitForm title="공격자" unit={attacker} onChange={setAttacker} tables={tables} />
        <UnitForm title="방어자" unit={defender} onChange={setDefender} tables={tables} />
      </div>

      <SectionLabel>실행 조건</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">반복 횟수</div>
            <Input type="number" min={1} max={100000} value={iterations} onChange={(e) => setIterations(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} />
            <div className="flex gap-1.5 mt-2">
              {[1000, 10000, 100000].map((n) => (
                <button key={n} onClick={() => setIterations(n)} className={`text-[11px] px-2.5 py-1 rounded-md border ${iterations === n ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}>{n >= 1000 ? `${n / 1000}k` : n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시드</div>
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          </div>
        </div>
        <Btn variant="primary" onClick={run} disabled={loading}><Swords size={11} />{loading ? "시뮬 중..." : "전투 시뮬 실행"}</Btn>
      </div>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && (
        <>
          <SectionLabel>결과</SectionLabel>
          {/* 승률 막대 + Wilson CI */}
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#6b6b77]">공격자 승률 ({result.iterations.toLocaleString()}회)</span>
              <span className="text-[18px] font-medium text-[#ededed]">{(result.winRate * 100).toFixed(1)}%</span>
            </div>
            <div className="relative h-4 bg-[#0f0f10] rounded-full overflow-hidden">
              {/* Wilson CI 구간 오버레이 */}
              <div className="absolute top-0 bottom-0 bg-[#7c3aed]/25" style={{ left: `${result.ci.low * 100}%`, width: `${(result.ci.high - result.ci.low) * 100}%` }} />
              {/* 승률(center) 막대 */}
              <div className="absolute top-0 bottom-0 left-0 bg-[#7c3aed]/70 rounded-full" style={{ width: `${result.winRate * 100}%` }} />
              {/* center 마커 */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-[#ededed]" style={{ left: `${result.ci.center * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6b6b77] mt-2">
              <span>95% CI [{(result.ci.low * 100).toFixed(1)}% – {(result.ci.high * 100).toFixed(1)}%]</span>
              <span>평균 턴 <span className="text-[#ededed] font-medium">{result.avgTurns.toFixed(1)}</span></span>
            </div>
          </div>

          {/* HP 추이 차트 */}
          {hpChart && (
            <>
              <SectionLabel>HP 추이 (대표 전투)</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={hpChart.series} xLabels={hpChart.xLabels} />
              </div>
            </>
          )}

          {/* 전투 로그 + export */}
          <div className="flex items-center justify-between mb-2.5 mt-5">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">전투 로그 (대표 전투 · {result.log.length}건)</div>
            <div className="flex gap-1.5">
              <Btn onClick={exportCsv}><FileDown size={11} />CSV</Btn>
              <Btn onClick={exportJson}><FileDown size={11} />JSON</Btn>
            </div>
          </div>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4 max-h-72 overflow-y-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#16161a]">
                <tr>
                  {["턴", "행동", "대상", "데미지", "치명", "남은 HP"].map((h) => (
                    <th key={h} className="px-2.5 py-1.5 text-left font-medium text-[#6b6b77] border-b border-[#2a2a2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.log.map((l, i) => (
                  <tr key={i} className="hover:bg-[#1a1a1c]">
                    <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#6b6b77]">{l.turn}</td>
                    <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#ededed]">{l.actor}</td>
                    <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#9a9aa3]">{l.target}</td>
                    <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#ededed]">{l.damage.toLocaleString()}</td>
                    <td className="px-2.5 py-1 border-b border-[#1f1f24]">{l.crit ? <span className="text-[#f59e0b] font-medium">CRIT</span> : <span className="text-[#4a4a55]">—</span>}</td>
                    <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#9a9aa3]">{l.remainingHp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
