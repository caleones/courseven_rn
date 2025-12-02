import { useMemo } from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import ComputeCourseSummaryUseCase from "@/src/features/peerReview/domain/usecases/ComputeCourseSummaryUseCase";

export function useComputeCourseSummary() {
  const container = useDI();
  const uc = container.resolve<ComputeCourseSummaryUseCase>(TOKENS.ComputeCourseSummaryUC);

  return useMemo(
    () => ({
      execute: (activityIds: string[]) => uc.execute(activityIds),
    }),
    [uc],
  );
}

export default useComputeCourseSummary;
