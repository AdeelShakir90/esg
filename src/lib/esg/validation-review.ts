import { ESG_FIELD_DEFINITION_BY_KEY, type EsgFieldKey } from "./definitions";
import type { EsgFieldValue } from "./schema";
import type { ValidationField } from "./validation";

export type DemoReviewStatus = "approved" | "rejected" | "edited";

export type DemoReviewDecision = {
  status: DemoReviewStatus;
  editedValue: EsgFieldValue | null;
};

export type DemoReviewState = Record<string, DemoReviewDecision>;

export type DemoReviewSession = {
  scopeKey: string;
  reviews: DemoReviewState;
};

export function getDemoReviewScope(documentId: string, extractionId: string) {
  return `${documentId}:${extractionId}`;
}

export function createDemoReviewSession(scopeKey: string): DemoReviewSession {
  return { scopeKey, reviews: {} };
}

export function getScopedDemoReviews(
  session: DemoReviewSession,
  scopeKey: string
): DemoReviewState {
  return session.scopeKey === scopeKey ? session.reviews : {};
}

export function setDemoReviewDecision(
  session: DemoReviewSession,
  scopeKey: string,
  fieldId: string,
  decision: DemoReviewDecision
): DemoReviewSession {
  const reviews = getScopedDemoReviews(session, scopeKey);
  return {
    scopeKey,
    reviews: {
      ...reviews,
      [fieldId]: decision,
    },
  };
}

export function resetDemoReviewDecision(
  session: DemoReviewSession,
  scopeKey: string,
  fieldId: string
): DemoReviewSession {
  const reviews = getScopedDemoReviews(session, scopeKey);
  if (!(fieldId in reviews)) {
    return session.scopeKey === scopeKey
      ? session
      : createDemoReviewSession(scopeKey);
  }

  const nextReviews = { ...reviews };
  delete nextReviews[fieldId];
  return { scopeKey, reviews: nextReviews };
}

export type DemoEditedValueResult =
  | { success: true; value: EsgFieldValue }
  | { success: false; message: string };

export function parseDemoEditedValue(
  fieldKey: EsgFieldKey,
  input: string | boolean
): DemoEditedValueResult {
  const definition = ESG_FIELD_DEFINITION_BY_KEY.get(fieldKey);
  if (!definition) {
    return { success: false, message: "This ESG field cannot be edited." };
  }

  if (definition.valueType === "boolean") {
    return typeof input === "boolean"
      ? { success: true, value: { type: "boolean", value: input } }
      : { success: false, message: "Choose Yes or No." };
  }

  if (typeof input !== "string" || input.trim() === "") {
    return { success: false, message: "Enter a value." };
  }

  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) {
    return { success: false, message: "Enter a non-negative number." };
  }

  if (definition.valueType === "integer" && !Number.isInteger(value)) {
    return { success: false, message: "Enter a whole number." };
  }

  if ("percentage" in definition && definition.percentage && value > 100) {
    return { success: false, message: "Enter a percentage from 0 to 100." };
  }

  return definition.valueType === "integer"
    ? { success: true, value: { type: "integer", value } }
    : { success: true, value: { type: "number", value } };
}

export function getEffectiveDemoReview(
  field: ValidationField,
  decision: DemoReviewDecision | undefined
) {
  return {
    status: decision?.status ?? field.validationStatus,
    value:
      decision?.status === "edited"
        ? decision.editedValue
        : field.validationStatus === "edited"
          ? field.validatedValue
          : field.value,
    isTemporary: decision !== undefined,
  };
}

export function getDemoReviewSummary(
  fields: readonly ValidationField[],
  reviews: DemoReviewState
) {
  const summary = {
    total: fields.length,
    approved: 0,
    edited: 0,
    rejected: 0,
    pending: 0,
  };

  for (const field of fields) {
    const status = getEffectiveDemoReview(field, reviews[field.id]).status;
    if (status === "approved") summary.approved += 1;
    else if (status === "edited") summary.edited += 1;
    else if (status === "rejected") summary.rejected += 1;
    else summary.pending += 1;
  }

  return summary;
}
