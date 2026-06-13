"use client";
import { useEffect, useState } from "react";
import { Plus, Tags, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Btn, Modal, Input, SectionLabel, Tooltip } from "@/components/ui";

interface EnumType {
  id: string;
  name: string;
  values: string[];
}

interface UsageInfo {
  tableName: string;
  columnName: string;
  count: number;
}

interface ValueWarning {
  value: string;
  usages: UsageInfo[];
}

interface ModalState {
  id?: string;
  name: string;
  valuesText: string;
  originalValues?: string[];
}

interface DeleteConfirm {
  type: EnumType;
  columnUsages: UsageInfo[];
}

export function TypeRegistry({ projectId }: { projectId: string }) {
  const [types, setTypes] = useState<EnumType[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [valueWarnings, setValueWarnings] = useState<ValueWarning[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

  const load = () =>
    fetch(`/api/enum-types?project_id=${projectId}`)
      .then((r) => r.json())
      .then(setTypes)
      .catch(() => {});

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [projectId]);

  const openNew = () => {
    setError(null);
    setValueWarnings([]);
    setModal({ name: "", valuesText: "" });
  };

  const openEdit = (t: EnumType) => {
    setError(null);
    setValueWarnings([]);
    setModal({ id: t.id, name: t.name, valuesText: t.values.join(", "), originalValues: t.values });
  };

  const closeModal = () => {
    setModal(null);
    setValueWarnings([]);
    setError(null);
  };

  const doSave = async () => {
    if (!modal) return;
    const values = modal.valuesText.split(",").map((v) => v.trim()).filter(Boolean);
    const res = modal.id
      ? await fetch("/api/enum-types", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: modal.id, name: modal.name.trim(), values }),
        })
      : await fetch("/api/enum-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, name: modal.name.trim(), values }),
        });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "저장에 실패했습니다.");
      return;
    }
    closeModal();
    load();
  };

  const save = async () => {
    if (!modal || checking) return;
    const values = modal.valuesText.split(",").map((v) => v.trim()).filter(Boolean);
    if (!modal.name.trim() || values.length === 0) {
      setError("이름과 값을 1개 이상 입력하세요.");
      return;
    }
    if (values.some((v) => !/^[A-Za-z0-9_]+$/.test(v))) {
      setError("값은 영문자·숫자·밑줄(_)만 사용할 수 있습니다.");
      return;
    }

    if (modal.id && modal.originalValues) {
      const removed = modal.originalValues.filter((v) => !values.includes(v));
      if (removed.length > 0) {
        setChecking(true);
        try {
          const warnings: ValueWarning[] = [];
          for (const val of removed) {
            const r = await fetch(
              `/api/enum-types/usage?enum_type_id=${modal.id}&value=${encodeURIComponent(val)}`
            );
            const usages: UsageInfo[] = await r.json();
            if (usages.length > 0) warnings.push({ value: val, usages });
          }
          if (warnings.length > 0) {
            setValueWarnings(warnings);
            return;
          }
        } finally {
          setChecking(false);
        }
      }
    }

    await doSave();
  };

  const del = async (t: EnumType) => {
    const r = await fetch(`/api/enum-types/usage?enum_type_id=${t.id}`);
    const columnUsages: UsageInfo[] = await r.json();
    setDeleteConfirm({ type: t, columnUsages });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch("/api/enum-types", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteConfirm.type.id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "삭제에 실패했습니다.");
      return;
    }
    setDeleteConfirm(null);
    load();
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-[#2a2a2f] flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#ededed] flex items-center gap-2">
            <Tags size={16} className="text-[#8b5cf6]" />타입
          </div>
          <div className="text-[11px] text-[#4a4a55] mt-0.5">
            재사용 enum 타입. 컬럼이 참조하며, 여기서 수정하면 모든 컬럼에 반영됩니다.
          </div>
        </div>
        <Tooltip label="새 타입 추가">
          <Btn variant="primary" onClick={openNew}><Plus size={11} /></Btn>
        </Tooltip>
      </div>

      <div className="p-6">
        {types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#16161a] border border-[#2a2a2f] flex items-center justify-center">
              <Tags size={22} className="text-[#4a4a55]" />
            </div>
            <div className="text-[13px] font-medium text-[#6b6b77]">정의된 타입이 없습니다</div>
            <div className="text-[11px] text-[#3a3a42] max-w-sm">
              Grade(SSR/SR/R/N), Element(fire/ice/…) 같은 고정 선택지를 타입으로 만들어 컬럼에서 재사용하세요.
            </div>
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
                      <button
                        className="text-[#6b6b77] hover:text-[#ededed] p-1 rounded hover:bg-[#2a2a2f]"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="text-[#6b6b77] hover:text-[#f87171] p-1 rounded hover:bg-[#2a2a2f]"
                        onClick={() => del(t)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.values.map((v) => (
                      <span
                        key={v}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 편집 모달 */}
      <Modal open={!!modal} onClose={closeModal} title={modal?.id ? "타입 편집" : "새 타입"}>
        {modal && (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-[#6b6b77] mb-1">타입 이름 *</div>
              <Input
                placeholder="예: Grade"
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[11px] text-[#6b6b77] mb-1">허용값 (쉼표로 구분) * — 영문·숫자·밑줄만 허용</div>
              <Input
                placeholder="예: SSR, SR, R, N"
                value={modal.valuesText}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^A-Za-z0-9_,\s]/g, "");
                  setModal({ ...modal, valuesText: filtered });
                  setValueWarnings([]);
                }}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {modal.valuesText
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .map((v, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd]">
                      {v}
                    </span>
                  ))}
              </div>
            </div>

            {/* 값 삭제 경고 */}
            {valueWarnings.length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2.5 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                  <AlertTriangle size={14} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 min-w-0">
                    <div className="text-[11px] font-semibold text-[#ededed]">
                      제거된 값을 사용하는 행이 있습니다
                    </div>
                    {valueWarnings.map((w) => (
                      <div key={w.value} className="space-y-1">
                        <div className="text-[11px]">
                          <span className="font-mono text-[#f87171] bg-[#f87171]/10 px-1.5 py-0.5 rounded">
                            {w.value}
                          </span>
                          <span className="text-[#9a9aa3] ml-1.5">— 아래 컬럼에서 사용 중</span>
                        </div>
                        {w.usages.map((u, i) => (
                          <div key={i} className="text-[10px] text-[#9a9aa3] pl-2 font-mono">
                            {u.tableName}.{u.columnName}{" "}
                            <span className="text-[#f59e0b]">({u.count}행)</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="text-[10px] text-[#6b6b77] pt-0.5">
                      저장해도 기존 행의 값은 그대로 남지만, 이후 드롭다운에서 선택 불가합니다.
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Btn onClick={() => setValueWarnings([])}>취소</Btn>
                  <button
                    onClick={doSave}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#f59e0b] hover:bg-[#d97706] text-white transition-colors"
                  >
                    경고 무시하고 저장
                  </button>
                </div>
              </div>
            )}

            {error && <div className="text-[11px] text-[#f87171]">{error}</div>}

            {valueWarnings.length === 0 && (
              <div className="flex justify-end gap-2 pt-1">
                <Btn onClick={closeModal}>취소</Btn>
                <Btn variant="primary" onClick={save}>
                  {checking ? "확인 중…" : modal.id ? "저장" : "생성"}
                </Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 타입 전체 삭제 확인 모달 */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="타입 삭제">
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
              <AlertTriangle size={16} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[12px] font-semibold text-[#ededed]">
                  <span className="text-[#f87171] font-mono">{deleteConfirm.type.name}</span> 타입을 삭제합니다
                </div>
                <div className="text-[11px] text-[#9a9aa3]">
                  이 타입을 사용하는 컬럼의 드롭다운이 비어버립니다. 기존 행 데이터는 유지됩니다.
                </div>
              </div>
            </div>

            {deleteConfirm.columnUsages.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-widest">
                  이 타입을 참조하는 컬럼 {deleteConfirm.columnUsages.length}개
                </div>
                <div className="border border-[#f59e0b]/20 rounded-lg overflow-hidden">
                  {deleteConfirm.columnUsages.map((u, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-3 py-2 border-b border-[#2a2a2f] last:border-b-0 text-[11px] font-mono"
                    >
                      <span className="text-[#a78bfa]">{u.tableName}</span>
                      <span className="text-[#4a4a55]">.</span>
                      <span className="text-[#a78bfa]">{u.columnName}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[#6b6b77]">
                  타입을 삭제하면 위 컬럼들이 enum 참조를 잃습니다. 컬럼 자체와 행 데이터는 유지됩니다.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Btn onClick={() => setDeleteConfirm(null)}>취소</Btn>
              <button
                onClick={confirmDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#ef4444] hover:bg-[#dc2626] text-white transition-colors"
              >
                <Trash2 size={12} />
                삭제
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
