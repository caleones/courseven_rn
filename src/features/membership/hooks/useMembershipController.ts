import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import {
    MembershipController,
    MembershipControllerState,
} from "@/src/features/membership/controllers/MembershipController";

export function useMembershipController() {
  return useController<MembershipController, MembershipControllerState>(TOKENS.MembershipController);
}
