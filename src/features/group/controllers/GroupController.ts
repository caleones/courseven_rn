import { Group } from "@/src/domain/models/Group";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { CreateGroupUseCase } from "@/src/domain/usecases/group/CreateGroupUseCase";

export type GroupControllerState = {
  isLoading: boolean;
  error: string | null;
  groupsByCourse: Record<string, Group[]>;
  groupsByCategory: Record<string, Group[]>;
  createdGroup: Group | null;
};

type Dependencies = {
  groupRepository: GroupRepository;
  createGroupUseCase: CreateGroupUseCase;
  getCurrentUserId: () => Promise<string | null>;
};

const INITIAL_STATE: GroupControllerState = {
  isLoading: false,
  error: null,
  groupsByCourse: {},
  groupsByCategory: {},
  createdGroup: null,
};

export class GroupController {
  private state: GroupControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly loadingCourseIds = new Set<string>();
  private readonly loadingCategoryIds = new Set<string>();

  private readonly groupRepository: GroupRepository;
  private readonly createGroupUseCase: CreateGroupUseCase;
  private readonly getCurrentUserId: () => Promise<string | null>;

  constructor({ groupRepository, createGroupUseCase, getCurrentUserId }: Dependencies) {
    this.groupRepository = groupRepository;
    this.createGroupUseCase = createGroupUseCase;
    this.getCurrentUserId = getCurrentUserId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): GroupControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  groupsForCourse(courseId: string): Group[] {
    return this.state.groupsByCourse[courseId] ?? [];
  }

  groupsForCategory(categoryId: string): Group[] {
    return this.state.groupsByCategory[categoryId] ?? [];
  }

  async loadByCourse(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (this.loadingCourseIds.has(courseId) && !options.force) {
      return;
    }

    this.loadingCourseIds.add(courseId);
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const list = await this.groupRepository.getGroupsByCourse(courseId);
      this.setState((prev) => ({
        ...prev,
        groupsByCourse: { ...prev.groupsByCourse, [courseId]: list },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCourseIds.delete(courseId);
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async loadByCategory(categoryId: string, options: { force?: boolean } = {}) {
    if (!categoryId) return;
    if (this.loadingCategoryIds.has(categoryId) && !options.force) {
      return;
    }

    this.loadingCategoryIds.add(categoryId);
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const list = await this.groupRepository.getGroupsByCategory(categoryId);
      this.setState((prev) => ({
        ...prev,
        groupsByCategory: { ...prev.groupsByCategory, [categoryId]: list },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCategoryIds.delete(categoryId);
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async createGroup(params: { name: string; courseId: string; categoryId: string }): Promise<Group | null> {
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
      const created = await this.createGroupUseCase.execute({
        ...params,
        teacherId,
      });
      await Promise.all([
        this.loadByCourse(params.courseId, { force: true }),
        this.loadByCategory(params.categoryId, { force: true }),
      ]);
      this.setState((prev) => ({ ...prev, createdGroup: created }));
      return created;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async updateGroup(group: Group): Promise<Group | null> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const updated = await this.groupRepository.updateGroup(group);
      this.setState((prev) => ({
        ...prev,
        groupsByCourse: {
          ...prev.groupsByCourse,
          [group.courseId]: (prev.groupsByCourse[group.courseId] ?? []).map((item) =>
            item.id === updated.id ? updated : item,
          ),
        },
        groupsByCategory: {
          ...prev.groupsByCategory,
          [group.categoryId]: (prev.groupsByCategory[group.categoryId] ?? []).map((item) =>
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

  async deleteGroup(groupId: string, courseId: string, categoryId: string): Promise<boolean> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await this.groupRepository.deleteGroup(groupId);
      this.setState((prev) => ({
        ...prev,
        groupsByCourse: {
          ...prev.groupsByCourse,
          [courseId]: (prev.groupsByCourse[courseId] ?? []).filter((item) => item.id !== groupId),
        },
        groupsByCategory: {
          ...prev.groupsByCategory,
          [categoryId]: (prev.groupsByCategory[categoryId] ?? []).filter(
            (item) => item.id !== groupId,
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

  clearCreatedGroup() {
    this.setState((prev) => ({ ...prev, createdGroup: null }));
  }

  private setState(updater: (prev: GroupControllerState) => GroupControllerState) {
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
        console.error("GroupController listener error", error);
      }
    }
  }
}
