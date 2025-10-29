import { useCallback, useMemo } from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { AssessmentRepository } from "@/src/data/repositories/AssessmentRepository";
import { RobleService } from "@/src/data/services/RobleService";
import { AuthLocalDataSourceImpl } from "@/src/features/auth/data/datasources/AuthLocalDataSource";

export function useAssessmentRepository(): AssessmentRepository {
  const container = useDI();
  const robleService = container.resolve<RobleService>(TOKENS.RobleService);
  
  const authLocalDS = useMemo(() => new AuthLocalDataSourceImpl(), []);

  const getAccessToken = useCallback(async () => {
    const stored = await authLocalDS.getSession();
    return stored?.session.tokens.accessToken ?? null;
  }, [authLocalDS]);

  return useMemo(
    () => new AssessmentRepository(robleService, { getAccessToken }),
    [robleService, getAccessToken],
  );
}
