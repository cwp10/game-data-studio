"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Wrench, Sparkles, Loader2, Square } from "lucide-react";
import { MCP_TOOL_PREFIX } from "@/lib/mcp/constants";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name: string | null;
}

// 경량 인라인 마크다운: **굵게** 와 `코드` 만 처리 (줄바꿈은 whitespace-pre-wrap)
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="px-1 rounded bg-[#0f0f10] text-[#c4b5fd] text-[11px]">{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function ChatPanel({
  projectId,
  tableId,
  tableName,
  placeholder,
  examples,
  onDataChanged,
}: {
  projectId: string;
  tableId?: string | null;
  tableName?: string | null;
  placeholder?: string;
  examples?: string[];
  onDataChanged?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [liveTools, setLiveTools] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const loadHistory = () =>
    fetch(`/api/chat?project_id=${projectId}`).then((r) => r.json()).then((m) => { if (mountedRef.current) setMessages(m); }).catch(() => {});

  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [projectId]);

  // 언마운트 시 진행 중인 스트림을 중단해 claude/MCP 프로세스 누수와 unmounted setState 를 막는다.
  useEffect(() => () => { mountedRef.current = false; abortRef.current?.abort(); }, []);

  // 히스토리 로드·스트리밍 완료 시 즉시 맨 아래로 (애니메이션 없이)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "instant" });
  }, [messages]);

  // 스트리밍 중 새 토큰이 올 때만 smooth 스크롤
  useEffect(() => {
    if (!streaming && !liveText && !liveTools.length) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [liveText, liveTools, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    setStreaming(true);
    setLiveText("");
    setLiveTools([]);
    // 낙관적 사용자 메시지
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: "user", content: text, tool_name: null }]);

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, table_id: tableId, message: text }),
        signal: ac.signal,
      });
      if (!res.body) throw new Error("스트림을 받을 수 없습니다.");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      const tools: string[] = [];

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          const evLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const data = dataLine.slice(5).trim();
          if (evLine?.includes("error")) { setError("실행 중 오류가 발생했습니다."); continue; }
          if (evLine?.includes("stderr")) continue;
          if (data === "[DONE]") continue;

          let o: { type?: string; message?: { content?: { type: string; text?: string; name?: string }[] } };
          try { o = JSON.parse(data); } catch { continue; }
          if (o.type === "assistant") {
            for (const b of o.message?.content ?? []) {
              if (b.type === "text" && b.text?.trim()) { acc += (acc ? "\n\n" : "") + b.text; setLiveText(acc); }
              else if (b.type === "tool_use" && b.name?.startsWith(MCP_TOOL_PREFIX)) {
                tools.push(b.name.replace(MCP_TOOL_PREFIX, ""));
                setLiveTools([...tools]);
              }
            }
          }
        }
      }
    } catch (e) {
      // 사용자가 중단한 경우는 오류로 표시하지 않음
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    } finally {
      abortRef.current = null;
      if (mountedRef.current) {
        setStreaming(false);
        setLiveText("");
        setLiveTools([]);
        await loadHistory();      // 영속된 정식 transcript 로 교체
        onDataChanged?.();        // 스키마/데이터 변경 반영
      }
    }
  };

  const stop = () => abortRef.current?.abort();

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-full bg-[#16161a]">
      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {empty && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-6">
            <div className="w-9 h-9 rounded-xl bg-[#1e1b4b] flex items-center justify-center">
              <Sparkles size={18} className="text-[#8b5cf6]" />
            </div>
            <div className="text-[12px] text-[#9a9aa3]">자연어로 데이터를 지시하면 AI가 처리합니다</div>
            {examples && (
              <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#2a2a2f] text-[#6b6b77] hover:border-[#7c3aed]/40 hover:text-[#9a9aa3] transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] bg-[#7c3aed] text-white text-xs leading-relaxed rounded-2xl rounded-br-sm px-3 py-2 whitespace-pre-wrap">{m.content}</div>
            </div>
          ) : m.role === "tool" ? (
            <div key={m.id} className="flex">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6b6b77] bg-[#0f0f10] border border-[#2a2a2f] rounded-full px-2.5 py-1">
                <Wrench size={11} className="text-[#8b5cf6]" />{m.tool_name}
              </span>
            </div>
          ) : (
            <div key={m.id} className="flex">
              <div className="max-w-[88%] text-xs leading-relaxed text-[#ededed] whitespace-pre-wrap"><Inline text={m.content} /></div>
            </div>
          )
        )}

        {/* 진행 중 라이브 표시 */}
        {streaming && (
          <div className="space-y-2">
            {liveTools.map((t, i) => (
              <div key={i} className="flex">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6b6b77] bg-[#0f0f10] border border-[#2a2a2f] rounded-full px-2.5 py-1">
                  <Wrench size={11} className="text-[#8b5cf6]" />{t}
                </span>
              </div>
            ))}
            {liveText && <div className="text-xs leading-relaxed text-[#ededed] whitespace-pre-wrap max-w-[88%]"><Inline text={liveText} /></div>}
            <div className="flex items-center gap-1.5 text-[11px] text-[#4a4a55]"><Loader2 size={12} className="animate-spin" />처리 중…</div>
          </div>
        )}

        {error && <div className="text-[11px] text-[#f87171]">{error}</div>}
      </div>

      {/* 입력 바 */}
      <div className="border-t border-[#2a2a2f] p-2.5">
        <div className="flex items-end gap-2 bg-[#0f0f10] border border-[#2a2a2f] rounded-xl px-3 py-2 focus-within:border-[#7c3aed]/50 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={placeholder ?? "무엇을 도와드릴까요? (Cmd+Enter 전송)"}
            className="flex-1 bg-transparent text-xs text-[#ededed] placeholder:text-[#4a4a55] resize-none outline-none max-h-24 leading-relaxed"
          />
          {streaming ? (
            <button
              onClick={stop}
              title="중단"
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2a2a2f] text-[#ededed] flex items-center justify-center hover:bg-[#3a3a42] transition-colors"
            >
              <Square size={11} className="fill-current" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#6d28d9] transition-colors"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
