import { NextRequest, NextResponse } from "next/server";
import { deleteRelation, listRelations, setRelation } from "@/lib/db/repo/relations";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listRelations(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json(setRelation(body), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { relation_id } = await req.json();
  deleteRelation(relation_id);
  return NextResponse.json({ deleted: true });
}
