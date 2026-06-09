"use client";
import { Home, Table2, Database, BarChart2, Play, Settings } from "lucide-react";
import { type Screen } from "@/app/page";

const NAV: { id: Screen; Icon: React.ElementType; label: string }[] = [
  { id: "home",       Icon: Home,      label: "프로젝트" },
  { id: "schema",     Icon: Table2,    label: "스키마" },
  { id: "editor",     Icon: Database,  label: "데이터" },
  { id: "balance",    Icon: BarChart2, label: "밸런싱" },
  { id: "simulation", Icon: Play,      label: "시뮬레이션" },
];

export function Sidebar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <div className="w-[160px] bg-[#16161a] border-r border-[#2a2a2f] flex flex-col flex-shrink-0">
      <div className="px-4 py-3.5 border-b border-[#2a2a2f]">
        <div className="text-[11px] font-semibold text-[#ededed] tracking-wide">Game Data</div>
        <div className="text-[10px] text-[#3a3a42] mt-0.5">Studio</div>
      </div>

      <nav className="flex flex-col py-1.5 flex-1">
        {NAV.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-l-2 transition-colors ${
              current === id
                ? "bg-[#1e1e24] text-[#ededed] border-[#7c3aed]"
                : "text-[#6b6b77] border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3]"
            }`}
          >
            <Icon size={14} className={current === id ? "text-[#7c3aed]" : ""} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-[#2a2a2f] py-1.5">
        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#6b6b77] border-l-2 border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3] transition-colors">
          <Settings size={14} />
          <span className="text-xs">설정</span>
        </button>
      </div>
    </div>
  );
}
