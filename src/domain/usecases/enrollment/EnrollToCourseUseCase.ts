import { Enrollment } from "@/src/domain/models/Enrollment";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";

export type EnrollToCourseParams = {
  userId: string;
  joinCode: string;
};

export class EnrollToCourseUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
  ) {}

  async execute(params: EnrollToCourseParams): Promise<Enrollment> {
    const joinCode = params.joinCode.trim();
    const userId = params.userId;

    const course = await this.courseRepository.getCourseByJoinCode(joinCode);
    if (!course) {
      throw new Error("Código de ingreso inválido");
    }

    if (course.teacherId === userId) {
      throw new Error("No puedes inscribirte como estudiante en tu propio curso");
    }

    const myEnrollments = await this.enrollmentRepository.getEnrollmentsByStudent(userId);
    const existing = myEnrollments.find((enrollment) => enrollment.courseId === course.id);

    if (existing && existing.isActive) {
      throw new Error("Ya estás inscrito en este curso");
    }

    if (existing && !existing.isActive) {
      const updated = await this.enrollmentRepository.updateEnrollment({
        ...existing,
        isActive: true,
        enrolledAt: new Date().toISOString(),
      });
      return updated;
    }

    const newEnrollment: Enrollment = {
      id: "",
      studentId: userId,
      courseId: course.id,
      enrolledAt: new Date().toISOString(),
      isActive: true,
    };

    return this.enrollmentRepository.createEnrollment(newEnrollment);
  }
}
