import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import { CourseController, CourseControllerState } from "@/src/features/course/controllers/CourseController";

export function useCourseController() {
  return useController<CourseController, CourseControllerState>(TOKENS.CourseController);
}
