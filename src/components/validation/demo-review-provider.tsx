"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import {
  getScopedDemoReviews,
  reduceDemoReviewSession,
  type DemoReviewDecision,
  type DemoReviewState,
} from "@/lib/esg/validation-review";

const EMPTY_REVIEWS: DemoReviewState = Object.freeze({});

type DemoReviewContextValue = {
  getReviews: (scopeKey: string) => DemoReviewState;
  setDecision: (
    scopeKey: string,
    fieldId: string,
    decision: DemoReviewDecision
  ) => void;
  resetDecision: (scopeKey: string, fieldId: string) => void;
  clearDecisions: (scopeKey: string) => void;
};

const DemoReviewContext = createContext<DemoReviewContextValue | null>(null);

export function DemoReviewProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(reduceDemoReviewSession, null);

  const getReviews = useCallback(
    (scopeKey: string) =>
      session ? getScopedDemoReviews(session, scopeKey) : EMPTY_REVIEWS,
    [session]
  );
  const setDecision = useCallback(
    (scopeKey: string, fieldId: string, decision: DemoReviewDecision) => {
      dispatch({ type: "set", scopeKey, fieldId, decision });
    },
    []
  );
  const resetDecision = useCallback((scopeKey: string, fieldId: string) => {
    dispatch({ type: "reset", scopeKey, fieldId });
  }, []);
  const clearDecisions = useCallback((scopeKey: string) => {
    dispatch({ type: "clear", scopeKey });
  }, []);

  const value = useMemo(
    () => ({ getReviews, setDecision, resetDecision, clearDecisions }),
    [clearDecisions, getReviews, resetDecision, setDecision]
  );

  return (
    <DemoReviewContext.Provider value={value}>
      {children}
    </DemoReviewContext.Provider>
  );
}

export function useDemoReview() {
  const context = useContext(DemoReviewContext);
  if (!context) {
    throw new Error("useDemoReview must be used within DemoReviewProvider.");
  }
  return context;
}
