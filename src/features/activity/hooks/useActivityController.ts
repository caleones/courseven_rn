import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import {
    ActivityController,
    ActivityControllerState,
} from "@/src/features/activity/controllers/ActivityController";

export function useActivityController() {
  return useController<ActivityController, ActivityControllerState>(TOKENS.ActivityController);
}