import assert from "node:assert/strict";
import test from "node:test";

import { createGeminiEsgResponseJsonSchema } from "./gemini-schema";

function visitSchema(
  value: unknown,
  visitor: (key: string, value: unknown) => void
) {
  if (Array.isArray(value)) {
    for (const child of value) visitSchema(child, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    visitor(key, child);
    visitSchema(child, visitor);
  }
}

function collectSchemaKeywords(value: unknown, keywords = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const child of value) collectSchemaKeywords(child, keywords);
    return keywords;
  }
  if (!value || typeof value !== "object") return keywords;

  for (const [key, child] of Object.entries(value)) {
    keywords.add(key);
    if (key === "properties" && child && typeof child === "object") {
      for (const propertySchema of Object.values(child)) {
        collectSchemaKeywords(propertySchema, keywords);
      }
    } else {
      collectSchemaKeywords(child, keywords);
    }
  }

  return keywords;
}

function fieldProperties() {
  const schema = createGeminiEsgResponseJsonSchema() as {
    properties: {
      fields: {
        items: { properties: Record<string, Record<string, unknown>> };
      };
    };
  };

  return schema.properties.fields;
}

test("uses only basic structural JSON Schema keywords for Gemini transport", () => {
  const schema = createGeminiEsgResponseJsonSchema();
  const allowedKeywords = new Set(["type", "properties", "required", "items"]);
  const schemaKeywords = collectSchemaKeywords(schema);
  const typeArrays: unknown[] = [];
  const nullTypes: unknown[] = [];

  visitSchema(schema, (key, value) => {
    if (key === "type" && Array.isArray(value)) typeArrays.push(value);
    if (
      key === "type" &&
      (value === "null" || (Array.isArray(value) && value.includes("null")))
    ) {
      nullTypes.push(value);
    }
  });

  assert.deepEqual([...schemaKeywords].sort(), [...allowedKeywords].sort());
  assert.deepEqual(typeArrays, []);
  assert.deepEqual(nullTypes, []);
});

test("describes the flat non-nullable Gemini field transport", () => {
  const fields = fieldProperties();
  const properties = fields.items.properties;

  assert.equal(properties.key.type, "string");
  assert.equal(properties.label.type, "string");
  assert.equal(properties.category.type, "string");
  assert.equal(properties.status.type, "string");
  assert.equal(properties.value_kind.type, "string");
  assert.equal(properties.number_value.type, "number");
  assert.equal(properties.integer_value.type, "integer");
  assert.equal(properties.boolean_value.type, "boolean");
  assert.equal(properties.unit_present.type, "boolean");
  assert.equal(properties.unit.type, "string");
  assert.equal(properties.period_label.type, "string");
  assert.equal(properties.period_start.type, "string");
  assert.equal(properties.period_end.type, "string");
  assert.equal(properties.confidence.type, "number");
  assert.equal(properties.evidence_quote.type, "string");
  assert.equal("evidence" in properties, false);
  assert.equal("page" in properties, false);
});

test("omits all semantic constraints from the Gemini transport schema", () => {
  const serialized = JSON.stringify(createGeminiEsgResponseJsonSchema());

  for (const keyword of [
    "enum",
    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "null",
    "anyOf",
    "oneOf",
    "allOf",
    "$ref",
    "$defs",
    "additionalProperties",
    "pattern",
    "minLength",
    "maxLength",
    "format",
    "const",
  ]) {
    assert.equal(serialized.includes(`"${keyword}"`), false);
  }
});
