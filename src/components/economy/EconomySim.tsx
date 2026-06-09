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
  const idRef = useRef(100);
  const key = `gds-economy-${projectId}`;

  // localStorage 영속
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const s = JSON.parse(raw);
      // 형태 검증: 배열이 아니면 무시 (구버전/손상 데이터 → 크래시 방지)
      if (!Array.isArray(s?.sources) || !Array.isArray(s?.sinks)) return;
      setSources(s.sources);
      setSinks(s.sinks);
      if (typeof s.days === "string") setDays(s.days);
      if (typeof s.start === "string") setStart(s.start);
      // 복원된 엔트리 id 와 충돌하지 않도록 idRef 를 최대값 이상으로 동기화
      const maxId = Math.max(100, ...[...s.sources, ...s.sinks].map((e: { id?: number }) => Number(e?.id) || 0));
      idRef.current = maxId;
    } catch { /* ignore */ }
    // eslint-disable-next-line
  }, [projectId]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ sources, sinks, days, start })); } catch { /* ignore */ }
  }, [key, sources, sinks, days, start]);

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
      {list.map((e) => (
        <div key={e.id} className="flex items-center gap-1.5">
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
  );
}
