import { Course } from "../models/Course";

type PaginatedCourseParams = {
  page?: number;
  limit?: number;
  categoryId?: string;
  teacherId?: string;
};

export interface CourseRepository {
  getCourseById(courseId: string): Promise<Course | null>;
  getCoursesByCategory(categoryId: string): Promise<Course[]>;
  getCoursesByTeacher(teacherId: string): Promise<Course[]>;
  createCourse(course: Course): Promise<Course>;
  updateCourse(course: Course, options?: { partial?: boolean }): Promise<Course>;
  setCourseActive(courseId: string, active: boolean): Promise<Course>;
  deleteCourse(courseId: string): Promise<boolean>;
  searchCoursesByTitle(title: string): Promise<Course[]>;
  getCourseByJoinCode(joinCode: string): Promise<Course | null>;
  getActiveCourses(): Promise<Course[]>;
  getCoursesPaginated(params?: PaginatedCourseParams): Promise<Course[]>;
  getCoursesOrdered(): Promise<Course[]>;
  updateCoursesOrder(courseIds: string[]): Promise<boolean>;
}
