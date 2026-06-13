"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { Column, RowWithData, Skill, Table, Unit, guessCol, num } from "./types";

export const SKILL_EVENT_META: Record<"heal" | "invuln" | "revive" | "aoe", { label: string; badge: string; rowBg: string }> = {
  heal:   { label: "회복", badge: "bg-[#0f2a1a] text-[#4ade80]", rowBg: "bg-[#4ade80]/5" },
  invuln: { label: "무적", badge: "bg-[#1e1b4b] text-[#c4b5fd]", rowBg: "bg-[#7c3aed]/5" },
  revive: { label: "부활", badge: "bg-[#0f2a1a] text-[#4ade80]", rowBg: "bg-[#4ade80]/5" },
  aoe:    { label: "광역", badge: "bg-[#3a1c00] text-[#f59e0b]", rowBg: "bg-[#f59e0b]/5" },
};

const SKILL_TYPES: { value: Skill["type"]; label: string }[] = [
  { value: "heal", label: "회복" },
  { value: "invuln", label: "무적" },
  { value: "revive", label: "부활" },
  { value: "aoe", label: "광역" },
];

const COL_SLOTS = [
  { key: "hp",       label: "HP",    hints: ["hp", "health", "life"] },
  { key: "atk",      label: "ATK",   hints: ["atk", "attack", "power", "dmg"] },
  { key: "def",      label: "DEF",   hints: ["def", "defense", "armor"] },
  { key: "speed",    label: "속도",  hints: ["spd", "speed", "agi"] },
  { key: "critRate", label: "치명율", hints: ["crit_rate", "critrate", "crit"] },
  { key: "critMult", label: "치명배율", hints: ["crit_dmg", "critmult", "crit_mult"] },
] as const;

type SlotKey = typeof COL_SLOTS[number]["key"];

