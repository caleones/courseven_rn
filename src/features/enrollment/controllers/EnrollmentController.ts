import { AppEventBus, EnrollmentJoinedEvent } from "@/src/core/events/AppEventBus";
import { Course } from "@/src/domain/models/Course";
import { Enrollment } from "@/src/domain/models/Enrollment";
import { User } from "@/src/domain/models/User";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";
import { UserRepository } from "@/src/domain/repositories/UserRepository";
import { EnrollToCourseUseCase } from "@/src/domain/usecases/enrollment/EnrollToCourseUseCase";
import { GetMyEnrollmentsUseCase } from "@/src/domain/usecases/enrollment/GetMyEnrollmentsUseCase";

export type EnrollmentControllerState = {
  isLoading: boolean;
  error: string | null;
  myEnrollments: Enrollment[];
  enrollmentCounts: Record<string, number>;
  enrollmentsByCourse: Record<string, Enrollment[]>;
  loadingCourseIds: string[];
  loadingCountCourseIds: string[];
};

const INITIAL_STATE: EnrollmentControllerState = {
  isLoading: false,
  error: null,
  myEnrollments: [],
  enrollmentCounts: {},
  enrollmentsByCourse: {},
  loadingCourseIds: [],
  loadingCountCourseIds: [],
};

type Dependencies = {
  enrollToCourseUseCase: EnrollToCourseUseCase;
  getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase;
  enrollmentRepository: EnrollmentRepository;
  courseRepository: CourseRepository;
  userRepository: UserRepository;
  appEventBus: AppEventBus;
  getCurrentUserId: () => Promise<string | null>;
};

export class EnrollmentController {
  private state: EnrollmentControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();

  private readonly enrollToCourseUseCase: EnrollToCourseUseCase;
  private readonly getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase;
  private readonly enrollmentRepository: EnrollmentRepository;
  private readonly courseRepository: CourseRepository;
  private readonly userRepository: UserRepository;
  private readonly appEventBus: AppEventBus;
  private readonly getCurrentUserId: () => Promise<string | null>;

  private readonly coursesById = new Map<string, Course>();
  private readonly usersById = new Map<string, User>();
  private readonly loadingCourseIds = new Set<string>();
  private readonly loadingCountCourseIds = new Set<string>();

  constructor({
    enrollToCourseUseCase,
    getMyEnrollmentsUseCase,
    enrollmentRepository,
    courseRepository,
    userRepository,
    appEventBus,
    getCurrentUserId,
  }: Dependencies) {
    this.enrollToCourseUseCase = enrollToCourseUseCase;
    this.getMyEnrollmentsUseCase = getMyEnrollmentsUseCase;
    this.enrollmentRepository = enrollmentRepository;
    this.courseRepository = courseRepository;
    this.userRepository = userRepository;
    this.appEventBus = appEventBus;
    this.getCurrentUserId = getCurrentUserId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): EnrollmentControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  get myEnrollments(): Enrollment[] {
    return this.state.myEnrollments;
  }

  async loadMyEnrollments(options: { force?: boolean } = {}) {
    if (this.state.isLoading && !options.force) {
      return;
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      return;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const enrollments = await this.getMyEnrollmentsUseCase.execute(userId);
      this.setState((prev) => ({
        ...prev,
        myEnrollments: enrollments,
      }));

      await Promise.all(
        enrollments.map(async (enrollment) => {
          await this.ensureCourseLoaded(enrollment.courseId);
          const course = this.coursesById.get(enrollment.courseId);
          if (course) {
            await this.ensureUserLoaded(course.teacherId);
          }
        }),
      );
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }

  async joinByCode(joinCode: string): Promise<Enrollment | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.setError("Usuario no autenticado");
      return null;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const enrollment = await this.enrollToCourseUseCase.execute({
        userId,
        joinCode: joinCode.trim(),
      });

      await this.loadMyEnrollments({ force: true });

      this.appEventBus.publish({
        type: "EnrollmentJoinedEvent",
        courseId: enrollment.courseId,
      } satisfies EnrollmentJoinedEvent);

      return enrollment;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }

  getCourseTitle(courseId: string): string {
    return this.coursesById.get(courseId)?.name ?? "Curso";
  }

  getCourseTeacherName(courseId: string): string {
    const course = this.coursesById.get(courseId);
    if (!course) {
      return "";
    }
    const teacher = this.usersById.get(course.teacherId);
    if (!teacher) {
      return "";
    }
    return [teacher.firstName, teacher.lastName].filter((part) => part.trim().length > 0).join(" ");
  }

