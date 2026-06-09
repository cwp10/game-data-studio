"use client";
import { useEffect, useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { Btn, ContentHeader, Modal, Input, Select, PanelHeader, PanelItem, TypeBadge } from "@/components/ui";

interface Table { id: string; name: string; description: string | null; }
interface Column { id: string; name: string; type: "string" | "number" | "boolean"; description: string | null; }
interface Relation { id: string; from_table_id: string; from_column: string; to_table_id: string; to_column: string; }

export function SchemaEditor({ projectId }: { projectId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [tableForm, setTableForm] = useState({ name: "", description: "" });
  const [colForm, setColForm] = useState({ name: "", type: "string" as Column["type"], description: "" });
  const [showRelModal, setShowRelModal] = useState(false);
  const [relForm, setRelForm] = useState({ from_column: "", to_table_id: "", to_column: "" });
  const [toColumns, setToColumns] = useState<Column[]>([]);

  const loadTables = () => fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((t: Table[]) => { setTables(t); if (!selectedId && t.length) setSelectedId(t[0].id); });
  const loadColumns = (tid: string) => fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setColumns(d.columns));
  const loadRelations = () => fetch(`/api/relations?project_id=${projectId}`).then((r) => r.json()).then(setRelations);
  const loadToColumns = (tid: string) =>
    fetch(`/api/tables/${tid}`).then((r) => r.json()).then((d: { columns: Column[] }) => setToColumns(d.columns));

  useEffect(() => { loadTables(); loadRelations(); }, [projectId]);
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

  const addCol = async () => {
    if (!selectedId || !colForm.name.trim()) return;
    await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: selectedId, ...colForm }) });
    setShowColModal(false);
    setColForm({ name: "", type: "string", description: "" });
    loadColumns(selectedId);
  };

  const delCol = async (id: string) => {
    await fetch("/api/columns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ column_id: id }) });
    if (selectedId) loadColumns(selectedId);
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
              <span className="ml-auto text-[10px] text-[#3a3a42]">{columns.length || ""}</span>
            </PanelItem>
          ))}
        </div>
      </div>

      {/* 메인: 컬럼 목록 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContentHeader title={selectedTable?.name ?? "테이블 선택"}>
          <Btn onClick={() => setShowRelModal(true)}><Link2 size={11} />관계 설정</Btn>
          <Btn variant="primary" onClick={() => setShowColModal(true)}><Plus size={11} />컬럼 추가</Btn>
        </ContentHeader>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#16161a]">
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[150px]">컬럼명</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[80px]">타입</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f] w-[130px]">참조</th>
                <th className="text-left px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b77] border-b border-[#2a2a2f]">설명</th>
                <th className="px-2.5 py-1.5 border-b border-[#2a2a2f] w-10"></th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.id} className="hover:bg-[#1e1e24]">
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-[#ededed]">{c.name}</td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f]"><TypeBadge type={c.type} /></td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f]">
                    {(() => { const ref = getColumnRef(c.name); return ref ? <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#3d0a1e] text-[#f9a8d4]">→ {ref}</span> : <span className="text-[#2a2a2f]">—</span>; })()}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-[#6b6b77]">{c.description}</td>
                  <td className="px-2.5 py-1.5 border-b border-[#2a2a2f] text-center">
                    <button className="text-[11px] text-[#3a3a42] hover:text-[#f87171] px-1 transition-colors" onClick={() => delCol(c.id)}>×</button>
                  </td>
                </tr>
              ))}
              {selectedId && (
                <tr>
                  <td colSpan={5} className="text-center text-[#4a4a55] py-2.5 text-[11px] cursor-pointer hover:bg-[#1e1e24]" onClick={() => setShowColModal(true)}>
                    ＋ 컬럼 추가
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 관계 패널 */}
        {tableRelations.length > 0 && (
          <div className="px-3.5 py-2.5 bg-[#16161a] border-t border-[#2a2a2f] flex-shrink-0">
            <div className="text-[11px] font-medium text-[#6b6b77] mb-1.5">관계</div>
            {tableRelations.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-[11px] text-[#9a9aa3] py-0.5">
                <span className="font-medium">{tables.find((t) => t.id === r.from_table_id)?.name}.{r.from_column}</span>
                <span className="text-[#3a3a42]">→</span>
                <span>{tables.find((t) => t.id === r.to_table_id)?.name}.{r.to_column}</span>
              </div>
            ))}
          </div>
        )}
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

      <Modal open={showColModal} onClose={() => setShowColModal(false)} title="컬럼 추가">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">컬럼명 *</div>
            <Input placeholder="예: atk" value={colForm.name} onChange={(e) => setColForm({ ...colForm, name: e.target.value })} />
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">타입</div>
            <Select value={colForm.type} onChange={(e) => setColForm({ ...colForm, type: e.target.value as Column["type"] })}>
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </Select>
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">설명</div>
            <Input placeholder="선택 사항" value={colForm.description} onChange={(e) => setColForm({ ...colForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowColModal(false)}>취소</Btn>
            <Btn variant="primary" onClick={addCol}>추가</Btn>
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
