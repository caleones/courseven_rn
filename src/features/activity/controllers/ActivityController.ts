import { AppEventBus } from "@/src/core/events/AppEventBus";
import { RefreshManager } from "@/src/core/utils/RefreshManager";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { CourseActivityRepository } from "@/src/domain/repositories/CourseActivityRepository";
import { GetCourseActivitiesForStudentUseCase } from "@/src/domain/usecases/activity/GetCourseActivitiesForStudentUseCase";

const STUDENT_REFRESH_TTL_MS = 60_000;

const toComparableDate = (value: string | null | undefined): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const sortActivities = (list: CourseActivity[]): CourseActivity[] =>
  [...list].sort((a, b) => {
    const aDate = toComparableDate(a.dueDate ?? a.createdAt);
    const bDate = toComparableDate(b.dueDate ?? b.createdAt);
    if (aDate !== bDate) {
      return aDate - bDate;
    }
    return a.title.localeCompare(b.title);
  });

const upsertActivityInList = (
  list: CourseActivity[] = [],
  activity: CourseActivity,
): CourseActivity[] => {
  const index = list.findIndex((item) => item.id === activity.id);
  if (index === -1) {
    return sortActivities([...list, activity]);
  }
  const next = list.slice();
  next[index] = activity;
  return sortActivities(next);
};

const removeActivityFromList = (
  list: CourseActivity[] = [],
  activityId: string,
): CourseActivity[] => list.filter((item) => item.id !== activityId);

export type ActivityControllerState = {
  isLoading: boolean;
  error: string | null;
  activitiesByCourse: Record<string, CourseActivity[]>;
  activitiesByCategory: Record<string, CourseActivity[]>;
  studentActivitiesByCourse: Record<string, CourseActivity[]>;
  createdActivity: CourseActivity | null;
};

type Dependencies = {
  activityRepository: CourseActivityRepository;
  getCourseActivitiesForStudentUseCase: GetCourseActivitiesForStudentUseCase;
  appEventBus: AppEventBus;
  refreshManager: RefreshManager;
  getCurrentUserId: () => Promise<string | null>;
};

const INITIAL_STATE: ActivityControllerState = {
  isLoading: false,
  error: null,
  activitiesByCourse: {},
  activitiesByCategory: {},
  studentActivitiesByCourse: {},
  createdActivity: null,
};

const studentKey = (courseId: string) => `activities:student:${courseId}`;

export class ActivityController {
  private state: ActivityControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly loadingCourseIds = new Set<string>();
  private readonly loadingCategoryIds = new Set<string>();
  private readonly loadingStudentCourseIds = new Set<string>();

  private readonly activityRepository: CourseActivityRepository;
  private readonly getCourseActivitiesForStudentUseCase: GetCourseActivitiesForStudentUseCase;
  private readonly appEventBus: AppEventBus;
  private readonly refreshManager: RefreshManager;
  private readonly getCurrentUserId: () => Promise<string | null>;

