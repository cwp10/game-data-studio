"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Btn, Modal, Input, Select, SectionLabel } from "@/components/ui";
import { type Screen } from "@/app/page";

interface Project {
  id: string;
  name: string;
  genre: string | null;
  description: string | null;
  table_count: number;
  row_count: number;
  anomaly_count: number;
  updated_at: number;
}

const GENRES = ["수집형 RPG", "방치형 RPG", "전략", "퍼즐", "기타"];

export function ProjectHome({ onNavigate }: { onNavigate: (screen: Screen, projectId?: string, projectName?: string) => void }) {
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
    <div className="flex-1 overflow-auto">
      {/* 헤더 */}
      <div className="px-6 py-5 border-b border-[#2a2a2f] flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#ededed]">프로젝트</div>
          <div className="text-[11px] text-[#4a4a55] mt-0.5">{projects.length}개의 프로젝트</div>
        </div>
        <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={11} />새 프로젝트</Btn>
      </div>

      <div className="p-6">
        {/* 빈 상태 */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🎮</div>
            <div className="text-[15px] font-medium text-[#ededed] mb-2">첫 번째 프로젝트를 만들어보세요</div>
            <div className="text-[12px] text-[#4a4a55] mb-6">장르에 맞는 스키마와 데이터를 자동으로 구성합니다</div>
            <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={11} />새 프로젝트 만들기</Btn>
          </div>
        )}

        {projects.length > 0 && (
          <>
            <SectionLabel>최근 프로젝트</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 cursor-pointer hover:border-[#7c3aed]/40 hover:bg-[#1a1a1c] transition-colors"
                  onClick={() => onNavigate("schema", p.id, p.name)}
                >
                  <div className="flex items-start justify-between mb-3">
                    {p.genre
                      ? <div className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30">{p.genre}</div>
                      : <div />
                    }
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[11px] px-1.5 py-0.5 rounded text-[#6b6b77] hover:text-[#ededed] hover:bg-[#2a2a2f]" onClick={(e) => { e.stopPropagation(); onNavigate("schema", p.id, p.name); }}>편집</button>
                      <button className="text-[11px] px-1.5 py-0.5 rounded text-[#6b6b77] hover:text-[#f87171] hover:bg-[#2a2a2f]" onClick={(e) => { e.stopPropagation(); del(p.id); }}>삭제</button>
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold mb-1 text-[#ededed]">{p.name}</div>
                  {p.description && <div className="text-[11px] text-[#6b6b77] mb-3 leading-relaxed">{p.description}</div>}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#2a2a2f]">
                    <div className="text-[11px] text-[#4a4a55]">테이블 <span className="text-[#9a9aa3] font-medium">{p.table_count}</span></div>
                    <div className="text-[11px] text-[#4a4a55]">행 <span className="text-[#9a9aa3] font-medium">{p.row_count.toLocaleString()}</span></div>
                    <div className="text-[11px] text-[#4a4a55]">이상값 <span className={`font-medium ${p.anomaly_count > 0 ? "text-[#f87171]" : "text-[#4ade80]"}`}>{p.anomaly_count}</span></div>
                    <div className="ml-auto text-[10px] text-[#3a3a42]">{fmt(p.updated_at)}</div>
                  </div>
                </div>
              ))}
              <div
                className="border border-dashed border-[#2a2a2f] rounded-xl flex flex-col items-center justify-center gap-2 min-h-[140px] text-[#3a3a42] cursor-pointer hover:border-[#7c3aed]/40 hover:text-[#6b6b77] transition-colors"
                onClick={() => setShowModal(true)}
              >
                <div className="text-xl">＋</div>
                <div className="text-[11px]">새 프로젝트</div>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="새 프로젝트">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1">프로젝트명 *</div>
            <Input placeholder="예: ProjectZ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1">장르</div>
            <Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              <option value="">선택 안함</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1">설명</div>
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
