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
    <div className="w-[168px] bg-[#16161a] border-r border-[#2a2a2f] flex flex-col flex-shrink-0">
      {/* 헤더 */}
      <div className="px-4 py-4 border-b border-[#2a2a2f] flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-[#7c3aed] flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">GD</span>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#ededed] leading-tight">Game Data</div>
          <div className="text-[10px] text-[#4a4a55] leading-tight">Studio</div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col pt-2 flex-1">
        {NAV.map(({ id, Icon, label }, i) => (
          <div key={id} className="contents">
            <button
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-2 transition-colors ${
                current === id
                  ? "bg-[#1e1e24] text-[#ededed] border-[#7c3aed]"
                  : "text-[#6b6b77] border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3]"
              }`}
            >
              <Icon size={16} className={current === id ? "text-[#8b5cf6]" : ""} />
              <span className="text-[12px]">{label}</span>
            </button>
            {/* 프로젝트 홈 아래 구분선 */}
            {i === 0 && <div className="mx-4 my-1.5 h-px bg-[#2a2a2f]" />}
          </div>
        ))}
      </nav>

      {/* 하단 설정 */}
      <div className="border-t border-[#2a2a2f] pb-2 pt-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#6b6b77] border-l-2 border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3] transition-colors">
          <Settings size={16} />
          <span className="text-[12px]">설정</span>
        </button>
      </div>
    </div>
  );
}
