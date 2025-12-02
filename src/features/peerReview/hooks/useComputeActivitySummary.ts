import { useMemo } from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import ComputeActivitySummaryUseCase from "@/src/features/peerReview/domain/usecases/ComputeActivitySummaryUseCase";

export function useComputeActivitySummary() {
  const container = useDI();
  const uc = container.resolve<ComputeActivitySummaryUseCase>(TOKENS.ComputeActivitySummaryUC);

  return useMemo(
    () => ({
      execute: (activityId: string) => uc.execute(activityId),
    }),
    [uc],
  );
}

export default useComputeActivitySummary;
