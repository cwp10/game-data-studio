"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Upload, Download, Sparkles, Trash2, MessageSquare, BarChart3 } from "lucide-react";
import { Btn, GradeBadge, PanelHeader, PanelItem, BottomTab } from "@/components/ui";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { type Screen } from "@/app/page";

interface Table { id: string; name: string; }
interface Column { id: string; name: string; type: "string" | "number" | "boolean" | "enum"; enum_type_id?: string | null; }
interface Row { id: string; data: Record<string, unknown>; }
interface Anomaly { row_id: string; label: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; anomalies: Anomaly[]; }
interface EnumType { id: string; name: string; values: string[]; }

export function DataEditor({ projectId, onNavigate }: { projectId: string; onNavigate?: (screen: Screen) => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [balance, setBalance] = useState<BalanceResult[]>([]);
  const [enumTypes, setEnumTypes] = useState<EnumType[]>([]);
  const [editing, setEditing] = useState<{ rowId: string; col: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bottomTab, setBottomTab] = useState<"chat" | "balance">("chat");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadData = (tid: string) => Promise.all([
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns)),
    fetch(`/api/rows?table_id=${tid}`).then((r) => r.json()).then(setRows),
  ]);
  const enumValuesFor = (col: Column): string[] => enumTypes.find((e) => e.id === col.enum_type_id)?.values ?? [];

  useEffect(() => { fetch(`/api/enum-types?project_id=${projectId}`).then((r) => r.json()).then(setEnumTypes).catch(() => {}); }, [projectId]);
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
    if (selectedRowId === id) setSelectedRowId(null);
  };

  const deleteSelected = () => {
    if (!selectedRowId) return;
    if (!confirm("선택한 행을 삭제합니다.")) return;
    delRow(selectedRowId);
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
    if (col.type === "enum") {
      if (!s) return <span className="text-[#3a3a42]">—</span>;
      if (GRADE_VALUES.has(s.toUpperCase())) return <GradeBadge grade={s.toUpperCase()} />;
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd]">{s}</span>;
    }
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
  const activeResult = balance[0]; // 첫 번째 결과를 통계 패널에 표시

  // z-score가 가장 높은(무시하지 않은) 이상값 1건을 AI 제안으로 표시
  const anomKey = (rowId: string, col: string) => `${rowId}:${col}`;
  const topAnomaly = balance
    .flatMap((b) => b.anomalies.map((a) => ({ ...a, column: b.column, mean: b.mean, stddev: b.stddev })))
    .filter((a) => !dismissed.has(anomKey(a.row_id, a.column)))
    .sort((x, y) => y.z_score - x.z_score)[0];

  const applyRecommended = () => {
    if (!topAnomaly) return;
    const row = rows.find((r) => r.id === topAnomaly.row_id);
    if (!row) return;
    saveCell(row, topAnomaly.column, String(Math.round(topAnomaly.mean)));
  };

  const dismissTop = () => {
    if (!topAnomaly) return;
    setDismissed((prev) => new Set(prev).add(anomKey(topAnomaly.row_id, topAnomaly.column)));
  };

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
          <div className="h-11 border-b border-[#2a2a2f] flex items-center px-3 gap-1.5 flex-shrink-0">
            <Btn variant="primary" onClick={addRow}><Plus size={11} />행 추가</Btn>
            <Btn disabled={!selectedRowId} onClick={deleteSelected}><Trash2 size={11} />삭제</Btn>
            <div className="w-px h-4 bg-[#2a2a2f] mx-0.5" />
            <Btn onClick={() => fileRef.current?.click()}><Upload size={11} />임포트</Btn>
            <Btn onClick={async () => {
              if (!selectedId) return;
              const res = await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", table_id: selectedId }) });
              const blob = await res.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = (tables.find((t) => t.id === selectedId)?.name ?? "export") + ".csv";
              a.click();
            }}><Download size={11} />익스포트</Btn>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !selectedId) return;
              const text = await file.text();
              await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", table_id: selectedId, csv_content: text }) });
              e.target.value = "";
              loadData(selectedId);
              runBalance();
            }} />
            <div className="w-px h-4 bg-[#2a2a2f] mx-0.5" />
            <Btn onClick={runBalance}><Sparkles size={11} />AI 분석</Btn>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-[#2a2a2f] rounded-lg text-[11px] text-[#3a3a42] w-32 bg-[#16161a]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              검색...
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRowId(row.id)}
                    className={`cursor-pointer ${selectedRowId === row.id ? "bg-[#1e1b4b]" : "hover:bg-[#1e1e24]"}`}
                  >
                    <td className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#4a4a55] text-[11px] text-center">{idx + 1}</td>
                    {columns.map((c) => {
                      const anomaly = getAnomaly(row.id, c.name);
                      const isEditing = editing?.rowId === row.id && editing?.col === c.name;
                      return (
                        <td key={c.id} className="px-2.5 py-1.5 border-b border-[#2a2a2f] whitespace-nowrap" onDoubleClick={() => { setEditing({ rowId: row.id, col: c.name }); setEditVal(String(row.data[c.name] ?? "")); }}>
                          {isEditing && c.type === "enum" ? (
                            <select
                              autoFocus
                              className="w-full px-1 py-0.5 border border-[#7c3aed] rounded text-xs outline-none bg-[#1e1b4b] text-[#ededed]"
                              value={editVal}
                              onChange={(e) => saveCell(row, c.name, e.target.value)}
                              onBlur={() => setEditing(null)}
                            >
                              <option value="">—</option>
                              {enumValuesFor(c).map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                          ) : isEditing ? (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단 탭 패널: 대화 | 밸런싱 분석 */}
      <div className="h-[300px] border-t border-[#2a2a2f] flex flex-col flex-shrink-0 bg-[#16161a]">
        <div className="flex items-center px-2 border-b border-[#2a2a2f] flex-shrink-0">
          <BottomTab active={bottomTab === "chat"} onClick={() => setBottomTab("chat")}><MessageSquare size={12} />대화</BottomTab>
          <BottomTab active={bottomTab === "balance"} onClick={() => setBottomTab("balance")}><BarChart3 size={12} />밸런싱 분석</BottomTab>
        </div>

        {bottomTab === "chat" ? (
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              projectId={projectId}
              tableId={selectedId}
              tableName={tables.find((t) => t.id === selectedId)?.name}
              placeholder={`${tables.find((t) => t.id === selectedId)?.name ?? "데이터"}에 할 일을 말해보세요 (Cmd+Enter)`}
              examples={["SSR 캐릭터 3개 추가해줘", "전체 def를 10% 올려줘", "이상값을 권장값으로 보정해줘"]}
              onDataChanged={() => { if (selectedId) { loadData(selectedId); runBalance(); } }}
            />
          </div>
        ) : (
        <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 px-4 py-3 border-r border-[#2a2a2f] overflow-auto">
          <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles size={11} className="text-[#8b5cf6]" />
            AI 밸런싱 제안{topAnomaly && <span className="text-[#9a9aa3] normal-case tracking-normal font-medium">— {topAnomaly.label} {topAnomaly.column}</span>}
          </div>
          {topAnomaly ? (
            <>
              <div className="bg-[#0f0f10] rounded-lg p-3 text-xs leading-relaxed text-[#ededed] border border-[#2a2a2f]">
                <span className={topAnomaly.severity === "danger" ? "text-[#f87171]" : "text-[#f59e0b]"}>현재 {topAnomaly.value.toLocaleString()}</span>
                <span className="text-[#6b6b77]">은(는) {topAnomaly.column} 평균({topAnomaly.mean.toFixed(0)})의 </span>
                <span className={topAnomaly.severity === "danger" ? "text-[#f87171]" : "text-[#f59e0b]"}>{(topAnomaly.value / topAnomaly.mean).toFixed(1)}배</span>
                <span className="text-[#6b6b77]">입니다.</span><br />
                <span className="text-[#6b6b77]">권장 범위: </span>
                <span className="text-[#4ade80] font-medium">{Math.round(topAnomaly.mean - topAnomaly.stddev).toLocaleString()} ~ {Math.round(topAnomaly.mean + topAnomaly.stddev).toLocaleString()}</span>
                <span className="text-[#4a4a55] text-[11px]"> (±1σ 기준)</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <Btn variant="primary" onClick={applyRecommended}>권장값 적용</Btn>
                <Btn onClick={() => onNavigate?.("balance")}>상세 분석</Btn>
                <Btn onClick={dismissTop}>무시</Btn>
              </div>
            </>
          ) : (
            <div className="bg-[#0f0f10] rounded-lg p-3 text-xs text-[#4a4a55] border border-[#2a2a2f]">
              {balance.length > 0 ? "✓ 감지된 이상값이 없습니다." : "✦ AI 분석 버튼을 클릭하면 이상값을 분석합니다."}
            </div>
          )}
        </div>
        <div className="w-[190px] px-4 py-3 flex-shrink-0">
          <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">{activeResult ? `통계 — ${activeResult.column}` : "통계"}</div>
          {activeResult ? (
            <div className="space-y-1">
              {[
                { label: "평균", value: activeResult.mean.toFixed(0), cls: "" },
                { label: "표준편차", value: `±${activeResult.stddev.toFixed(0)}`, cls: "" },
                { label: "이상값", value: `${totalAnomalies}건`, cls: totalAnomalies > 0 ? "text-[#f87171]" : "" },
                { label: "경고", value: `${totalWarns}건`, cls: totalWarns > 0 ? "text-[#f59e0b]" : "" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-[11px]">
                  <span className="text-[#4a4a55]">{s.label}</span>
                  <span className={`font-medium text-[#9a9aa3] ${s.cls}`}>{s.value}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-[11px] text-[#3a3a42]">데이터 없음</div>}
        </div>
        </div>
        )}
      </div>

      {/* 상태바 */}
      <div className="h-6 bg-[#0f0f10] border-t border-[#2a2a2f] flex items-center px-4 gap-3 text-[10px] text-[#3a3a42] flex-shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0" />
        <span>game-data-studio.db</span>
        <span className="text-[#2a2a2f]">·</span>
        <span>{rows.length}행 {columns.length}컬럼</span>
        <div className="ml-auto flex gap-3">
          {totalAnomalies > 0 && <span className="text-[#f87171]">이상값 {totalAnomalies}건</span>}
          {totalWarns > 0 && <span className="text-[#f59e0b]">경고 {totalWarns}건</span>}
        </div>
      </div>
    </div>
  );
}
