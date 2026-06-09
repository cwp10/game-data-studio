import { NextRequest, NextResponse } from "next/server";
import { listEconomyScenarios, saveEconomyScenario, updateEconomyScenario, deleteEconomyScenario } from "@/lib/db/repo/economy";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listEconomyScenarios(projectId));
}

export async function POST(req: NextRequest) {
  const { project_id, name, data } = await req.json();
  if (!project_id || !name || !data) return NextResponse.json({ error: "project_id, name, data required" }, { status: 400 });
  return NextResponse.json(saveEconomyScenario(project_id, name, data), { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { id, data } = await req.json();
  if (!id || !data) return NextResponse.json({ error: "id, data required" }, { status: 400 });
  updateEconomyScenario(id, data);
  return NextResponse.json({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteEconomyScenario(id);
  return NextResponse.json({ deleted: true });
}
