import { AttributeDefinition } from "../types/attributes";
import { validateAttributeKeys, RESERVED_FIELD_NAMES } from "./dataset-config";

const def = (key: string): AttributeDefinition => ({
  key,
  label: "Label",
  description: "Description",
  type: "binary",
});

describe("validateAttributeKeys", () => {
  it("accepts non-colliding keys", () => {
    expect(() => validateAttributeKeys([def("voices_raised"), def("food_present")])).not.toThrow();
  });

  it("rejects a key that collides with a reserved field name", () => {
    expect(() => validateAttributeKeys([def("text")])).toThrow(/reserved search field/);
  });

  it("rejects a key matching the pathway_<n> pattern", () => {
    expect(() => validateAttributeKeys([def("pathway_3")])).toThrow(/pathway_<n>/);
  });

  it("rejects duplicate keys", () => {
    expect(() => validateAttributeKeys([def("food_present"), def("food_present")]))
      .toThrow(/Duplicate attribute key/);
  });

  it("allows aliasing the numeric star fields", () => {
    // Attributes may alias an existing numeric search field when the value is identical.
    expect(() => validateAttributeKeys([def("stars"), def("review_stars")])).not.toThrow();
  });

  it("does not list the aliasable star fields as reserved", () => {
    expect(RESERVED_FIELD_NAMES).not.toContain("stars");
    expect(RESERVED_FIELD_NAMES).not.toContain("review_stars");
  });
});
