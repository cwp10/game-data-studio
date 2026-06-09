"use client";
import { useEffect, useState } from "react";
import { Btn, Modal, Input, Select, SectionLabel } from "@/components/ui";
import { type Screen } from "@/app/page";

interface Project {
  id: string;
  name: string;
  genre: string | null;
  description: string | null;
  table_count: number;
  row_count: number;
  updated_at: number;
}

const GENRES = ["수집형 RPG", "방치형 RPG", "전략", "퍼즐", "기타"];

export function ProjectHome({ onNavigate }: { onNavigate: (screen: Screen, projectId?: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", genre: "", description: "" });

  const load = () => fetch("/api/projects").then((r) => r.json()).then(setProjects);
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowModal(false);
    setForm({ name: "", genre: "", description: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("프로젝트와 모든 하위 데이터를 삭제합니다. 계속하시겠습니까?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  const fmt = (ms: number) => {
    const diff = Date.now() - ms;
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전 수정`;
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[18px] font-medium">프로젝트</div>
        <Btn variant="primary" onClick={() => setShowModal(true)}>＋ 새 프로젝트</Btn>
      </div>

      <SectionLabel>최근 프로젝트</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {projects.map((p) => (
          <div key={p.id} className="bg-white border border-[#e0ded8] rounded-xl p-4 cursor-pointer hover:border-[#c0beb8]" onClick={() => onNavigate("schema", p.id)}>
            {p.genre && <div className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#e6f1fb] text-[#0C447C] mb-2">{p.genre}</div>}
            <div className="text-sm font-medium mb-1">{p.name}</div>
            {p.description && <div className="text-[11px] text-[#888] mb-2">{p.description}</div>}
            <div className="flex gap-3">
              <div className="text-[11px] text-[#666]">테이블 <span className="text-[#1a1a18] font-medium">{p.table_count}</span></div>
              <div className="text-[11px] text-[#666]">행 <span className="text-[#1a1a18] font-medium">{p.row_count.toLocaleString()}</span></div>
            </div>
            <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-[#f0ede8]">
              <span className="text-[10px] text-[#aaa]">{fmt(p.updated_at)}</span>
              <div className="flex gap-1.5">
                <button className="text-xs text-[#aaa] hover:text-[#333]" onClick={(e) => { e.stopPropagation(); onNavigate("schema", p.id); }}>✎</button>
                <button className="text-xs text-[#aaa] hover:text-[#A32D2D]" onClick={(e) => { e.stopPropagation(); del(p.id); }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
        <div
          className="border border-dashed border-[#c0beb8] rounded-xl flex flex-col items-center justify-center gap-2 min-h-[140px] text-[#aaa] cursor-pointer hover:border-[#a0a098]"
          onClick={() => setShowModal(true)}
        >
          <div className="text-2xl">＋</div>
          <div className="text-sm">새 프로젝트 만들기</div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="새 프로젝트">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#888] mb-1">프로젝트명 *</div>
            <Input placeholder="예: ProjectZ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <div className="text-[11px] text-[#888] mb-1">장르</div>
            <Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              <option value="">선택 안함</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#888] mb-1">설명</div>
            <Input placeholder="간단한 설명 (선택)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowModal(false)}>취소</Btn>
            <Btn variant="primary" onClick={create}>생성</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
