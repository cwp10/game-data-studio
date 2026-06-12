import { NextRequest, NextResponse } from "next/server";
import { spawnClaude } from "@/lib/util/claude";
import { SEED_TEMPLATES, GENRES, type SeedTable } from "@/lib/genre-seeds";

// claude 헤드리스 호출이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GENRES, SEED_TEMPLATES, SeedTable 은 @/lib/genre-seeds 단일 출처
const GENRE_LABELS = Object.fromEntries(GENRES.map((g) => [g.code, { label: g.label, hint: g.hint }]));

// 시드 테이블 셋을 프롬프트에 넣을 텍스트로 직렬화
function seedToText(tables: SeedTable[]): string {
  return tables
    .map((t) => `- ${t.name}: ${t.columns.map((c) => `${c.name}(${c.type})`).join(", ")}`)
    .join("\n");
}

// claude -p --output-format json 으로 호출하고 assistant 최종 텍스트를 반환
function runClaude(prompt: string, system: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 마법사는 단순 구조 생성이라 빠르고 저렴한 모델로 충분 (WIZARD_MODEL 로 override)
    const model = process.env.WIZARD_MODEL ?? "haiku";
    // MCP/툴 없이 순수 텍스트 생성만 (strict-mcp-config 로 외부 MCP 서버 미로드)
    const child = spawnClaude(
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

export async function POST(req: NextRequest) {
  const { choices = [], finish = false, genre, genres, retry = false } = await req.json();
  const path = (choices as string[]).filter(Boolean);

  // 다중 장르 지원: genres 배열 우선, 없으면 단일 genre로 폴백
  const genresList: string[] = (
    Array.isArray(genres) && genres.length > 0 ? genres : (typeof genre === "string" ? [genre] : [])
  ).filter((g: string) => GENRE_LABELS[g]);

  const primaryGenreCode = genresList[0];
  const isHybrid = genresList.length > 1;
  const genreInfo = primaryGenreCode ? GENRE_LABELS[primaryGenreCode] : undefined;
  const primarySeed = primaryGenreCode ? SEED_TEMPLATES[primaryGenreCode] : undefined;

  // 하이브리드: 모든 선택 장르의 시드 테이블 병합 (테이블명 기준 중복 제거)
  const mergedSeed: SeedTable[] = isHybrid
    ? genresList
        .flatMap((g) => SEED_TEMPLATES[g] ?? [])
        .filter((t, i, arr) => arr.findIndex((t2) => t2.name === t.name) === i)
    : (primarySeed ?? []);

  const hybridLabel = genresList.map((g) => GENRE_LABELS[g]?.label ?? g).join(" + ");

  const system = [
    "너는 RPG 게임 수치 데이터 기획 온보딩 도우미다.",
    "이 툴은 RPG 6종(수집형 RPG / 방치형 RPG / MMORPG / 턴제·액션 RPG / 로그라이크 RPG / SRPG) 전용이다.",
    "사용자가 선택한 RPG 장르의 게임성·성장 구조를 단계적으로 구체화한다.",
    "모든 RPG는 메타 테이블 + <entity>_levels 등 전개 테이블의 하이브리드 성장 구조를 따른다.",
    "반드시 JSON 객체 하나만 출력한다. 마크다운, 코드펜스, 설명 문장 금지.",
  ].join("\n");

  const genreLine = isHybrid
    ? `선택한 장르 조합: ${hybridLabel}`
    : (genreInfo
        ? `선택한 장르: ${genreInfo.label} (${primaryGenreCode}) — ${genreInfo.hint}`
        : "선택한 장르: (미지정)");

  let prompt: string;
  if (finish) {
    if (mergedSeed.length > 0 && primaryGenreCode) {
      const hybridNote = isHybrid
        ? `\n이 프로젝트는 ${hybridLabel} 하이브리드 장르다. 각 장르의 핵심 테이블을 선별하되 중복 개념은 통합하고, 하이브리드 특성에 맞는 테이블 6~10개를 구성하라.`
        : "\n핵심 테이블과 컬럼은 그대로 유지하고, 사용자의 선택 경로에 맞춰 컬럼·테이블을 추가하거나 조정할 수 있다. 빈손 생성 금지.";
      prompt = [
        genreLine,
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(없음)"}`,
        "아래는 이 장르에 검증된 시드 테이블 셋이다. 이 템플릿을 기반으로 보강·특화하라." + hybridNote,
        "",
        "[시드 테이블 셋]",
        seedToText(mergedSeed),
        "",
        "컬럼 type은 string | number | boolean 중 하나. 정확히 다음 JSON만 출력:",
        `{"type":"plan","name":"<프로젝트명 제안>","genre":"${isHybrid ? hybridLabel : primaryGenreCode}","description":"<2~3문장 컨셉>","tables":[{"name":"<영문 snake_case>","description":"<설명>","columns":[{"name":"<영문>","type":"string","description":"<설명>"}]}]}`,
      ].join("\n");
    } else {
      // 후방호환: genre 코드/시드 없을 때 기존 빈손 생성 흐름
      prompt = [
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(없음)"}`,
        "이 컨셉으로 RPG 게임 수치 데이터 프로젝트를 만든다. 장르에 핵심적인 테이블 4~8개와 각 컬럼을 설계해라.",
        "메타 테이블 + <entity>_levels 전개 테이블의 하이브리드 성장 구조를 권장한다.",
        "컬럼 type은 string | number | boolean 중 하나. 정확히 다음 JSON만 출력:",
        `{"type":"plan","name":"<프로젝트명 제안>","genre":"${path.join(" · ") || "RPG"}","description":"<2~3문장 컨셉>","tables":[{"name":"<영문 snake_case>","description":"<설명>","columns":[{"name":"<영문>","type":"string","description":"<설명>"}]}]}`,
      ].join("\n");
    }
  } else {
    // 추가 선택지: 선택한 RPG 장르 맥락에서 게임성을 세부 구체화
    const retryLine = retry ? " 이전에 제안한 선택지와 완전히 다른 새로운 관점의 선택지를 제시해라." : "";
    const questionLine = isHybrid
      ? `이 ${hybridLabel} 하이브리드 게임의 세부 게임성(성장 곡선·전투 방식·콘텐츠·경제 등)을 더 구체화할 선택지 4~6개를 제시해라.${retryLine}`
      : (genreInfo
          ? `이 ${genreInfo.label}의 세부 게임성(성장 곡선·전투 방식·콘텐츠·경제 등)을 더 구체화할 선택지 4~6개를 제시해라.${retryLine}`
          : `다음 단계로 RPG 게임성을 더 구체화할 선택지 4~6개를 제시해라.${retryLine}`);
    prompt = [
      genreLine,
      `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(시작)"}`,
      questionLine,
      "보통 1~3단계면 충분하다.",
      "정확히 다음 JSON만 출력:",
      `{"type":"choices","question":"<이번 단계 질문>","options":[{"label":"<선택지>","hint":"<한 줄 설명>"}],"canFinish":<지금 만들어도 될 만큼 구체적이면 true, 아니면 false>}`,
    ].join("\n");
  }

  try {
    const text = await runClaude(prompt, system);
    const plan = extractJSON(text);
    // finish 시 plan.genre를 결정적으로 설정 (haiku 출력 신뢰 금지)
    if (finish && primaryGenreCode && plan && typeof plan === "object") {
      (plan as Record<string, unknown>).genre = isHybrid ? hybridLabel : primaryGenreCode;
    }
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
