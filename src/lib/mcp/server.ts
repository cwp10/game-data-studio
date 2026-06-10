import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerProjectHandlers } from "./handlers/project-handler.js";
import { registerTableHandlers } from "./handlers/table-handler.js";
import { registerRowHandlers } from "./handlers/row-handler.js";
import { registerCsvHandlers } from "./handlers/csv-handler.js";
import { registerRelationHandlers } from "./handlers/relation-handler.js";
import { registerBalanceHandlers } from "./handlers/balance-handler.js";
import { registerSimulationHandlers } from "./handlers/simulation-handler.js";
import { registerCurveHandlers } from "./handlers/curve-handler.js";
import { registerEnumHandlers } from "./handlers/enum-handler.js";
import { registerMemoryHandlers } from "./handlers/memory-handler.js";
import { registerSnapshotHandlers } from "./handlers/snapshot-handler.js";
import { registerValidateHandlers } from "./handlers/validate-handler.js";

const server = new McpServer({ name: "game-data-studio", version: "1.0.0" });

// 도메인별 핸들러 등록 (각 모듈이 server.tool(...)로 자기 영역 툴을 붙인다)
registerProjectHandlers(server);
registerTableHandlers(server);
registerRowHandlers(server);
registerCsvHandlers(server);
registerRelationHandlers(server);
registerBalanceHandlers(server);
registerSimulationHandlers(server);
registerCurveHandlers(server);
registerEnumHandlers(server);
registerMemoryHandlers(server);
registerSnapshotHandlers(server);
registerValidateHandlers(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("game-data-studio MCP server running");
