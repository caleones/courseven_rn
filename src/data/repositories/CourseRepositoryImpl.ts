import {
    CourseRecord,
    mapCourseEntityToRecord,
    mapCourseRecordToEntity,
    toCourseRecord,
} from "@/src/data/models/roble/CourseRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { Course } from "@/src/domain/models/Course";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureCourseRecord = (raw: Record<string, unknown>): CourseRecord =>
  toCourseRecord(raw);

export class CourseRepositoryImpl implements CourseRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getCourseById(courseId: string): Promise<Course | null> {
    try {
      const token = await this.requireToken();
      const rows = await this.service.readCourses({
        accessToken: token,
        query: { _id: courseId },
      });
      if (!rows.length) {
        return null;
      }
      return mapCourseRecordToEntity(ensureCourseRecord(rows[0]));
    } catch (error) {
      console.debug("[COURSE_REPO] getCourseById error", error);
      return null;
    }
  }

  async getCoursesByCategory(): Promise<Course[]> {
    console.debug("[COURSE_REPO] getCoursesByCategory not supported");
    return [];
  }

  async getCoursesByTeacher(teacherId: string): Promise<Course[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCoursesByTeacher({
      accessToken: token,
      teacherId,
    });
    return rows.map((row) => mapCourseRecordToEntity(ensureCourseRecord(row)));
  }

  async createCourse(course: Course): Promise<Course> {
    const token = await this.requireToken();
    const recordPayload: Record<string, unknown> = {
      ...mapCourseEntityToRecord(course),
    };
    if (typeof recordPayload._id !== "string" || recordPayload._id.length === 0) {
      delete recordPayload._id;
    }
    const response = await this.service.insertCourse({
      accessToken: token,
      record: recordPayload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      throw new Error("La respuesta de inserción de cursos no contiene registros");
    }
    return mapCourseRecordToEntity(ensureCourseRecord(inserted[0] as Record<string, unknown>));
  }

  async updateCourse(course: Course, options?: { partial?: boolean }): Promise<Course> {
    const token = await this.requireToken();
    const partial = options?.partial ?? true;
    const updates: Record<string, unknown> = {
      name: course.name,
      description: course.description,
    };
    if (!partial) {
      updates.join_code = course.joinCode;
      updates.teacher_id = course.teacherId;
      updates.is_active = course.isActive;
    }
    const response = await this.service.updateCourse({
      accessToken: token,
      id: course.id,
      updates,
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapCourseRecordToEntity(ensureCourseRecord(updated));
    }

    const refreshed = await this.getCourseById(course.id);
    if (!refreshed) {
      throw new Error("No se pudo obtener el curso actualizado");
    }
    return refreshed;
  }

  async setCourseActive(courseId: string, active: boolean): Promise<Course> {
    const token = await this.requireToken();
    const response = await this.service.updateCourse({
      accessToken: token,
      id: courseId,
      updates: { is_active: active },
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapCourseRecordToEntity(ensureCourseRecord(updated));
    }

    const refreshed = await this.getCourseById(courseId);
    if (!refreshed) {
      throw new Error("No se pudo actualizar el estado del curso");
    }
    return refreshed;
  }

  async deleteCourse(courseId: string): Promise<boolean> {
    const token = await this.requireToken();
    await this.service.updateCourse({
      accessToken: token,
      id: courseId,
      updates: { is_active: false },
    });
    return true;
  }

  async searchCoursesByTitle(): Promise<Course[]> {
    return [];
  }

  async getCourseByJoinCode(joinCode: string): Promise<Course | null> {
    const token = await this.requireToken();
    const rows = await this.service.readCoursesByJoinCode({
      accessToken: token,
      joinCode,
    });
    const active = rows.filter((row) => {
      const record = ensureCourseRecord(row);
      return record.is_active ?? true;
    });
    if (!active.length) {
      return null;
    }
    return mapCourseRecordToEntity(ensureCourseRecord(active[0]));
  }

  async getActiveCourses(): Promise<Course[]> {
    return [];
  }

  async getCoursesPaginated(): Promise<Course[]> {
    return [];
  }

  async getCoursesOrdered(): Promise<Course[]> {
    return [];
  }

  async updateCoursesOrder(): Promise<boolean> {
    return false;
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
    const updated = response.updated;
    if (Array.isArray(updated) && updated.length > 0) {
      return updated[0] as Record<string, unknown>;
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
