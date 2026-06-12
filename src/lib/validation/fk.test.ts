import { describe, it, expect } from "vitest";
import { findBrokenRefs, findReferencingRows, type RelationSpec, type RowsByTable } from "./fk";

const rel = (
  from_table_id: string,
  from_column: string,
  to_table_id: string,
  to_column: string,
): RelationSpec => ({ from_table_id, from_column, to_table_id, to_column });

describe("findBrokenRefs", () => {
  it("유효 ref → 0 broken", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      characters: [{ id: "c1", data: { id: "c1" } }],
      skills: [{ id: "s1", data: { char_id: "c1" } }],
    };
    expect(findBrokenRefs(relations, rows)).toEqual([]);
  });

  it("존재하지 않는 id 참조 → 1 broken (value/from_row_id 정확)", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      characters: [{ id: "c1", data: { id: "c1" } }],
      skills: [{ id: "s1", data: { char_id: "c999" } }],
    };
    const result = findBrokenRefs(relations, rows);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("c999");
    expect(result[0].from_row_id).toBe("s1");
    expect(result[0].from_table_id).toBe("skills");
    expect(result[0].to_table_id).toBe("characters");
  });

  it("빈 FK(null/undefined/\"\") → 0 broken", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      characters: [{ id: "c1", data: { id: "c1" } }],
      skills: [
        { id: "s1", data: { char_id: null } },
        { id: "s2", data: { char_id: undefined } },
        { id: "s3", data: { char_id: "" } },
      ],
    };
    expect(findBrokenRefs(relations, rows)).toEqual([]);
  });

  it("self-ref valid (promote_to_id가 유효 class id) → 0 broken", () => {
    const relations = [rel("classes", "promote_to_id", "classes", "id")];
    const rows: RowsByTable = {
      classes: [
        { id: "k1", data: { id: "k1", promote_to_id: "k2" } },
        { id: "k2", data: { id: "k2", promote_to_id: "" } },
      ],
    };
    expect(findBrokenRefs(relations, rows)).toEqual([]);
  });

  it("self-ref dangling (없는 id) → 1 broken", () => {
    const relations = [rel("classes", "promote_to_id", "classes", "id")];
    const rows: RowsByTable = {
      classes: [{ id: "k1", data: { id: "k1", promote_to_id: "k404" } }],
    };
    const result = findBrokenRefs(relations, rows);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("k404");
    expect(result[0].from_row_id).toBe("k1");
  });

  it("to_column이 'id'가 아닌 경우(code)도 정확 동작", () => {
    const relations = [rel("drops", "item_code", "items", "code")];
    const rows: RowsByTable = {
      items: [{ id: "i1", data: { id: "i1", code: "SWORD" } }],
      drops: [
        { id: "d1", data: { item_code: "SWORD" } }, // valid
        { id: "d2", data: { item_code: "i1" } }, // id로 참조 → code엔 없음 → broken
      ],
    };
    const result = findBrokenRefs(relations, rows);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("i1");
    expect(result[0].from_row_id).toBe("d2");
  });

  it("to_table 키 부재 → skip (over-flag 방지)", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      skills: [{ id: "s1", data: { char_id: "c999" } }],
      // characters 키 자체가 없음
    };
    expect(findBrokenRefs(relations, rows)).toEqual([]);
  });

  it("타입 강제변환 없음 — number 5 ≠ string '5'", () => {
    const relations = [rel("a", "ref", "b", "id")];
    const rows: RowsByTable = {
      b: [{ id: "b1", data: { id: 5 } }],
      a: [{ id: "a1", data: { ref: "5" } }],
    };
    expect(findBrokenRefs(relations, rows)).toHaveLength(1);
  });
});

describe("findReferencingRows", () => {
  it("2개 행이 참조 → 2건", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      characters: [{ id: "c1", data: { id: "c1" } }],
      skills: [
        { id: "s1", data: { char_id: "c1" } },
        { id: "s2", data: { char_id: "c1" } },
        { id: "s3", data: { char_id: "c2" } },
      ],
    };
    const target = { id: "c1", data: { id: "c1" } };
    const result = findReferencingRows("characters", target, relations, rows);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.row_id).sort()).toEqual(["s1", "s2"]);
    expect(result[0].table_id).toBe("skills");
    expect(result[0].column).toBe("char_id");
  });

  it("미참조 → 0건", () => {
    const relations = [rel("skills", "char_id", "characters", "id")];
    const rows: RowsByTable = {
      characters: [{ id: "c9", data: { id: "c9" } }],
      skills: [{ id: "s1", data: { char_id: "c1" } }],
    };
    const target = { id: "c9", data: { id: "c9" } };
    expect(findReferencingRows("characters", target, relations, rows)).toEqual([]);
  });

  it("to_column=code로 참조하는 행 조회", () => {
    const relations = [rel("drops", "item_code", "items", "code")];
    const rows: RowsByTable = {
      items: [{ id: "i1", data: { id: "i1", code: "SWORD" } }],
      drops: [
        { id: "d1", data: { item_code: "SWORD" } },
        { id: "d2", data: { item_code: "SHIELD" } },
      ],
    };
    const target = { id: "i1", data: { id: "i1", code: "SWORD" } };
    const result = findReferencingRows("items", target, relations, rows);
    expect(result).toHaveLength(1);
    expect(result[0].row_id).toBe("d1");
  });
});
