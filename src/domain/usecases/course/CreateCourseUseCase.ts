import { Course } from "@/src/domain/models/Course";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";

export type CreateCourseParams = {
  name: string;
  description: string;
  teacherId: string;
};

const JOIN_CODE_LENGTH = 6;

const padJoinCode = (value: string) => {
  if (value.length >= JOIN_CODE_LENGTH) {
    return value.slice(-JOIN_CODE_LENGTH);
  }
  return value.padStart(JOIN_CODE_LENGTH, "0");
};

export class CreateCourseUseCase {
  static readonly maxCoursesPerTeacher = 3;

  constructor(private readonly repository: CourseRepository) {}

  async execute(params: CreateCourseParams): Promise<Course> {
    const name = params.name.trim();
    const description = params.description.trim();
    const teacherId = params.teacherId;

    const existing = await this.repository.getCoursesByTeacher(teacherId);
    if (existing.length >= CreateCourseUseCase.maxCoursesPerTeacher) {
      throw new Error(
        `Has alcanzado el límite de ${CreateCourseUseCase.maxCoursesPerTeacher} cursos como profesor.`,
      );
    }

    const now = Date.now().toString(36).toUpperCase();
    const joinCode = padJoinCode(now);

    const newCourse: Course = {
      id: "",
      name,
      description,
      joinCode,
      teacherId,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    return this.repository.createCourse(newCourse);
  }
}
