import fs from "fs";
import path from "path";
import os from "os";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

// Electron 패키지 등에서 spawn된 프로세스는 셸 PATH를 상속하지 않으므로
// claude 바이너리를 절대경로로 해석한다. (CLAUDE_BIN > 일반 설치 경로 > PATH)
let cached: string | null = null;

export function resolveClaudeBin(): string {
  if (cached) return cached;
  const candidates = [
    process.env.CLAUDE_BIN,
    path.join(os.homedir(), ".local/bin/claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try { if (fs.existsSync(c)) { cached = c; return c; } } catch { /* ignore */ }
  }
  cached = "claude"; // PATH 폴백
  return cached;
}

// claude CLI 를 공통 옵션으로 spawn 한다(bin 해석 + cwd/env + stdin EPIPE 흡수 + 선택적 입력 주입).
// stdout 수집(스트리밍/버퍼)·종료 처리는 호출부가 담당한다.
export function spawnClaude(
  args: string[],
  opts: { input?: string; detached?: boolean } = {},
): ChildProcessWithoutNullStreams {
  const child = spawn(resolveClaudeBin(), args, { cwd: process.cwd(), env: process.env, detached: opts.detached });
  // claude 가 즉시 죽으면 stdin write 에서 EPIPE 가 날 수 있으므로 흡수(child error/close 에서 처리됨).
  child.stdin.on("error", () => {});
  if (opts.input !== undefined) {
    child.stdin.write(opts.input);
    child.stdin.end();
  }
  return child;
}
