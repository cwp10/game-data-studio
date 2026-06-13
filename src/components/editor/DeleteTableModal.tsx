"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, Link } from "lucide-react";
import { Modal, Btn } from "@/components/ui";

interface Table { id: string; name: string; row_count?: number; }
interface Relation { id: string; from_table_id: string; from_column: string; to_table_id: string; to_column: string; }

interface DeleteTableModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  table: Table;
  projectId: string;
  tables: Table[];
}

export function DeleteTableModal({ open, onClose, onConfirm, table, projectId, tables }: DeleteTableModalProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/relations?project_id=${projectId}`)
      .then((r) => r.json())
      .then((all: Relation[]) => {
        setRelations(all.filter((r) => r.from_table_id === table.id || r.to_table_id === table.id));
      })
      .catch(() => setRelations([]));
  }, [open, projectId, table.id]);

  const tableName = (id: string) => tables.find((t) => t.id === id)?.name ?? id;

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="테이블 삭제">
      <div className="space-y-4">

        {/* 경고 헤더 */}
        <div className="flex gap-3 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
          <AlertTriangle size={16} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-[#ededed]">
              <span className="text-[#f87171] font-mono">{table.name}</span> 테이블을 삭제합니다
            </div>
            <div className="text-[11px] text-[#9a9aa3]">
              {table.row_count !== undefined && table.row_count > 0
                ? `행 ${table.row_count.toLocaleString()}개와 모든 컬럼이 영구 삭제됩니다.`
                : "모든 컬럼이 영구 삭제됩니다."}
              {" "}되돌릴 수 없습니다.
            </div>
          </div>
        </div>

        {/* 관계 목록 */}
        {relations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#f59e0b] uppercase tracking-widest">
              <Link size={11} />
              연결된 관계 {relations.length}개도 함께 삭제됩니다
            </div>
            <div className="border border-[#f59e0b]/20 rounded-lg overflow-hidden">
              {relations.map((rel) => (
                <div key={rel.id} className="flex items-center gap-1.5 px-3 py-2 border-b border-[#2a2a2f] last:border-b-0 text-[11px]">
                  <span className="font-mono text-[#a78bfa]">{tableName(rel.from_table_id)}.{rel.from_column}</span>
                  <span className="text-[#4a4a55]">→</span>
                  <span className="font-mono text-[#a78bfa]">{tableName(rel.to_table_id)}.{rel.to_column}</span>
                  {rel.from_table_id !== table.id && (
                    <span className="ml-auto text-[10px] text-[#f59e0b]">참조 중단</span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#6b6b77]">
              관계가 삭제되어도 참조하는 테이블의 행은 유지됩니다. 단, 참조 무결성 검사에서 오류로 표시될 수 있습니다.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={onClose}>취소</Btn>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#ef4444] hover:bg-[#dc2626] text-white transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            {loading ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
