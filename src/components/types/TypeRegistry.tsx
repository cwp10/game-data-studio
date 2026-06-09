"use client";
import { useEffect, useState } from "react";
import { Plus, Tags, Pencil, Trash2 } from "lucide-react";
import { Btn, Modal, Input, SectionLabel, Tooltip } from "@/components/ui";

interface EnumType {
  id: string;
  name: string;
  values: string[];
}

export function TypeRegistry({ projectId }: { projectId: string }) {
  const [types, setTypes] = useState<EnumType[]>([]);
  const [modal, setModal] = useState<{ id?: string; name: string; valuesText: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch(`/api/enum-types?project_id=${projectId}`).then((r) => r.json()).then(setTypes).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const openNew = () => { setError(null); setModal({ name: "", valuesText: "" }); };
  const openEdit = (t: EnumType) => { setError(null); setModal({ id: t.id, name: t.name, valuesText: t.values.join(", ") }); };

  const save = async () => {
    if (!modal) return;
    const values = modal.valuesText.split(",").map((v) => v.trim()).filter(Boolean);
    if (!modal.name.trim() || values.length === 0) { setError("이름과 값을 1개 이상 입력하세요."); return; }
    if (values.some((v) => !/^[A-Za-z0-9_]+$/.test(v))) { setError("값은 영문자·숫자·밑줄(_)만 사용할 수 있습니다."); return; }
    const res = modal.id
      ? await fetch("/api/enum-types", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: modal.id, name: modal.name.trim(), values }) })
      : await fetch("/api/enum-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId, name: modal.name.trim(), values }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "저장에 실패했습니다."); return; }
    setModal(null);
    load();
  };

  const del = async (t: EnumType) => {
    if (!confirm(`'${t.name}' 타입을 삭제합니다.`)) return;
    const res = await fetch("/api/enum-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "삭제에 실패했습니다."); return; }
    load();
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-[#2a2a2f] flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#ededed] flex items-center gap-2"><Tags size={16} className="text-[#8b5cf6]" />타입</div>
          <div className="text-[11px] text-[#4a4a55] mt-0.5">재사용 enum 타입. 컬럼이 참조하며, 여기서 수정하면 모든 컬럼에 반영됩니다.</div>
        </div>
        <Tooltip label="새 타입 추가"><Btn variant="primary" onClick={openNew}><Plus size={11} /></Btn></Tooltip>
      </div>

      <div className="p-6">
        {types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#16161a] border border-[#2a2a2f] flex items-center justify-center">
              <Tags size={22} className="text-[#4a4a55]" />
            </div>
            <div className="text-[13px] font-medium text-[#6b6b77]">정의된 타입이 없습니다</div>
            <div className="text-[11px] text-[#3a3a42] max-w-sm">Grade(SSR/SR/R/N), Element(fire/ice/…) 같은 고정 선택지를 타입으로 만들어 컬럼에서 재사용하세요.</div>
            <Btn variant="primary" onClick={openNew}><Plus size={11} />새 타입</Btn>
          </div>
        ) : (
          <>
            <SectionLabel>enum 타입 {types.length}개</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => (
                <div key={t.id} className="group bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="text-[13px] font-semibold text-[#ededed]">{t.name}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[#6b6b77] hover:text-[#ededed] p-1 rounded hover:bg-[#2a2a2f]" onClick={() => openEdit(t)}><Pencil size={12} /></button>
                      <button className="text-[#6b6b77] hover:text-[#f87171] p-1 rounded hover:bg-[#2a2a2f]" onClick={() => del(t)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.values.map((v) => (
                      <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30">{v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "타입 편집" : "새 타입"}>
        {modal && (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-[#6b6b77] mb-1">타입 이름 *</div>
              <Input placeholder="예: Grade" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#6b6b77] mb-1">허용값 (쉼표로 구분) * — 영문·숫자·밑줄만 허용</div>
              <Input
                placeholder="예: SSR, SR, R, N"
                value={modal.valuesText}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^A-Za-z0-9_,\s]/g, "");
                  setModal({ ...modal, valuesText: filtered });
                }}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {modal.valuesText.split(",").map((v) => v.trim()).filter(Boolean).map((v, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd]">{v}</span>
                ))}
              </div>
            </div>
            {error && <div className="text-[11px] text-[#f87171]">{error}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Btn onClick={() => setModal(null)}>취소</Btn>
              <Btn variant="primary" onClick={save}>{modal.id ? "저장" : "생성"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
