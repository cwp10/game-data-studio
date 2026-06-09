// MCP 툴 응답 헬퍼. 모든 핸들러가 동일한 출력 형태를 쓰도록 단일 출처로 둔다.
export function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
