import {
    EnrollmentRecord,
    mapEnrollmentEntityToRecord,
    mapEnrollmentRecordToEntity,
    toEnrollmentRecord,
} from "@/src/data/models/roble/EnrollmentRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { Enrollment } from "@/src/domain/models/Enrollment";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureEnrollmentRecord = (raw: Record<string, unknown>): EnrollmentRecord =>
  toEnrollmentRecord(raw);

export class EnrollmentRepositoryImpl implements EnrollmentRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async createEnrollment(enrollment: Enrollment): Promise<Enrollment> {
    const token = await this.requireToken();
    const recordPayload: Record<string, unknown> = {
      ...mapEnrollmentEntityToRecord(enrollment),
    };
    if (typeof recordPayload._id !== "string" || recordPayload._id.length === 0) {
      delete recordPayload._id;
    }
    if (!recordPayload.status) {
      recordPayload.status = "active";
    }
    const response = await this.service.insertEnrollment({
      accessToken: token,
      record: recordPayload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      throw new Error("La inserción de inscripciones no devolvió registros");
    }
    return mapEnrollmentRecordToEntity(
      ensureEnrollmentRecord(inserted[0] as Record<string, unknown>),
    );
  }

  async getEnrollmentById(enrollmentId: string): Promise<Enrollment | null> {
    const token = await this.requireToken();
    const rows = await this.service.readEnrollments({
      accessToken: token,
      query: { _id: enrollmentId },
    });
    if (!rows.length) {
      return null;
    }
    return mapEnrollmentRecordToEntity(ensureEnrollmentRecord(rows[0]));
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    const token = await this.requireToken();
    const rows = await this.service.readEnrollments({
      accessToken: token,
      query: { user_id: studentId },
    });
    return rows.map((row) => mapEnrollmentRecordToEntity(ensureEnrollmentRecord(row)));
  }

  async getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
    const token = await this.requireToken();
    const rows = await this.service.readEnrollments({
      accessToken: token,
      query: { course_id: courseId },
    });
    return rows
      .map((row) => mapEnrollmentRecordToEntity(ensureEnrollmentRecord(row)))
      .filter((enrollment) => enrollment.isActive);
  }

  async isStudentEnrolledInCourse(
    studentId: string,
    courseId: string,
  ): Promise<boolean> {
    const enrollments = await this.getEnrollmentsByCourse(courseId);
    return enrollments.some((enrollment) => enrollment.studentId === studentId);
  }

  async deleteEnrollment(): Promise<boolean> {
    throw new Error("deleteEnrollment no está implementado");
  }

  async getActiveEnrollments(): Promise<Enrollment[]> {
    return [];
  }

  async getEnrollmentsPaginated(): Promise<Enrollment[]> {
    return [];
  }

  async updateEnrollment(enrollment: Enrollment): Promise<Enrollment> {
    const token = await this.requireToken();
    if (!enrollment.id) {
      throw new Error("updateEnrollment requiere un identificador");
    }
    const updates: Record<string, unknown> = {
      user_id: enrollment.studentId,
      course_id: enrollment.courseId,
      enrolled_at: enrollment.enrolledAt,
      is_active: enrollment.isActive,
    };
    const response = await this.service.updateRow({
      accessToken: token,
      table: "enrollments",
      id: enrollment.id,
      updates,
    });
    const updated = this.extractUpdatedRecord(response);
    if (!updated) {
      const refreshed = await this.getEnrollmentById(enrollment.id);
      if (!refreshed) {
        throw new Error("No se pudo obtener la inscripción actualizada");
      }
      return refreshed;
    }
    return mapEnrollmentRecordToEntity(ensureEnrollmentRecord(updated));
  }

  async getEnrollmentCountByCourse(courseId: string): Promise<number> {
    const list = await this.getEnrollmentsByCourse(courseId);
    return list.length;
  }

  async getEnrollmentCountByStudent(studentId: string): Promise<number> {
    const token = await this.requireToken();
    const rows = await this.service.readEnrollments({
      accessToken: token,
      query: { user_id: studentId },
    });
    return rows.length;
  }

  private async requireToken(): Promise<string> {
    if (!this.getAccessToken) {
      throw new Error("Access token no disponible");
    }
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error("Access token no disponible");
    }
    return token;
  }

  private extractUpdatedRecord(response: Record<string, unknown>):
    | Record<string, unknown>
    | null {
    if (Array.isArray(response.updated) && response.updated.length > 0) {
      return response.updated[0] as Record<string, unknown>;
    }
    if (response.data && typeof response.data === "object") {
      return response.data as Record<string, unknown>;
    }
    if (Array.isArray(response.inserted) && response.inserted.length > 0) {
      return response.inserted[0] as Record<string, unknown>;
    }
    return null;
  }
}
