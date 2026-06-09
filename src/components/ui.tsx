"use client";
import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Btn({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "success" }) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 border rounded-md text-[11px] cursor-pointer whitespace-nowrap";
  const variants = {
    default: "bg-white border-[#d0cec8] text-[#555] hover:bg-[#f8f7f4]",
    primary: "bg-[#e6f1fb] border-[#85b7eb] text-[#0C447C] hover:bg-[#d6e8f7]",
    success: "bg-[#eaf3de] border-[#97c459] text-[#27500A] hover:bg-[#deeeca]",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Badge({ variant, children }: { variant: "ssr" | "sr" | "r" | "n" | "danger" | "warn" | "success" | "info"; children: ReactNode }) {
  const styles = {
    ssr: "bg-[#fbeaf0] text-[#72243E]",
    sr: "bg-[#faeeda] text-[#633806]",
    r: "bg-[#e6f1fb] text-[#0C447C]",
    n: "bg-[#f1efe8] text-[#5F5E5A]",
    danger: "bg-[#fcebeb] text-[#A32D2D]",
    warn: "bg-[#faeeda] text-[#633806]",
    success: "bg-[#eaf3de] text-[#27500A]",
    info: "bg-[#e6f1fb] text-[#0C447C]",
  };
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${styles[variant]}`}>{children}</span>;
}

export function TypeBadge({ type }: { type: "string" | "number" | "boolean" }) {
  const styles = {
    number: "bg-[#e6f1fb] text-[#0C447C]",
    string: "bg-[#eaf3de] text-[#27500A]",
    boolean: "bg-[#faeeda] text-[#633806]",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[type]}`}>{type}</span>;
}

export function PanelHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-3 py-2.5 border-b border-[#e8e6e0] flex items-center justify-between text-[11px] font-medium text-[#888] uppercase tracking-wide ${className}`}>
      {children}
    </div>
  );
}

export function PanelItem({ active, children, onClick, className = "" }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 text-xs cursor-pointer border-l-2 flex items-center gap-2 ${active ? "bg-white text-[#1a1a18] border-[#185FA5] font-medium" : "text-[#666] border-transparent hover:bg-white"} ${className}`}
    >
      {children}
    </div>
  );
}

export function ContentHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-3.5 py-2.5 border-b border-[#e8e6e0] flex items-center justify-between flex-shrink-0">
      <span className="text-sm font-medium">{title}</span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-medium text-[#888] uppercase tracking-wide mb-2 mt-4 first:mt-0 ${className}`}>{children}</div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-[400px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-medium mb-4">{title}</div>
        {children}
      </div>
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full px-3 py-2 border border-[#d0cec8] rounded-md text-xs focus:outline-none focus:border-[#85b7eb]" {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full px-3 py-2 border border-[#d0cec8] rounded-md text-xs focus:outline-none focus:border-[#85b7eb] bg-white" {...props} />;
}
