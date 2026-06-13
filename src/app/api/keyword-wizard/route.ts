import { NextRequest, NextResponse } from "next/server";
import { spawnAI } from "@/lib/util/ai";
import { assembleOverlays } from "@/lib/game-patterns/modules";
import { GENRES } from "@/lib/genre-seeds";

// claude 헤드리스 호출이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// claude -p --output-format json 으로 호출하고 assistant 최종 텍스트를 반환
function runClaude(prompt: string, system: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 마법사는 단순 데이터 생성이라 빠르고 저렴한 모델로 충분 (WIZARD_MODEL 로 override)
    const model = process.env.WIZARD_MODEL ?? "sonnet";
    // MCP/툴 없이 순수 텍스트 생성만 (strict-mcp-config 로 외부 MCP 서버 미로드)
    const child = spawnAI(
      ["-p", "--output-format", "json", "--strict-mcp-config", "--model", model, "--append-system-prompt", system],
      { input: prompt },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.stderr.on("data", (c: Buffer) => (err += c.toString()));
    child.on("error", reject);
    child.on("close", () => {
      try {
        const o = JSON.parse(out);
        resolve(typeof o.result === "string" ? o.result : out);
      } catch {
        reject(new Error("claude 응답 파싱 실패: " + (err || out).slice(0, 300)));
      }
    });
  });
}

// 응답 텍스트에서 JSON 객체만 추출 (코드펜스/서두 제거)
function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

// row 값 타입 강제 — typeMap 기준 number/boolean/string 변환 (타입이 이미 확정되어 inferColumnType 불필요)
function enforceTypes(rows: unknown[], typeMap: Record<string, string>): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => {
      const r = { ...row };
      for (const [k, v] of Object.entries(r)) {
        const expected = typeMap[k];
        if (!expected) continue;
        if (expected === "number" && typeof v !== "number") {
          const n = Number(v);
          if (!isNaN(n)) r[k] = n;
        } else if (expected === "boolean" && typeof v !== "boolean") {
          r[k] = v === "true" || v === 1 || v === "1";
        } else if (expected === "string" && typeof v !== "string") {
          if (v !== null && v !== undefined) r[k] = String(v);
        }
      }
      return r;
    });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const baseGenre = typeof body?.baseGenre === "string" ? body.baseGenre : "";
  const featuresInput = body?.features;

  if (!baseGenre) {
    return NextResponse.json({ error: "baseGenre 가 필요합니다." }, { status: 400 });
  }

  const features: string[] = Array.isArray(featuresInput)
    ? featuresInput.filter((f: unknown): f is string => typeof f === "string")
    : [];

  const { allTables, relations, baseTables, overlayTables } = assembleOverlays(baseGenre, features);
  const genreLabel = GENRES.find((g) => g.code === baseGenre)?.label ?? baseGenre;

  // 테이블별 컬럼 타입 맵 (row 값 타입 강제용)
  const typeMaps: Record<string, Record<string, string>> = {};
  for (const t of allTables) {
    const m: Record<string, string> = {};
    for (const c of t.columns) m[c.name] = c.type;
    typeMaps[t.name] = m;
  }

  const tableStructureStr = JSON.stringify(
    allTables.map((t) => ({ name: t.name, columns: t.columns.map((c) => ({ name: c.name, type: c.type })) })),
    null,
    2,
  );

  const protagonistTable = allTables.find((t) =>
    ["characters", "heroes", "units", "classes"].includes(t.name),
  );
  const protagonistName = protagonistTable?.name ?? "characters";

  const system =
    "너는 RPG 게임 수치 데이터 설계 전문가다. 반드시 JSON 객체 하나만 출력. 마크다운·코드펜스·설명 텍스트 일절 금지.";

  const promptParts: string[] = [
    `게임 장르: ${genreLabel} / 추가 기능: ${features.join(", ") || "없음"}`,
    "",
    "아래 테이블 구조에 맞는 시드 데이터를 생성하라. 테이블 구조는 변경하지 않는다.",
    "",
    "## 테이블 구조",
    tableStructureStr,
    "",
    "## 행 생성 규칙",
    `★ 주 엔티티(${protagonistName}): 5개 행, id: char_001~char_005`,
    "★ 레벨 테이블(*_levels): 첫 번째 주 엔티티 id로 레벨 1,2,3,5,7,10,15,20,30,50 (10개 행)",
    "★ FK 컬럼 값은 같은 응답 내 주 엔티티의 실제 id 값과 정확히 일치",
    "★ 수치 기준: 레벨1 HP 500~1500, 레벨50 HP 15000~40000, 성장은 지수 곡선",
    "- 그 외 테이블: 3~5개 행",
  ];

  if (baseGenre === "idle_rpg") {
    promptParts.push(
      "",
      "## 방치형 RPG 전용",
      "- hero_levels: 레벨 간 DPS 1.5~2배 증가",
      "- economy_config: 기본 골드 수입·오프라인 효율 파라미터",
    );
  }

  if (features.includes("전생")) {
    promptParts.push(
      "",
      "## 프레스티지 규칙",
      "- prestige_bonuses: 레벨 1~10, gold_mult는 레벨마다 1.5~2배",
    );
  }

  promptParts.push(
    "",
    "## 출력 형식 (이 형식 그대로)",
    `{"enumTypes":[{"name":"grade","values":["SSR","SR","R","N"]}],"tableRows":{"characters":[{"id":"char_001","name":"아리아","grade":"SSR"}],"character_levels":[{"character_id":"char_001","level":1,"hp":500,"atk":85}]}}`,
  );

  const prompt = promptParts.join("\n");

  try {
    const text = await runClaude(prompt, system);
    const raw = extractJSON(text) as { enumTypes?: unknown; tableRows?: Record<string, unknown[]> };
    const tableRows: Record<string, unknown[]> =
      raw && typeof raw.tableRows === "object" && raw.tableRows !== null ? raw.tableRows : {};

    const tablesWithRows = allTables.map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => ({ name: c.name, type: c.type })),
      rows: enforceTypes(tableRows[t.name] ?? [], typeMaps[t.name]),
    }));

    return NextResponse.json({
      tables: tablesWithRows,
      enumTypes: Array.isArray(raw.enumTypes) ? raw.enumTypes : [],
      relations,
      baseTables,
      overlayTables,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
