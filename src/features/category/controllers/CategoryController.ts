import { Category } from "@/src/domain/models/Category";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";
import { CreateCategoryUseCase } from "@/src/domain/usecases/category/CreateCategoryUseCase";

export type CategoryControllerState = {
  isLoading: boolean;
  error: string | null;
  categoriesByCourse: Record<string, Category[]>;
  createdCategory: Category | null;
};

type Dependencies = {
  categoryRepository: CategoryRepository;
  createCategoryUseCase: CreateCategoryUseCase;
  getCurrentUserId: () => Promise<string | null>;
};

const INITIAL_STATE: CategoryControllerState = {
  isLoading: false,
  error: null,
  categoriesByCourse: {},
  createdCategory: null,
};

export class CategoryController {
  private state: CategoryControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly loadingCourseIds = new Set<string>();

  private readonly categoryRepository: CategoryRepository;
  private readonly createCategoryUseCase: CreateCategoryUseCase;
  private readonly getCurrentUserId: () => Promise<string | null>;

  constructor({ categoryRepository, createCategoryUseCase, getCurrentUserId }: Dependencies) {
    this.categoryRepository = categoryRepository;
    this.createCategoryUseCase = createCategoryUseCase;
    this.getCurrentUserId = getCurrentUserId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CategoryControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  categoriesFor(courseId: string): Category[] {
    return this.state.categoriesByCourse[courseId] ?? [];
  }

  createdCategory(): Category | null {
    return this.state.createdCategory;
  }

  async loadByCourse(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (this.loadingCourseIds.has(courseId) && !options.force) {
      return;
    }

    this.loadingCourseIds.add(courseId);
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const list = await this.categoryRepository.getCategoriesByCourse(courseId);
      this.setState((prev) => ({
        ...prev,
        categoriesByCourse: { ...prev.categoriesByCourse, [courseId]: list },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCourseIds.delete(courseId);
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async createCategory(params: {
    name: string;
    description?: string | null;
    courseId: string;
    groupingMethod: string;
    maxMembersPerGroup?: number | null;
  }): Promise<Category | null> {
    if (this.state.isLoading) {
      return null;
    }

    const teacherId = await this.getCurrentUserId();
    if (!teacherId) {
      this.setError("Usuario no autenticado");
      return null;
    }

    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const created = await this.createCategoryUseCase.execute({
        ...params,
        teacherId,
      });
      await this.loadByCourse(params.courseId, { force: true });
      this.setState((prev) => ({ ...prev, createdCategory: created }));
      return created;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async updateCategory(category: Category): Promise<Category | null> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const updated = await this.categoryRepository.updateCategory(category);
      this.setState((prev) => ({
        ...prev,
        categoriesByCourse: {
          ...prev.categoriesByCourse,
          [category.courseId]: (prev.categoriesByCourse[category.courseId] ?? []).map((item) =>
            item.id === updated.id ? updated : item,
          ),
        },
      }));
      return updated;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async deleteCategory(categoryId: string, courseId: string): Promise<boolean> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await this.categoryRepository.deleteCategory(categoryId);
      this.setState((prev) => ({
        ...prev,
        categoriesByCourse: {
          ...prev.categoriesByCourse,
          [courseId]: (prev.categoriesByCourse[courseId] ?? []).filter(
            (item) => item.id !== categoryId,
          ),
        },
      }));
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  clearError() {
    this.setState((prev) => ({ ...prev, error: null }));
  }

  clearCreatedCategory() {
    this.setState((prev) => ({ ...prev, createdCategory: null }));
  }

  private setState(updater: (prev: CategoryControllerState) => CategoryControllerState) {
    const next = updater(this.state);
    this.state = next;
    this.notify();
  }

  private setError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
    this.setState((prev) => ({ ...prev, error: message }));
  }

  private notify() {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch (error) {
        console.error("CategoryController listener error", error);
      }
    }
  }
}
