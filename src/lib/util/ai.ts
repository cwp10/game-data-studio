import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readSettings } from "@/lib/settings";

// ── Claude CLI ──────────────────────────────────────────────────────────────

let claudeCached: string | null = null;
function resolveClaudeBin(): string {
  if (claudeCached) return claudeCached;
  const candidates = [
    process.env.CLAUDE_BIN,
    path.join(os.homedir(), ".local/bin/claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) { claudeCached = c; return c; } } catch { /* ignore */ }
  }
  claudeCached = "claude";
  return claudeCached;
}

// ── Codex CLI ───────────────────────────────────────────────────────────────

let codexCached: string | null = null;
function resolveCodexBin(): string {
  if (codexCached) return codexCached;
  const candidates = [
    process.env.CODEX_BIN,
    path.join(os.homedir(), ".local/bin/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/usr/bin/codex",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) { codexCached = c; return c; } } catch { /* ignore */ }
  }
  codexCached = "codex";
  return codexCached;
}

// ── 공통 spawn ──────────────────────────────────────────────────────────────

export function spawnAI(
  claudeArgs: string[],
  opts: { input?: string; detached?: boolean } = {},
): ChildProcessWithoutNullStreams {
  const settings = readSettings();

  if (settings.aiProvider === "codex") {
    // Codex CLI: --approval-mode full-auto 로 자동 실행
    // MCP는 ~/.codex/config.toml 에 사전 등록 필요 (--mcp-config 미지원)
    const codexArgs = [
      "--approval-mode", "full-auto",
      "--model", settings.codexModel,
      "--quiet",
    ];
    const child = spawn(resolveCodexBin(), codexArgs, {
      cwd: process.cwd(),
      env: process.env,
      detached: opts.detached,
    });
    child.stdin.on("error", () => {});
    if (opts.input !== undefined) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
    return child;
  }

  // Claude CLI (기본)
  const child = spawn(resolveClaudeBin(), claudeArgs, {
    cwd: process.cwd(),
    env: process.env,
    detached: opts.detached,
  });
  child.stdin.on("error", () => {});
  if (opts.input !== undefined) {
    child.stdin.write(opts.input);
    child.stdin.end();
  }
  return child;
}

// 하위 호환: 기존 spawnClaude 호출 코드가 있으면 이걸 사용
export { resolveClaudeBin as resolveClaudeBinLegacy };
