"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, Sparkles, Trash2, MessageSquare, BarChart3, TrendingUp, ChevronDown, ChevronUp, Eye, EyeOff, Save, Undo2, Redo2, StickyNote, GitCompare, Plus } from "lucide-react";
import { Btn, GradeBadge, PanelHeader, PanelItem, BottomTab, Tooltip } from "@/components/ui";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LineChart } from "@/components/chart/LineChart";
import { computeCurve } from "@/lib/curve/generate";
import { solveCurve } from "@/lib/curve/solve";
import { fitCurve } from "@/lib/curve/fit";
import { CurveModal, type CurveState } from "@/components/editor/CurveModal";
import { AnnotationModal } from "@/components/editor/AnnotationModal";
import { FormulaPreviewModal } from "@/components/editor/FormulaPreviewModal";
import { SnapshotDiffModal, type DiffResultData } from "@/components/editor/SnapshotDiffModal";
import { useGridState, coerce, cellsToTSV, tsvToCommands, type Row, type CellCmd, type RowsDeleteCmd } from "@/components/editor/useGridState";
import { type Screen } from "@/app/page";

const CHART_PALETTE = ["#7c3aed", "#4ade80", "#f59e0b", "#f87171", "#38bdf8", "#c4b5fd"];

interface Table { id: string; name: string; }
interface Column { id: string; table_id?: string; name: string; type: "string" | "number" | "boolean" | "enum"; enum_type_id?: string | null; }
interface Anomaly { row_id: string; label: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; anomalies: Anomaly[]; }
interface Violation { row_id: string; column: string; rule: "min" | "max" | "required" | "unique"; value: unknown; message: string; }
interface EnumType { id: string; name: string; values: string[]; }
interface BrokenRef { from_table_id: string; from_row_id: string; from_column: string; value: unknown; to_table_id: string; to_column: string; }
interface ReferencingRow { table_id: string; row_id: string; column: string; }