  overrideCourseTitle(courseId: string, newTitle: string) {
    const course = this.coursesById.get(courseId);
    if (!course) {
      return;
    }
    this.coursesById.set(courseId, { ...course, name: newTitle });
    this.notify();
  }

  isLoadingCourse(courseId: string): boolean {
    return this.loadingCourseIds.has(courseId);
  }

  isLoadingCount(courseId: string): boolean {
    return this.loadingCountCourseIds.has(courseId);
  }

  enrollmentCountFor(courseId: string): number {
    return this.state.enrollmentCounts[courseId] ?? 0;
  }

  enrollmentsFor(courseId: string): Enrollment[] {
    return this.state.enrollmentsByCourse[courseId] ?? [];
  }

  isCourseActive(courseId: string): boolean | null {
    const course = this.coursesById.get(courseId);
    if (!course) {
      return null;
    }
    return course.isActive;
  }

  async loadEnrollmentCountForCourse(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (!options.force && this.state.enrollmentCounts[courseId] !== undefined) return;
    if (this.loadingCountCourseIds.has(courseId)) return;

    this.loadingCountCourseIds.add(courseId);
    this.syncLoadingSets();

    try {
      const count = await this.enrollmentRepository.getEnrollmentCountByCourse(courseId);
      this.setState((prev) => ({
        ...prev,
        enrollmentCounts: { ...prev.enrollmentCounts, [courseId]: count },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCountCourseIds.delete(courseId);
      this.syncLoadingSets();
    }
  }

  async loadEnrollmentsForCourse(courseId: string, options: { force?: boolean } = {}) {
    if (!courseId) return;
    if (!options.force && this.state.enrollmentsByCourse[courseId]) return;
    if (this.loadingCourseIds.has(courseId)) return;

    this.loadingCourseIds.add(courseId);
    this.syncLoadingSets();

    try {
      const list = await this.enrollmentRepository.getEnrollmentsByCourse(courseId);
      this.setState((prev) => ({
        ...prev,
        enrollmentsByCourse: { ...prev.enrollmentsByCourse, [courseId]: list },
        enrollmentCounts: { ...prev.enrollmentCounts, [courseId]: list.length },
      }));

      await Promise.all(
        list.map(async (enrollment) => {
          await this.ensureUserLoaded(enrollment.studentId);
        }),
      );
    } catch (error) {
      this.setError(error);
    } finally {
      this.loadingCourseIds.delete(courseId);
      this.syncLoadingSets();
    }
  }

  userName(userId: string): string {
    const user = this.usersById.get(userId);
    if (!user) {
      return userId || "Sin nombre";
    }
    const parts = [user.firstName, user.lastName].filter((part) => part.trim().length > 0);
    return parts.length > 0 ? parts.join(" ") : userId || "Sin nombre";
  }

  userEmail(userId: string): string {
    return this.usersById.get(userId)?.email ?? "";
  }

  cachedUser(userId: string): User | undefined {
    return this.usersById.get(userId);
  }

  async ensureUserLoaded(userId: string): Promise<User | null> {
    if (!userId) {
      return null;
    }
    const cached = this.usersById.get(userId);
    if (cached) {
      return cached;
    }
    try {
      const fetched = await this.userRepository.getUserById(userId);
      if (fetched) {
        this.usersById.set(userId, fetched);
      }
      return fetched ?? null;
    } catch (error) {
      this.setError(error, { silent: true });
      return null;
    }
  }

  clearError() {
    this.setState((prev) => ({
      ...prev,
      error: null,
    }));
  }

  private async ensureCourseLoaded(courseId: string): Promise<Course | null> {
    if (!courseId) {
      return null;
    }
    const cached = this.coursesById.get(courseId);
    if (cached) {
      return cached;
    }
    try {
      const course = await this.courseRepository.getCourseById(courseId);
      if (course) {
        this.coursesById.set(courseId, course);
      }
      return course ?? null;
    } catch (error) {
      this.setError(error, { silent: true });
      return null;
    }
  }

  private setState(updater: (prev: EnrollmentControllerState) => EnrollmentControllerState) {
    const next = updater(this.state);
    this.state = next;
    this.notify();
  }

  private setError(error: unknown, options: { silent?: boolean } = {}) {
    if (options.silent) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
    this.setState((prev) => ({
      ...prev,
      error: message,
    }));
  }

  private syncLoadingSets() {
    this.setState((prev) => ({
      ...prev,
      loadingCourseIds: Array.from(this.loadingCourseIds),
      loadingCountCourseIds: Array.from(this.loadingCountCourseIds),
    }));
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("EnrollmentController listener error", error);
      }
    }
  }
}
