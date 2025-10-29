import { TOKENS } from "@/src/core/di/tokens";
import { useController } from "@/src/core/hooks/useController";
import {
    CategoryController,
    CategoryControllerState,
} from "@/src/features/category/controllers/CategoryController";

export function useCategoryController() {
  return useController<CategoryController, CategoryControllerState>(TOKENS.CategoryController);
}