export function UnitForm({
  title, unit, onChange, tables, showSkills,
}: {
  title: string;
  unit: Unit;
  onChange: (u: Unit) => void;
  tables: Table[];
  showSkills?: boolean;
}) {
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);
  const [colMap, setColMap] = useState<Record<SlotKey, string>>({ hp: "", atk: "", def: "", speed: "", critRate: "", critMult: "" });

  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); setColMap({ hp: "", atk: "", def: "", speed: "", critRate: "", critMult: "" }); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => {
      const c: Column[] = d.columns ?? [];
      setCols(c);
      const m = {} as Record<SlotKey, string>;
      for (const slot of COL_SLOTS) m[slot.key] = guessCol(c, [...slot.hints]);
      setColMap(m);
    });
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // 핵심 6 슬롯에 매핑되지 않은 number 컬럼 → extra 자동 매핑
  const extraCols = useMemo(() => {
    const coreMapped = new Set(Object.values(colMap).filter(Boolean));
    return cols.filter((c) => c.type === "number" && !coreMapped.has(c.name)).map((c) => c.name);
  }, [cols, colMap]);

  const prefill = (rid: string) => {
    const row = rows.find((r) => r.id === rid);
    if (!row) return;
    const extra: Record<string, number> = {};
    for (const col of extraCols) extra[col] = num(row.data[col]);
    onChange({
      name: String(row.data.name ?? row.data.id ?? "유닛"),
      hp:       num(row.data[colMap.hp]),
      atk:      num(row.data[colMap.atk]),
      def:      num(row.data[colMap.def]),
      speed:    num(row.data[colMap.speed]) || 100,
      critRate: colMap.critRate ? num(row.data[colMap.critRate]) / 100 : (unit.critRate ?? 0),
      critMult: colMap.critMult ? num(row.data[colMap.critMult]) / 100 : (unit.critMult ?? 1.5),
      ...(extraCols.length > 0 ? { extra } : {}),
    });
  };

  const setMap = (key: SlotKey, val: string) => setColMap((m) => ({ ...m, [key]: val }));
  const set = (k: keyof Unit, v: number | string) => onChange({ ...unit, [k]: v });

  const skills = unit.skills ?? [];
  const addSkill = () => onChange({ ...unit, skills: [...skills, { type: "heal", cooldown: 3, value: 1000 }] });
  const setSkill = (i: number, patch: Partial<Skill>) => onChange({ ...unit, skills: skills.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const removeSkill = (i: number) => onChange({ ...unit, skills: skills.filter((_, j) => j !== i) });

  const numCols = cols.filter((c) => c.type === "number");

  return (
    <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
      <div className="text-[12px] font-semibold text-[#ededed] mb-2.5">{title}</div>

      {/* 테이블/행 선택 */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">행에서 불러오기…</option>
          {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value="" onChange={(e) => prefill(e.target.value)} disabled={!tableId}>
          <option value="">— 행 선택 —</option>
          {rows.map((r) => <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>)}
        </Select>
      </div>

      {/* 컬럼 매핑 (테이블 선택 시 표시) */}
      {cols.length > 0 && (
        <div className="mb-2.5 px-2.5 py-2 bg-[#0f0f10] rounded-lg border border-[#2a2a2f]">
          <div className="text-[9px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-1.5">핵심 스탯 매핑</div>
          <div className="grid grid-cols-3 gap-1.5">
            {COL_SLOTS.map((slot) => (
              <div key={slot.key}>
                <div className="text-[9px] text-[#6b6b77] mb-0.5">{slot.label}</div>
                <Select value={colMap[slot.key]} onChange={(e) => setMap(slot.key, e.target.value)}>
                  <option value="">—</option>
                  {numCols.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </div>
            ))}
          </div>
          {extraCols.length > 0 && (
            <div className="mt-1.5">
              <div className="text-[9px] text-[#4a4a55] mb-1">추가 스탯 자동 매핑 <span className="text-[#6b6b77]">(전투력 지수 반영)</span></div>
              <div className="flex flex-wrap gap-1">
                {extraCols.map((col) => (
                  <span key={col} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1b4b] text-[#8b5cf6] border border-[#7c3aed]/30">{col}</span>
                ))}
              </div>
            </div>
          )}
          {extraCols.length === 0 && <div className="text-[9px] text-[#4a4a55] mt-1.5">행 선택 시 위 매핑으로 값을 불러옵니다</div>}
        </div>
      )}

      {/* 직접 입력 */}
      <div className="space-y-2">
        <Input placeholder="이름" value={unit.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {([
            ["HP",   "hp",    "hp"],
            ["ATK",  "atk",   "atk"],
            ["DEF",  "def",   "def"],
            ["속도", "speed", "speed"],
          ] as const).map(([label, k, mk]) => (
            <div key={k}>
              <div className="text-[10px] text-[#6b6b77] mb-1 flex items-center gap-1">
                {label}
                {colMap[mk] && <span className="text-[#8b5cf6]">· {colMap[mk]}</span>}
              </div>
              <Input type="number" value={unit[k] as number} onChange={(e) => set(k, Number(e.target.value) || 0)} />
            </div>
          ))}
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1 flex items-center gap-1">
              치명타율 (0~1)
              {colMap.critRate && <span className="text-[#8b5cf6]">· {colMap.critRate}</span>}
            </div>
            <Input type="number" step={0.01} min={0} max={1} value={unit.critRate ?? 0} onChange={(e) => set("critRate", Number(e.target.value) || 0)} />
          </div>
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1 flex items-center gap-1">
              치명타 배율
              {colMap.critMult && <span className="text-[#8b5cf6]">· {colMap.critMult}</span>}
            </div>
            <Input type="number" step={0.1} value={unit.critMult ?? 1.5} onChange={(e) => set("critMult", Number(e.target.value) || 1.5)} />
          </div>
        </div>
      </div>

      {/* 추가 스탯 직접 입력 (extra) */}
      {extraCols.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2f]">
          <div className="text-[9px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-1.5">추가 스탯</div>
          <div className="grid grid-cols-2 gap-2">
            {extraCols.map((col) => (
              <div key={col}>
                <div className="text-[10px] text-[#8b5cf6] mb-1">{col}</div>
                <Input
                  type="number"
                  value={(unit.extra ?? {})[col] ?? 0}
                  onChange={(e) => onChange({ ...unit, extra: { ...(unit.extra ?? {}), [col]: Number(e.target.value) || 0 } })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 스킬 */}
      {showSkills && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2f]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-wide">스킬</div>
            <button onClick={addSkill} className="text-[#6b6b77] hover:text-[#c4b5fd] flex items-center gap-1 text-[11px]"><Plus size={12} />추가</button>
          </div>
          {skills.length === 0 && <div className="text-[11px] text-[#4a4a55]">스킬 없음 (기본 전투)</div>}
          <div className="space-y-2">
            {skills.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">유형</div>
                  <Select value={s.type} onChange={(e) => setSkill(i, { type: e.target.value as Skill["type"] })}>
                    {SKILL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">쿨다운(턴)</div>
                  <Input type="number" min={0} value={s.cooldown} onChange={(e) => setSkill(i, { cooldown: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">값</div>
                  <Input type="number" value={s.value} onChange={(e) => setSkill(i, { value: Number(e.target.value) || 0 })} />
                </div>
                <button onClick={() => removeSkill(i)} className="text-[#6b6b77] hover:text-[#f87171] pb-1.5 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
