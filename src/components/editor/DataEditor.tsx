"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Download, Sparkles, Trash2, MessageSquare, BarChart3, TrendingUp, ChevronDown, ChevronUp, Eye, EyeOff, Save } from "lucide-react";
import { Btn, GradeBadge, PanelHeader, PanelItem, BottomTab, Modal, Input, Select, Tooltip } from "@/components/ui";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LineChart } from "@/components/chart/LineChart";
import { computeCurve, type CurveType } from "@/lib/curve/generate";
import { type Screen } from "@/app/page";

const CHART_PALETTE = ["#7c3aed", "#4ade80", "#f59e0b", "#f87171", "#38bdf8", "#c4b5fd"];

interface Table { id: string; name: string; }
interface Column { id: string; table_id?: string; name: string; type: "string" | "number" | "boolean" | "enum"; enum_type_id?: string | null; }
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
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColToggle, setShowColToggle] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: string; name: string; created_at: number }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bottomTab, setBottomTab] = useState<"chat" | "balance" | "chart">("chat");
  const [bottomCollapsed, setBottomCollapsed] = useState(() => localStorage.getItem("editor:bottomCollapsed") === "1");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartX, setChartX] = useState("");
  const [chartY, setChartY] = useState<string[]>([]);
  const [showCurve, setShowCurve] = useState(false);
  const [curve, setCurve] = useState({ value_column: "", level_column: "level", type: "power" as CurveType, base: "100", factor: "1.5", count: "30", replace: true });
  const fileRef = useRef<HTMLInputElement>(null);
  const balanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickedRowRef = useRef<string | null>(null);

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadData = (tid: string) => Promise.all([
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns)),
    fetch(`/api/rows?table_id=${tid}`).then((r) => r.json()).then(setRows),
  ]);
  const enumValuesFor = (col: Column): string[] => enumTypes.find((e) => e.id === col.enum_type_id)?.values ?? [];

  useEffect(() => { fetch(`/api/enum-types?project_id=${projectId}`).then((r) => r.json()).then(setEnumTypes).catch(() => {}); }, [projectId]);
  useEffect(() => { loadTables(); }, [projectId]);
  useEffect(() => { if (selectedId) loadData(selectedId); }, [selectedId]);

  // 테이블 전환 시 숨김 컬럼 초기화
  useEffect(() => setHiddenCols(new Set()), [selectedId]);

  // 스냅샷 목록 로드 (테이블 전환 시)
  const loadSnapshots = () => {
    if (!selectedId) return;
    fetch(`/api/snapshots?table_id=${selectedId}`).then((r) => r.json()).then(setSnapshots).catch((e) => console.error(e));
  };
  useEffect(() => { loadSnapshots(); }, [selectedId]);

  // 차트 기본 축: 테이블이 바뀔 때 1회 초기화 (level 우선). 같은 테이블 내 편집 시엔 사용자 선택 보존.
  const chartTableRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || columns.length === 0) return;
    if (columns[0].table_id && columns[0].table_id !== selectedId) return; // 아직 이전 테이블 컬럼
    const names = new Set(columns.map((c) => c.name));
    const firstInit = chartTableRef.current !== selectedId;
    // 테이블 전환 시 1회 초기화. 그 외엔, 선택된 축 컬럼이 삭제/이름변경으로 사라졌을 때만 정리.
    if (!firstInit && names.has(chartX) && chartY.every((y) => names.has(y))) return;
    chartTableRef.current = selectedId;
    const nums = columns.filter((c) => c.type === "number").map((c) => c.name);
    const x = (!firstInit && names.has(chartX)) ? chartX
      : columns.find((c) => c.name === "level")?.name ?? columns.find((c) => c.name === "id")?.name ?? columns[0]?.name ?? "";
    const keepY = chartY.filter((y) => names.has(y));
    setChartX(x);
    setChartY(firstInit || keepY.length === 0 ? nums.filter((c) => c !== x).slice(0, 2) : keepY);
  }, [selectedId, columns, chartX, chartY]);

  const addRow = async () => {
    if (!selectedId) return;
    const data: Record<string, unknown> = {};
    columns.forEach((c) => { data[c.name] = c.type === "number" ? 0 : ""; });
    const r = await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, data }) });
    const row = await r.json();
    setRows((prev) => [...prev, row]);
  };

  const handleRowClick = (rowId: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRowRef.current) {
      // 범위 선택: filteredRows에서 lastClickedRowRef ~ rowId 사이 전체
      const ids = filteredRows.map((r) => r.id);
      const a = ids.indexOf(lastClickedRowRef.current);
      const b = ids.indexOf(rowId);
      const [from, to] = a < b ? [a, b] : [b, a];
      setSelectedRowIds(new Set(ids.slice(from, to + 1)));
    } else if (e.metaKey || e.ctrlKey) {
      // 개별 토글
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
        return next;
      });
    } else {
      setSelectedRowIds(new Set([rowId]));
    }
    lastClickedRowRef.current = rowId;
  };

  const deleteSelected = async () => {
    if (!selectedRowIds.size) return;
    if (!confirm(`${selectedRowIds.size}행을 삭제합니다.`)) return;
    const ids = Array.from(selectedRowIds);
    await fetch("/api/rows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row_ids: ids }),
    });
    setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
    setSelectedRowIds(new Set());
    scheduleBalance();
  };

  const saveCell = async (row: Row, col: string, val: string) => {
    const col_ = columns.find((c) => c.name === col);
    const parsed = col_?.type === "number" ? (isNaN(Number(val)) ? val : Number(val)) : val;
    const newData = { ...row.data, [col]: parsed };
    await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, id: row.id, data: newData }) });
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, data: newData } : r));
    setEditing(null);
    scheduleBalance();
  };

  const runBalance = async () => {
    if (!selectedId) return;
    const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId }) });
    const d = await res.json();
    setBalance(d.results ?? []);
  };

  // 셀 편집마다 즉시 재분석하지 않고 연속 편집을 모아 한 번만 재계산한다(API 호출 폭주 방지).
  const scheduleBalance = () => {
    if (balanceTimer.current) clearTimeout(balanceTimer.current);
    balanceTimer.current = setTimeout(() => { balanceTimer.current = null; runBalance(); }, 500);
  };
  useEffect(() => () => { if (balanceTimer.current) clearTimeout(balanceTimer.current); }, []);

  // 이상값을 (rowId:col) 키로 인덱싱해 셀 렌더링 시 O(1) 조회 (기존엔 셀마다 balance 전체 스캔).
  const anomalyMap = useMemo(() => {
    const m = new Map<string, Anomaly>();
    for (const b of balance) for (const a of b.anomalies) m.set(`${a.row_id}:${b.column}`, a);
    return m;
  }, [balance]);
  const getAnomaly = (rowId: string, col: string) => anomalyMap.get(`${rowId}:${col}`) ?? null;

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

  // 성장 곡선 미리보기 (클라이언트 계산)
  const curvePreview = (() => {
    const base = Number(curve.base), factor = Number(curve.factor), count = Number(curve.count);
    if (![base, factor, count].every(Number.isFinite) || count < 1) return [];
    return computeCurve({ type: curve.type, base, factor, count: Math.min(count, 200) });
  })();

  const runCurve = async () => {
    if (!selectedId || !curve.value_column.trim()) return;
    const res = await fetch("/api/curve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table_id: selectedId, value_column: curve.value_column.trim(), level_column: curve.level_column.trim() || "level",
        type: curve.type, base: Number(curve.base), factor: Number(curve.factor), count: Number(curve.count), replace: curve.replace,
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "생성에 실패했습니다."); return; }
    setShowCurve(false);
    loadData(selectedId);
    runBalance();
  };

  // 검색 필터
  const filteredRows = searchQuery.trim()
    ? rows.filter((r) =>
        columns.some((c) => String(r.data[c.name] ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : rows;

  // 컬럼 가시성 (id 컬럼은 항상 표시)
  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.name));

  // CSV 내보내기
  const csvExport = async () => {
    if (!selectedId) return;
    const res = await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", table_id: selectedId }) });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (tables.find((t) => t.id === selectedId)?.name ?? "export") + ".csv";
    a.click();
  };

  // JSON 내보내기
  const exportJson = () => {
    if (!selectedId) return;
    const t = tables.find((t) => t.id === selectedId);
    const data = JSON.stringify(rows.map((r) => r.data), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (t?.name ?? "export") + ".json";
    a.click();
  };

  // 스냅샷 저장
  const saveSnapshot = async () => {
    if (!selectedId) return;
    const name = prompt("스냅샷 이름:");
    if (!name) return;
    await fetch("/api/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, name }) });
    loadSnapshots();
  };

  // 스냅샷 복원
  const restoreSnapshot = async (snapshotId: string, snapName: string) => {
    if (!confirm(`"${snapName}" 스냅샷으로 복원합니다. 현재 데이터가 대체됩니다.`)) return;
    await fetch("/api/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", table_id: selectedId, snapshot_id: snapshotId }) });
    if (selectedId) loadData(selectedId);
    runBalance();
  };

  // 이상값 전체 보정
  const applyAllAnomalies = async () => {
    const toFix = balance.flatMap((b) =>
      b.anomalies
        .filter((a) => !dismissed.has(anomKey(a.row_id, b.column)))
        .map((a) => ({ ...a, column: b.column, mean: b.mean }))
    );
    if (!toFix.length) return;
    if (!confirm(`${toFix.length}건의 이상값을 모두 권장값(mean)으로 보정합니다.`)) return;
    // 한 행에 여러 컬럼 이상값이 있을 수 있으므로 행별로 패치를 합쳐 한 번만 기록 (stale closure로 인한 덮어쓰기 방지)
    const patches = new Map<string, Record<string, unknown>>();
    for (const a of toFix) {
      const base = patches.get(a.row_id) ?? rows.find((r) => r.id === a.row_id)?.data;
      if (!base) continue;
      patches.set(a.row_id, { ...base, [a.column]: Math.round(a.mean) });
    }
    for (const [id, data] of patches) {
      await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, id, data }) });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, data } : r)));
    }
    runBalance();
  };

  // 차트 데이터 (선택한 Y 컬럼들을 X 기준 정렬해 라인 시리즈로)
  const numericCols = columns.filter((c) => c.type === "number");
  const chartRows = (() => {
    const xNum = columns.find((c) => c.name === chartX)?.type === "number";
    const rs = [...rows];
    if (xNum) rs.sort((a, b) => Number(a.data[chartX]) - Number(b.data[chartX]));
    return rs;
  })();
  const chartSeries = chartY.map((name, i) => ({ name, color: CHART_PALETTE[i % CHART_PALETTE.length], values: chartRows.map((r) => Number(r.data[name])) }));
  const chartXLabels = chartRows.map((r) => String(r.data[chartX] ?? ""));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 테이블 목록 */}
        <div className="w-[170px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
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
          <div className="h-11 border-b border-[#2a2a2f] flex items-center px-3 gap-1 flex-shrink-0">
            <Tooltip label="선택 삭제"><Btn disabled={selectedRowIds.size === 0} onClick={deleteSelected}><Trash2 size={11} /></Btn></Tooltip>
            {selectedRowIds.size > 1 && <span className="text-[11px] text-[#8b5cf6] px-1">{selectedRowIds.size}행</span>}
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="CSV 임포트"><Btn onClick={() => fileRef.current?.click()}><Upload size={11} /></Btn></Tooltip>
            <div className="relative">
              <Tooltip label="내보내기 (CSV / JSON)"><Btn disabled={!selectedId} onClick={() => setShowExportMenu((v) => !v)}><Download size={11} /></Btn></Tooltip>
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a1f] border border-[#2a2a2f] rounded-lg shadow-xl z-50 py-1 min-w-[80px]" onMouseLeave={() => setShowExportMenu(false)}>
                  <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#ededed] hover:bg-[#2a2a2f]" onClick={() => { csvExport(); setShowExportMenu(false); }}>CSV</button>
                  <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#ededed] hover:bg-[#2a2a2f]" onClick={() => { exportJson(); setShowExportMenu(false); }}>JSON</button>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="스냅샷 저장"><Btn disabled={!selectedId} onClick={saveSnapshot}><Save size={11} /></Btn></Tooltip>
            {snapshots.length > 0 && (
              <Tooltip label="스냅샷 복원">
                <select
                  className="bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-[#6b6b77] outline-none"
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) restoreSnapshot(e.target.value, snapshots.find((s) => s.id === e.target.value)?.name ?? ""); e.target.value = ""; }}
                >
                  <option value="">복원...</option>
                  {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Tooltip>
            )}
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="성장 곡선 생성"><Btn disabled={!selectedId} onClick={() => setShowCurve(true)}><TrendingUp size={11} /></Btn></Tooltip>
            <Tooltip label="AI 밸런스 분석"><Btn onClick={runBalance}><Sparkles size={11} /></Btn></Tooltip>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !selectedId) return;
              const text = await file.text();
              await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", table_id: selectedId, csv_content: text }) });
              e.target.value = "";
              loadData(selectedId);
              runBalance();
            }} />
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-[#2a2a2f] rounded-lg text-[11px] w-40 bg-[#16161a] focus-within:border-[#7c3aed]/50">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#3a3a42] flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="flex-1 min-w-0 bg-transparent outline-none text-[#ededed] placeholder:text-[#3a3a42]"
              />
            </div>
          </div>

          {/* 스프레드시트 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#16161a]">
                  <th className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#6b6b77] w-7 text-center relative">
                    <button
                      onClick={() => setShowColToggle((v) => !v)}
                      title="컬럼 표시/숨김"
                      className="text-[#4a4a55] hover:text-[#ededed] align-middle"
                    >
                      {hiddenCols.size > 0 ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    {showColToggle && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowColToggle(false)} />
                        <div className="absolute left-0 top-full mt-1 z-20 w-40 bg-[#16161a] border border-[#2a2a2f] rounded-lg shadow-lg py-1 text-left">
                          {columns.map((c) => {
                            const isId = c.name === "id";
                            const hidden = hiddenCols.has(c.name);
                            return (
                              <label key={c.id} className={`flex items-center gap-2 px-2.5 py-1 text-[11px] ${isId ? "text-[#4a4a55] cursor-default" : "text-[#ededed] cursor-pointer hover:bg-[#1e1e24]"}`}>
                                <input
                                  type="checkbox"
                                  className="accent-[#7c3aed]"
                                  checked={!hidden}
                                  disabled={isId}
                                  onChange={() => setHiddenCols((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(c.name)) next.delete(c.name); else next.add(c.name);
                                    return next;
                                  })}
                                />
                                {c.name}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </th>
                  {visibleColumns.map((c) => (
                    <th key={c.id} className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-left text-[11px] font-medium text-[#6b6b77] whitespace-nowrap">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={(e) => handleRowClick(row.id, e)}
                    className={`cursor-pointer border-b border-[#2a2a2f] ${selectedRowIds.has(row.id) ? "bg-[#1e1b4b]" : "hover:bg-[#1e1e24]"}`}
                  >
                    <td className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#4a4a55] text-[11px] text-center">{idx + 1}</td>
                    {visibleColumns.map((c) => {
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
                {!searchQuery && (
                  <tr className="hover:bg-[#1e1e24] cursor-pointer" onClick={addRow}>
                    <td colSpan={visibleColumns.length + 1} className="px-2.5 py-2.5 text-center text-[11px] text-[#4a4a55] hover:text-[#6b6b77]">
                      <Plus size={11} className="inline -mt-px mr-1" />행 추가
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단 탭 패널: 대화 | 밸런싱 분석 | 차트. ChevronDown 으로 아래로 숨김 */}
      <div className={`${bottomCollapsed ? "" : "h-[300px]"} border-t border-[#2a2a2f] flex flex-col flex-shrink-0 bg-[#16161a]`}>
        <div className="flex items-center px-2 border-b border-[#2a2a2f] flex-shrink-0">
          <BottomTab active={bottomTab === "chat"} onClick={() => setBottomTab("chat")}><MessageSquare size={12} />대화</BottomTab>
          <BottomTab active={bottomTab === "balance"} onClick={() => setBottomTab("balance")}><BarChart3 size={12} />밸런싱 분석</BottomTab>
          <BottomTab active={bottomTab === "chart"} onClick={() => setBottomTab("chart")}><TrendingUp size={12} />차트</BottomTab>
          <button
            onClick={() => setBottomCollapsed((v) => { localStorage.setItem("editor:bottomCollapsed", v ? "0" : "1"); return !v; })}
            title={bottomCollapsed ? "펼치기" : "아래로 숨기기"}
            className="ml-auto mr-1 text-[#6b6b77] hover:text-[#ededed] transition-colors p-1"
          >
            {bottomCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {!bottomCollapsed && (bottomTab === "chart" ? (
          <div className="flex-1 overflow-auto p-3">
            {numericCols.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[12px] text-[#4a4a55]">숫자 컬럼이 없습니다.</div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap text-[11px]">
                  <span className="text-[10px] text-[#6b6b77]">X축</span>
                  <select value={chartX} onChange={(e) => setChartX(e.target.value)} className="bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-[#ededed] outline-none">
                    {columns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <span className="text-[10px] text-[#6b6b77] ml-2">Y축</span>
                  {numericCols.map((c) => (
                    <label key={c.id} className="flex items-center gap-1 cursor-pointer text-[#9a9aa3]">
                      <input type="checkbox" className="accent-[#7c3aed]" checked={chartY.includes(c.name)}
                        onChange={(e) => setChartY((prev) => e.target.checked ? [...prev, c.name] : prev.filter((y) => y !== c.name))} />
                      {c.name}
                    </label>
                  ))}
                </div>
                {chartY.length > 0
                  ? <LineChart series={chartSeries} xLabels={chartXLabels} height={195} />
                  : <div className="flex items-center justify-center h-[180px] text-[12px] text-[#4a4a55]">Y축 컬럼을 1개 이상 선택하세요</div>}
              </>
            )}
          </div>
        ) : bottomTab === "chat" ? (
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
                {balance.length > 0 && balance.some((b) => b.anomalies.length > 0) && (
                  <Btn onClick={applyAllAnomalies}>전체 보정</Btn>
                )}
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
        ))}
      </div>

      {/* 상태바 */}
      <div className="h-6 bg-[#0f0f10] border-t border-[#2a2a2f] flex items-center px-4 gap-3 text-[10px] text-[#3a3a42] flex-shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0" />
        <span>game-data-studio.db</span>
        <span className="text-[#2a2a2f]">·</span>
        <span>{rows.length}행 {columns.length}컬럼{searchQuery.trim() && ` (${filteredRows.length}건 표시)`}</span>
        <div className="ml-auto flex gap-3">
          {totalAnomalies > 0 && <span className="text-[#f87171]">이상값 {totalAnomalies}건</span>}
          {totalWarns > 0 && <span className="text-[#f59e0b]">경고 {totalWarns}건</span>}
        </div>
      </div>

      {/* 성장 곡선 생성 모달 */}
      <Modal open={showCurve} onClose={() => setShowCurve(false)} title="성장 곡선 생성">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">레벨 컬럼</div>
              <Input value={curve.level_column} onChange={(e) => setCurve({ ...curve, level_column: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">값 컬럼 *</div>
              <Input placeholder="예: exp" value={curve.value_column} onChange={(e) => setCurve({ ...curve, value_column: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">곡선 타입</div>
            <Select value={curve.type} onChange={(e) => setCurve({ ...curve, type: e.target.value as CurveType })}>
              <option value="linear">linear — base + factor×(L-1)</option>
              <option value="power">power — base × L^factor</option>
              <option value="exponential">exponential — base × factor^(L-1)</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">base</div>
              <Input value={curve.base} onChange={(e) => setCurve({ ...curve, base: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">factor</div>
              <Input value={curve.factor} onChange={(e) => setCurve({ ...curve, factor: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">개수(레벨)</div>
              <Input value={curve.count} onChange={(e) => setCurve({ ...curve, count: e.target.value })} />
            </div>
          </div>

          {/* 미리보기 */}
          {curvePreview.length > 0 && (
            <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">미리보기</div>
                <div className="text-[10px] text-[#6b6b77]">Lv1 {curvePreview[0].toLocaleString()} → Lv{curvePreview.length} {curvePreview[curvePreview.length - 1].toLocaleString()}</div>
              </div>
              <div className="flex items-end gap-px h-16">
                {(() => {
                  const max = Math.max(...curvePreview, 1);
                  const step = Math.max(1, Math.ceil(curvePreview.length / 40));
                  return curvePreview.filter((_, i) => i % step === 0).map((v, i) => (
                    <div key={i} className="flex-1 bg-[#7c3aed] rounded-t-sm min-w-0" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={v.toLocaleString()} />
                  ));
                })()}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] text-[#9a9aa3] cursor-pointer">
            <input type="checkbox" checked={curve.replace} onChange={(e) => setCurve({ ...curve, replace: e.target.checked })} className="accent-[#7c3aed]" />
            기존 행을 모두 지우고 새로 생성 (체크 해제 시 추가)
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={() => setShowCurve(false)}>취소</Btn>
            <Btn variant="primary" onClick={runCurve} disabled={!curve.value_column.trim() || curvePreview.length === 0}><TrendingUp size={11} />생성</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
