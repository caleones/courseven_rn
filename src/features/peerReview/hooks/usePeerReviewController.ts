import { useCallback, useMemo, useReducer } from "react";

import { useAssessmentRepository } from "@/src/data/repositories/hooks/useAssessmentRepository";
import { CoursePeerReviewSummary } from "@/src/domain/models/PeerReviewSummaries";

type PeerReviewState = {
  courseSummaries: Record<string, CoursePeerReviewSummary>;
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_COURSE_SUMMARY"; payload: { courseId: string; summary: CoursePeerReviewSummary } };

const initialState: PeerReviewState = {
  courseSummaries: {},
  isLoading: false,
  error: null,
};

function reducer(state: PeerReviewState, action: Action): PeerReviewState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "SET_COURSE_SUMMARY":
      return {
        ...state,
        courseSummaries: {
          ...state.courseSummaries,
          [action.payload.courseId]: action.payload.summary,
        },
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

export function usePeerReviewController() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const assessmentRepository = useAssessmentRepository();

  const loadCourseSummary = useCallback(
    async (courseId: string, activityIds: string[], force = false) => {
      // If not forcing and we already have it cached, skip
      if (!force && state.courseSummaries[courseId]) {
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const summary = await assessmentRepository.computeCourseSummary(activityIds);
        dispatch({
          type: "SET_COURSE_SUMMARY",
          payload: { courseId, summary },
        });
      } catch (error: any) {
        console.error("[PeerReviewController] loadCourseSummary error:", error);
        dispatch({ type: "SET_ERROR", payload: error?.message ?? "Error cargando resumen" });
      }
    },
    [assessmentRepository, state.courseSummaries],
  );

  const controller = useMemo(
    () => ({
      loadCourseSummary,
    }),
    [loadCourseSummary],
  );

  return [state, controller] as const;
}