export function DataEditor({ projectId, onNavigate }: { projectId: string; onNavigate?: (screen: Screen) => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const grid = useGridState();
  const { rows } = grid;
  const [balance, setBalance] = useState<BalanceResult[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [brokenRefs, setBrokenRefs] = useState<BrokenRef[]>([]);
  const [enumTypes, setEnumTypes] = useState<EnumType[]>([]);
  const [editing, setEditing] = useState<{ rowId: string; col: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  // 셀 선택(복붙용). selectedRowIds(행 선택, 삭제용)와 완전 분리·공존. activeCell=시작, anchorCell=범위 반대편.
  const [activeCell, setActiveCell] = useState<{ rowId: string; col: string } | null>(null);
  const [anchorCell, setAnchorCell] = useState<{ rowId: string; col: string } | null>(null);
  // Ctrl+클릭으로 추가된 비연속 셀/범위. 각 항목이 독립적인 직사각형 범위.
  type CellRange = { active: { rowId: string; col: string }; anchor: { rowId: string; col: string } | null };
  const [additionalRanges, setAdditionalRanges] = useState<CellRange[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColToggle, setShowColToggle] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: string; name: string; created_at: number }[]>([]);
  // 스냅샷 diff: A(기준)·B(비교) 선택 후 /api/snapshots action:"diff" 호출 → 변경 행 목록.
  const [showDiff, setShowDiff] = useState(false);
  const [diffA, setDiffA] = useState("");
  const [diffB, setDiffB] = useState("");
  const [diffResult, setDiffResult] = useState<DiffResultData | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bottomTab, setBottomTab] = useState<"chat" | "balance" | "chart">("chat");
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  useEffect(() => { if (localStorage.getItem("editor:bottomCollapsed") === "1") setBottomCollapsed(true); }, []);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartX, setChartX] = useState("");
  const [chartY, setChartY] = useState<string[]>([]);
  const [showCurve, setShowCurve] = useState(false);
  const [curve, setCurve] = useState<CurveState>({ value_column: "", level_column: "level", type: "power", base: "100", factor: "1.5", count: "30", replace: true, range: "100", rate: "0.3", midpoint: "15" });
  const [solveTargetLevel, setSolveTargetLevel] = useState("");
  const [solveTargetValue, setSolveTargetValue] = useState("");
  const [solveResult, setSolveResult] = useState<{ ok: boolean; achievedValue?: number } | null>(null);
  // 곡선 피팅: (level, value) 점 입력 → fitCurve(클라이언트 순수) → base/factor 자동 채움 + R².
  const [fitPoints, setFitPoints] = useState<{ level: string; value: string }[]>([{ level: "1", value: "" }, { level: "2", value: "" }]);
  const [fitResult, setFitResult] = useState<{ ok: boolean; r2?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const balanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickedRowRef = useRef<string | null>(null);
  // annotations (수치 근거 메모): row_id별 메모 목록. 행 우측 StickyNote 아이콘 + 모달.
  const [annotationsByRow, setAnnotationsByRow] = useState<Map<string, { id: string; note: string; column_name: string | null }[]>>(new Map());
  const [annotationTarget, setAnnotationTarget] = useState<{ rowId: string } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [annotationLoading, setAnnotationLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [addRowCount, setAddRowCount] = useState(1);
  const [formulaPreview, setFormulaPreview] = useState<{ name: string; type: string; base: number; factor: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isUndoRedoInProgressRef = useRef(false);
  const isResizingRef = useRef(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const DEFAULT_COL_WIDTH = 120;

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadData = (tid: string) => Promise.all([
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns)),
    fetch(`/api/rows?table_id=${tid}`).then((r) => r.json()).then((rows: Row[]) => grid.load(rows)),
  ]);
  const enumValuesFor = (col: Column): string[] => enumTypes.find((e) => e.id === col.enum_type_id)?.values ?? [];

  // 메모 로드: 테이블 전체 annotation 조회 → row_id별 Map. row_id 없는(테이블/컬럼 수준) 항목은 제외.
  const loadAnnotations = async () => {
    if (!selectedId) { setAnnotationsByRow(new Map()); return; }
    try {
      const data: { id: string; row_id: string | null; column_name: string | null; note: string }[] =
        await fetch(`/api/annotations?table_id=${selectedId}`).then((r) => r.json());
      const map = new Map<string, { id: string; note: string; column_name: string | null }[]>();
      for (const a of data) {
        if (!a.row_id) continue;
        const arr = map.get(a.row_id) ?? [];
        arr.push({ id: a.id, note: a.note, column_name: a.column_name });
        map.set(a.row_id, arr);
      }
      setAnnotationsByRow(map);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetch(`/api/enum-types?project_id=${projectId}`).then((r) => r.json()).then(setEnumTypes).catch(() => {}); }, [projectId]);
  useEffect(() => { loadTables(); }, [projectId]);
  useEffect(() => { if (selectedId) { loadData(selectedId); runValidate(selectedId); runFkCheck(); } }, [selectedId]);
  useEffect(() => { loadAnnotations(); }, [selectedId]);

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

  const addRows = async (count: number) => {
    if (!selectedId) return;
    setShowAddRowModal(false);
    for (let i = 0; i < count; i++) {
      const data: Record<string, unknown> = {};
      columns.forEach((c) => { data[c.name] = c.type === "number" ? 0 : ""; });
      const r = await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, data }) });
      const row = await r.json();
      grid.append(row);
    }
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
    const ids = Array.from(selectedRowIds);
    // 삭제 전 참조 경고(★ surface-not-block): 참조하는 행이 있으면 confirm에 경고만 추가, 차단하지 않음.
    // 조회 실패 시에도 삭제를 막지 않고 기본 confirm으로 폴백한다.
    let refWarning = "";
    if (selectedId) {
      try {
        const res = await fetch("/api/fk/refs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId, table_id: selectedId, row_ids: ids }) });
        const d = await res.json();
        if (d.error) throw new Error(d.error);
        const referencing: { row_id: string; refs: ReferencingRow[] }[] = d.referencing ?? [];
        // 참조하는 행을 table_id:row_id로 중복 제거(같은 행이 여러 컬럼으로 참조해도 1행).
        const refSet = new Set<string>();
        for (const r of referencing) for (const ref of r.refs) refSet.add(`${ref.table_id}:${ref.row_id}`);
        if (refSet.size > 0) refWarning = `\n\n⚠️ 선택한 행을 ${refSet.size}개 행이 참조합니다. 삭제 시 참조가 깨집니다.`;
      } catch (e) { console.error(e); }
    }
    if (!confirm(`${selectedRowIds.size}행을 삭제합니다.${refWarning}`)) return;
    // 삭제 전 행 데이터와 위치 보존 (undo 복구용)
    const deletedRows: Row[] = [];
    const deletedIndices: number[] = [];
    for (const id of ids) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) { deletedRows.push(rows[idx]); deletedIndices.push(idx); }
    }
    await fetch("/api/rows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row_ids: ids }),
    });
    grid.deleteWithUndo(deletedRows, deletedIndices);
    setSelectedRowIds(new Set());
    scheduleBalance();
    runFkCheck();
  };

  // 저장 표시기: saving → POST → saved(2초) → idle. 실패 시 idle 복귀(멈춤 방지).
  const postRow = async (id: string, data: Record<string, unknown>) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setSaveState("saving");
    try {
      await fetch("/api/rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, id, data }) });
      setSaveState("saved");
      saveTimer.current = setTimeout(() => { saveTimer.current = null; setSaveState("idle"); }, 2000);
      return true;
    } catch (e) {
      console.error(e);
      setSaveState("idle");
      return false;
    }
  };
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const saveCell = async (row: Row, col: string, val: string) => {
    const col_ = columns.find((c) => c.name === col);
    const parsed = col_ ? coerce(col_.type, val) : val;
    const before = row.data[col];
    const newData = { ...row.data, [col]: parsed };
    const ok = await postRow(row.id, newData);
    setEditing(null);
    if (!ok) return;
    grid.updateCell(row.id, col, before, parsed);
    scheduleBalance();
  };

  // 그룹(CellCmd[])을 rowId로 묶어 행별 full data 조립 → 행당 1 POST 루프.
  // ⚠️ 같은 행 여러 셀을 셀당 POST하면 서로 덮어써 마지막만 남으므로 반드시 행 단위로 합쳐 POST.
  const postGroup = async (group: CellCmd[], dir: "before" | "after"): Promise<boolean> => {
    const byRow = new Map<string, Record<string, unknown>>();
    for (const c of group) {
      const base = byRow.get(c.rowId) ?? grid.rows.find((r) => r.id === c.rowId)?.data;
      if (!base) continue;
      byRow.set(c.rowId, { ...base, [c.col]: c[dir] });
    }
    if (byRow.size === 0) return false;
    let ok = true;
    for (const [id, data] of byRow) { if (!(await postRow(id, data))) ok = false; }
    return ok;
  };

  // Undo/Redo: reducer는 순수하므로 DB 라운드트립(POST)을 컴포넌트에서 처리. 성공 시에만 dispatch.
  // isUndoRedoInProgressRef: 연속 Ctrl+Z 시 같은 entry가 중복 처리되는 race condition 방지.
  const handleUndo = async () => {
    if (isUndoRedoInProgressRef.current) return;
    const entry = grid.undoTop;
    if (!entry) return;
    isUndoRedoInProgressRef.current = true;
    try {
      if (!Array.isArray(entry)) {
        // 행 삭제 undo: 삭제된 행을 DB에 복구
        const cmd = entry as RowsDeleteCmd;
        for (const row of cmd.rows) await postRow(row.id, row.data);
        grid.undo();
        scheduleBalance();
        runFkCheck();
      } else {
        if (!(await postGroup(entry, "before"))) return;
        grid.undo();
        scheduleBalance();
      }
    } finally {
      isUndoRedoInProgressRef.current = false;
    }
  };
  const handleRedo = async () => {
    if (isUndoRedoInProgressRef.current) return;
    const entry = grid.redoTop;
    if (!entry) return;
    isUndoRedoInProgressRef.current = true;
    try {
      if (!Array.isArray(entry)) {
        // 행 삭제 redo: DB에서 다시 삭제
        const cmd = entry as RowsDeleteCmd;
        const ids = cmd.rows.map((r) => r.id);
        await fetch("/api/rows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_ids: ids }) });
        grid.redo();
        scheduleBalance();
        runFkCheck();
      } else {
        if (!(await postGroup(entry, "after"))) return;
        grid.redo();
        scheduleBalance();
      }
    } finally {
      isUndoRedoInProgressRef.current = false;
    }
  };

  // 셀 mousedown: 드래그 선택 시작. shift+클릭 = 범위 확장. ctrl+클릭 = 비연속 셀 토글.
  const handleCellMouseDown = (rowId: string, col: string, e: React.MouseEvent) => {
    if (e.button !== 0 || isResizingRef.current) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setAdditionalRanges((prev) => {
        // 동일 단일 셀이 이미 있으면 제거(토글), 없으면 추가
        const idx = prev.findIndex((r) => r.active.rowId === rowId && r.active.col === col && !r.anchor);
        return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, { active: { rowId, col }, anchor: null }];
      });
      return;
    }
    setAdditionalRanges([]);
    if (e.shiftKey && activeCell) {
      setAnchorCell({ rowId, col });
    } else {
      setActiveCell({ rowId, col });
      setAnchorCell(null);
    }
    isDraggingRef.current = true;
  };

  // 컬럼 너비 드래그 리사이즈. isResizingRef로 셀 드래그 선택과 충돌 방지.
  const startResize = (colName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = colWidths[colName] ?? DEFAULT_COL_WIDTH;
    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + ev.clientX - startX);
      setColWidths((prev) => ({ ...prev, [colName]: newWidth }));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // 컬럼 헤더 클릭: 해당 컬럼 전체 셀을 선택. Shift=범위 확장. Ctrl=비연속 추가/토글.
  const handleColumnHeaderClick = (colName: string, ci: number, e: React.MouseEvent) => {
    if (!filteredRows.length) return;
    const firstRow = filteredRows[0].id;
    const lastRow = filteredRows[filteredRows.length - 1].id;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedRowIds(new Set());
      setAdditionalRanges((prev) => {
        const exists = prev.findIndex((r) => r.active.col === colName && r.anchor?.col === colName);
        return exists >= 0 ? prev.filter((_, i) => i !== exists) : [...prev, { active: { rowId: firstRow, col: colName }, anchor: { rowId: lastRow, col: colName } }];
      });
      return;
    }
    if (e.shiftKey && activeCell) {
      const anchorColIdx = visibleColumns.findIndex((c) => c.name === activeCell.col);
      const from = Math.min(anchorColIdx, ci);
      const to = Math.max(anchorColIdx, ci);
      setActiveCell({ rowId: firstRow, col: visibleColumns[from].name });
      setAnchorCell({ rowId: lastRow, col: visibleColumns[to].name });
      setAdditionalRanges([]);
      setSelectedRowIds(new Set());
    } else {
      setActiveCell({ rowId: firstRow, col: colName });
      setAnchorCell({ rowId: lastRow, col: colName });
      setAdditionalRanges([]);
      setSelectedRowIds(new Set());
    }
  };

  // 행 번호 클릭: 해당 행 전체 셀을 activeCell~anchorCell로 선택 + selectedRowIds 업데이트.
  // Shift+클릭 = 범위 확장. Ctrl+클릭 = 행 단위 비연속 추가/토글.
  const handleRowNumberClick = (rowId: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!visibleColumns.length) return;
    const firstCol = visibleColumns[0].name;
    const lastCol = visibleColumns[visibleColumns.length - 1].name;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setAdditionalRanges((prev) => {
        const exists = prev.findIndex((r) => r.active.rowId === rowId && r.anchor?.rowId === rowId);
        return exists >= 0 ? prev.filter((_, i) => i !== exists) : [...prev, { active: { rowId, col: firstCol }, anchor: { rowId, col: lastCol } }];
      });
      return;
    }
    if (e.shiftKey && activeCell) {
      const anchorRowIdx = filteredRows.findIndex((r) => r.id === activeCell.rowId);
      const from = Math.min(anchorRowIdx, idx);
      const to = Math.max(anchorRowIdx, idx);
      setSelectedRowIds(new Set(filteredRows.slice(from, to + 1).map((r) => r.id)));
      setActiveCell({ rowId: filteredRows[from].id, col: firstCol });
      setAnchorCell({ rowId: filteredRows[to].id, col: lastCol });
      setAdditionalRanges([]);
    } else {
      setSelectedRowIds(new Set([rowId]));
      setActiveCell({ rowId, col: firstCol });
      setAnchorCell({ rowId, col: lastCol });
      setAdditionalRanges([]);
    }
  };

  // 스프레드시트 영역 빈 곳(td 밖) 클릭 시 셀 선택 전체 해제
  const handleGridAreaMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("td")) {
      setActiveCell(null);
      setAnchorCell(null);
      setAdditionalRanges([]);
    }
  };

  // 드래그 중 마우스가 셀에 진입하면 anchorCell 확장
  const handleCellMouseEnter = (rowId: string, col: string) => {
    if (!isDraggingRef.current) return;
    setAnchorCell({ rowId, col });
  };

  // 선택 범위 셀을 빈값으로 초기화 (id 컬럼 제외). 주 범위 + additionalRanges 모두 처리.
  const deleteSelection = async () => {
    const rows_ = filteredRowsRef.current;
    const cols_ = visibleColumnsRef.current;
    const seen = new Set<string>();
    const cmds: CellCmd[] = [];
    const addCmd = (ri: number, ci: number) => {
      const row = rows_[ri], col = cols_[ci];
      if (!row || !col || col.name === "id") return;
      const key = `${row.id}:${col.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      const before = row.data[col.name];
      const after = col.type === "number" ? 0 : "";
      if (before === after) return;
      cmds.push({ rowId: row.id, col: col.name, before, after });
    };
    const r = selectionRange();
    if (r) for (let ri = r.r0; ri <= r.r1; ri++) for (let ci = r.c0; ci <= r.c1; ci++) addCmd(ri, ci);
    for (const ar of additionalRanges) {
      const ar_ = rows_.findIndex((x) => x.id === ar.active.rowId);
      const ac_ = cols_.findIndex((x) => x.name === ar.active.col);
      const br_ = ar.anchor ? rows_.findIndex((x) => x.id === ar.anchor!.rowId) : ar_;
      const bc_ = ar.anchor ? cols_.findIndex((x) => x.name === ar.anchor!.col) : ac_;
      for (let ri = Math.min(ar_, br_); ri <= Math.max(ar_, br_); ri++)
        for (let ci = Math.min(ac_, bc_); ci <= Math.max(ac_, bc_); ci++) addCmd(ri, ci);
    }
    if (!cmds.length) return;
    if (!(await postGroup(cmds, "after"))) return;
    grid.batchUpdate(cmds);
    scheduleBalance();
    runValidate();
  };

  // activeCell~anchorCell 사각형 범위를 화면상의 filteredRows·visibleColumns idx로 환산.
  const selectionRange = (): { r0: number; r1: number; c0: number; c1: number } | null => {
    if (!activeCell) return null;
    const ri = (id: string) => filteredRows.findIndex((r) => r.id === id);
    const ci = (name: string) => visibleColumns.findIndex((c) => c.name === name);
    const ar = ri(activeCell.rowId), ac = ci(activeCell.col);
    if (ar < 0 || ac < 0) return null;
    const br = anchorCell ? ri(anchorCell.rowId) : ar;
    const bc = anchorCell ? ci(anchorCell.col) : ac;
    if (anchorCell && (br < 0 || bc < 0)) return { r0: ar, r1: ar, c0: ac, c1: ac };
    return { r0: Math.min(ar, br), r1: Math.max(ar, br), c0: Math.min(ac, bc), c1: Math.max(ac, bc) };
  };

  const isCellSelected = (rowId: string, col: string): boolean => {
    const range = selectionRange();
    const r = filteredRows.findIndex((x) => x.id === rowId);
    const c = visibleColumns.findIndex((x) => x.name === col);
    if (range && r >= range.r0 && r <= range.r1 && c >= range.c0 && c <= range.c1) return true;
    for (const ar of additionalRanges) {
      const ar_ = filteredRows.findIndex((x) => x.id === ar.active.rowId);
      const ac_ = visibleColumns.findIndex((x) => x.name === ar.active.col);
      const br_ = ar.anchor ? filteredRows.findIndex((x) => x.id === ar.anchor!.rowId) : ar_;
      const bc_ = ar.anchor ? visibleColumns.findIndex((x) => x.name === ar.anchor!.col) : ac_;
      if (r >= Math.min(ar_, br_) && r <= Math.max(ar_, br_) && c >= Math.min(ac_, bc_) && c <= Math.max(ac_, bc_)) return true;
    }
    return false;
  };

  // Electron clipboard 우선, 없으면 navigator.clipboard 폴백.
  const elApi = () => (typeof window !== "undefined" ? (window as unknown as Record<string, { readClipboard?: () => string; writeClipboard?: (t: string) => void }>)["electronAPI"] : undefined);

  // Ctrl+C: 선택 범위(없으면 activeCell 단일)를 TSV로 클립보드 복사.
  // Electron API → navigator.clipboard → execCommand 순으로 시도.
  const copySelection = async () => {
    const range = selectionRange();
    if (!range) return;
    const tsv = cellsToTSV(filteredRows, visibleColumns, range);

    const api = elApi();
    if (api?.writeClipboard) {
      try { api.writeClipboard(tsv); return; } catch { /* fall through */ }
    }
    if (navigator?.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(tsv); return; } catch { /* fall through */ }
    }
    try {
      const el = document.createElement("textarea");
      el.value = tsv;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch { /* ignore */ }
  };

  // Ctrl+V: 클립보드 TSV를 activeCell 기준으로 매핑 → 행당 1 POST → grid.batchUpdate(1 undo 엔트리).
  const pasteSelection = async () => {
    if (!activeCell) return;
    let tsv = "";

    const api = elApi();
    if (api?.readClipboard) {
      try { tsv = api.readClipboard(); } catch { /* fall through */ }
    }
    if (!tsv && navigator?.clipboard?.readText) {
      try { tsv = await navigator.clipboard.readText(); } catch { /* fall through */ }
    }
    if (!tsv) return;
    const anchorRowIndex = filteredRows.findIndex((r) => r.id === activeCell.rowId);
    const anchorColIndex = visibleColumns.findIndex((c) => c.name === activeCell.col);
    if (anchorRowIndex < 0 || anchorColIndex < 0) return;
    const cmds = tsvToCommands(tsv, { rowIndex: anchorRowIndex, colIndex: anchorColIndex }, filteredRows, visibleColumns);
    if (cmds.length === 0) return;
    if (!(await postGroup(cmds, "after"))) return;
    grid.batchUpdate(cmds);
    scheduleBalance();
  };

  // 단축키 핸들러를 ref에 보관(매 렌더 갱신)해 stale closure 없이 [] deps 리스너에서 최신 값 호출.
  const shortcutRef = useRef({ handleUndo, handleRedo, copySelection, pasteSelection, deleteSelection, editing, activeCell, setActiveCell, setAnchorCell });
  shortcutRef.current = { handleUndo, handleRedo, copySelection, pasteSelection, deleteSelection, editing, activeCell, setActiveCell, setAnchorCell };
  // filteredRows·visibleColumns는 아래 선언 후 별도 ref로 관리 (선언 순서 제약 우회)
  const filteredRowsRef = useRef<Row[]>([]);
  const visibleColumnsRef = useRef<Column[]>([]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const isUndoRedo = (e.metaKey || e.ctrlKey) && (k === "z" || k === "y");
      const isCopy = (e.metaKey || e.ctrlKey) && k === "c";
      const isPaste = (e.metaKey || e.ctrlKey) && k === "v";
      const isTab = e.key === "Tab";
      const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
      const isDelete = e.key === "Delete" || e.key === "Backspace";
      if (!isUndoRedo && !isCopy && !isPaste && !isTab && !isArrow && !isDelete) return;
      // 가드: 셀 편집 중이거나 입력 요소에 포커스가 있으면(채팅·검색) 브라우저 기본 동작 우선.
      const el = document.activeElement;
      const tag = el?.tagName.toLowerCase();
      if (shortcutRef.current.editing !== null || tag === "input" || tag === "textarea" || tag === "select") return;
      if (isCopy) {
        if (!shortcutRef.current.activeCell) return;
        e.preventDefault();
        shortcutRef.current.copySelection();
        return;
      }
      if (isPaste) {
        if (!shortcutRef.current.activeCell) return;
        e.preventDefault();
        shortcutRef.current.pasteSelection();
        return;
      }
      if (isTab) {
        e.preventDefault();
        const { activeCell: ac, setActiveCell: setAC, setAnchorCell: setAnc } = shortcutRef.current;
        const rows = filteredRowsRef.current;
        const cols = visibleColumnsRef.current;
        if (!ac) return;
        const rowIdx = rows.findIndex((r) => r.id === ac.rowId);
        const colIdx = cols.findIndex((c) => c.name === ac.col);
        if (rowIdx < 0 || colIdx < 0) return;
        let nextCol = colIdx + (e.shiftKey ? -1 : 1);
        let nextRow = rowIdx;
        if (nextCol >= cols.length) { nextCol = 0; nextRow = Math.min(rowIdx + 1, rows.length - 1); }
        else if (nextCol < 0) { nextCol = cols.length - 1; nextRow = Math.max(rowIdx - 1, 0); }
        const next = { rowId: rows[nextRow].id, col: cols[nextCol].name };
        setAC(next);
        setAnc(next);
        return;
      }
      if (isArrow) {
        const { activeCell: ac, setActiveCell: setAC, setAnchorCell: setAnc } = shortcutRef.current;
        if (!ac) return;
        e.preventDefault();
        const rows = filteredRowsRef.current;
        const cols = visibleColumnsRef.current;
        const rowIdx = rows.findIndex((r) => r.id === ac.rowId);
        const colIdx = cols.findIndex((c) => c.name === ac.col);
        if (rowIdx < 0 || colIdx < 0) return;
        let nextRow = rowIdx;
        let nextCol = colIdx;
        if (e.key === "ArrowUp") nextRow = Math.max(0, rowIdx - 1);
        else if (e.key === "ArrowDown") nextRow = Math.min(rows.length - 1, rowIdx + 1);
        else if (e.key === "ArrowLeft") nextCol = Math.max(0, colIdx - 1);
        else if (e.key === "ArrowRight") nextCol = Math.min(cols.length - 1, colIdx + 1);
        const next = { rowId: rows[nextRow].id, col: cols[nextCol].name };
        setAC(next);
        setAnc(null);
        return;
      }
      if (isDelete) {
        if (!shortcutRef.current.activeCell) return;
        e.preventDefault();
        shortcutRef.current.deleteSelection();
        return;
      }
      const isRedo = k === "y" || (k === "z" && e.shiftKey);
      e.preventDefault();
      if (isRedo) shortcutRef.current.handleRedo(); else shortcutRef.current.handleUndo();
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const onMouseUp = () => { isDraggingRef.current = false; };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  // activeCell 변경 시 해당 셀이 스크롤 영역 밖이면 자동 스크롤.
  useEffect(() => {
    if (!activeCell || !gridContainerRef.current) return;
    const rowIdx = filteredRowsRef.current.findIndex((r) => r.id === activeCell.rowId);
    const colIdx = visibleColumnsRef.current.findIndex((c) => c.name === activeCell.col);
    if (rowIdx < 0 || colIdx < 0) return;
    const tbody = gridContainerRef.current.querySelector("tbody");
    if (!tbody) return;
    const tr = (tbody as HTMLTableSectionElement).rows[rowIdx];
    if (!tr) return;
    const td = tr.cells[colIdx + 1]; // +1은 행번호 td
    td?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeCell]);

  const runBalance = async () => {
    if (!selectedId) return;
    const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId }) });
    const d = await res.json();
    setBalance(d.results ?? []);
  };

  // 제약 위반 검증. 읽기/편집은 막지 않고 위반 셀을 하이라이트하기 위한 surface 조회.
  const runValidate = async (tid = selectedId) => {
    if (!tid) return;
    try {
      const res = await fetch("/api/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: tid }) });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setViolations(d.violations ?? []);
    } catch (e) { console.error(e); }
  };

  // FK 무결성 검증(읽기 전용). 프로젝트 전체 깨진 참조를 조회 → 셀 하이라이트용 surface.
  const runFkCheck = async () => {
    try {
      const res = await fetch("/api/fk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setBrokenRefs(d.broken ?? []);
    } catch (e) { console.error(e); }
  };

  // 셀 편집마다 즉시 재분석하지 않고 연속 편집을 모아 한 번만 재계산한다(API 호출 폭주 방지).
  const scheduleBalance = () => {
    if (balanceTimer.current) clearTimeout(balanceTimer.current);
    balanceTimer.current = setTimeout(() => { balanceTimer.current = null; runBalance(); }, 500);
  };
  useEffect(() => () => { if (balanceTimer.current) clearTimeout(balanceTimer.current); }, []);

  // 이상값을 (rowId:col) 키로 인덱싱해 셀 렌더링 시 O(1) 조회 (기존엔 셀마다 balance 전체 스캔).
  const hasFormulaColumns = useMemo(() => {
    const names = new Set(columns.map((c) => c.name));
    return names.has("growth_type") && names.has("growth_base") && names.has("growth_factor");
  }, [columns]);

  const anomalyMap = useMemo(() => {
    const m = new Map<string, Anomaly>();
    for (const b of balance) for (const a of b.anomalies) m.set(`${a.row_id}:${b.column}`, a);
    return m;
  }, [balance]);
  const getAnomaly = (rowId: string, col: string) => anomalyMap.get(`${rowId}:${col}`) ?? null;

  // 위반을 (rowId:col) 키로 묶어 셀 렌더 시 O(1) 조회(한 셀에 여러 규칙 위반 가능 → 배열).
  const violationMap = useMemo(() => {
    const m = new Map<string, Violation[]>();
    for (const v of violations) {
      const key = `${v.row_id}:${v.column}`;
      const arr = m.get(key);
      if (arr) arr.push(v); else m.set(key, [v]);
    }
    return m;
  }, [violations]);
  const getViolations = (rowId: string, col: string) => violationMap.get(`${rowId}:${col}`) ?? null;

  // 깨진 FK를 (rowId:col) 키로 묶어 셀 렌더 시 O(1) 조회. 현재 테이블이 from_table_id인 broken만.
  const brokenFkMap = useMemo(() => {
    const m = new Map<string, BrokenRef>();
    for (const b of brokenRefs) {
      if (b.from_table_id !== selectedId) continue;
      m.set(`${b.from_row_id}:${b.from_column}`, b);
    }
    return m;
  }, [brokenRefs, selectedId]);
  const getBrokenFk = (rowId: string, col: string) => brokenFkMap.get(`${rowId}:${col}`) ?? null;

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
    const base = Number(curve.base), count = Number(curve.count);
    if (!Number.isFinite(base) || !Number.isFinite(count) || count < 1) return [];
    if (curve.type === "s_curve") {
      const range = Number(curve.range), rate = Number(curve.rate), midpoint = Number(curve.midpoint);
      if (![range, rate, midpoint].every(Number.isFinite)) return [];
      return computeCurve({ type: "s_curve", base, factor: 0, count: Math.min(count, 200), range, rate, midpoint });
    }
    const factor = Number(curve.factor);
    if (!Number.isFinite(factor)) return [];
    return computeCurve({ type: curve.type, base, factor, count: Math.min(count, 200) });
  })();

  // 목표값으로 factor 역산 (클라이언트 순수 함수, type/base 는 모달 현재 값 사용)
  const runSolve = () => {
    if (curve.type === "s_curve") { setSolveResult({ ok: false }); return; }
    const r = solveCurve(curve.type, Number(curve.base), Number(solveTargetLevel), Number(solveTargetValue));
    if (!r.solved) { setSolveResult({ ok: false }); return; }
    setCurve({ ...curve, factor: String(r.factor) });
    setSolveResult({ ok: true, achievedValue: r.achievedValue });
  };

  // 점에서 곡선 맞추기 (클라이언트 순수 fitCurve, 현재 type 기준)
  // 빈/NaN 행은 제외. 유효점 2개 미만이면 안내만 하고 base/factor 를 건드리지 않는다(0 덮어쓰기 방지).
  const runFit = () => {
    const usable = fitPoints
      .filter((p) => p.level.trim() !== "" && p.value.trim() !== "" && Number.isFinite(Number(p.level)) && Number.isFinite(Number(p.value)))
      .map((p) => ({ level: Number(p.level), value: Number(p.value) }));
    if (usable.length < 2) { setFitResult({ ok: false }); return; }
    const r = fitCurve(usable, curve.type);
    if (curve.type === "s_curve") {
      setCurve({ ...curve, base: String(r.base), range: String(r.range ?? 100), rate: String(r.rate ?? 0.3), midpoint: String(r.midpoint ?? 15) });
    } else {
      setCurve({ ...curve, base: String(r.base), factor: String(r.factor) });
    }
    setFitResult({ ok: true, r2: r.r2 });
  };

  const runCurve = async () => {
    if (!selectedId || !curve.value_column.trim()) return;
    const body: Record<string, unknown> = {
      table_id: selectedId,
      value_column: curve.value_column.trim(),
      level_column: curve.level_column.trim() || "level",
      type: curve.type,
      base: Number(curve.base),
      factor: curve.type === "s_curve" ? 0 : Number(curve.factor),
      count: Number(curve.count),
      replace: curve.replace,
    };
    if (curve.type === "s_curve") {
      body.range = Number(curve.range);
      body.rate = Number(curve.rate);
      body.midpoint = Number(curve.midpoint);
    }
    const res = await fetch("/api/curve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "생성에 실패했습니다."); return; }
    setShowCurve(false);
    loadData(selectedId);
    runBalance();
    runValidate();
  };

  // 검색 필터
  const filteredRows = searchQuery.trim()
    ? rows.filter((r) =>
        columns.some((c) => String(r.data[c.name] ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : rows;

  // 컬럼 가시성 (id 컬럼은 항상 표시)
  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.name));
  filteredRowsRef.current = filteredRows;
  visibleColumnsRef.current = visibleColumns;

  // CSV 내보내기
  const saveBlob = async (blob: Blob, fileName: string, mimeType: string, ext: string) => {
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: fileName, accept: { [mimeType]: [ext] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  };

  const csvExport = async () => {
    if (!selectedId) return;
    const res = await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", table_id: selectedId }) });
    const blob = await res.blob();
    const fileName = (tables.find((t) => t.id === selectedId)?.name ?? "export") + ".csv";
    await saveBlob(blob, fileName, "text/csv", ".csv");
  };

  // JSON 내보내기
  const exportJson = async () => {
    if (!selectedId) return;
    const t = tables.find((t) => t.id === selectedId);
    const data = JSON.stringify(rows.map((r) => r.data), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const fileName = (t?.name ?? "export") + ".json";
    await saveBlob(blob, fileName, "application/json", ".json");
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
    runValidate();
  };

  // 스냅샷 비교: 선택한 A/B 스냅샷 간 변경 행을 서버에서 diff
  const runDiff = async () => {
    if (!diffA || !diffB || !selectedId) return;
    setDiffLoading(true);
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diff", table_id: selectedId, snapshot_a_id: diffA, snapshot_b_id: diffB }),
      });
      const data = await res.json();
      if (data.error) { console.error("diff 실패:", data.error); alert(data.error); return; }
      setDiffResult(data);
    } catch (err) {
      console.error("diff 요청 실패:", err);
      alert("스냅샷 비교에 실패했습니다.");
    } finally {
      setDiffLoading(false);
    }
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
    }
    grid.setRows(rows.map((r) => { const data = patches.get(r.id); return data ? { ...r, data } : r; }));
    runBalance();
    runValidate();
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
  const range = selectionRange();
  // 컬럼 너비 합 + 행번호(28px) + 메모(28px) = 테이블 총 너비
  const totalTableWidth = visibleColumns.reduce((sum, c) => sum + (colWidths[c.name] ?? DEFAULT_COL_WIDTH), 0) + 56;

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
            <Tooltip label="선택 삭제"><Btn tabIndex={-1} disabled={selectedRowIds.size === 0} onClick={deleteSelected}><Trash2 size={11} /></Btn></Tooltip>
            {selectedRowIds.size > 1 && <span className="text-[11px] text-[#8b5cf6] px-1">{selectedRowIds.size}행</span>}
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="실행 취소 (Cmd/Ctrl+Z)"><Btn tabIndex={-1} disabled={!grid.canUndo} onClick={handleUndo}><Undo2 size={11} /></Btn></Tooltip>
            <Tooltip label="다시 실행 (Cmd/Ctrl+Shift+Z)"><Btn tabIndex={-1} disabled={!grid.canRedo} onClick={handleRedo}><Redo2 size={11} /></Btn></Tooltip>
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="CSV 임포트"><Btn tabIndex={-1} onClick={() => fileRef.current?.click()}><Upload size={11} /></Btn></Tooltip>
            <div className="relative">
              <Tooltip label="내보내기 (CSV / JSON)"><Btn tabIndex={-1} disabled={!selectedId} onClick={() => setShowExportMenu((v) => !v)}><Download size={11} /></Btn></Tooltip>
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a1f] border border-[#2a2a2f] rounded-lg shadow-xl z-50 py-1 min-w-[80px]" onMouseLeave={() => setShowExportMenu(false)}>
                  <button tabIndex={-1} className="w-full text-left px-3 py-1.5 text-[11px] text-[#ededed] hover:bg-[#2a2a2f]" onClick={() => { csvExport(); setShowExportMenu(false); }}>CSV</button>
                  <button tabIndex={-1} className="w-full text-left px-3 py-1.5 text-[11px] text-[#ededed] hover:bg-[#2a2a2f]" onClick={() => { exportJson(); setShowExportMenu(false); }}>JSON</button>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="스냅샷 저장"><Btn tabIndex={-1} disabled={!selectedId} onClick={saveSnapshot}><Save size={11} /></Btn></Tooltip>
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
            {snapshots.length >= 2 && (
              <Tooltip label="스냅샷 비교">
                <Btn tabIndex={-1} disabled={!selectedId} onClick={() => { setShowDiff(true); setDiffResult(null); }}><GitCompare size={11} /></Btn>
              </Tooltip>
            )}
            <div className="w-px h-4 bg-[#2a2a2f] mx-1" />
            <Tooltip label="성장 곡선 생성"><Btn tabIndex={-1} disabled={!selectedId} onClick={() => setShowCurve(true)}><TrendingUp size={11} /></Btn></Tooltip>
            <Tooltip label="AI 밸런스 분석"><Btn tabIndex={-1} onClick={runBalance}><Sparkles size={11} /></Btn></Tooltip>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !selectedId) return;
              const text = await file.text();
              await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", table_id: selectedId, csv_content: text }) });
              e.target.value = "";
              loadData(selectedId);
              runBalance();
              runValidate();
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
          <div ref={gridContainerRef} className="flex-1 overflow-auto" onMouseDown={handleGridAreaMouseDown}>
            <table className="border-collapse text-xs select-none" style={{ tableLayout: "fixed", width: totalTableWidth }}>
              <thead>
                <tr className="bg-[#16161a]">
                  <th className="px-1.5 py-1.5 border-b border-[#2a2a2f] text-[#6b6b77] w-7 text-center relative">
                    <button
                      tabIndex={-1}
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
                  {visibleColumns.map((c, ci) => {
                    const colHighlighted = (range && ci >= range.c0 && ci <= range.c1) ||
                      additionalRanges.some((ar) => {
                        const ac_ = visibleColumns.findIndex((x) => x.name === ar.active.col);
                        const bc_ = ar.anchor ? visibleColumns.findIndex((x) => x.name === ar.anchor!.col) : ac_;
                        return ci >= Math.min(ac_, bc_) && ci <= Math.max(ac_, bc_);
                      });
                    return (
                      <th key={c.id} style={{ width: colWidths[c.name] ?? DEFAULT_COL_WIDTH }} className={`relative px-2.5 py-1.5 border-b border-[#2a2a2f] text-left text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer select-none overflow-hidden ${colHighlighted ? "bg-[#1e1b3a] text-[#a78bfa]" : "text-[#6b6b77] hover:text-[#9a9aa3] hover:bg-[#1e1e24]"}`} onClick={(e) => handleColumnHeaderClick(c.name, ci, e)}>
                        <span className="block truncate">{c.name}</span>
                        <div
                          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#7c3aed]/60 active:bg-[#7c3aed] z-10"
                          onMouseDown={(e) => startResize(c.name, e)}
                        />
                      </th>
                    );
                  })}
                  <th className={`px-1.5 py-1.5 border-b border-[#2a2a2f] ${hasFormulaColumns ? "w-14" : "w-7"}`} />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={(e) => handleRowClick(row.id, e)}
                    className="cursor-pointer border-b border-[#2a2a2f] hover:bg-[#1e1e24]"
                  >
                    {(() => {
                      const rowHighlighted = (range && idx >= range.r0 && idx <= range.r1) ||
                        additionalRanges.some((ar) => {
                          const ar_ = filteredRows.findIndex((x) => x.id === ar.active.rowId);
                          const br_ = ar.anchor ? filteredRows.findIndex((x) => x.id === ar.anchor!.rowId) : ar_;
                          return idx >= Math.min(ar_, br_) && idx <= Math.max(ar_, br_);
                        });
                      return <td className={`px-1.5 py-1.5 border-b border-[#2a2a2f] text-[11px] text-center transition-colors cursor-pointer select-none ${rowHighlighted ? "bg-[#1e1b3a] text-[#a78bfa] font-medium" : "text-[#4a4a55] hover:text-[#9a9aa3] hover:bg-[#1e1e24]"}`} onClick={(e) => handleRowNumberClick(row.id, idx, e)}>{idx + 1}</td>;
                    })()}
                    {visibleColumns.map((c) => {
                      const anomaly = getAnomaly(row.id, c.name);
                      const cellViolations = getViolations(row.id, c.name);
                      const brokenFk = getBrokenFk(row.id, c.name);
                      const isEditing = editing?.rowId === row.id && editing?.col === c.name;
                      const cellSelected = isCellSelected(row.id, c.name);
                      // 위반·깨진FK 메시지를 합쳐 한 쪽이 다른 쪽 tooltip을 가리지 않게.
                      const cellTitle = [
                        ...(cellViolations ? cellViolations.map((v) => v.message) : []),
                        ...(brokenFk ? [`참조 대상 없음: ${String(brokenFk.value ?? "")}`] : []),
                      ].join("\n") || undefined;
                      return (
                        <td
                          key={c.id}
                          title={cellTitle}
                          className={`px-2.5 py-1.5 border-b border-[#2a2a2f] whitespace-nowrap overflow-hidden ${cellSelected ? "outline outline-1 -outline-offset-1 outline-[#7c3aed] bg-[#7c3aed]/10" : cellViolations ? "outline outline-1 -outline-offset-1 outline-[#ef4444] bg-[#ef4444]/10" : brokenFk ? "outline outline-1 -outline-offset-1 outline-[#f59e0b] bg-[#f59e0b]/10" : ""}`}
                          onMouseDown={(e) => handleCellMouseDown(row.id, c.name, e)}
                          onMouseEnter={() => handleCellMouseEnter(row.id, c.name)}
                          onDoubleClick={() => { setEditing({ rowId: row.id, col: c.name }); setEditVal(String(row.data[c.name] ?? "")); }}
                        >
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
                            // IME 견고화: uncontrolled(defaultValue+ref). 조합 중 Enter는 확정으로만 처리, 저장 안 함.
                            <input
                              autoFocus
                              ref={editInputRef}
                              className="w-full px-1 py-0.5 border border-[#7c3aed] rounded text-xs outline-none bg-[#1e1b4b] text-[#ededed]"
                              defaultValue={String(row.data[c.name] ?? "")}
                              onCompositionStart={() => { isComposingRef.current = true; }}
                              onCompositionEnd={() => { isComposingRef.current = false; }}
                              onBlur={(e) => saveCell(row, c.name, e.currentTarget.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !isComposingRef.current && !e.nativeEvent.isComposing) saveCell(row, c.name, e.currentTarget.value);
                                if (e.key === "Escape") setEditing(null);
                                if (e.key === "Tab") {
                                  e.preventDefault();
                                  saveCell(row, c.name, e.currentTarget.value);
                                  const rowIdx = filteredRows.findIndex((r) => r.id === row.id);
                                  const colIdx = visibleColumns.findIndex((col) => col.name === c.name);
                                  let nextCol = colIdx + (e.shiftKey ? -1 : 1);
                                  let nextRow = rowIdx;
                                  if (nextCol >= visibleColumns.length) { nextCol = 0; nextRow = Math.min(rowIdx + 1, filteredRows.length - 1); }
                                  else if (nextCol < 0) { nextCol = visibleColumns.length - 1; nextRow = Math.max(rowIdx - 1, 0); }
                                  const next = { rowId: filteredRows[nextRow].id, col: visibleColumns[nextCol].name };
                                  setActiveCell(next); setAnchorCell(next);
                                }
                              }}
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
                    {(() => {
                      const hasNote = (annotationsByRow.get(row.id) ?? []).length > 0;
                      return (
                        <td className={`px-1.5 py-1.5 border-b border-[#2a2a2f] text-center ${hasFormulaColumns ? "w-14" : "w-7"}`}>
                          <button
                            tabIndex={-1}
                            onClick={(e) => { e.stopPropagation(); setAnnotationTarget({ rowId: row.id }); setNoteInput(""); }}
                            className={`p-1 rounded hover:bg-[#2a2a2f] transition-colors ${hasNote ? "text-[#c4b5fd]" : "text-[#3a3a42]"}`}
                            title={hasNote ? "메모 있음" : "메모 추가"}
                          >
                            <StickyNote size={12} />
                          </button>
                          {hasFormulaColumns && (
                            <button
                              tabIndex={-1}
                              onClick={(e) => { e.stopPropagation(); setFormulaPreview({ name: String(row.data["name"] ?? row.id), type: String(row.data["growth_type"] ?? "power"), base: Number(row.data["growth_base"] ?? 0), factor: Number(row.data["growth_factor"] ?? 1) }); }}
                              className="p-1 rounded hover:bg-[#2a2a2f] transition-colors text-[#7c3aed]/60 hover:text-[#7c3aed]"
                              title="공식 미리보기"
                            >
                              <TrendingUp size={12} />
                            </button>
                          )}
                        </td>
                      );
                    })()}
                  </tr>
                ))}
                {!searchQuery && (
                  <tr className="hover:bg-[#1e1e24] cursor-pointer" onClick={() => { setAddRowCount(1); setShowAddRowModal(true); }}>
                    <td colSpan={visibleColumns.length + 2} className="px-2.5 py-2.5 text-center text-[11px] text-[#4a4a55] hover:text-[#6b6b77]">
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
              onDataChanged={() => { if (selectedId) { loadData(selectedId); runBalance(); runValidate(); } }}
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
        {saveState === "saving" && <span className="text-[#9a9aa3]">저장 중…</span>}
        {saveState === "saved" && <span className="text-[#4ade80]">저장됨 ✓</span>}
        <div className="ml-auto flex gap-3">
          {violations.length > 0 && <span className="text-[#ef4444]">제약 위반 {violations.length}건</span>}
          {totalAnomalies > 0 && <span className="text-[#f87171]">이상값 {totalAnomalies}건</span>}
          {totalWarns > 0 && <span className="text-[#f59e0b]">경고 {totalWarns}건</span>}
        </div>
      </div>

      <CurveModal
        open={showCurve}
        onClose={() => setShowCurve(false)}
        curve={curve}
        setCurve={setCurve}
        curvePreview={curvePreview}
        solveTargetLevel={solveTargetLevel}
        setSolveTargetLevel={setSolveTargetLevel}
        solveTargetValue={solveTargetValue}
        setSolveTargetValue={setSolveTargetValue}
        solveResult={solveResult}
        setSolveResult={setSolveResult}
        runSolve={runSolve}
        fitPoints={fitPoints}
        setFitPoints={setFitPoints}
        fitResult={fitResult}
        setFitResult={setFitResult}
        runFit={runFit}
        runCurve={runCurve}
      />

      <AnnotationModal
        projectId={projectId}
        selectedId={selectedId}
        annotationTarget={annotationTarget}
        setAnnotationTarget={setAnnotationTarget}
        annotationsByRow={annotationsByRow}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        annotationLoading={annotationLoading}
        setAnnotationLoading={setAnnotationLoading}
        loadAnnotations={loadAnnotations}
      />

      {formulaPreview && (
        <FormulaPreviewModal
          open={true}
          onClose={() => setFormulaPreview(null)}
          heroName={formulaPreview.name}
          type={formulaPreview.type}
          base={formulaPreview.base}
          factor={formulaPreview.factor}
        />
      )}

      {showAddRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddRowModal(false)} />
          <div className="relative bg-[#16161a] border border-[#2a2a2f] rounded-xl shadow-2xl p-5 w-64">
            <div className="text-[12px] font-semibold text-[#ededed] mb-4">행 추가</div>
            {/* 수량 입력 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-[#6b6b77] w-8 flex-shrink-0">수량</span>
              <input
                type="number"
                min={1}
                value={addRowCount}
                onChange={(e) => setAddRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-[#0f0f10] border border-[#2a2a2f] rounded-lg px-3 py-1.5 text-[13px] text-[#ededed] outline-none focus:border-[#7c3aed]/50 text-center"
              />
            </div>
            {/* 단위 버튼 */}
            <div className="flex gap-1.5 mb-4">
              {[-10, -5, -1, 1, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setAddRowCount((v) => Math.max(1, v + n))}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${n < 0 ? "bg-[#1e1e24] hover:bg-[#2a2a2f] border-[#2a2a2f] text-[#9a9aa3]" : "bg-[#1e1b4b] hover:bg-[#2d1b69] border-[#3d2b8a] text-[#c4b5fd]"}`}
                >
                  {n > 0 ? `+${n}` : n}
                </button>
              ))}
            </div>
            {/* 확인/취소 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRowModal(false)}
                className="flex-1 py-2 rounded-lg text-[12px] text-[#6b6b77] hover:text-[#9a9aa3] border border-[#2a2a2f] hover:border-[#3a3a42] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => addRows(addRowCount)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors"
              >
                {addRowCount}개 추가
              </button>
            </div>
          </div>
        </div>
      )}

      <SnapshotDiffModal
        open={showDiff}
        onClose={() => setShowDiff(false)}
        snapshots={snapshots}
        diffA={diffA}
        setDiffA={setDiffA}
        diffB={diffB}
        setDiffB={setDiffB}
        diffResult={diffResult}
        diffLoading={diffLoading}
        runDiff={runDiff}
      />
    </div>
  );
}
