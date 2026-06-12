import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Simulation {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  input_tables: string | null; // JSON array
  result: string | null; // JSON
  formula_cs: string | null;
  created_at: number;
  updated_at: number;
}

export function listSimulations(projectId: string): Simulation[] {
  return getDb()
    .prepare("SELECT * FROM simulations WHERE project_id = ? ORDER BY updated_at DESC")
    .all(projectId) as Simulation[];
}

export function getSimulation(id: string): Simulation | undefined {
  return getDb().prepare("SELECT * FROM simulations WHERE id = ?").get(id) as Simulation | undefined;
}

export function deleteSimulation(id: string): void {
  getDb().prepare("DELETE FROM simulations WHERE id = ?").run(id);
}

export function saveSimulation(data: {
  project_id: string;
  name: string;
  description?: string;
  input_tables?: string[];
  result?: unknown;
  formula_cs?: string;
}): Simulation {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO simulations (id, project_id, name, description, input_tables, result, formula_cs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    data.project_id,
    data.name,
    data.description ?? null,
    data.input_tables ? JSON.stringify(data.input_tables) : null,
    data.result ? JSON.stringify(data.result) : null,
    data.formula_cs ?? null,
    now,
    now
  );
  return getSimulation(id)!;
}
