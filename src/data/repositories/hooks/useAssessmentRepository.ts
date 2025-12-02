import { useCallback, useMemo } from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import AssessmentRepositoryImpl from "@/src/features/peerReview/data/AssessmentRepositoryImpl";
import { AssessmentRepository as IAssessmentRepository } from "@/src/features/peerReview/domain/repositories/AssessmentRepository";
import { RobleService } from "@/src/data/services/RobleService";
import { AuthLocalDataSourceImpl } from "@/src/features/auth/data/datasources/AuthLocalDataSource";

export function useAssessmentRepository(): IAssessmentRepository {
  const container = useDI();
  const robleService = container.resolve<RobleService>(TOKENS.RobleService);
  
  const authLocalDS = useMemo(() => new AuthLocalDataSourceImpl(), []);

  const getAccessToken = useCallback(async () => {
    const stored = await authLocalDS.getSession();
    return stored?.session.tokens.accessToken ?? null;
  }, [authLocalDS]);

  return useMemo(
    () => new AssessmentRepositoryImpl(robleService, { getAccessToken }) as unknown as IAssessmentRepository,
    [robleService, getAccessToken],
  );
}
