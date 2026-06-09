import fs from "fs";
import path from "path";
import os from "os";

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
