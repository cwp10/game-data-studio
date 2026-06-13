"use client";
import { useEffect } from "react";

export function DragGuard() {
  useEffect(() => {
    const block = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    };
    document.addEventListener("dragover", block);
    document.addEventListener("drop", block);
    return () => {
      document.removeEventListener("dragover", block);
      document.removeEventListener("drop", block);
    };
  }, []);
  return null;
}
