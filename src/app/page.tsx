"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ProjectHome } from "@/components/project/ProjectHome";
import { SchemaEditor } from "@/components/schema/SchemaEditor";
import { DataEditor } from "@/components/editor/DataEditor";
import { BalancePanel } from "@/components/balance/BalancePanel";
import { SimulationView } from "@/components/simulation/SimulationView";

export type Screen = "home" | "schema" | "editor" | "balance" | "simulation";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [projectId, setProjectId] = useState<string | null>(null);

  const navigate = (s: Screen, pid?: string) => {
    if (pid) setProjectId(pid);
    setScreen(s);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f10]">
      {/* macOS titlebar */}
      <div className="h-9 bg-[#0f0f10] border-b border-[#2a2a2f] flex items-center px-3 gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#E24B4A]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#EF9F27]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#639922]" />
        <span className="text-xs text-[#6b6b77] ml-2">Game Data Studio{projectId && screen !== "home" ? " — " + screen : ""}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={screen} onChange={(s) => setScreen(s)} />

        <div className="flex flex-1 overflow-hidden">
          {screen === "home" && <ProjectHome onNavigate={navigate} />}
          {screen === "schema" && projectId && <SchemaEditor projectId={projectId} />}
          {screen === "editor" && projectId && <DataEditor projectId={projectId} />}
          {screen === "balance" && projectId && <BalancePanel projectId={projectId} onNavigate={(s) => setScreen(s)} />}
          {screen === "simulation" && projectId && <SimulationView projectId={projectId} />}
          {screen !== "home" && !projectId && (
            <div className="flex-1 flex items-center justify-center text-[#4a4a55] text-sm">
              프로젝트를 먼저 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