  constructor({
    activityRepository,
    getCourseActivitiesForStudentUseCase,
    appEventBus,
    refreshManager,
    getCurrentUserId,
  }: Dependencies) {
    this.activityRepository = activityRepository;
    this.getCourseActivitiesForStudentUseCase = getCourseActivitiesForStudentUseCase;
    this.appEventBus = appEventBus;
    this.refreshManager = refreshManager;
    this.getCurrentUserId = getCurrentUserId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ActivityControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  activitiesForCourse(courseId: string): CourseActivity[] {
    return this.state.activitiesByCourse[courseId] ?? [];
  }

  activitiesForCategory(categoryId: string): CourseActivity[] {
    return this.state.activitiesByCategory[categoryId] ?? [];
  }

  studentActivitiesForCourse(courseId: string): CourseActivity[] {
    return this.state.studentActivitiesByCourse[courseId] ?? [];
  }

  createdActivity(): CourseActivity | null {
    return this.state.createdActivity;
  }

  async loadByCourse(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (this.loadingCourseIds.has(courseId) && !options.force) {
      return;
    }

    this.loadingCourseIds.add(courseId);
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const list = await this.activityRepository.getActivitiesByCourse(courseId);
      this.setState((prev) => ({
        ...prev,
        activitiesByCourse: {
          ...prev.activitiesByCourse,
          [courseId]: sortActivities(list),
        },
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
      const list = await this.activityRepository.getActivitiesByCategory(categoryId);
      this.setState((prev) => ({
        ...prev,
        activitiesByCategory: {
          ...prev.activitiesByCategory,
          [categoryId]: sortActivities(list),
        },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCategoryIds.delete(categoryId);
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async loadForStudent(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (this.loadingStudentCourseIds.has(courseId) && !options.force) {
      return;
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.setError("Usuario no autenticado");
      return;
    }

    this.loadingStudentCourseIds.add(courseId);
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (options.force) {
        this.refreshManager.invalidate(studentKey(courseId));
      }
      await this.refreshManager.run({
        key: studentKey(courseId),
        ttl: STUDENT_REFRESH_TTL_MS,
        force: options.force,
        action: async () => {
          const list = await this.getCourseActivitiesForStudentUseCase.execute({
            courseId,
            userId,
          });
          this.setState((prev) => ({
            ...prev,
            studentActivitiesByCourse: {
              ...prev.studentActivitiesByCourse,
              [courseId]: sortActivities(list),
            },
          }));
        },
      });
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingStudentCourseIds.delete(courseId);
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async getActivityById(activityId: string): Promise<CourseActivity | null> {
    const cached = this.findActivity(activityId);
    if (cached) {
      return cached;
    }
    try {
      const fetched = await this.activityRepository.getActivityById(activityId);
      if (fetched) {
        this.applyActivityUpdate(fetched);
      }
      return fetched;
    } catch (error) {
      this.setError(error, { silent: true });
      return null;
    }
  }

  async createActivity(params: {
    title: string;
    description?: string | null;
    courseId: string;
    categoryId: string;
    dueDate?: string | null;
    reviewing?: boolean;
    privateReview?: boolean;
  }): Promise<CourseActivity | null> {
    if (this.state.isLoading) {
      return null;
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.setError("Usuario no autenticado");
      return null;
    }

    const title = params.title.trim();
    const descriptionRaw = params.description ?? null;
    const description = typeof descriptionRaw === "string" ? descriptionRaw.trim() : null;

    const activity: CourseActivity = {
      id: "",
      title,
      description,
      courseId: params.courseId,
      categoryId: params.categoryId,
      createdBy: userId,
      dueDate: params.dueDate ?? null,
      createdAt: new Date().toISOString(),
      isActive: true,
      reviewing: params.reviewing ?? false,
      privateReview: params.privateReview ?? false,
    };

    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const created = await this.activityRepository.createActivity(activity);
      this.applyActivityUpdate(created, { setCreated: true });
      this.invalidateStudentCache(created.courseId);
      this.publishActivityChanged(created.courseId);
      return created;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async updateActivity(activity: CourseActivity): Promise<CourseActivity | null> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const updated = await this.activityRepository.updateActivity(activity);
      this.applyActivityUpdate(updated);
      this.invalidateStudentCache(updated.courseId);
      this.publishActivityChanged(updated.courseId);
      return updated;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async deleteActivity(params: {
    activityId: string;
    courseId: string;
    categoryId: string;
  }): Promise<boolean> {
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await this.activityRepository.deleteActivity(params.activityId);
      this.removeActivityFromState(params.activityId, params.courseId, params.categoryId);
      this.invalidateStudentCache(params.courseId);
      this.publishActivityChanged(params.courseId);
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

  clearCreatedActivity() {
    this.setState((prev) => ({ ...prev, createdActivity: null }));
  }

  private applyActivityUpdate(activity: CourseActivity, options: { setCreated?: boolean } = {}) {
    this.setState((prev) => {
      const previous = this.findActivity(activity.id, prev);
      const beforeCourseId = previous?.courseId ?? activity.courseId;
      const beforeCategoryId = previous?.categoryId ?? activity.categoryId;

      const nextActivitiesByCourse = { ...prev.activitiesByCourse };
      if (beforeCourseId !== activity.courseId) {
        nextActivitiesByCourse[beforeCourseId] = removeActivityFromList(
          nextActivitiesByCourse[beforeCourseId] ?? [],
          activity.id,
        );
      }
      nextActivitiesByCourse[activity.courseId] = upsertActivityInList(
        nextActivitiesByCourse[activity.courseId],
        activity,
      );

      const nextActivitiesByCategory = { ...prev.activitiesByCategory };
      if (beforeCategoryId !== activity.categoryId) {
        nextActivitiesByCategory[beforeCategoryId] = removeActivityFromList(
          nextActivitiesByCategory[beforeCategoryId] ?? [],
          activity.id,
        );
      }
      nextActivitiesByCategory[activity.categoryId] = upsertActivityInList(
        nextActivitiesByCategory[activity.categoryId],
        activity,
      );

      const nextStudentActivities = { ...prev.studentActivitiesByCourse };
      const studentList = nextStudentActivities[activity.courseId];
      if (studentList) {
        nextStudentActivities[activity.courseId] = upsertActivityInList(studentList, activity);
      }
      if (previous && previous.courseId !== activity.courseId) {
        const prevStudentList = nextStudentActivities[previous.courseId];
        if (prevStudentList) {
          nextStudentActivities[previous.courseId] = removeActivityFromList(
            prevStudentList,
            activity.id,
          );
        }
      }

      return {
        ...prev,
        activitiesByCourse: nextActivitiesByCourse,
        activitiesByCategory: nextActivitiesByCategory,
        studentActivitiesByCourse: nextStudentActivities,
        createdActivity: options.setCreated ? activity : prev.createdActivity,
      };
    });
  }

  private removeActivityFromState(
    activityId: string,
    courseId: string,
    categoryId: string,
  ) {
    this.setState((prev) => ({
      ...prev,
      activitiesByCourse: {
        ...prev.activitiesByCourse,
        [courseId]: removeActivityFromList(prev.activitiesByCourse[courseId] ?? [], activityId),
      },
      activitiesByCategory: {
        ...prev.activitiesByCategory,
        [categoryId]: removeActivityFromList(
          prev.activitiesByCategory[categoryId] ?? [],
          activityId,
        ),
      },
      studentActivitiesByCourse: {
        ...prev.studentActivitiesByCourse,
        [courseId]: removeActivityFromList(
          prev.studentActivitiesByCourse[courseId] ?? [],
          activityId,
        ),
      },
    }));
  }

  private invalidateStudentCache(courseId: string) {
    this.refreshManager.invalidate(studentKey(courseId));
    this.setState((prev) => {
      if (!(courseId in prev.studentActivitiesByCourse)) {
        return prev;
      }
      const { [courseId]: _, ...rest } = prev.studentActivitiesByCourse;
      return {
        ...prev,
        studentActivitiesByCourse: rest,
      };
    });
  }

  private publishActivityChanged(courseId: string) {
    this.appEventBus.publish({
      type: "ActivityChangedEvent",
      courseId,
    });
  }

  private findActivity(activityId: string, state?: ActivityControllerState): CourseActivity | null {
    const source = state ?? this.state;
    for (const list of Object.values(source.activitiesByCourse)) {
      const found = list.find((item) => item.id === activityId);
      if (found) {
        return found;
      }
    }
    for (const list of Object.values(source.activitiesByCategory)) {
      const found = list.find((item) => item.id === activityId);
      if (found) {
        return found;
      }
    }
    for (const list of Object.values(source.studentActivitiesByCourse)) {
      const found = list.find((item) => item.id === activityId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private setState(updater: (prev: ActivityControllerState) => ActivityControllerState) {
    const next = updater(this.state);
    this.state = next;
    this.notify();
  }

  private setError(error: unknown, options: { silent?: boolean } = {}) {
    const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
    if (options.silent) {
      return;
    }
    this.setState((prev) => ({ ...prev, error: message }));
  }

  private notify() {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch (error) {
        console.error("ActivityController listener error", error);
      }
    }
  }
}