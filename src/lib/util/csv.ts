// CSV 파싱 단일 출처. CRLF/CR 줄바꿈 정규화 + 셀 양끝 공백·따옴표 제거.
// Next API 라우트와 tsx 로 실행되는 MCP 서버 양쪽에서 import 한다(node 의존성 없음).
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => line.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}
