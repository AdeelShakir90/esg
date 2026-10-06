export const ESG_SCHEMA_VERSION = "esg-core-v1";
export const ESG_PROMPT_VERSION = "esg-extraction-v1";
export const MAX_ESG_SOURCE_TEXT_CHARACTERS = 80_000;

export const ESG_FIELD_DEFINITIONS = [
  {
    key: "electricity_consumption",
    label: "Electricity consumption",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "renewable_electricity_share",
    label: "Renewable electricity share",
    category: "environmental",
    valueType: "number",
    percentage: true,
  },
  {
    key: "natural_gas_consumption",
    label: "Natural gas consumption",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "scope_1_emissions",
    label: "Scope 1 emissions",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "scope_2_emissions",
    label: "Scope 2 emissions",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "water_consumption",
    label: "Water consumption",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "waste_generated",
    label: "Waste generated",
    category: "environmental",
    valueType: "number",
  },
  {
    key: "recycling_recovery_rate",
    label: "Recycling or recovery rate",
    category: "environmental",
    valueType: "number",
    percentage: true,
  },
  {
    key: "employee_count",
    label: "Employee count",
    category: "social",
    valueType: "integer",
  },
  {
    key: "employee_training_hours_total",
    label: "Total employee training hours",
    category: "social",
    valueType: "number",
  },
  {
    key: "supplier_code_of_conduct",
    label: "Supplier code of conduct",
    category: "governance",
    valueType: "boolean",
  },
  {
    key: "anti_corruption_policy",
    label: "Anti-corruption policy",
    category: "governance",
    valueType: "boolean",
  },
] as const;

export type EsgFieldDefinition = (typeof ESG_FIELD_DEFINITIONS)[number];
export type EsgFieldKey = EsgFieldDefinition["key"];
export type EsgCategory = EsgFieldDefinition["category"];
export type EsgValueType = EsgFieldDefinition["valueType"];

export const ESG_FIELD_KEYS = ESG_FIELD_DEFINITIONS.map(
  (definition) => definition.key
) as [EsgFieldKey, ...EsgFieldKey[]];

export const ESG_FIELD_DEFINITION_BY_KEY = new Map<EsgFieldKey, EsgFieldDefinition>(
  ESG_FIELD_DEFINITIONS.map((definition) => [definition.key, definition])
);
