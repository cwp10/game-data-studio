"use client";
import { useEffect, useState } from "react";
import { Sparkles, Save, Copy } from "lucide-react";
import { Btn, SectionLabel } from "@/components/ui";
import { EngineMode, ENGINE_LABELS, FormulaItem, generateEngineCode } from "@/lib/codegen/engineFormula";
import { Column, Simulation, Table } from "./types";

// ════════════════════════════════════════════════════════════════════
// 저장된 시뮬 / AI 수식 도출 패널 (saved 모드)
// 입력 조건(테이블·컬럼 선택) → /api/simulation {action:"run"} → 도출된 수식 + 엔진 코드.
// formula/setFormula 는 헤더 복사 버튼이 참조하므로 SimulationView(shell)가 소유 → props.
// ════════════════════════════════════════════════════════════════════
export function SavedSimPanel({
  projectId, tables, selectedSimId, simulations, setSimulations, formula, setFormula,
}: {
  projectId: string;
  tables: Table[];
  selectedSimId: string | null;
  simulations: Simulation[];
  setSimulations: React.Dispatch<React.SetStateAction<Simulation[]>>;
  formula: string;
  setFormula: (f: string) => void;
}) {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Record<string, Column[]>>({});
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [formulaData, setFormulaData] = useState<FormulaItem[]>([]);
  const [engineMode, setEngineMode] = useState<EngineMode>("plain");
  const [loading, setLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFormula(d.formula ?? "수식을 도출하지 못했습니다. 컬럼을 2개 이상 선택해주세요.");
    setFormulaData(Array.isArray(d.formulaData) ? d.formulaData : []);
    setEngineMode("plain");
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
        {/* 헤더: 엔진 선택 버튼 그룹 + 저장됨 배지 + 복사 버튼 */}
        <div className="px-4 py-2.5 border-b border-[#2a2a2f] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(ENGINE_LABELS) as EngineMode[]).map((eng) => (
              <button
                key={eng}
                onClick={() => setEngineMode(eng)}
                className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-colors ${engineMode === eng ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-transparent border-[#2a2a2f] text-[#6b6b77] hover:border-[#4a4a55] hover:text-[#9a9aa3]"}`}
              >
                {ENGINE_LABELS[eng]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {selectedSim?.formula_cs && <span className="text-[10px] text-[#4ade80] font-medium">✓ 저장됨</span>}
            <button
              onClick={() => {
                const code = engineMode === "plain"
                  ? (selectedSim?.formula_cs ?? formula)
                  : generateEngineCode(formulaData, engineMode);
                if (code) navigator.clipboard.writeText(code);
              }}
              className="text-[10px] px-2 py-1 rounded border border-[#2a2a2f] text-[#6b6b77] hover:text-[#ededed] hover:border-[#4a4a55] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Copy size={10} />복사
            </button>
          </div>
        </div>
        {/* 수식 내용 */}
        {engineMode === "plain" ? (
          <pre className="px-4 py-3 text-[12px] text-[#c4b5fd] whitespace-pre-wrap leading-relaxed font-mono">{selectedSim?.formula_cs ?? formula ?? "시뮬레이션을 실행하면 수식이 여기에 표시됩니다."}</pre>
        ) : (
          <pre className="px-4 py-3 text-[12px] text-[#86efac] whitespace-pre-wrap leading-relaxed font-mono">
            {formulaData.length > 0
              ? generateEngineCode(formulaData, engineMode)
              : "수식 도출 후 엔진 코드를 확인할 수 있습니다."}
          </pre>
        )}
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
        <div className="mt-3 flex gap-2">
          <Btn variant="primary" onClick={saveSim}><Save size={11} />저장</Btn>
        </div>
      )}
    </>
  );
}
