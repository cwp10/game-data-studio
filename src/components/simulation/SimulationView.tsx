"use client";
import { useEffect, useState } from "react";
import { RotateCcw, Copy, Plus, Trash2 } from "lucide-react";
import { Btn, ContentHeader, PanelHeader, PillTab, Tooltip } from "@/components/ui";
import { Simulation, Table } from "./panels/types";
import { SavedSimPanel } from "./panels/SavedSimPanel";
import { StatCalcPanel } from "./panels/StatCalcPanel";
import { CombatSimPanel } from "./panels/CombatSimPanel";
import { GachaSimPanel } from "./panels/GachaSimPanel";
import { DpsSimPanel } from "./panels/DpsSimPanel";
import { DifficultySimPanel } from "./panels/DifficultySimPanel";
import { PacingSimPanel } from "./panels/PacingSimPanel";

type Mode = "saved" | "stat" | "combat" | "gacha" | "dps" | "difficulty" | "pacing";

export function SimulationView({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<Mode>("saved");
  const [tables, setTables] = useState<Table[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  // formula 는 헤더 복사 버튼이 참조 → shell 소유, SavedSimPanel 에 props 로 전달
  const [formula, setFormula] = useState("");

  useEffect(() => {
    fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then(setTables);
    fetch(`/api/simulation?project_id=${projectId}`).then((r) => r.json()).then(setSimulations);
  }, [projectId]);

  const deleteSim = async (id: string) => {
    if (!confirm("이 시뮬레이션을 삭제하시겠습니까?")) return;
    await fetch(`/api/simulation?id=${id}`, { method: "DELETE" });
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (selectedSimId === id) setSelectedSimId(null);
  };

  const selectedSim = simulations.find((s) => s.id === selectedSimId);

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
              className={`group px-3 py-2.5 cursor-pointer border-l-2 flex items-start justify-between gap-1 ${mode === "saved" && selectedSimId === s.id ? "bg-[#1e1e24] border-[#8b5cf6]" : "border-transparent hover:bg-[#1e1e24]"}`}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#ededed] truncate">{s.name}</div>
                {s.description && <div className="text-[11px] text-[#6b6b77] mt-0.5 truncate">{s.description}</div>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSim(s.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-[#6b6b77] hover:text-[#f87171] mt-0.5"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="px-3 py-2.5 text-xs text-[#4a4a55] cursor-pointer hover:bg-[#1e1e24]" onClick={() => { setMode("saved"); setSelectedSimId(null); }}>
            ＋ 새 시뮬레이션
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContentHeader title={mode === "stat" ? "스탯 계산기" : mode === "combat" ? "전투 시뮬레이션" : mode === "gacha" ? "가챠 시뮬레이션" : mode === "dps" ? "DPS 빌드 비교" : mode === "difficulty" ? "난이도 곡선" : mode === "pacing" ? "진척도 페이싱" : (selectedSim?.name ?? "새 시뮬레이션")}>
          <PillTab
            tabs={[{ id: "saved", label: "저장된 시뮬" }, { id: "stat", label: "스탯 계산기" }, { id: "combat", label: "전투 시뮬" }, { id: "gacha", label: "가챠" }, { id: "dps", label: "DPS" }, { id: "difficulty", label: "난이도" }, { id: "pacing", label: "페이싱" }]}
            active={mode}
            onChange={(m) => setMode(m as Mode)}
          />
          {mode === "saved" && (
            <>
              <Tooltip label="재실행"><Btn onClick={() => setSelectedSimId(null)}><RotateCcw size={11} /></Btn></Tooltip>
              <Tooltip label="수식 복사"><Btn variant="success" onClick={() => formula && navigator.clipboard.writeText(formula)}><Copy size={11} /></Btn></Tooltip>
            </>
          )}
        </ContentHeader>

        <div className="flex-1 overflow-auto p-5">
          {mode === "saved" && (
            <SavedSimPanel
              projectId={projectId}
              tables={tables}
              selectedSimId={selectedSimId}
              simulations={simulations}
              setSimulations={setSimulations}
              formula={formula}
              setFormula={setFormula}
            />
          )}
          {mode === "stat" && <StatCalcPanel tables={tables} />}
          {mode === "combat" && <CombatSimPanel tables={tables} />}
          {mode === "gacha" && <GachaSimPanel tables={tables} />}
          {mode === "dps" && <DpsSimPanel tables={tables} />}
          {mode === "difficulty" && <DifficultySimPanel tables={tables} />}
          {mode === "pacing" && <PacingSimPanel tables={tables} />}
        </div>
      </div>
    </div>
  );
}
