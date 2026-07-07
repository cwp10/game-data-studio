import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, type AppSettings } from "@/lib/settings";

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<AppSettings>;
  const current = readSettings();
  const next: AppSettings = { ...current, ...body };
  writeSettings(next);
  return NextResponse.json(next);
}
