import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readRows, upsertRow, deleteRow } from "../../db/repo/rows.js";
import { listSnapshots, createSnapshot, deleteSnapshot } from "../../db/repo/snapshots.js";
import { ok } from "./respond.js";

export function registerSnapshotHandlers(server: McpServer) {
  server.tool("list_snapshots", "테이블의 스냅샷 목록 조회", { table_id: z.string() },
    async ({ table_id }) => ok(listSnapshots(table_id))
  );

  server.tool("create_snapshot", "현재 테이블 데이터를 스냅샷으로 저장", { table_id: z.string(), name: z.string() },
    async ({ table_id, name }) => ok(createSnapshot(table_id, name, readRows(table_id)))
  );

  server.tool("restore_snapshot", "스냅샷으로 테이블 데이터 복원", { table_id: z.string(), snapshot_id: z.string() },
    async ({ table_id, snapshot_id }) => {
      const snap = listSnapshots(table_id).find((s) => s.id === snapshot_id);
      if (!snap) return ok({ error: "snapshot not found" });
      const rows: Array<{ id: string; data: Record<string, unknown> }> = JSON.parse(snap.data);
      const existing = readRows(table_id);
      for (const r of existing) deleteRow(r.id);
      for (const r of rows) upsertRow(table_id, r.id, r.data);
      return ok({ restored: rows.length });
    }
  );

  server.tool("delete_snapshot", "스냅샷 삭제", { snapshot_id: z.string() },
    async ({ snapshot_id }) => { deleteSnapshot(snapshot_id); return ok({ deleted: true }); }
  );
}
