"use client";
import { type Screen } from "@/app/page";

const NAV: { id: Screen; icon: string; label: string }[] = [
  { id: "home", icon: "⌂", label: "프로젝트" },
  { id: "schema", icon: "⊞", label: "스키마" },
  { id: "editor", icon: "▤", label: "데이터" },
  { id: "balance", icon: "▦", label: "밸런싱" },
  { id: "simulation", icon: "▷", label: "시뮬레이션" },
];

export function Sidebar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <div className="w-[160px] bg-[#16161a] border-r border-[#2a2a2f] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-[#2a2a2f]">
        <div className="text-[11px] font-semibold text-[#ededed] tracking-wide uppercase">Game Data</div>
        <div className="text-[10px] text-[#4a4a55] mt-0.5">Studio</div>
      </div>

      <nav className="flex flex-col py-2 flex-1">
        {NAV.map((n) => (
          <button
            key={n.id}
            title={n.label}
            onClick={() => onChange(n.id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-l-2 transition-colors ${
              current === n.id
                ? "bg-[#1e1e24] text-[#ededed] border-[#8b5cf6]"
                : "text-[#6b6b77] border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3]"
            }`}
          >
            <span className={`text-sm flex-shrink-0 ${current === n.id ? "text-[#8b5cf6]" : ""}`}>{n.icon}</span>
            <span className="text-xs">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-[#2a2a2f] py-2">
        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#6b6b77] border-l-2 border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3] transition-colors">
          <span className="text-sm flex-shrink-0">⚙</span>
          <span className="text-xs">설정</span>
        </button>
      </div>
    </div>
  );
}
