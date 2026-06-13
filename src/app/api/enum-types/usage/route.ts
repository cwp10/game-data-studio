import { NextRequest, NextResponse } from "next/server";
import { checkEnumValueUsage, checkEnumTypeUsage } from "@/lib/db/repo/enumTypes";

export async function GET(req: NextRequest) {
  const enumTypeId = req.nextUrl.searchParams.get("enum_type_id");
  const value = req.nextUrl.searchParams.get("value");
  if (!enumTypeId) return NextResponse.json({ error: "enum_type_id required" }, { status: 400 });
  const usages = value ? checkEnumValueUsage(enumTypeId, value) : checkEnumTypeUsage(enumTypeId);
  return NextResponse.json(usages);
}
