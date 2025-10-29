import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import {
    EnrollmentController,
    EnrollmentControllerState,
} from "@/src/features/enrollment/controllers/EnrollmentController";

export function useEnrollmentController() {
  return useController<EnrollmentController, EnrollmentControllerState>(
    TOKENS.EnrollmentController,
  );
}
