#!/usr/bin/env node
// Next.js standalone 빌드 후 electron-builder 패키징 전에 실행
// - 심볼릭 링크를 실제 디렉터리로 교체 (electron-builder가 stat 실패하는 버그 우회)
import { execSync } from "child_process";
import { readdirSync, lstatSync, readlinkSync, cpSync, rmSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STANDALONE = join(ROOT, ".next", "standalone");

function resolveSymlinks(dir) {
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isSymbolicLink()) {
      const target = readlinkSync(full);
      const absTarget = resolve(dirname(full), target);
      rmSync(full);
      cpSync(absTarget, full, { recursive: true });
      count++;
    } else if (e.isDirectory()) {
      count += resolveSymlinks(full);
    }
  }
  return count;
}

console.log("심볼릭 링크 실제 디렉터리로 교체 중...");
const n = resolveSymlinks(STANDALONE);
console.log(`완료: ${n}개 링크 교체`);
