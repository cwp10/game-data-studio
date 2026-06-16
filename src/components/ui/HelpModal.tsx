"use client";
import { useEffect, useState } from "react";
import {
  Home, Table2, Database, Tags, BarChart2, Play, Coins, NotebookText,
  X, Lightbulb, ChevronRight,
  Plus, Upload, Download, Save, Undo2, Redo2, TrendingUp, Sparkles,
  GitCompare, Link2, Pencil, Trash2, MessageSquare, Eye, StickyNote,
  RotateCcw, Copy, BarChart3, Zap, Wand2, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { type Screen } from "@/app/page";

// ── 인라인 시각 컴포넌트 ─────────────────────────────────────────

function IBtn({ icon: Icon, label, variant = "default" }: {
  icon?: React.ElementType;
  label?: string;
  variant?: "default" | "primary" | "success" | "danger";
}) {
  const cls = {
    default: "bg-[#2a2a3a] border-[#3a3a4a] text-[#c9c9d4]",
    primary: "bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#a78bfa]",
    success: "bg-emerald-900/20 border-emerald-700/40 text-emerald-400",
    danger:  "bg-red-900/20 border-red-800/40 text-red-400",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-[3px] px-1.5 py-[2px] rounded border text-[10px] font-medium align-middle leading-none ${cls}`}>
      {Icon && <Icon size={9} />}
      {label && <span>{label}</span>}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-[2px] rounded bg-[#0f0f10] border border-[#3a3a4a] text-[10px] font-mono text-[#a78bfa] align-middle leading-none">
      {children}
    </kbd>
  );
}

function StepList({ title, items }: {
  title?: string;
  items: { label: React.ReactNode; sub?: React.ReactNode }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-5 h-5 rounded-full bg-[#2a2a3a] border border-[#7c3aed]/50 flex items-center justify-center text-[10px] text-[#8b5cf6] font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#ededed] leading-relaxed">{item.label}</div>
              {item.sub && <div className="text-[11px] text-[#6b6b77] mt-0.5 leading-relaxed">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowDiagram({ title, items }: {
  title?: string;
  items: { icon?: React.ElementType; label: string; desc?: string }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex items-start gap-1 flex-wrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#1e1e28] border border-[#2a2a3a]">
                {item.icon && <item.icon size={11} className="text-[#8b5cf6] flex-shrink-0" />}
                <span className="text-[11px] text-[#ededed] whitespace-nowrap">{item.label}</span>
              </div>
              {item.desc && <span className="text-[9px] text-[#6b6b77] text-center px-1">{item.desc}</span>}
            </div>
            {i < items.length - 1 && <ChevronRight size={12} className="text-[#3a3a4a] flex-shrink-0 mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutGrid({ items }: { items: { key: string; desc: string }[] }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">키보드 단축키</div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(({ key, desc }) => (
          <div key={key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <Kbd>{key}</Kbd>
            <span className="text-[11px] text-[#9a9aa3] truncate">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarRow({ title, items }: {
  title?: string;
  items: { icon: React.ElementType; label: string; desc: string }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex flex-col divide-y divide-[#1e1e28] rounded-lg border border-[#2a2a3a] overflow-hidden">
        {items.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2 bg-[#16161e]">
            <IBtn icon={Icon} label={label} />
            <span className="text-[11px] text-[#9a9aa3] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{children}</div>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-[#22222e] border border-[#2a2a3a] px-3.5 py-3">
      <Lightbulb size={13} className="text-[#d6b34a] flex-shrink-0 mt-0.5" />
      <div className="text-[11px] text-[#c9c9d4] leading-relaxed">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-4 border-t border-[#2a2a3a]" />;
}

// ── 화면별 도움말 콘텐츠 ─────────────────────────────────────────

function HomeContent() {
  return (
    <>
      <FlowDiagram
        title="새 프로젝트 만들기"
        items={[
          { icon: Plus, label: "새 프로젝트 만들기", desc: "버튼 클릭" },
          { icon: Play, label: "장르 선택", desc: "RPG 유형 선택" },
          { label: "이름 입력", desc: "프로젝트명" },
          { icon: Zap, label: "자동 생성 완료", desc: "테이블 생성" },
        ]}
      />
      <Divider />
      <StepList
        title="프로젝트 카드 관리"
        items={[
          {
            label: <>카드를 클릭하면 해당 프로젝트의 <strong className="text-[#ededed]">스키마 화면</strong>으로 이동합니다.</>,
          },
          {
            label: <>카드 우측 <IBtn label="편집" /> 버튼으로 이름을 변경합니다.</>,
          },
          {
            label: <>카드 우측 <IBtn label="삭제" variant="danger" /> 버튼으로 프로젝트를 삭제합니다.</>,
            sub: "삭제 시 모든 테이블·데이터가 함께 제거됩니다.",
          },
        ]}
      />
      <Tip>장르를 선택하면 수집형 RPG·방치형 RPG 등에 맞는 기본 테이블 구조가 자동으로 생성됩니다.</Tip>
    </>
  );
}

function SchemaContent() {
  return (
    <>
      <FlowDiagram
        title="테이블 추가 흐름"
        items={[
          { icon: Plus, label: "+ 버튼", desc: "좌측 패널 상단" },
          { label: "테이블 이름 입력", desc: "모달" },
          { icon: Table2, label: "테이블 생성", desc: "자동으로 id 컬럼 포함" },
          { icon: Plus, label: "컬럼 추가", desc: "하단 행 클릭" },
        ]}
      />
      <Divider />
      <ToolbarRow
        title="스키마 툴바 버튼"
        items={[
          { icon: Link2, label: "관계 설정", desc: "이 테이블의 컬럼을 다른 테이블 FK로 연결합니다." },
          { icon: Download, label: "CSV 내보내기", desc: "이 테이블의 컬럼 목록을 CSV로 내보냅니다." },
        ]}
      />
      <Divider />
      <StepList
        title="컬럼 편집"
        items={[
          {
            label: <>컬럼 행 우측 <IBtn icon={Pencil} label="편집" /> 버튼을 클릭합니다.</>,
            sub: "이름·타입·제약(min/max/필수/고유)을 변경할 수 있습니다.",
          },
          {
            label: <>타입을 <strong className="text-[#ededed]">enum</strong>으로 지정하면 타입 화면에서 선택지를 정의합니다.</>,
          },
          {
            label: <>위/아래 화살표로 컬럼 순서를 변경합니다.</>,
          },
          {
            label: <>우측 × 버튼으로 컬럼을 삭제합니다.</>,
            sub: "해당 컬럼의 모든 데이터가 함께 삭제됩니다.",
          },
        ]}
      />
      <Tip>하단 <IBtn icon={MessageSquare} label="대화" /> 탭에서 AI에게 "유저 ID 컬럼 추가해줘" 같이 자연어로 스키마를 수정할 수 있습니다.</Tip>
    </>
  );
}

// 데이터 화면 안의 "테이블 → 공식 변환" 기능 전용 콘텐츠.
// 무한 레벨 공식(성장 곡선)으로 전환하는 흐름을 기획자 언어로 설명한다.
function TableToFormulaContent() {
  return (
    <>
      <div className="rounded-lg bg-[#7c3aed]/8 border border-[#7c3aed]/25 px-3.5 py-3 mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Wand2 size={13} className="text-[#a78bfa]" />
          <span className="text-[12px] font-semibold text-[#ededed]">테이블 → 공식 변환</span>
        </div>
        <div className="text-[11px] text-[#9a9aa3] leading-relaxed">
          레벨별 수치를 행으로 일일이 입력한 테이블(예: 1,000행짜리 레벨표)을, 레벨이 아무리 높아도
          공식 하나로 값을 계산하는 <strong className="text-[#ededed]">무한 레벨 공식</strong>으로 바꿔주는 기능입니다.
          기존 데이터에서 곡선 모양을 자동으로 찾아 <span className="font-mono text-[#c4b5fd]">growth_type · growth_base · growth_factor</span> 세 값으로 정리합니다.
        </div>
      </div>

      <ToolbarRow
        title="두 개의 진입점"
        items={[
          { icon: TrendingUp, label: "공식 미리보기", desc: "각 행 우측의 ↗ 아이콘. 그 행에 입력된 공식이 레벨별로 어떤 수치를 만드는지 즉시 확인합니다." },
          { icon: Wand2, label: "테이블 → 공식 변환", desc: "툴바의 ✦ 버튼. 기존 레벨 데이터에서 공식 파라미터를 자동으로 역산합니다." },
        ]}
      />
      <Divider />

      <SectionLabel>① 행 단위 공식 미리보기 (↗)</SectionLabel>
      <StepList
        items={[
          {
            label: <>테이블에 <span className="font-mono text-[#c4b5fd]">growth_type</span> · <span className="font-mono text-[#c4b5fd]">growth_base</span> · <span className="font-mono text-[#c4b5fd]">growth_factor</span> 세 컬럼이 모두 있을 때, 각 행 우측에 <IBtn icon={TrendingUp} /> 아이콘이 나타납니다.</>,
            sub: "세 컬럼 중 하나라도 없으면 아이콘이 보이지 않습니다. 방치형 RPG 위자드로 만든 heroes 테이블에는 기본 포함됩니다.",
          },
          {
            label: <><IBtn icon={TrendingUp} /> 를 클릭하면 그 행의 공식으로 <strong className="text-[#ededed]">Lv 1 · 10 · 100 · 1,000 · 10,000 · 100,000</strong> 의 수치를 한 번에 보여줍니다.</>,
            sub: "표 + 막대그래프로 성장 분포를 함께 확인합니다. 파라미터를 바꾸고 다시 눌러 감을 잡으세요.",
          },
          {
            label: <>수치가 <span className="text-[#f87171] font-semibold">∞</span> 로 표시되면 극고레벨에서 값이 폭발(오버플로우)했다는 뜻입니다.</>,
            sub: "exponential 곡선에서 자주 발생합니다. power 또는 logarithmic 으로 바꾸라는 경고가 함께 표시됩니다.",
          },
        ]}
      />
      <Divider />

      <SectionLabel>② ✦ 버튼으로 기존 테이블을 공식으로 변환</SectionLabel>
      <FlowDiagram
        items={[
          { icon: Wand2, label: "✦ 버튼", desc: "툴바 (행 2개 이상)" },
          { label: "컬럼 선택", desc: "레벨·수치·곡선" },
          { label: "피팅 결과", desc: "R²·오차 확인" },
          { icon: CheckCircle2, label: "일괄 적용", desc: "엔티티 테이블에 저장" },
        ]}
      />
      <div className="text-[10px] text-[#6b6b77] -mt-3 mb-4 leading-relaxed">
        ✦ 버튼은 현재 테이블에 <strong className="text-[#9a9aa3]">행이 2개 이상</strong> 있을 때만 활성화됩니다. 곡선을 맞추려면 최소 두 점이 필요하기 때문입니다.
      </div>
      <StepList
        title="변환 모달 사용법"
        items={[
          {
            label: <><strong className="text-[#ededed]">컬럼 선택</strong> — 레벨 컬럼(예: level), 수치 컬럼(예: dps), 곡선 타입을 고릅니다.</>,
          },
          {
            label: <><strong className="text-[#ededed]">그룹 컬럼</strong> (선택) — 영웅 ID처럼 엔티티를 구분하는 컬럼을 고르면, 그룹별로 따로 공식을 찾습니다.</>,
            sub: "예: hero_id 를 고르면 \"5개 그룹 감지\"처럼 표시되고, 영웅마다 개별 공식이 산출됩니다.",
          },
          {
            label: <><strong className="text-[#ededed]">피팅 결과</strong> — R²(적합도), 최대·평균 오차%, 그리고 파라미터 JSON을 보여줍니다. <IBtn icon={Copy} label="복사" /> 로 복사할 수 있습니다.</>,
          },
          {
            label: <><strong className="text-[#ededed]">원본 vs 공식 비교표</strong> — 여러 레벨에서 원본값 / 공식값 / 오차%를 나란히 비교해 차이를 눈으로 확인합니다.</>,
          },
        ]}
      />
      <Divider />

      <SectionLabel>곡선 6종 — 어떤 성장 모양인가</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-5">
        {[
          { name: "power", desc: "레벨^지수 형태. 방치형 게임에서 가장 흔합니다. \"레벨이 2배 되면 수치는 N배\"." },
          { name: "exponential", desc: "매 레벨마다 일정 배율로 곱셈. 극고레벨에서 ∞로 폭발하므로 단독 사용은 주의하세요." },
          { name: "linear", desc: "매 레벨마다 일정량 증가. 초반 튜토리얼 구간에 적합합니다." },
          { name: "quadratic", desc: "이차함수. 중반부터 급격히 올라가는 느낌입니다." },
          { name: "logarithmic", desc: "초반엔 빠르고 고레벨로 갈수록 완만. 스킬 레벨 같은 작은 보너스에 적합합니다." },
          { name: "s_curve", desc: "초반 완만 → 중반 급성장 → 후반 다시 완만. 스테이지 난이도 등에 사용합니다." },
        ].map(({ name, desc }) => (
          <div key={name} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <span className="px-1.5 py-0.5 rounded bg-[#2a2a3a] border border-[#3a3a4a] text-[10px] text-[#a78bfa] font-mono whitespace-nowrap flex-shrink-0">{name}</span>
            <span className="text-[11px] text-[#6b6b77] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#6b6b77] -mt-2 mb-5 leading-relaxed">
        곡선 6종은 모두 ✦ 변환 모달에서 고를 수 있습니다. 행 단위 ↗ 미리보기는 그 행에 적힌 공식을 그대로 그려보는 용도이므로,
        s_curve처럼 추가 값(중간점 등)이 필요한 곡선은 ✦ 모달에서 확인하는 것이 정확합니다.
      </div>
      <Divider />

      <SectionLabel>R² (적합도) 읽는 법</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-5">
        {[
          { badge: "우수", cls: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30", range: "0.99 이상", desc: "공식이 기존 데이터를 거의 완벽히 재현합니다. 안심하고 전환하세요." },
          { badge: "양호", cls: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30", range: "0.95 ~ 0.99", desc: "약간 오차는 있지만 실용적으로 사용할 수 있습니다." },
          { badge: "불량", cls: "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30", range: "0.95 미만", desc: "다른 곡선 타입을 시도하세요. 데이터가 곡선 형태가 아닐 수 있습니다." },
        ].map(({ badge, cls, range, desc }) => (
          <div key={badge} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${cls}`}>{badge}</span>
            <span className="text-[10px] font-mono text-[#9a9aa3] whitespace-nowrap flex-shrink-0 mt-0.5">{range}</span>
            <span className="text-[11px] text-[#6b6b77] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#6b6b77] -mt-2 mb-5 leading-relaxed">
        오차% 색상도 같은 식으로 읽습니다 — 초록(5% 미만) / 노랑(15% 미만) / 빨강(그 이상).
      </div>
      <Divider />

      <SectionLabel>그룹별 일괄 적용</SectionLabel>
      <StepList
        items={[
          {
            label: <>그룹 컬럼을 선택하면 <strong className="text-[#ededed]">일괄 적용</strong> 영역이 나타납니다. (그룹이 1개 이상 감지될 때)</>,
          },
          {
            label: <><strong className="text-[#ededed]">적용할 테이블</strong> — 공식을 저장할 부모 엔티티 테이블을 고릅니다. (예: heroes)</>,
          },
          {
            label: <><strong className="text-[#ededed]">매칭 컬럼</strong> — 그룹값과 비교할 컬럼을 고릅니다. (예: heroes.id 가 hero_001 같은 그룹값과 일치하는 행을 찾습니다)</>,
            sub: "매칭 컬럼 값이 그룹값과 같거나, 행 id 자체가 그룹값과 같으면 그 행에 저장됩니다.",
          },
          {
            label: <><IBtn icon={Wand2} label="N개 그룹 일괄 적용" variant="primary" /> 을 누르면 그룹마다 공식을 찾아 대상 테이블 행에 자동 저장합니다.</>,
          },
          {
            label: <>결과는 그룹별로 표시됩니다 — <IBtn icon={CheckCircle2} label="성공" variant="success" /> / <IBtn icon={AlertTriangle} label="매칭 행 없음" /> / <IBtn icon={XCircle} label="오류" variant="danger" />.</>,
            sub: "대상 테이블에 growth_* 컬럼이 없으면 \"저장은 되지만 화면에 안 보일 수 있다\"는 경고가 표시됩니다. 먼저 스키마에 세 컬럼을 추가해 두세요.",
          },
        ]}
      />
      <Divider />

      <SectionLabel>자주 쓰는 시나리오</SectionLabel>
      <div className="flex flex-col gap-3 mb-5">
        <div className="rounded-lg bg-[#16161e] border border-[#2a2a3a] p-3">
          <div className="text-[11px] font-semibold text-[#ededed] mb-2">시나리오 A — 새 방치형 게임을 공식으로 시작</div>
          <StepList
            items={[
              { label: <>위자드에서 "방치형 RPG" 선택 → heroes 테이블에 growth_* 컬럼이 자동 포함됩니다.</> },
              { label: <>heroes 행 입력: <span className="font-mono text-[#c4b5fd]">growth_type=power, growth_base=100, growth_factor=1.5</span></> },
              { label: <>행 우측 <IBtn icon={TrendingUp} /> 로 Lv 1~100,000 수치를 즉시 확인합니다.</> },
              { label: <>마음에 안 들면 파라미터를 수정하고 다시 <IBtn icon={TrendingUp} /> 로 확인합니다.</> },
            ]}
          />
        </div>

        <div className="rounded-lg bg-[#16161e] border border-[#2a2a3a] p-3">
          <div className="text-[11px] font-semibold text-[#ededed] mb-2">시나리오 B — 기존 레벨표(1,000행)를 공식으로 전환</div>
          <StepList
            items={[
              { label: <>hero_levels 테이블을 열고 툴바 <IBtn icon={Wand2} /> 버튼을 클릭합니다.</> },
              { label: <>레벨 컬럼=level, 수치 컬럼=dps, 곡선 타입=power 로 설정합니다.</> },
              { label: <>그룹 컬럼=hero_id 선택 → 예: "5개 그룹 감지". 특정 영웅을 골라 R²·오차를 미리 확인합니다.</> },
              { label: <>일괄 적용: 적용 테이블=heroes, 매칭 컬럼=id 로 설정 후 <strong className="text-[#ededed]">5개 그룹 일괄 적용</strong>.</> },
              { label: <>heroes 테이블로 가서 <IBtn icon={TrendingUp} /> 로 각 영웅의 공식 결과를 검증합니다.</> },
            ]}
          />
        </div>

        <div className="rounded-lg bg-[#16161e] border border-[#2a2a3a] p-3">
          <div className="text-[11px] font-semibold text-[#ededed] mb-2">시나리오 C — 목표 수치(앵커)에서 공식 거꾸로 찾기</div>
          <div className="text-[11px] text-[#9a9aa3] leading-relaxed mb-2">
            "레벨 1=100, 레벨 1000=500만" 같은 목표만 있을 때, 그 두 점을 지나는 공식을 거꾸로 찾을 수 있습니다.
          </div>
          <div className="px-3 py-2 rounded-lg bg-[#1e1e28] border border-[#2a2a3a] text-[11px] text-[#9a9aa3] font-mono">
            &ldquo;fit_curve로 power 타입 파라미터 찾아줘, 레벨1=100 레벨1000=5000000&rdquo;
          </div>
          <div className="text-[10px] text-[#6b6b77] mt-2 leading-relaxed">
            메모리 화면의 AI 대화창에 위처럼 요청하거나, ✦ 모달에서 두 점만 있는 임시 테이블로 피팅해도 됩니다.
          </div>
        </div>
      </div>

      <Tip>
        전환 전에는 <IBtn icon={Save} label="스냅샷 저장" /> 으로 원본 레벨표를 백업해 두세요. 공식이 마음에 들지 않으면 언제든 되돌릴 수 있습니다.
      </Tip>
    </>
  );
}

