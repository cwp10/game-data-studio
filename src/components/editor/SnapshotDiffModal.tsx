"use client";
import { type Dispatch, type SetStateAction } from "react";
import { Btn, Modal } from "@/components/ui";
import { type DiffResult } from "@/lib/snapshot/diff";

export interface DiffResultData {
  snapshotA: { id: string; name: string; created_at: number };
  snapshotB: { id: string; name: string; created_at: number };
  diff: DiffResult;
}

interface SnapshotDiffModalProps {
  open: boolean;
  onClose: () => void;
  snapshots: { id: string; name: string; created_at: number }[];
  diffA: string;
  setDiffA: Dispatch<SetStateAction<string>>;
  diffB: string;
  setDiffB: Dispatch<SetStateAction<string>>;
  diffResult: DiffResultData | null;
  diffLoading: boolean;
  runDiff: () => void;
}

export function SnapshotDiffModal({
  open,
  onClose,
  snapshots,
  diffA,
  setDiffA,
  diffB,
  setDiffB,
  diffResult,
  diffLoading,
  runDiff,
}: SnapshotDiffModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="스냅샷 비교">
      <div className="flex gap-2 mb-4 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-[#6b6b77] mb-1 block">기준 (A)</label>
          <select value={diffA} onChange={(e) => setDiffA(e.target.value)} className="w-full bg-[#1e1e24] border border-[#2a2a2f] rounded text-[12px] text-[#ededed] px-2 py-1.5">
            <option value="">선택</option>
            {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-[#6b6b77] mb-1 block">비교 (B)</label>
          <select value={diffB} onChange={(e) => setDiffB(e.target.value)} className="w-full bg-[#1e1e24] border border-[#2a2a2f] rounded text-[12px] text-[#ededed] px-2 py-1.5">
            <option value="">선택</option>
            {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <Btn variant="primary" disabled={!diffA || !diffB || diffLoading} onClick={runDiff}>
          {diffLoading ? "비교 중..." : "비교"}
        </Btn>
      </div>
      {diffResult && (
        <>
          <div className="text-[11px] text-[#6b6b77] mb-3">
            +{diffResult.diff.added} 추가 / -{diffResult.diff.removed} 삭제 / ~{diffResult.diff.changed} 변경
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {diffResult.diff.rows.map((row) => (
              <div key={row.row_id} className={`px-3 py-2 rounded text-[11px] ${
                row.type === "added" ? "bg-[#14532d]/30 border-l-2 border-[#4ade80]" :
                row.type === "removed" ? "bg-[#450a0a]/30 border-l-2 border-[#f87171]" :
                "bg-[#2a1f00]/30 border-l-2 border-[#f59e0b]"
              }`}>
                <span className={row.type === "added" ? "text-[#4ade80]" : row.type === "removed" ? "text-[#f87171]" : "text-[#f59e0b]"}>
                  {row.type === "added" ? "+" : row.type === "removed" ? "−" : "~"}
                </span>
                {" "}행 {row.row_id.slice(0, 8)}
                {row.type === "changed" && ` (${row.changedKeys.join(", ")})`}
              </div>
            ))}
            {diffResult.diff.rows.length === 0 && (
              <p className="text-[11px] text-[#4a4a55] text-center py-4">변경 없음</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
