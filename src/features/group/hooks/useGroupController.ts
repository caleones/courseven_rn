import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import {
    GroupController,
    GroupControllerState,
} from "@/src/features/group/controllers/GroupController";

export function useGroupController() {
  return useController<GroupController, GroupControllerState>(TOKENS.GroupController);
}
