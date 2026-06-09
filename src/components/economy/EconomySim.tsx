"use client";
import { useEffect, useRef, useState } from "react";
import { Coins, Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { SectionLabel } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { projectEconomy } from "@/lib/economy/project";

interface Entry { id: number; name: string; amount: string; every: string }

const seedSources = (): Entry[] => [
  { id: 1, name: "일일 퀘스트", amount: "300", every: "1" },
  { id: 2, name: "주간 보너스", amount: "1000", every: "7" },
];
const seedSinks = (): Entry[] => [
  { id: 3, name: "10연 가챠", amount: "1600", every: "7" },
  { id: 4, name: "스태미나 충전", amount: "150", every: "1" },
];

const num = (s: string, d = 0) => { const n = Number(s); return Number.isFinite(n) ? n : d; };

export function EconomySim({ projectId }: { projectId: string }) {
  const [sources, setSources] = useState<Entry[]>(seedSources);
  const [sinks, setSinks] = useState<Entry[]>(seedSinks);
  const [days, setDays] = useState("30");
  const [start, setStart] = useState("0");
  const [scenarios, setScenarios] = useState<{ id: string; name: string; updated_at: number }[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const idRef = useRef(100);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 엔트리 id 충돌 방지: idRef를 현재 엔트리 최대 id 이상으로 동기화
  const syncIdRef = (list: Entry[]) => {
    idRef.current = Math.max(idRef.current, 100, ...list.map((e) => Number(e.id) || 0));
  };

  // 시나리오 목록 로드
  const loadScenarios = () =>
    fetch(`/api/economy?project_id=${projectId}`).then((r) => r.json()).then(setScenarios).catch((e) => console.error(e));
  useEffect(() => { loadScenarios(); }, [projectId]);

  // 시나리오 저장
  const saveScenario = async () => {
    const name = prompt("시나리오 이름:");
    if (!name) return;
    const data = { sources, sinks, days, start };
    const s = await fetch("/api/economy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, name, data }),
    }).then((r) => r.json());
    setActiveScenarioId(s.id);
    loadScenarios();
  };

  // 활성 시나리오 변경 시 자동 저장 (debounce)
  const autoSave = async () => {
    if (!activeScenarioId) return;
    await fetch("/api/economy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeScenarioId, data: { sources, sinks, days, start } }),
    }).catch((e) => console.error(e));
  };
  useEffect(() => {
    if (!activeScenarioId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line
  }, [sources, sinks, days, start, activeScenarioId]);

  // 시나리오 불러오기
  const loadScenario = (s: { id: string; name: string; data?: string }) => {
    setActiveScenarioId(s.id);
    try {
      const d = JSON.parse(s.data ?? "{}");
      if (Array.isArray(d.sources)) { setSources(d.sources); syncIdRef(d.sources); }
      if (Array.isArray(d.sinks)) { setSinks(d.sinks); syncIdRef(d.sinks); }
      if (typeof d.days === "string") setDays(d.days);
      if (typeof d.start === "string") setStart(d.start);
    } catch { /* ignore */ }
  };

  // 시나리오 삭제
  const deleteScenario = async (id: string) => {
    if (!confirm("시나리오를 삭제합니다.")) return;
    await fetch("/api/economy", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (activeScenarioId === id) setActiveScenarioId(null);
    loadScenarios();
  };

  const add = (set: typeof setSources) => set((prev) => [...prev, { id: ++idRef.current, name: "", amount: "0", every: "1" }]);
  const update = (set: typeof setSources, id: number, patch: Partial<Entry>) => set((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (set: typeof setSources, id: number) => set((prev) => prev.filter((e) => e.id !== id));

  // 일자별 투영 계산 (코어 로직은 lib/economy/project)
  const N = Math.max(1, Math.min(num(days, 30), 365));
  const toEntries = (list: Entry[]) => list.map((e) => ({ amount: num(e.amount), every: Math.max(1, num(e.every, 1)) }));
  const { balSeries, incSeries, spSeries, cumInc, cumSp, net, finalBalance: bal } = projectEconomy(toEntries(sources), toEntries(sinks), N, num(start));
  const xLabels = Array.from({ length: N }, (_, i) => String(i + 1));

  const entryRows = (list: Entry[], set: typeof setSources, isSource: boolean) => (
    <div className="space-y-1.5">
      {list.map((e, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input value={e.name} onChange={(ev) => update(set, e.id, { name: ev.target.value })} placeholder="이름"
            className="flex-1 bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-[#ededed] outline-none focus:border-[#7c3aed]/50" />
          <input value={e.amount} onChange={(ev) => update(set, e.id, { amount: ev.target.value })} placeholder="금액"
            className="w-20 bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-right text-[#ededed] outline-none focus:border-[#7c3aed]/50" />
          <div className="flex items-center gap-1 text-[10px] text-[#6b6b77]">
            <input value={e.every} onChange={(ev) => update(set, e.id, { every: ev.target.value })}
              className="w-10 bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-1.5 py-1 text-[11px] text-right text-[#ededed] outline-none" />
            일마다
          </div>
          <button onClick={() => remove(set, e.id)} className="text-[#3a3a42] hover:text-[#f87171] p-0.5"><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => add(set)} className={`flex items-center gap-1 text-[11px] ${isSource ? "text-[#4ade80]" : "text-[#f87171]"} opacity-70 hover:opacity-100`}>
        <Plus size={11} />{isSource ? "수입 추가" : "지출 추가"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 좌측 시나리오 목록 */}
      <div className="w-[170px] border-r border-[#2a2a2f] bg-[#16161a] flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-[#2a2a2f] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#6b6b77] uppercase tracking-wider">시나리오</span>
          <button className="text-[#6b6b77] hover:text-[#ededed]" onClick={saveScenario}><Plus size={13} /></button>
        </div>
        <div className="overflow-auto flex-1">
          {scenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => loadScenario(s as { id: string; name: string; data?: string })}
              className={`px-3 py-2.5 cursor-pointer border-l-2 group flex items-center justify-between ${
                activeScenarioId === s.id ? "bg-[#1e1e24] border-[#8b5cf6]" : "border-transparent hover:bg-[#1e1e24]"
              }`}
            >
              <span className="text-xs font-medium text-[#ededed] truncate">{s.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-[#3a3a42] hover:text-[#f87171] ml-1 flex-shrink-0"
              ><X size={12} /></button>
            </div>
          ))}
          <div
            className="px-3 py-2.5 text-xs text-[#4a4a55] cursor-pointer hover:bg-[#1e1e24]"
            onClick={() => { setActiveScenarioId(null); setSources(seedSources()); setSinks(seedSinks()); setDays("30"); setStart("0"); }}
          >
            ＋ 새 시나리오
          </div>
        </div>
      </div>

      {/* 메인 내용 */}
      <div className="flex-1 overflow-auto">
      <div className="px-6 py-4 border-b border-[#2a2a2f]">
        <div className="text-[15px] font-semibold text-[#ededed] flex items-center gap-2"><Coins size={16} className="text-[#8b5cf6]" />경제 시뮬레이션</div>
        <div className="text-[11px] text-[#4a4a55] mt-0.5">재화 수입·지출을 입력하면 일자별 잔액을 투영합니다. 주기(일)로 일일·주간·일회성을 표현하세요.</div>
      </div>

      <div className="p-6 space-y-5">
        {/* 입력 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#4ade80] mb-2.5 flex items-center gap-1.5"><TrendingUp size={12} />소스 (수입)</div>
            {entryRows(sources, setSources, true)}
          </div>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#f87171] mb-2.5 flex items-center gap-1.5"><TrendingDown size={12} />싱크 (지출)</div>
            {entryRows(sinks, setSinks, false)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[11px] text-[#9a9aa3]">일수
            <input value={days} onChange={(e) => setDays(e.target.value)} className="w-16 bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-right text-[#ededed] outline-none" /></label>
          <label className="flex items-center gap-2 text-[11px] text-[#9a9aa3]">시작 잔액
            <input value={start} onChange={(e) => setStart(e.target.value)} className="w-24 bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-right text-[#ededed] outline-none" /></label>
        </div>

        {/* 메트릭 */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "총 수입", val: cumInc, cls: "text-[#4ade80]" },
            { label: "총 지출", val: cumSp, cls: "text-[#f87171]" },
            { label: "순익", val: net, cls: net >= 0 ? "text-[#4ade80]" : "text-[#f87171]" },
            { label: `${N}일 후 잔액`, val: bal, cls: bal >= 0 ? "text-[#ededed]" : "text-[#f87171]" },
          ].map((m) => (
            <div key={m.label} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3.5">
              <div className="text-[10px] font-medium text-[#4a4a55] uppercase tracking-wide mb-1.5">{m.label}</div>
              <div className={`text-[20px] font-semibold ${m.cls}`}>{m.val.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* 차트 */}
        <div>
          <SectionLabel>일자별 추이</SectionLabel>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
            <LineChart
              height={240}
              xLabels={xLabels}
              series={[
                { name: "잔액", color: "#7c3aed", values: balSeries },
                { name: "누적 수입", color: "#4ade80", values: incSeries },
                { name: "누적 지출", color: "#f87171", values: spSeries },
              ]}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
