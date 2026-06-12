"use client";
import { type Dispatch, type SetStateAction } from "react";
import { Btn, Modal } from "@/components/ui";

interface AnnotationModalProps {
  projectId: string;
  selectedId: string | null;
  annotationTarget: { rowId: string } | null;
  setAnnotationTarget: Dispatch<SetStateAction<{ rowId: string } | null>>;
  annotationsByRow: Map<string, { id: string; note: string; column_name: string | null }[]>;
  noteInput: string;
  setNoteInput: Dispatch<SetStateAction<string>>;
  annotationLoading: boolean;
  setAnnotationLoading: Dispatch<SetStateAction<boolean>>;
  loadAnnotations: () => Promise<void>;
}

export function AnnotationModal({
  projectId,
  selectedId,
  annotationTarget,
  setAnnotationTarget,
  annotationsByRow,
  noteInput,
  setNoteInput,
  annotationLoading,
  setAnnotationLoading,
  loadAnnotations,
}: AnnotationModalProps) {
  return (
    <Modal open={!!annotationTarget} onClose={() => setAnnotationTarget(null)} title="수치 근거 메모">
      {annotationTarget && (
        <>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {(annotationsByRow.get(annotationTarget.rowId) ?? []).map((a) => (
              <div key={a.id} className="flex items-start gap-2 bg-[#1e1e24] rounded p-2.5">
                <p className="flex-1 text-[12px] text-[#ededed] whitespace-pre-wrap">{a.note}</p>
                <button
                  onClick={async () => {
                    await fetch("/api/annotations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
                    await loadAnnotations();
                  }}
                  className="text-[#6b6b77] hover:text-[#f87171] text-[10px] flex-shrink-0"
                >삭제</button>
              </div>
            ))}
            {(annotationsByRow.get(annotationTarget.rowId) ?? []).length === 0 && (
              <p className="text-[11px] text-[#4a4a55]">등록된 메모가 없습니다.</p>
            )}
          </div>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="이 행의 수치를 결정한 근거를 기록하세요..."
            className="w-full bg-[#1e1e24] border border-[#2a2a2f] rounded text-[12px] text-[#ededed] p-2.5 resize-none h-20 focus:outline-none focus:border-[#7c3aed]"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Btn onClick={() => setAnnotationTarget(null)}>닫기</Btn>
            <Btn variant="primary" disabled={!noteInput.trim() || annotationLoading} onClick={async () => {
              if (!selectedId) return;
              setAnnotationLoading(true);
              try {
                await fetch("/api/annotations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ project_id: projectId, table_id: selectedId, row_id: annotationTarget.rowId, note: noteInput.trim() }),
                });
                setNoteInput("");
                await loadAnnotations();
              } catch (e) { console.error(e); }
              setAnnotationLoading(false);
            }}>저장</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