function EditorContent() {
  return (
    <>
      <ToolbarRow
        title="툴바 버튼"
        items={[
          { icon: Trash2,    label: "행 삭제",      desc: "선택된 행을 삭제합니다. Ctrl+Z로 복구 가능합니다." },
          { icon: Undo2,     label: "실행 취소",    desc: "셀 편집·행 삭제를 포함한 마지막 작업을 되돌립니다. (Ctrl+Z)" },
          { icon: Redo2,     label: "다시 실행",    desc: "되돌린 작업을 다시 적용합니다. (Ctrl+Shift+Z)" },
          { icon: Upload,    label: "CSV 임포트",   desc: "CSV 파일을 불러와 행을 일괄 추가합니다." },
          { icon: Download,  label: "내보내기",     desc: "CSV 또는 JSON 형식으로 저장합니다." },
          { icon: Save,      label: "스냅샷 저장",  desc: "현재 상태를 버전으로 저장합니다." },
          { icon: GitCompare,label: "버전 비교",    desc: "저장된 스냅샷과 현재 데이터 차이를 확인합니다." },
          { icon: TrendingUp,label: "성장 곡선 생성", desc: "레벨별 수치를 수식으로 자동 채웁니다." },
          { icon: Sparkles,  label: "AI 밸런스 분석", desc: "AI가 이상값을 분석하고 권장값을 제시합니다." },
          { icon: Eye,       label: "컬럼 표시/숨김", desc: "보고 싶은 컬럼만 선택해 화면에 표시합니다." },
        ]}
      />
      <Divider />
      <SectionLabel>셀 선택 방법</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-5">
        {[
          { how: "셀 클릭",          desc: "단일 셀 선택." },
          { how: "마우스 드래그",    desc: "드래그한 영역의 셀을 범위 선택합니다." },
          { how: "Shift + 클릭",     desc: "처음 선택한 셀부터 클릭 셀까지 범위를 확장합니다." },
          { how: "Ctrl + 클릭",      desc: "비연속 셀을 개별로 추가·토글합니다. 이미 선택된 셀은 해제됩니다." },
          { how: "행 번호 클릭",     desc: "해당 행 전체 셀을 선택합니다. Shift·Ctrl 조합도 동일하게 적용됩니다." },
          { how: "컬럼 헤더 클릭",   desc: "해당 컬럼 전체 셀을 선택합니다. Shift·Ctrl 조합도 동일하게 적용됩니다." },
          { how: "빈 영역 클릭",     desc: "셀 선택을 전체 해제합니다." },
        ].map(({ how, desc }) => (
          <div key={how} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <span className="px-1.5 py-0.5 rounded bg-[#2a2a3a] border border-[#3a3a4a] text-[10px] text-[#a78bfa] whitespace-nowrap flex-shrink-0">{how}</span>
            <span className="text-[11px] text-[#6b6b77] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>
      <ShortcutGrid
        items={[
          { key: "Ctrl Z",      desc: "실행 취소 (행 삭제 복구 포함)" },
          { key: "Ctrl ⇧ Z",   desc: "다시 실행" },
          { key: "Ctrl C",      desc: "선택 셀 복사" },
          { key: "Ctrl V",      desc: "붙여넣기" },
          { key: "Del / ⌫",    desc: "선택 셀 값 지우기" },
          { key: "↑ ↓ ← →",   desc: "셀 이동 (화면 자동 스크롤)" },
          { key: "Tab",         desc: "다음 셀로 이동" },
          { key: "Enter",       desc: "셀 편집 확정" },
        ]}
      />
      <Divider />
      <StepList
        title="행 추가 / 컬럼 너비 조절"
        items={[
          {
            label: <>테이블 하단 <IBtn icon={Plus} label="행 추가" /> 클릭 시 팝업이 열립니다.</>,
            sub: "수량 입력란에 직접 입력하거나 ±1/5/10 버튼으로 조절 후 확인합니다.",
          },
          {
            label: <>컬럼 헤더 오른쪽 끝에 마우스를 올리면 <strong className="text-[#ededed]">↔ 리사이즈 핸들</strong>이 나타납니다.</>,
            sub: "핸들을 드래그하면 해당 컬럼 너비가 실시간으로 조절됩니다. 최소 너비는 40px입니다.",
          },
        ]}
      />
      <Divider />
      <StepList
        title="이상값 셀 대응"
        items={[
          {
            label: <><span className="inline-block w-3 h-3 rounded-sm bg-red-500/40 border border-red-500 align-middle mr-1" /> 빨간 셀 = 위험 이상값, <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500 align-middle mr-1" /> 노란 셀 = 경고입니다.</>,
          },
          {
            label: <>이상값 셀을 클릭하면 하단 <IBtn icon={BarChart3} label="밸런싱 분석" /> 패널에 원인이 표시됩니다.</>,
          },
          {
            label: <><IBtn label="권장값 적용" variant="primary" /> 버튼으로 AI 제안값을 한 번에 반영합니다.</>,
          },
        ]}
      />
      <Tip>
        행 우측 <IBtn icon={StickyNote} /> 아이콘을 클릭해 해당 수치의 근거나 메모를 기록할 수 있습니다.
      </Tip>
      <Divider />
      <TableToFormulaContent />
    </>
  );
}

function TypesContent() {
  return (
    <>
      <FlowDiagram
        title="enum 타입 생성 → 컬럼 적용"
        items={[
          { icon: Plus, label: "새 타입", desc: "타입 화면에서" },
          { label: "이름 입력", desc: "예: grade" },
          { label: "값 추가", desc: "SSR, SR, R, N" },
          { icon: Table2, label: "스키마 컬럼 편집", desc: "타입 = grade 선택" },
          { icon: Database, label: "데이터 편집", desc: "드롭다운으로 선택" },
        ]}
      />
      <Divider />
      <StepList
        title="타입 관리"
        items={[
          { label: "타입 목록에서 항목을 선택하면 오른쪽에 상세 편집 패널이 열립니다." },
          { label: <>허용값 목록에 값을 추가·삭제해 선택지를 관리합니다.</> },
          {
            label: "타입이 연결된 컬럼이 있으면 삭제 시 경고가 표시됩니다.",
            sub: "연결된 컬럼의 데이터가 영향을 받을 수 있으니 먼저 컬럼 타입을 변경하세요.",
          },
        ]}
      />
      <Tip>등급·직업·속성처럼 반복 사용되는 값은 타입으로 만들면 일관성이 유지되고, 입력 오류도 줄어듭니다.</Tip>
    </>
  );
}

function BalanceContent() {
  return (
    <>
      <FlowDiagram
        title="이상값 분석 흐름"
        items={[
          { icon: Sparkles, label: "AI 분석 실행", desc: "툴바 버튼" },
          { label: "이상값 목록 확인", desc: "위험·경고 분류" },
          { label: "항목 클릭", desc: "데이터 화면으로 이동" },
          { icon: Pencil, label: "수치 수정", desc: "직접 편집" },
        ]}
      />
      <Divider />
      <SectionLabel>분석 패널 구성</SectionLabel>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { label: "이상값 목록", desc: "Danger(빨강) / Warn(노랑)으로 구분. 클릭하면 데이터 화면 해당 행으로 이동합니다." },
          { label: "레이더 차트", desc: "선택한 유닛들의 HP·ATK·DEF 등 능력치를 방사형으로 비교합니다." },
          { label: "상관계수", desc: "Pearson 계수로 두 컬럼 간 연관성을 분석합니다. ±1에 가까울수록 강한 상관관계입니다." },
          { label: "승률 매트릭스", desc: "유닛 간 1:1 전투 승률을 표로 보여줍니다. 몬테카를로 시뮬 기반입니다." },
          { label: "AI 리포트", desc: "Claude가 수치 전반을 분석하고 개선안을 제안합니다." },
        ].map(({ label, desc }) => (
          <div key={label} className="px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <div className="text-[11px] font-semibold text-[#ededed] mb-0.5">{label}</div>
            <div className="text-[10px] text-[#6b6b77] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
      <Tip>밸런스 점수가 80 미만이면 빨간색으로 표시됩니다. 이상값을 수정한 뒤 분석을 다시 실행해 점수 변화를 확인하세요.</Tip>
    </>
  );
}

function SimulationContent() {
  return (
    <>
      <SectionLabel>7개 시뮬레이션 탭</SectionLabel>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { tab: "저장된 시뮬", desc: "실제 DB 데이터로 컬럼 수식을 자동 도출합니다. 테이블·컬럼을 선택하면 가장 잘 맞는 곡선식을 찾아줍니다." },
          { tab: "스탯 계산기", desc: "DB 테이블을 선택하면 number 컬럼 전체가 스탯으로 자동 인식됩니다. 행을 고른 뒤 레벨·강화 단계를 설정해 최종 스탯을 계산합니다." },
          { tab: "전투 시뮬", desc: "몬테카를로 기법으로 유닛 간 전투 승률과 HP 추이를 시뮬합니다. DB 테이블에서 행을 불러와 HP·ATK·DEF 등 핵심 스탯을 컬럼에 매핑하고, 매핑되지 않은 나머지 number 컬럼은 추가 스탯으로 자동 반영됩니다." },
          { tab: "가챠", desc: "소프트 천장을 포함한 가챠 확률 분포와 평균 소환 횟수를 계산합니다." },
          { tab: "DPS", desc: "빌드별 초당 데미지를 비교합니다. 스킬·크리 확률 등 파라미터를 직접 설정합니다." },
          { tab: "난이도", desc: "스테이지별 적 유닛을 설정하면 플레이어 기준 승률과 예상 플레이타임을 계산합니다." },
          { tab: "페이싱", desc: "N일간 레벨·스테이지·재화 타임라인을 예측합니다. 성장 곡선과 하루 시도 횟수를 설정합니다." },
        ].map(({ tab, desc }) => (
          <div key={tab} className="px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-1.5 py-0.5 rounded bg-[#2a2a3a] border border-[#3a3a4a] text-[10px] text-[#a78bfa]">{tab}</span>
            </div>
            <div className="text-[10px] text-[#6b6b77] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
      <Divider />
      <ToolbarRow
        title="저장된 시뮬 툴바"
        items={[
          { icon: RotateCcw, label: "재실행", desc: "시뮬레이션을 처음부터 다시 실행합니다." },
          { icon: Copy, label: "수식 복사", desc: "도출된 수식 텍스트를 클립보드로 복사합니다." },
        ]}
      />
      <Tip>페이싱 시뮬로 콘텐츠 소진 속도와 페이 게이트 위치를 미리 확인해 보세요.</Tip>
    </>
  );
}

function EconomyContent() {
  return (
    <>
      <FlowDiagram
        title="경제 시뮬 설정 흐름"
        items={[
          { icon: Plus, label: "항목 추가", desc: "재화 종류" },
          { label: "수입·지출 입력", desc: "일일 금액" },
          { label: "성장률 설정", desc: "기간별 변화율" },
          { label: "인플레이션 설정", desc: "가치 하락률" },
          { icon: TrendingUp, label: "잔액 차트", desc: "LineChart 확인" },
        ]}
      />
      <Divider />
      <StepList
        title="차트 읽는 법"
        items={[
          {
            label: <><strong className="text-[#ededed]">실질 잔액</strong> 선은 인플레이션을 반영한 실제 구매력을 보여줍니다.</>,
          },
          {
            label: <><strong className="text-[#ededed]">명목 잔액</strong> 선은 누적된 절대 수치입니다.</>,
          },
          {
            label: <>두 선의 차이가 클수록 재화 인플레이션이 심한 게임 경제를 나타냅니다.</>,
            sub: "차이가 너무 크면 초반 재화 수급을 줄이거나 소비처를 늘리는 조정이 필요합니다.",
          },
        ]}
      />
      <Tip>인플레이션을 0으로 설정하면 순수 수입·지출 밸런스만 확인할 수 있습니다.</Tip>
    </>
  );
}

function MemoryContent() {
  return (
    <>
      <FlowDiagram
        title="AI 채팅으로 DB 조작"
        items={[
          { icon: MessageSquare, label: "대화 탭 열기", desc: "하단 탭" },
          { label: "자연어 입력", desc: "\"레벨 50 데이터 추가\"" },
          { icon: Sparkles, label: "AI 실행", desc: "MCP로 DB 조작" },
          { icon: Database, label: "즉시 반영", desc: "데이터 화면 새로고침" },
        ]}
      />
      <Divider />
      <SectionLabel>AI 채팅 활용 예시</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-5">
        {[
          "영웅 테이블에 레벨 50 행 추가해줘",
          "HP 컬럼이 1000 이상인 유닛 보여줘",
          "이 테이블 구조 설명해줘",
          "ATK가 가장 높은 유닛 3개 알려줘",
        ].map((ex) => (
          <div key={ex} className="px-3 py-2 rounded-lg bg-[#1e1e28] border border-[#2a2a3a] text-[11px] text-[#9a9aa3] font-mono">
            &ldquo;{ex}&rdquo;
          </div>
        ))}
      </div>
      <Divider />
      <StepList
        title="프로젝트 메모"
        items={[
          { label: "메모 탭에서 기획 의도·결정 사항을 자유형식으로 기록합니다." },
          {
            label: "저장된 메모는 AI 채팅 시 자동으로 맥락으로 활용됩니다.",
            sub: "\"이 프로젝트는 방치형 RPG로, 재화 인플레이션 억제가 핵심\" 같은 메모가 AI 응답 품질을 높입니다.",
          },
        ]}
      />
      <Tip>AI 채팅은 MCP(Model Context Protocol)로 실제 DB에 직접 접근합니다. 민감한 데이터 수정 전에는 스냅샷을 먼저 저장하세요.</Tip>
    </>
  );
}

// ── 화면 메타 ────────────────────────────────────────────────────

const SECTIONS = [
  { id: "home"       as Screen, label: "프로젝트",   Icon: Home,        title: "프로젝트",   subtitle: "게임 프로젝트를 생성하고 관리하는 시작점입니다.",          Content: HomeContent       },
  { id: "schema"     as Screen, label: "스키마",     Icon: Table2,      title: "스키마",     subtitle: "테이블 구조(컬럼)를 설계하는 화면입니다.",                  Content: SchemaContent     },
  { id: "editor"     as Screen, label: "데이터",     Icon: Database,    title: "데이터",     subtitle: "수치 데이터를 입력·편집하고, 레벨표를 무한 레벨 공식으로 전환합니다.", Content: EditorContent     },
  { id: "types"      as Screen, label: "타입",       Icon: Tags,        title: "타입",       subtitle: "컬럼에서 사용하는 선택지(enum) 목록을 관리합니다.",           Content: TypesContent      },
  { id: "balance"    as Screen, label: "밸런싱",     Icon: BarChart2,   title: "밸런싱",     subtitle: "테이블 수치의 이상값을 감지하고 밸런스를 분석합니다.",        Content: BalanceContent    },
  { id: "simulation" as Screen, label: "시뮬레이션", Icon: Play,        title: "시뮬레이션", subtitle: "수치를 시뮬레이션해 게임 플레이 감을 미리 예측합니다.",       Content: SimulationContent },
  { id: "economy"    as Screen, label: "경제",       Icon: Coins,       title: "경제",       subtitle: "재화 흐름(수입·지출)을 시뮬레이션합니다.",                   Content: EconomyContent    },
  { id: "memory"     as Screen, label: "메모리",     Icon: NotebookText,title: "메모리",     subtitle: "AI와 대화하며 DB를 자연어로 조작하고 기획 메모를 저장합니다.", Content: MemoryContent     },
];

// ── HelpModal ────────────────────────────────────────────────────

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  initialScreen?: Screen;
}

export function HelpModal({ open, onClose, initialScreen }: HelpModalProps) {
  const [active, setActive] = useState<Screen>(initialScreen ?? "home");

  useEffect(() => {
    if (open) setActive(initialScreen ?? "home");
  }, [open, initialScreen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const { Icon, title, subtitle, Content } = section;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1a1a22] border border-[#2a2a3a] rounded-xl w-[760px] max-h-[82vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌측 화면 목록 */}
        <div className="w-[152px] border-r border-[#2a2a3a] py-3 flex flex-col gap-0.5 flex-shrink-0">
          <div className="px-4 pb-2 text-[10px] font-semibold text-[#4a4a55] uppercase tracking-wider">
            사용 가이드
          </div>
          {SECTIONS.map(({ id, label, Icon: SIcon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`mx-2 px-3 py-2 rounded-md text-left flex items-center gap-2 text-[11px] transition-colors ${
                active === id
                  ? "bg-[#2a2a3a] text-[#c9c9d4]"
                  : "text-[#6b6b77] hover:bg-[#22222e] hover:text-[#9a9aa3]"
              }`}
            >
              <SIcon size={13} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* 우측 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2a2a3a] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Icon size={16} className="text-[#8b5cf6]" />
              <div>
                <div className="text-[14px] font-semibold text-[#ededed]">{title}</div>
                <div className="text-[11px] text-[#6b6b77] mt-0.5">{subtitle}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              title="닫기 (ESC)"
              className="text-[#6b6b77] hover:text-[#ededed] hover:bg-[#22222e] rounded-md p-1.5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 px-6 py-5 overflow-y-auto">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
