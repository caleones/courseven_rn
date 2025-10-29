import { Enrollment } from "../models/Enrollment";

type PaginatedEnrollmentParams = {
  page?: number;
  limit?: number;
  studentId?: string;
  courseId?: string;
};

export interface EnrollmentRepository {
  getEnrollmentById(enrollmentId: string): Promise<Enrollment | null>;
  getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>;
  getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]>;
  createEnrollment(enrollment: Enrollment): Promise<Enrollment>;
  updateEnrollment(enrollment: Enrollment): Promise<Enrollment>;
  deleteEnrollment(enrollmentId: string): Promise<boolean>;
  isStudentEnrolledInCourse(studentId: string, courseId: string): Promise<boolean>;
  getActiveEnrollments(): Promise<Enrollment[]>;
  getEnrollmentsPaginated(params?: PaginatedEnrollmentParams): Promise<Enrollment[]>;
  getEnrollmentCountByCourse(courseId: string): Promise<number>;
  getEnrollmentCountByStudent(studentId: string): Promise<number>;
}
