"use client";
import { type Screen } from "@/app/page";

const NAV = [
  { id: "home" as Screen, icon: "⌂", title: "프로젝트 홈" },
  { id: "schema" as Screen, icon: "⊞", title: "스키마 에디터" },
  { id: "editor" as Screen, icon: "▤", title: "데이터 에디터" },
  { id: "balance" as Screen, icon: "▦", title: "밸런싱 패널" },
  { id: "simulation" as Screen, icon: "▷", title: "시뮬레이션" },
];

export function Sidebar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <div className="w-[52px] bg-[#f8f7f4] border-r border-[#e8e6e0] flex flex-col items-center py-3 gap-1.5 flex-shrink-0">
      <button
        title="프로젝트 홈"
        onClick={() => onChange("home")}
        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center text-lg ${current === "home" ? "bg-white text-[#185FA5]" : "text-[#999] hover:bg-white hover:text-[#333]"}`}
      >
        ⌂
      </button>
      <div className="w-6 h-px bg-[#e0ded8]" />
      {NAV.slice(1).map((n) => (
        <button
          key={n.id}
          title={n.title}
          onClick={() => onChange(n.id)}
          className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center text-lg ${current === n.id ? "bg-white text-[#185FA5]" : "text-[#999] hover:bg-white hover:text-[#333]"}`}
        >
          {n.icon}
        </button>
      ))}
      <div className="flex-1" />
      <button title="설정" className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-lg text-[#999] hover:bg-white hover:text-[#333]">⚙</button>
    </div>
  );
}
