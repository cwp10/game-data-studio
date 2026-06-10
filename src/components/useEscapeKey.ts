"use client";
import { useEffect } from "react";

// 모달 등에서 ESC 키로 닫기. enabled가 true일 때만 document keydown 리스너 등록/해제.
export function useEscapeKey(enabled: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onEscape]);
}
