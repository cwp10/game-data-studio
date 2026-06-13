import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

export type AIProvider = "claude" | "codex";
export interface AppSettings {
  aiProvider: AIProvider;
  codexModel: string;
}

const DEFAULTS: AppSettings = { aiProvider: "claude", codexModel: "gpt-4o" };

export function readSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<AppSettings>;
  const current = readSettings();
  const next: AppSettings = { ...current, ...body };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return NextResponse.json(next);
}
