// 도출된 곡선 수식(FormulaItem)을 엔진별 코드 문자열로 변환하는 순수 모듈.
// SimulationView 의 "도출된 수식" 패널에서 엔진 탭(Unity/Unreal/Godot/JS/Python)별 코드 생성에 사용.

export type EngineMode = "plain" | "unity" | "unreal" | "godot" | "js" | "python";

export interface FormulaItem {
  xCol: string;
  yCol: string;
  type: "linear" | "power" | "exponential" | "logarithmic" | "quadratic";
  base: number;
  factor: number;
  r2: number;
}

export const ENGINE_LABELS: Record<EngineMode, string> = {
  plain: "수식", unity: "Unity C#", unreal: "Unreal C++", godot: "Godot", js: "JavaScript", python: "Python",
};

export function generateEngineCode(items: FormulaItem[], engine: EngineMode): string {
  if (engine === "plain" || items.length === 0) return "";
  const f4 = (n: number) => parseFloat(n.toPrecision(8)).toString();

  return items.map(({ xCol, yCol, type, base, factor }) => {
    const fnName = yCol.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const X = xCol;

    // 각 타입별 수식 표현
    let expr = { unity: "", unreal: "", godot: "", js: "", python: "" };
    if (type === "linear") {
      expr = {
        unity:  `${f4(base)}f + ${f4(factor)}f * (${X} - 1)`,
        unreal: `${f4(base)}f + ${f4(factor)}f * (${X} - 1)`,
        godot:  `${f4(base)} + ${f4(factor)} * (${X} - 1)`,
        js:     `${f4(base)} + ${f4(factor)} * (${X} - 1)`,
        python: `${f4(base)} + ${f4(factor)} * (${X} - 1)`,
      };
    } else if (type === "power") {
      expr = {
        unity:  `${f4(base)}f * Mathf.Pow(${X}, ${f4(factor)}f)`,
        unreal: `${f4(base)}f * FMath::Pow((float)${X}, ${f4(factor)}f)`,
        godot:  `${f4(base)} * pow(${X}, ${f4(factor)})`,
        js:     `${f4(base)} * Math.pow(${X}, ${f4(factor)})`,
        python: `${f4(base)} * (${X} ** ${f4(factor)})`,
      };
    } else if (type === "exponential") {
      expr = {
        unity:  `${f4(base)}f * Mathf.Pow(${f4(factor)}f, ${X} - 1)`,
        unreal: `${f4(base)}f * FMath::Pow(${f4(factor)}f, ${X} - 1)`,
        godot:  `${f4(base)} * pow(${f4(factor)}, ${X} - 1)`,
        js:     `${f4(base)} * Math.pow(${f4(factor)}, ${X} - 1)`,
        python: `${f4(base)} * (${f4(factor)} ** (${X} - 1))`,
      };
    } else if (type === "logarithmic") {
      expr = {
        unity:  `${f4(base)}f + ${f4(factor)}f * Mathf.Log(${X})`,
        unreal: `${f4(base)}f + ${f4(factor)}f * FMath::Loge(${X})`,
        godot:  `${f4(base)} + ${f4(factor)} * log(${X})`,
        js:     `${f4(base)} + ${f4(factor)} * Math.log(${X})`,
        python: `${f4(base)} + ${f4(factor)} * math.log(${X})`,
      };
    } else { // quadratic
      expr = {
        unity:  `${f4(base)}f + ${f4(factor)}f * Mathf.Pow(${X} - 1, 2)`,
        unreal: `${f4(base)}f + ${f4(factor)}f * FMath::Pow(${X} - 1, 2)`,
        godot:  `${f4(base)} + ${f4(factor)} * pow(${X} - 1, 2)`,
        js:     `${f4(base)} + ${f4(factor)} * Math.pow(${X} - 1, 2)`,
        python: `${f4(base)} + ${f4(factor)} * ((${X} - 1) ** 2)`,
      };
    }

    if (engine === "unity") return `float Get${fnName.charAt(0).toUpperCase() + fnName.slice(1)}(int ${X}) {\n    return ${expr.unity};\n}`;
    if (engine === "unreal") return `float Get${fnName.charAt(0).toUpperCase() + fnName.slice(1)}(int32 ${X}) {\n    return ${expr.unreal};\n}`;
    if (engine === "godot") return `func get_${yCol}(${X}: int) -> float:\n    return ${expr.godot}`;
    if (engine === "js") return `function get${fnName.charAt(0).toUpperCase() + fnName.slice(1)}(${X}) {\n    return ${expr.js};\n}`;
    if (engine === "python") return `def get_${yCol}(${X}: int) -> float:\n    return ${expr.python}`;
    return "";
  }).join("\n\n");
}
