"use client";
import { ReactNode, useEffect, useState } from "react";
import { NotebookText, Pencil, Save, X, RefreshCw } from "lucide-react";
import { Btn, Tooltip } from "@/components/ui";

// 인라인: **굵게** / `코드`
function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${keyBase}-${i}`} className="font-semibold text-[#ededed]">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={`${keyBase}-${i}`} className="px-1 rounded bg-[#0f0f10] text-[#c4b5fd] text-[12px]">{p.slice(1, -1)}</code>;
    return <span key={`${keyBase}-${i}`}>{p}</span>;
  });
}

// 경량 블록 마크다운 렌더: 제목/목록/인용/문단
function Markdown({ md }: { md: string }) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-1.5">
        {items.map((it, i) => <li key={i} className="text-[13px] text-[#9a9aa3] leading-relaxed">{inline(it, `li-${blocks.length}-${i}`)}</li>)}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^- /.test(line)) { list.push(line.slice(2)); return; }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) blocks.push(<h3 key={idx} className="text-[13px] font-semibold text-[#ededed] mt-3 mb-1">{inline(line.slice(4), `h3-${idx}`)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={idx} className="text-[14px] font-semibold text-[#ededed] mt-4 mb-1.5">{inline(line.slice(3), `h2-${idx}`)}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={idx} className="text-[16px] font-bold text-[#ededed] mb-2">{inline(line.slice(2), `h1-${idx}`)}</h1>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={idx} className="border-l-2 border-[#3a3a42] pl-3 my-1.5 text-[12px] text-[#6b6b77] italic">{inline(line.slice(2), `bq-${idx}`)}</blockquote>);
    else blocks.push(<p key={idx} className="text-[13px] text-[#9a9aa3] leading-relaxed my-1">{inline(line, `p-${idx}`)}</p>);
  });
  flushList();
  return <div>{blocks}</div>;
}

export function MemoryView({ projectId }: { projectId: string }) {
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = () =>
    fetch(`/api/memory?project_id=${projectId}`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content ?? ""); setLoaded(true); })
      .catch(() => setLoaded(true));

  useEffect(() => { setLoaded(false); load(); /* eslint-disable-next-line */ }, [projectId]);

  const startEdit = () => { setDraft(content); setEditing(true); };
  const save = async () => {
    setSaving(true);
    await fetch("/api/memory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId, content: draft }) });
    setContent(draft);
    setSaving(false);
    setEditing(false);
  };

  const isEmpty = loaded && !content.trim();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[15px] font-semibold text-[#ededed] flex items-center gap-2"><NotebookText size={16} className="text-[#8b5cf6]" />프로젝트 메모리</div>
          <div className="text-[11px] text-[#4a4a55] mt-0.5">AI가 대화에서 결정·규칙·맥락을 누적 기록합니다. 직접 편집도 가능합니다.</div>
        </div>
        <div className="flex gap-1.5">
          {editing ? (
            <>
              <Tooltip label="취소"><Btn onClick={() => setEditing(false)}><X size={11} /></Btn></Tooltip>
              <Tooltip label={saving ? "저장 중…" : "저장"}><Btn variant="primary" onClick={save} disabled={saving}><Save size={11} /></Btn></Tooltip>
            </>
          ) : (
            <>
              <Tooltip label="새로고침"><Btn onClick={load}><RefreshCw size={11} /></Btn></Tooltip>
              <Tooltip label="편집"><Btn variant="primary" onClick={startEdit}><Pencil size={11} /></Btn></Tooltip>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="# 프로젝트 메모리&#10;&#10;## 수치 규칙&#10;- ..."
            className="w-full h-full px-6 py-4 bg-[#0f0f10] text-[13px] text-[#ededed] font-mono leading-relaxed resize-none outline-none placeholder:text-[#3a3a42]"
          />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
            <div className="w-12 h-12 rounded-2xl bg-[#16161a] border border-[#2a2a2f] flex items-center justify-center">
              <NotebookText size={22} className="text-[#4a4a55]" />
            </div>
            <div className="text-[13px] font-medium text-[#6b6b77]">아직 기록된 메모리가 없습니다</div>
            <div className="text-[11px] text-[#3a3a42] max-w-sm">스키마·데이터 화면의 대화에서 설계 결정이나 수치 규칙을 정하면 AI가 여기에 누적합니다. 직접 작성할 수도 있습니다.</div>
            <Btn variant="primary" onClick={startEdit}><Pencil size={11} />직접 작성</Btn>
          </div>
        ) : (
          <div className="max-w-3xl px-6 py-5">
            <Markdown md={content} />
          </div>
        )}
      </div>
    </div>
  );
}
