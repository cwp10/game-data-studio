"use client";
import { useState } from "react";
import { Home, Table2, Database, BarChart2, Play, Settings, NotebookText, Tags, Coins, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type Screen } from "@/app/page";

const NAV: { id: Screen; Icon: React.ElementType; label: string }[] = [
  { id: "home",       Icon: Home,         label: "프로젝트" },
  { id: "schema",     Icon: Table2,       label: "스키마" },
  { id: "editor",     Icon: Database,     label: "데이터" },
  { id: "types",      Icon: Tags,         label: "타입" },
  { id: "balance",    Icon: BarChart2,    label: "밸런싱" },
  { id: "simulation", Icon: Play,         label: "시뮬레이션" },
  { id: "economy",    Icon: Coins,        label: "경제" },
  { id: "memory",     Icon: NotebookText, label: "메모리" },
];

export function Sidebar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && localStorage.getItem("sidebar:collapsed") === "1");

  return (
    <div className={`${collapsed ? "w-[52px]" : "w-[168px]"} bg-[#16161a] border-r border-[#2a2a2f] flex flex-col flex-shrink-0 transition-[width] duration-150`}>
      {/* 헤더: 타이틀 + 접기 토글 */}
      <div className={`flex items-center px-2 pt-2 pb-1 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && <span className="text-[12px] font-semibold text-[#ededed] pl-1.5 truncate">Game Data Studio</span>}
        <button
          onClick={() => setCollapsed((v) => { localStorage.setItem("sidebar:collapsed", v ? "0" : "1"); return !v; })}
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          className="flex-shrink-0 text-[#6b6b77] hover:text-[#ededed] hover:bg-[#1a1a1c] rounded-md p-1.5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col pt-1 flex-1">
        {NAV.map(({ id, Icon, label }, i) => (
          <div key={id} className="contents">
            <button
              onClick={() => onChange(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-4"} py-3 text-left border-l-2 transition-colors ${
                current === id
                  ? "bg-[#1e1e24] text-[#ededed] border-[#7c3aed]"
                  : "text-[#6b6b77] border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3]"
              }`}
            >
              <Icon size={16} className={current === id ? "text-[#8b5cf6]" : ""} />
              {!collapsed && <span className="text-[12px]">{label}</span>}
            </button>
            {/* 프로젝트 홈 아래 구분선 */}
            {i === 0 && <div className={`${collapsed ? "mx-2" : "mx-4"} my-1.5 h-px bg-[#2a2a2f]`} />}
          </div>
        ))}
      </nav>

      {/* 하단 설정 */}
      <div className="border-t border-[#2a2a2f] pb-2 pt-1">
        <button
          title={collapsed ? "설정" : undefined}
          className={`w-full flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-4"} py-3 text-left text-[#6b6b77] border-l-2 border-transparent hover:bg-[#1a1a1c] hover:text-[#9a9aa3] transition-colors`}
        >
          <Settings size={16} />
          {!collapsed && <span className="text-[12px]">설정</span>}
        </button>
      </div>
    </div>
  );
}
