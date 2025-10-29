import { Course } from "@/src/domain/models/Course";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";
import { CreateCourseUseCase } from "@/src/domain/usecases/course/CreateCourseUseCase";
import type { EnrollmentController } from "@/src/features/enrollment/controllers/EnrollmentController";

export type CourseControllerState = {
  isLoading: boolean;
  error: string | null;
  teacherCourses: Course[];
  createdCourse: Course | null;
};

const INITIAL_STATE: CourseControllerState = {
  isLoading: false,
  error: null,
  teacherCourses: [],
  createdCourse: null,
};

type Dependencies = {
  createCourseUseCase: CreateCourseUseCase;
  courseRepository: CourseRepository;
  getCurrentUserId: () => Promise<string | null>;
  enrollmentController?: EnrollmentController;
};

export class CourseController {
  private state: CourseControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly coursesById = new Map<string, Course>();
  private bootstrapPromise: Promise<void> | null = null;

  private readonly createCourseUseCase: CreateCourseUseCase;
  private readonly courseRepository: CourseRepository;
  private readonly getCurrentUserId: () => Promise<string | null>;
  private readonly enrollmentController?: EnrollmentController;

  constructor({
    createCourseUseCase,
    courseRepository,
    getCurrentUserId,
    enrollmentController,
  }: Dependencies) {
    this.createCourseUseCase = createCourseUseCase;
    this.courseRepository = courseRepository;
    this.getCurrentUserId = getCurrentUserId;
    this.enrollmentController = enrollmentController;

    this.bootstrapPromise = this.bootstrap();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CourseControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  get teacherCourses(): Course[] {
    return this.state.teacherCourses;
  }

  async ensureReady() {
    await this.bootstrapPromise;
  }

  async loadMyTeachingCourses(options: { force?: boolean } = {}) {
    const teacherId = await this.getCurrentUserId();
    if (!teacherId) return;

    if (this.state.isLoading && !options.force) {
      return;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const list = await this.courseRepository.getCoursesByTeacher(teacherId);
      this.syncCourseCache(list);
      this.setState((prev) => ({
        ...prev,
        teacherCourses: list,
        createdCourse: prev.createdCourse,
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }

  async canCreateMoreCourses(): Promise<boolean> {
    try {
      const teacherId = await this.getCurrentUserId();
      if (!teacherId) {
        return false;
      }
      const existing = await this.courseRepository.getCoursesByTeacher(teacherId);
      return existing.length < CreateCourseUseCase.maxCoursesPerTeacher;
    } catch (error) {
      this.setError(error, { silent: true });
      return false;
    }
  }

  async getCourseById(courseId: string): Promise<Course | null> {
    const cached = this.coursesById.get(courseId);
    if (cached) {
      return cached;
    }
    try {
      const fetched = await this.courseRepository.getCourseById(courseId);
      if (fetched) {
        this.upsertCourse(fetched);
      }
      return fetched;
    } catch (error) {
      this.setError(error, { silent: true });
      return null;
    }
  }

  async createCourse(params: { name: string; description: string }): Promise<Course | null> {
    if (this.state.isLoading) {
      return null;
    }

    const teacherId = await this.getCurrentUserId();
    if (!teacherId) {
      this.setError("Usuario no autenticado");
      return null;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const course = await this.createCourseUseCase.execute({
        name: params.name,
        description: params.description,
        teacherId,
      });

      this.upsertCourse(course);

      await this.loadMyTeachingCourses({ force: true });

      this.setState((prev) => ({
        ...prev,
        createdCourse: course,
      }));

      return course;
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

  async updateCourse(course: Course): Promise<Course | null> {
    const teacherId = await this.getCurrentUserId();
    if (!teacherId || teacherId !== course.teacherId) {
      this.setError("No tienes permisos para editar este curso");
      return null;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const updated = await this.courseRepository.updateCourse(course, { partial: true });
      this.notifyCourseChanged(updated);
      return updated;
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

  async deleteCourse(courseId: string): Promise<boolean> {
    const course = await this.getCourseById(courseId);
    const teacherId = await this.getCurrentUserId();
    if (!course || !teacherId || course.teacherId !== teacherId) {
      this.setError("No tienes permisos para eliminar este curso");
      return false;
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const ok = await this.courseRepository.deleteCourse(courseId);
      if (ok) {
        this.coursesById.delete(courseId);
        this.setState((prev) => ({
          ...prev,
          teacherCourses: prev.teacherCourses.filter((c) => c.id !== courseId),
        }));
      }
      return ok;
    } catch (error) {
      this.setError(error);
      return false;
    } finally {
      this.setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }

  async setCourseActive(courseId: string, active: boolean): Promise<Course | null> {
    const teacherId = await this.getCurrentUserId();
    const course = await this.getCourseById(courseId);
    if (!course || !teacherId || course.teacherId !== teacherId) {
      this.setError("No puedes modificar este curso");
      return null;
    }

    if (active) {
      const activeCount = this.state.teacherCourses.filter((c) => c.isActive).length;
      if (activeCount >= CreateCourseUseCase.maxCoursesPerTeacher) {
        this.setError(
          `Ya tienes ${activeCount} cursos activos (máx ${CreateCourseUseCase.maxCoursesPerTeacher}). Deshabilita otro para continuar.`,
        );
        return null;
      }
    }

    this.setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const updated = await this.courseRepository.setCourseActive(courseId, active);
      this.notifyCourseChanged(updated);
      await this.loadMyTeachingCourses({ force: true });
      return updated;
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

  async ensureCourseActiveOrWarn(courseId: string, entityLabel: string): Promise<boolean> {
    const course = await this.getCourseById(courseId);
    if (course && !course.isActive) {
      this.setError(`Habilita el curso antes de crear ${entityLabel}`);
      return false;
    }
    return true;
  }

  clearError() {
    this.setState((prev) => ({
      ...prev,
      error: null,
    }));
  }

  clearCreatedCourse() {
    this.setState((prev) => ({
      ...prev,
      createdCourse: null,
    }));
  }

  private notifyCourseChanged(course: Course) {
    this.upsertCourse(course);
    this.setState((prev) => ({
      ...prev,
      teacherCourses: prev.teacherCourses.map((item) =>
        item.id === course.id ? course : item,
      ),
    }));
    this.enrollmentController?.overrideCourseTitle(course.id, course.name);
  }

  private upsertCourse(course: Course) {
    this.coursesById.set(course.id, course);
  }

  private syncCourseCache(list: Course[]) {
    this.coursesById.clear();
    for (const course of list) {
      this.coursesById.set(course.id, course);
    }
  }

  private setState(updater: (prev: CourseControllerState) => CourseControllerState) {
    const next = updater(this.state);
    this.state = next;
    this.notify();
  }

  private setError(error: unknown, options: { silent?: boolean } = {}) {
    const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
    if (options.silent) {
      return;
    }
    this.setState((prev) => ({
      ...prev,
      error: message,
    }));
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("CourseController listener error", error);
      }
    }
  }

  private async bootstrap() {
    const teacherId = await this.getCurrentUserId();
    if (!teacherId) {
      return;
    }
    await this.loadMyTeachingCourses();
  }
}
