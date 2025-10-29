import { Enrollment } from "@/src/domain/models/Enrollment";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";

export class GetMyEnrollmentsUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  async execute(userId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.getEnrollmentsByStudent(userId);
  }
}
