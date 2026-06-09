// MCP 서버/툴 네이밍 단일 출처. client·server 양쪽에서 import 가능하도록 node 의존성 없음.
// MCP_SERVER_NAME 은 반드시 data/mcp.json 의 mcpServers 키와 동일해야 한다(툴 prefix 가 그 키로 결정됨).
export const MCP_SERVER_NAME = "game-data-studio";
export const MCP_TOOL_PREFIX = `mcp__${MCP_SERVER_NAME}__`;
export const mcpTool = (name: string) => `${MCP_TOOL_PREFIX}${name}`;
