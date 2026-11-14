import { describe, expect, it } from "vitest";
import { normalizeName } from "@/lib/names";

describe("normalizeName", () => {
  it("treats the spellings of Louis C.K. as one name", () => {
    const a = normalizeName("Louis C.K.");
    expect(a).toBe("louis ck");
    expect(normalizeName("Louis CK")).toBe(a);
    expect(normalizeName("Louis C. K.")).toBe(a);
  });

  it("folds accents", () => {
    expect(normalizeName("José Alvarado")).toBe("jose alvarado");
  });

  it("turns a hyphen into a space", () => {
    expect(normalizeName("Jean-Luc Picard")).toBe("jean luc picard");
  });

  it("returns an empty string for an empty name", () => {
    expect(normalizeName("")).toBe("");
  });

  it("keeps different people apart", () => {
    expect(normalizeName("Chris Rock")).not.toBe(normalizeName("Chris Roach"));
  });
});
