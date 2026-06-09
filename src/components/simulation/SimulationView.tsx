"use client";
import { useEffect, useState } from "react";
import { Btn, ContentHeader, CsCodeBlock, PanelHeader, SectionLabel } from "@/components/ui";

interface Table { id: string; name: string; }
interface Column { id: string; name: string; type: string; }
interface Simulation { id: string; name: string; description: string | null; formula_cs: string | null; input_tables: string | null; }

export function SimulationView({ projectId }: { projectId: string }) {
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

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 좌측 시뮬레이션 목록 */}
      <div className="w-[200px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
        <PanelHeader>
          시뮬레이션
          <button className="text-sm font-normal cursor-pointer text-[#6b6b77] hover:text-[#ededed]" onClick={() => setSelectedSimId(null)}>＋</button>
        </PanelHeader>
        <div className="overflow-auto flex-1">
          {simulations.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSimId(s.id)}
              className={`px-3 py-2.5 cursor-pointer border-l-2 ${selectedSimId === s.id ? "bg-[#1e1e24] border-[#8b5cf6]" : "border-transparent hover:bg-[#1e1e24]"}`}
            >
              <div className="text-xs font-medium text-[#ededed]">{s.name}</div>
              {s.description && <div className="text-[11px] text-[#6b6b77] mt-0.5">{s.description}</div>}
            </div>
          ))}
          <div className="px-3 py-2.5 text-xs text-[#4a4a55] cursor-pointer hover:bg-[#1e1e24]" onClick={() => setSelectedSimId(null)}>
            ＋ 새 시뮬레이션
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContentHeader title={selectedSim?.name ?? "새 시뮬레이션"}>
          <Btn onClick={() => setSelectedSimId(null)}>↺ 재실행</Btn>
          <Btn variant="success" onClick={() => formula && navigator.clipboard.writeText(formula)}>⎘ C# 복사</Btn>
        </ContentHeader>

        <div className="flex-1 overflow-auto p-4">
          {!selectedSimId && (
            <>
              <SectionLabel>입력 조건</SectionLabel>
              <div className="bg-[#1a1a1c] border border-[#2a2a2f] rounded-lg p-3.5 mb-3">
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
                  {loading ? "로딩 중..." : "✦ AI 수식 도출"}
                </Btn>
              </div>
            </>
          )}

          <SectionLabel>도출된 수식</SectionLabel>
          <div className="bg-[#1a1a1c] border border-[#2a2a2f] rounded-lg overflow-hidden mb-3">
            <div className="px-3.5 py-2.5 border-b border-[#2a2a2f] bg-[#16161a] flex items-center justify-between">
              <span className="text-xs font-medium text-[#ededed]">Unity C#</span>
              {selectedSim?.formula_cs && <span className="text-[10px] text-[#4ade80]">✓ 저장됨</span>}
            </div>
            <CsCodeBlock code={selectedSim?.formula_cs ?? formula ?? "// 시뮬레이션을 실행하면 Unity C# 수식이 여기에 표시됩니다."} />
          </div>

          {snapshot && (
            <div className="bg-[#2d1a00] rounded-md px-3 py-2 text-[11px] text-[#f59e0b] flex items-start gap-1.5">
              ⚠ 데이터 스냅샷이 로드되었습니다. Claude Code에서 MCP run_simulation 툴로 C# 수식을 도출하고 save_simulation으로 저장하세요.
            </div>
          )}

          {snapshot && (
            <div className="mt-3 flex gap-2">
              <Btn variant="primary" onClick={saveSim}>💾 저장</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
