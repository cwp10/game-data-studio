import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface EconomyScenario {
  id: string;
  project_id: string;
  name: string;
  data: string; // JSON: { sources, sinks, days, start }
  created_at: number;
  updated_at: number;
}

export function listEconomyScenarios(projectId: string): EconomyScenario[] {
  return getDb().prepare("SELECT * FROM economy_scenarios WHERE project_id = ? ORDER BY updated_at DESC").all(projectId) as EconomyScenario[];
}

export function getEconomyScenario(id: string): EconomyScenario | undefined {
  return getDb().prepare("SELECT * FROM economy_scenarios WHERE id = ?").get(id) as EconomyScenario | undefined;
}

export function saveEconomyScenario(projectId: string, name: string, data: unknown): EconomyScenario {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare("INSERT INTO economy_scenarios (id, project_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, projectId, name, JSON.stringify(data), now, now);
  return getEconomyScenario(id)!;
}

export function updateEconomyScenario(id: string, data: unknown): void {
  getDb().prepare("UPDATE economy_scenarios SET data = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(data), Date.now(), id);
}

export function deleteEconomyScenario(id: string): void {
  getDb().prepare("DELETE FROM economy_scenarios WHERE id = ?").run(id);
}
