"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, GradeBadge, PanelHeader, PanelItem } from "@/components/ui";

interface Table { id: string; name: string; }
interface Column { id: string; name: string; type: "string" | "number" | "boolean"; }
interface Row { id: string; data: Record<string, unknown>; }
interface Anomaly { row_id: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; anomalies: Anomaly[]; }

export function DataEditor({ projectId }: { projectId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [balance, setBalance] = useState<BalanceResult[]>([]);
  const [editing, setEditing] = useState<{ rowId: string; col: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadData = (tid: string) => Promise.all([
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns)),
    fetch(`/api/rows?table_id=${tid}`).then((r) => r.json()).then(setRows),
  ]);

  useEffect(() => { loadTables(); }, [projectId]);
  useEffect(() => { if (selectedId) loadData(selectedId); }, [selectedId]);

  const addRow = async () => {
    if (!selectedId) return;
    const data: Record<string, unknown> = {};
    columns.forEach((c) => { data[c.name] = c.type === "number" ? 0 : ""; });
    const r = await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, data }) });
    const row = await r.json();
    setRows((prev) => [...prev, row]);
  };

  const delRow = async (id: string) => {
    await fetch("/api/rows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_id: id }) });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveCell = async (row: Row, col: string, val: string) => {
    const col_ = columns.find((c) => c.name === col);
    const parsed = col_?.type === "number" ? (isNaN(Number(val)) ? val : Number(val)) : val;
    const newData = { ...row.data, [col]: parsed };
    await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, id: row.id, data: newData }) });
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, data: newData } : r));
    setEditing(null);
    runBalance();
  };

  const runBalance = async () => {
    if (!selectedId) return;
    const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId }) });
    const d = await res.json();
    setBalance(d.results ?? []);
  };

  const getAnomaly = (rowId: string, col: string) => {
    for (const b of balance) {
      const a = b.anomalies.find((a) => a.row_id === rowId);
      if (a && b.column === col) return a;
    }
    return null;
  };

  const GRADE_VALUES = new Set(["SSR", "SR", "R", "N"]);
  const renderCell = (col: Column, val: unknown) => {
    const s = String(val ?? "");
    if (col.type === "string" && GRADE_VALUES.has(s.toUpperCase())) {
      return <GradeBadge grade={s.toUpperCase()} />;
    }
    if (col.type === "number" && typeof val === "number") {
      return val.toLocaleString();
    }
    return s;
  };

  const totalAnomalies = balance.reduce((a, b) => a + b.anomalies.filter((x) => x.severity === "danger").length, 0);
  const totalWarns = balance.reduce((a, b) => a + b.anomalies.filter((x) => x.severity === "warn").length, 0);
  const activeResult = balance[0]; // 첫 번째 결과를 AI 패널에 표시

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 테이블 목록 */}
        <div className="w-[130px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
          <PanelHeader>테이블</PanelHeader>
          <div className="overflow-auto flex-1">
            {tables.map((t) => (
              <PanelItem key={t.id} active={selectedId === t.id} onClick={() => setSelectedId(t.id)}>{t.name}</PanelItem>
            ))}
          </div>
        </div>

        {/* 데이터 그리드 */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 툴바 */}
          <div className="h-10 border-b border-[#2a2a2f] flex items-center px-3 gap-1.5 flex-shrink-0">
            <Btn variant="primary" onClick={addRow}>＋ 행 추가</Btn>
            <Btn onClick={() => fileRef.current?.click()}>↑ CSV 임포트</Btn>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !selectedId) return;
              const text = await file.text();
              await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", table_id: selectedId, csv_content: text }) });
              e.target.value = "";
              loadData(selectedId);
              runBalance();
            }} />
            <Btn onClick={async () => {
              if (!selectedId) return;
              const res = await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", table_id: selectedId }) });
              const blob = await res.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = (tables.find((t) => t.id === selectedId)?.name ?? "export") + ".csv";
              a.click();
            }}>↓ CSV 익스포트</Btn>
            <div className="w-px h-4.5 bg-[#3a3a42] mx-1" />
            <Btn onClick={runBalance}>✦ AI 분석</Btn>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-[#3a3a42] rounded-md text-[11px] text-[#4a4a55] w-32">
              🔍 검색...
            </div>
          </div>

          {/* 스프레드시트 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#16161a]">
                  <th className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#6b6b77] w-7 text-center"></th>
                  {columns.map((c) => (
                    <th key={c.id} className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-left text-[11px] font-medium text-[#6b6b77] whitespace-nowrap">{c.name}</th>
                  ))}
                  <th className="px-2.5 py-1.5 border-b border-[#2a2a2f] w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#1e1e24]">
                    <td className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#4a4a55] text-[11px] text-center">{idx + 1}</td>
                    {columns.map((c) => {
                      const anomaly = getAnomaly(row.id, c.name);
                      const isEditing = editing?.rowId === row.id && editing?.col === c.name;
                      return (
                        <td key={c.id} className="px-2.5 py-1.5 border-b border-[#2a2a2f] whitespace-nowrap" onDoubleClick={() => { setEditing({ rowId: row.id, col: c.name }); setEditVal(String(row.data[c.name] ?? "")); }}>
                          {isEditing ? (
                            <input
                              autoFocus
                              className="w-full px-1 py-0.5 border border-[#7c3aed] rounded text-xs outline-none bg-[#1e1b4b] text-[#ededed]"
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => saveCell(row, c.name, editVal)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveCell(row, c.name, editVal); if (e.key === "Escape") setEditing(null); }}
                            />
                          ) : (
                            <span className={anomaly ? (anomaly.severity === "danger" ? "text-[#f87171] font-medium" : "text-[#f59e0b] font-medium") : "text-[#ededed]"}>
                              {anomaly && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${anomaly.severity === "danger" ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} />}
                              {renderCell(c, row.data[c.name])}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-center">
                      <button className="text-[#2a2a2f] hover:text-[#f87171] text-xs" onClick={() => delRow(row.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단 AI 패널 */}
      <div className="h-[160px] border-t border-[#2a2a2f] flex flex-shrink-0">
        <div className="flex-1 p-3 border-r border-[#2a2a2f]">
          <div className="text-[11px] font-medium text-[#9a9aa3] mb-2">✦ AI 밸런싱 분석</div>
          {activeResult ? (
            <div className="bg-[#16161a] rounded-md p-2.5 text-xs leading-relaxed text-[#ededed]">
              <span className="font-medium">{activeResult.column}</span> — 평균 <span className="font-medium">{activeResult.mean.toFixed(0)}</span>, 표준편차 ±{activeResult.stddev.toFixed(0)}
              {activeResult.anomalies.length > 0 && (
                <div className="mt-1 text-[#f87171]">이상값 {activeResult.anomalies.length}건 감지됨</div>
              )}
            </div>
          ) : (
            <div className="bg-[#16161a] rounded-md p-2.5 text-xs text-[#9a9aa3]">AI 분석 버튼을 클릭하면 이상값을 분석합니다.</div>
          )}
        </div>
        <div className="w-[200px] p-3 flex-shrink-0">
          <div className="text-[11px] font-medium text-[#9a9aa3] mb-2">통계</div>
          {activeResult ? (
            <>
              <div className="flex justify-between text-[11px] py-0.5 border-b border-[#2a2a2f]"><span className="text-[#6b6b77]">평균</span><span className="font-medium text-[#ededed]">{activeResult.mean.toFixed(0)}</span></div>
              <div className="flex justify-between text-[11px] py-0.5 border-b border-[#2a2a2f]"><span className="text-[#6b6b77]">표준편차</span><span className="font-medium text-[#ededed]">±{activeResult.stddev.toFixed(0)}</span></div>
              <div className="flex justify-between text-[11px] py-0.5 border-b border-[#2a2a2f]"><span className="text-[#6b6b77]">이상값</span><span className={`font-medium ${totalAnomalies > 0 ? "text-[#f87171]" : "text-[#ededed]"}`}>{totalAnomalies}건</span></div>
              <div className="flex justify-between text-[11px] py-0.5"><span className="text-[#6b6b77]">경고</span><span className={`font-medium ${totalWarns > 0 ? "text-[#f59e0b]" : "text-[#ededed]"}`}>{totalWarns}건</span></div>
            </>
          ) : <div className="text-[11px] text-[#4a4a55]">데이터 없음</div>}
        </div>
      </div>

      {/* 상태바 */}
      <div className="h-6 bg-[#16161a] border-t border-[#2a2a2f] flex items-center px-3 gap-3.5 text-[11px] text-[#4a4a55] flex-shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        <span>game-data-studio.db</span>
        <span>{rows.length}행 · {columns.length}컬럼</span>
        <span className="ml-auto text-[#f87171]">{totalAnomalies > 0 ? `이상값 ${totalAnomalies}건` : ""}</span>
        {totalWarns > 0 && <span className="text-[#f59e0b]">경고 {totalWarns}건</span>}
      </div>
    </div>
  );
}
