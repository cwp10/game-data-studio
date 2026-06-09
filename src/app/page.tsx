"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ProjectHome } from "@/components/project/ProjectHome";
import { SchemaEditor } from "@/components/schema/SchemaEditor";
import { DataEditor } from "@/components/editor/DataEditor";
import { BalancePanel } from "@/components/balance/BalancePanel";
import { SimulationView } from "@/components/simulation/SimulationView";
import { MemoryView } from "@/components/memory/MemoryView";
import { TypeRegistry } from "@/components/types/TypeRegistry";
import { EconomySim } from "@/components/economy/EconomySim";

export type Screen = "home" | "schema" | "editor" | "balance" | "simulation" | "memory" | "types" | "economy";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  const navigate = (s: Screen, pid?: string, pname?: string) => {
    if (pid) setProjectId(pid);
    if (pname) setProjectName(pname);
    setScreen(s);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f10]">
      {/* macOS titlebar */}
      <div className="h-9 bg-[#0f0f10] border-b border-[#2a2a2f] flex items-center px-3 gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#E24B4A]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#EF9F27]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#639922]" />
        <span className="text-xs text-[#4a4a55] ml-2">
          Game Data Studio{projectId && projectName ? ` — ${projectName}` : ""}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={screen} onChange={(s) => setScreen(s)} />

        <div className="flex flex-1 overflow-hidden">
          {screen === "home" && <ProjectHome onNavigate={navigate} />}
          {screen === "schema" && projectId && <SchemaEditor projectId={projectId} />}
          {screen === "editor" && projectId && <DataEditor projectId={projectId} onNavigate={(s) => setScreen(s)} />}
          {screen === "balance" && projectId && <BalancePanel projectId={projectId} onNavigate={(s) => setScreen(s)} />}
          {screen === "simulation" && projectId && <SimulationView projectId={projectId} />}
          {screen === "memory" && projectId && <MemoryView projectId={projectId} />}
          {screen === "types" && projectId && <TypeRegistry projectId={projectId} />}
          {screen === "economy" && projectId && <EconomySim projectId={projectId} />}
          {screen !== "home" && !projectId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#16161a] border border-[#2a2a2f] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a4a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#6b6b77] mb-1">프로젝트를 선택하세요</div>
                <div className="text-[11px] text-[#3a3a42]">홈에서 프로젝트를 선택하면 이 화면이 열립니다</div>
              </div>
              <button
                onClick={() => setScreen("home")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2f] text-[11px] text-[#6b6b77] hover:bg-[#1a1a1c] hover:text-[#9a9aa3] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                프로젝트 목록
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
