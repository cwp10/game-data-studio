import { NextRequest, NextResponse } from "next/server";
import { listEnumTypes, createEnumType, updateEnumType, deleteEnumType } from "@/lib/db/repo/enumTypes";
import { countColumnsUsingEnum } from "@/lib/db/repo/columns";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listEnumTypes(projectId));
}

export async function POST(req: NextRequest) {
  const { project_id, name, values } = await req.json();
  if (!project_id || !name?.trim()) return NextResponse.json({ error: "project_id, name required" }, { status: 400 });
  try {
    return NextResponse.json(createEnumType({ project_id, name: name.trim(), values: values ?? [] }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { id, name, values } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  return NextResponse.json(updateEnumType(id, { name, values }));
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const used = countColumnsUsingEnum(id);
  if (used > 0) return NextResponse.json({ error: `사용 중인 컬럼이 ${used}개 있어 삭제할 수 없습니다.` }, { status: 409 });
  deleteEnumType(id);
  return NextResponse.json({ deleted: true });
}
