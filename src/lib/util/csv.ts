// RFC 4180 CSV 파서/직렬화. Next API 라우트와 MCP 서버 양쪽에서 공용 (node 의존성 없음).

export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records = parseRecords(normalized);
  if (records.length === 0) return { headers: [], rows: [] };
  return { headers: records[0], rows: records.slice(1) };
}

// 셀 값을 RFC 4180 규칙으로 직렬화. 쉼표·줄바꿈·쌍따옴표 포함 시 감싸고 내부 " → "".
export function serializeCSV(headers: string[], rows: string[][]): string {
  const encode = (v: string) => {
    if (v.includes(",") || v.includes("\n") || v.includes('"')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(encode).join(",")];
  for (const row of rows) lines.push(row.map(encode).join(","));
  return lines.join("\n");
}

// RFC 4180 상태 머신 파서. 따옴표 안 쉼표·줄바꿈·"" 이스케이프 처리.
function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let inQuote = false;
  let record: string[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
        i++;
      } else if (ch === ",") {
        record.push(field);
        field = "";
        i++;
      } else if (ch === "\n") {
        record.push(field);
        field = "";
        if (record.some((f) => f !== "")) records.push(record);
        record = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // 마지막 필드/레코드 처리
  record.push(field);
  if (record.some((f) => f !== "")) records.push(record);

  return records;
}
