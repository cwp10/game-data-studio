"use client";
import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Btn({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "success" }) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 border rounded-md text-[11px] cursor-pointer whitespace-nowrap transition-colors";
  const variants = {
    default: "bg-[#1a1a1c] border-[#2a2a2f] text-[#9a9aa3] hover:bg-[#1e1e24] hover:border-[#3a3a42] hover:text-[#ededed]",
    primary: "bg-[#7c3aed] border-[#7c3aed] text-white hover:bg-[#6d28d9]",
    success: "bg-[#16a34a] border-[#16a34a] text-white hover:bg-[#15803d]",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Badge({ variant, children }: { variant: "ssr" | "sr" | "r" | "n" | "danger" | "warn" | "success" | "info"; children: ReactNode }) {
  const styles = {
    ssr: "bg-[#3d0a1e] text-[#f9a8d4]",
    sr: "bg-[#451a03] text-[#fbbf24]",
    r: "bg-[#1e1b4b] text-[#c4b5fd]",
    n: "bg-[#1a1a1c] text-[#9a9aa3]",
    danger: "bg-[#2d0a0a] text-[#f87171]",
    warn: "bg-[#2d1a00] text-[#f59e0b]",
    success: "bg-[#052e16] text-[#4ade80]",
    info: "bg-[#1e1b4b] text-[#c4b5fd]",
  };
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${styles[variant]}`}>{children}</span>;
}

export function TypeBadge({ type }: { type: "string" | "number" | "boolean" }) {
  const styles = {
    number: "bg-[#1e1b4b] text-[#c4b5fd]",
    string: "bg-[#052e16] text-[#4ade80]",
    boolean: "bg-[#2d1a00] text-[#fbbf24]",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[type]}`}>{type}</span>;
}

export function PanelHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-3 py-2.5 border-b border-[#2a2a2f] flex items-center justify-between text-[11px] font-medium text-[#6b6b77] uppercase tracking-wide bg-[#16161a] ${className}`}>
      {children}
    </div>
  );
}

export function PanelItem({ active, children, onClick, className = "" }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 text-xs cursor-pointer border-l-2 flex items-center gap-2 ${active ? "bg-[#1e1e24] text-[#ededed] border-[#8b5cf6] font-medium" : "text-[#9a9aa3] border-transparent hover:bg-[#1e1e24]"} ${className}`}
    >
      {children}
    </div>
  );
}

export function ContentHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-3.5 py-2.5 border-b border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
      <span className="text-sm font-medium text-[#ededed]">{title}</span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-medium text-[#6b6b77] uppercase tracking-wide mb-2 mt-4 first:mt-0 ${className}`}>{children}</div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-2xl shadow-2xl p-5 w-[420px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-4 text-[#ededed]">{title}</div>
        {children}
      </div>
    </div>
  );
}

export function PillTab({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-[#16161a] rounded-lg border border-[#2a2a2f]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${active === t.id ? "bg-[#1e1e24] text-[#8b5cf6] font-medium" : "text-[#6b6b77] hover:text-[#9a9aa3]"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full px-3 py-2 border border-[#3a3a42] rounded-md text-xs focus:outline-none focus:border-[#8b5cf6] bg-[#16161a] text-[#ededed]" {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full px-3 py-2 border border-[#3a3a42] rounded-md text-xs focus:outline-none focus:border-[#8b5cf6] bg-[#16161a] text-[#ededed]" {...props} />;
}

const GRADE_STYLES: Record<string, string> = {
  SSR: "bg-[#3d0a1e] text-[#f9a8d4]",
  SR:  "bg-[#451a03] text-[#fbbf24]",
  R:   "bg-[#1e1b4b] text-[#c4b5fd]",
  N:   "bg-[#1a1a1c] text-[#9a9aa3]",
};

export function GradeBadge({ grade }: { grade: string }) {
  const style = GRADE_STYLES[grade.toUpperCase()];
  if (!style) return <span>{grade}</span>;
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${style}`}>{grade}</span>;
}

export function CsCodeBlock({ code }: { code: string }) {
  const lines = code.split("\n");

  function tokenizeLine(line: string): { text: string; cls: string }[] {
    const tokens: { text: string; cls: string }[] = [];
    let remaining = line;

    while (remaining.length > 0) {
      // 주석
      const commentIdx = remaining.indexOf("//");
      if (commentIdx === 0) {
        tokens.push({ text: remaining, cls: "text-[#4a4a55]" });
        break;
      }

      // 함수 호출 (word.word 패턴 또는 단독 함수명)
      const fnMatch = remaining.match(/^([A-Z][a-zA-Z]*\.[A-Za-z]+)/);
      if (fnMatch) {
        tokens.push({ text: fnMatch[0], cls: "text-[#4ade80]" });
        remaining = remaining.slice(fnMatch[0].length);
        continue;
      }

      // 숫자 리터럴 (float 포함: 1200f, 1.5f, 0, 1)
      const numMatch = remaining.match(/^(\d+\.?\d*f?)/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], cls: "text-[#f87171]" });
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }

      // 키워드
      const kwMatch = remaining.match(/^(bool|float|int|void|return|if|else|var|new|true|false|this)\b/);
      if (kwMatch) {
        tokens.push({ text: kwMatch[0], cls: "text-[#c4b5fd]" });
        remaining = remaining.slice(kwMatch[0].length);
        continue;
      }

      // 그 외 문자 (1글자씩)
      tokens.push({ text: remaining[0], cls: "text-[#9a9aa3]" });
      remaining = remaining.slice(1);
    }
    return tokens;
  }

  return (
    <div className="bg-[#0f0f10] rounded-md px-3.5 py-3 font-mono text-[11px] leading-[1.8] overflow-x-auto">
      {lines.map((line, i) => {
        const commentIdx = line.indexOf("//");
        if (commentIdx === 0) {
          return <div key={i}><span className="text-[#4a4a55]">{line}</span></div>;
        }
        if (commentIdx > 0) {
          const before = line.slice(0, commentIdx);
          const comment = line.slice(commentIdx);
          return (
            <div key={i}>
              {tokenizeLine(before).map((t, j) => (
                <span key={j} className={t.cls}>{t.text}</span>
              ))}
              <span className="text-[#4a4a55]">{comment}</span>
            </div>
          );
        }
        return (
          <div key={i}>
            {tokenizeLine(line).map((t, j) => (
              <span key={j} className={t.cls}>{t.text}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
