"use client";
import { useEffect, useState } from "react";
import { Plus, Link2, FileText, Lock, MessageSquare, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { Btn, ContentHeader, Modal, Input, Select, PanelHeader, PanelItem, TypeBadge, PkBadge, BottomTab } from "@/components/ui";
import { ChatPanel } from "@/components/chat/ChatPanel";

interface Table { id: string; name: string; description: string | null; }
interface Column { id: string; name: string; type: "string" | "number" | "boolean" | "enum"; description: string | null; enum_type_id: string | null; }
interface Relation { id: string; from_table_id: string; from_column: string; to_table_id: string; to_column: string; }
interface EnumType { id: string; name: string; values: string[]; }

export function SchemaEditor({ projectId }: { projectId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [enumTypes, setEnumTypes] = useState<EnumType[]>([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [tableForm, setTableForm] = useState({ name: "", description: "" });
  const [colForm, setColForm] = useState<{ id?: string; name: string; type: Column["type"]; description: string; enum_type_id: string }>({ name: "", type: "string", description: "", enum_type_id: "" });
  const [showRelModal, setShowRelModal] = useState(false);
  const [relForm, setRelForm] = useState({ from_column: "", to_table_id: "", to_column: "" });
  const [toColumns, setToColumns] = useState<Column[]>([]);
  const [bottomTab, setBottomTab] = useState<"chat" | "relations">("chat");

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadColumns = (tid: string) => fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns));
  const loadRelations = () => fetch(`/api/relations?project_id=${projectId}`).then((r) => r.json()).then(setRelations);
  const loadEnumTypes = () => fetch(`/api/enum-types?project_id=${projectId}`).then((r) => r.json()).then(setEnumTypes).catch(() => {});
  const loadToColumns = (tid: string) =>
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setToColumns(d.columns));

  useEffect(() => { loadTables(); loadRelations(); loadEnumTypes(); }, [projectId]);
  useEffect(() => { if (selectedId) loadColumns(selectedId); }, [selectedId]);

  const createTable = async () => {
    if (!tableForm.name.trim()) return;
    await fetch("/api/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId, ...tableForm }) });
    setShowTableModal(false);
    setTableForm({ name: "", description: "" });
    loadTables();
  };

  const delTable = async (id: string) => {
    if (!confirm("테이블을 삭제합니다.")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    loadTables();
  };

  const openNewCol = () => { setColForm({ name: "", type: "string", description: "", enum_type_id: "" }); setShowColModal(true); };
  const openEditCol = (c: Column) => { setColForm({ id: c.id, name: c.name, type: c.type, description: c.description ?? "", enum_type_id: c.enum_type_id ?? "" }); setShowColModal(true); };

  const saveCol = async () => {
    if (!selectedId || !colForm.name.trim()) return;
    if (colForm.type === "enum" && !colForm.enum_type_id) return; // enum이면 타입 선택 필수
    const enum_type_id = colForm.type === "enum" ? colForm.enum_type_id : null;
    const res = colForm.id
      ? await fetch("/api/columns", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ column_id: colForm.id, name: colForm.name, type: colForm.type, description: colForm.description, enum_type_id }) })
      : await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, name: colForm.name, type: colForm.type, description: colForm.description, enum_type_id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "저장에 실패했습니다."); return; }
    setShowColModal(false);
    setColForm({ name: "", type: "string", description: "", enum_type_id: "" });
    loadColumns(selectedId);
  };

  const delCol = async (id: string) => {
    await fetch("/api/columns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ column_id: id }) });
    if (selectedId) loadColumns(selectedId);
  };

  const moveCol = async (index: number, dir: -1 | 1) => {
    if (!selectedId) return;
    const target = index + dir;
    if (target < 0 || target >= columns.length) return;
    const ids = columns.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await fetch("/api/columns", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder", table_id: selectedId, ordered_ids: ids }) });
    loadColumns(selectedId);
  };

  const createRelation = async () => {
    if (!selectedId || !relForm.from_column || !relForm.to_table_id || !relForm.to_column) return;
    await fetch("/api/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, from_table_id: selectedId, from_column: relForm.from_column, to_table_id: relForm.to_table_id, to_column: relForm.to_column }),
    });
    setShowRelModal(false);
    setRelForm({ from_column: "", to_table_id: "", to_column: "" });
    setToColumns([]);
    loadRelations();
  };

  const getColumnRef = (colName: string) => {
    const rel = relations.find((r) => r.from_table_id === selectedId && r.from_column === colName);
    if (!rel) return null;
    const toTable = tables.find((t) => t.id === rel.to_table_id);
    return toTable ? `${toTable.name}.${rel.to_column}` : null;
  };

  const selectedTable = tables.find((t) => t.id === selectedId);
  const tableRelations = relations.filter((r) => r.from_table_id === selectedId || r.to_table_id === selectedId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 좌측 테이블 목록 */}
      <div className="w-[170px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
        <PanelHeader>
          테이블
          <button className="text-[#6b6b77] hover:text-[#ededed] transition-colors" onClick={() => setShowTableModal(true)}><Plus size={13} /></button>
        </PanelHeader>
        <div className="overflow-auto flex-1">
          {tables.map((t) => (
            <PanelItem key={t.id} active={selectedId === t.id} onClick={() => setSelectedId(t.id)}>
              <span className="flex-1 truncate">{t.name}</span>
              <span className="ml-auto text-[10px] text-[#3a3a42]">{selectedId === t.id ? columns.length || "" : ""}</span>
            </PanelItem>
          ))}
        </div>
      </div>

      {/* 메인: 컬럼 목록 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContentHeader title={selectedTable?.name ?? "테이블 선택"}>
          <Btn onClick={() => setShowRelModal(true)}><Link2 size={11} />관계 설정</Btn>
          <Btn disabled={!selectedId} onClick={async () => {
            if (!selectedId) return;
            const res = await fetch("/api/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", table_id: selectedId }) });
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = (selectedTable?.name ?? "export") + ".csv";
            a.click();
          }}><FileText size={11} />CSV</Btn>
          <Btn variant="primary" onClick={openNewCol}><Plus size={11} />컬럼 추가</Btn>
        </ContentHeader>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#16161a]">
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[150px]">컬럼명</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[80px]">타입</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[130px]">참조</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f]">설명</th>
                <th className="px-2.5 py-1.5 border-b border-[#2a2a2f] w-28"></th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c, idx) => {
                const isPk = c.name === "id";
                return (
                <tr key={c.id} className="group hover:bg-[#1e1e24]">
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-[#ededed]">{c.name}{isPk && <PkBadge />}</td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f]">
                    <TypeBadge type={c.type} />
                    {c.type === "enum" && <span className="ml-1.5 text-[10px] text-[#8b5cf6]">{enumTypes.find((e) => e.id === c.enum_type_id)?.name ?? "?"}</span>}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f]">
                    {(() => { const ref = getColumnRef(c.name); return ref ? <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#3d0a1e] text-[#f9a8d4]">→ {ref}</span> : <span className="text-[#2a2a2f]">—</span>; })()}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-[#6b6b77]">{c.description}</td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-right whitespace-nowrap">
                    {isPk ? (
                      <Lock size={11} className="inline text-[#3a3a42]" />
                    ) : (
                      <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="위로" disabled={idx === 0} className="text-[#4a4a55] hover:text-[#ededed] disabled:opacity-20 p-0.5" onClick={() => moveCol(idx, -1)}><ChevronUp size={13} /></button>
                        <button title="아래로" disabled={idx === columns.length - 1} className="text-[#4a4a55] hover:text-[#ededed] disabled:opacity-20 p-0.5" onClick={() => moveCol(idx, 1)}><ChevronDown size={13} /></button>
                        <button title="편집" className="text-[#6b6b77] hover:text-[#ededed] p-0.5" onClick={() => openEditCol(c)}><Pencil size={11} /></button>
                        <button title="삭제" className="text-[#6b6b77] hover:text-[#f87171] p-0.5" onClick={() => delCol(c.id)}>×</button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
              {selectedId && (
                <tr>
                  <td colSpan={5} className="text-center text-[#4a4a55] py-2.5 text-[11px] cursor-pointer hover:bg-[#1e1e24]" onClick={openNewCol}>
                    ＋ 컬럼 추가
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 탭 패널: 대화 | 관계 */}
        <div className="h-[280px] border-t border-[#2a2a2f] flex flex-col flex-shrink-0 bg-[#16161a]">
          <div className="flex items-center px-2 border-b border-[#2a2a2f] flex-shrink-0">
            <BottomTab active={bottomTab === "chat"} onClick={() => setBottomTab("chat")}><MessageSquare size={12} />대화</BottomTab>
            <BottomTab active={bottomTab === "relations"} onClick={() => setBottomTab("relations")}>
              <Link2 size={12} />관계{tableRelations.length > 0 && <span className="ml-0.5 text-[#4a4a55]">{tableRelations.length}</span>}
            </BottomTab>
          </div>

          {bottomTab === "chat" ? (
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                projectId={projectId}
                tableId={selectedId}
                tableName={selectedTable?.name}
                placeholder={`${selectedTable?.name ?? "스키마"}에 할 일을 말해보세요 (Cmd+Enter)`}
                examples={["crit_rate(number) 컬럼 추가해줘", "skills 테이블 만들어줘", "수집형 RPG 표준 컬럼 채워줘"]}
                onDataChanged={() => { loadTables(); loadRelations(); if (selectedId) loadColumns(selectedId); }}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-3.5 py-2.5">
              {tableRelations.length > 0 ? tableRelations.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-[11px] text-[#9a9aa3] py-0.5">
                  <span className="font-medium">{tables.find((t) => t.id === r.from_table_id)?.name}.{r.from_column}</span>
                  <span className="text-[#3a3a42]">→</span>
                  <span>{tables.find((t) => t.id === r.to_table_id)?.name}.{r.to_column}</span>
                </div>
              )) : (
                <div className="text-[11px] text-[#3a3a42] text-center py-6">설정된 관계가 없습니다 — 상단 &apos;관계 설정&apos;으로 추가하세요.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={showTableModal} onClose={() => setShowTableModal(false)} title="테이블 추가">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">테이블명 *</div>
            <Input placeholder="예: characters" value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} />
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">설명</div>
            <Input placeholder="선택 사항" value={tableForm.description} onChange={(e) => setTableForm({ ...tableForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowTableModal(false)}>취소</Btn>
            <Btn variant="primary" onClick={createTable}>생성</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showColModal} onClose={() => setShowColModal(false)} title={colForm.id ? "컬럼 편집" : "컬럼 추가"}>
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">컬럼명 *</div>
            <Input placeholder="예: atk" value={colForm.name} onChange={(e) => setColForm({ ...colForm, name: e.target.value })} />
            {colForm.id && <div className="text-[10px] text-[#4a4a55] mt-1">이름을 바꾸면 모든 행의 데이터 키도 함께 변경됩니다.</div>}
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">타입</div>
            <Select value={colForm.type} onChange={(e) => setColForm({ ...colForm, type: e.target.value as Column["type"] })}>
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="enum">enum (선택지)</option>
            </Select>
          </div>
          {colForm.type === "enum" && (
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">enum 타입 *</div>
              {enumTypes.length > 0 ? (
                <Select value={colForm.enum_type_id} onChange={(e) => setColForm({ ...colForm, enum_type_id: e.target.value })}>
                  <option value="">선택</option>
                  {enumTypes.map((et) => <option key={et.id} value={et.id}>{et.name} ({et.values.join("/")})</option>)}
                </Select>
              ) : (
                <div className="text-[11px] text-[#6b6b77] bg-[#0f0f10] border border-[#2a2a2f] rounded-lg px-3 py-2">정의된 타입이 없습니다. 좌측 &apos;타입&apos; 화면에서 먼저 만들어주세요.</div>
              )}
            </div>
          )}
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">설명</div>
            <Input placeholder="선택 사항" value={colForm.description} onChange={(e) => setColForm({ ...colForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowColModal(false)}>취소</Btn>
            <Btn variant="primary" onClick={saveCol}>{colForm.id ? "저장" : "추가"}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showRelModal} onClose={() => setShowRelModal(false)} title="관계 설정">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">이 테이블의 컬럼 *</div>
            <Select value={relForm.from_column} onChange={(e) => setRelForm({ ...relForm, from_column: e.target.value })}>
              <option value="">선택</option>
              {columns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">참조 테이블 *</div>
            <Select value={relForm.to_table_id} onChange={(e) => { setRelForm({ ...relForm, to_table_id: e.target.value, to_column: "" }); if (e.target.value) loadToColumns(e.target.value); }}>
              <option value="">선택</option>
              {tables.filter((t) => t.id !== selectedId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">참조 컬럼 *</div>
            <Select value={relForm.to_column} onChange={(e) => setRelForm({ ...relForm, to_column: e.target.value })}>
              <option value="">선택</option>
              {toColumns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowRelModal(false)}>취소</Btn>
            <Btn variant="primary" onClick={createRelation}>설정</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
