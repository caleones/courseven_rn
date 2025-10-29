import {
    CourseActivityRecord,
    mapCourseActivityEntityToRecord,
    mapCourseActivityRecordToEntity,
    toCourseActivityRecord,
} from "@/src/data/models/roble/CourseActivityRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { CourseActivityRepository } from "@/src/domain/repositories/CourseActivityRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureActivityRecord = (raw: Record<string, unknown>): CourseActivityRecord =>
  toCourseActivityRecord(raw);

export class CourseActivityRepositoryImpl implements CourseActivityRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getActivityById(activityId: string): Promise<CourseActivity | null> {
    if (!activityId) return null;
    const token = await this.requireToken();
    const rows = await this.service.readActivities({
      accessToken: token,
      query: { _id: activityId, is_active: true },
    });
    if (!rows.length) {
      return null;
    }
    return mapCourseActivityRecordToEntity(
      ensureActivityRecord(rows[0] as Record<string, unknown>),
    );
  }

  async getActivitiesByCourse(courseId: string): Promise<CourseActivity[]> {
    const token = await this.requireToken();
    const rows = await this.service.readActivities({
      accessToken: token,
      query: { course_id: courseId },
    });
    return rows.map((row) => mapCourseActivityRecordToEntity(ensureActivityRecord(row)));
  }

  async getActivitiesByCategory(categoryId: string): Promise<CourseActivity[]> {
    const token = await this.requireToken();
    const rows = await this.service.readActivities({
      accessToken: token,
      query: { category_id: categoryId, is_active: true },
    });
    return rows.map((row) => mapCourseActivityRecordToEntity(ensureActivityRecord(row)));
  }

  async createActivity(activity: CourseActivity): Promise<CourseActivity> {
    const token = await this.requireToken();
    const payload: Record<string, unknown> = {
      ...mapCourseActivityEntityToRecord(activity),
    };
    if (typeof payload._id !== "string" || payload._id.length === 0) {
      delete payload._id;
    }
    const response = await this.service.insertActivity({
      accessToken: token,
      record: payload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      throw new Error("La respuesta de inserción de actividades no contiene registros");
    }
    return mapCourseActivityRecordToEntity(
      ensureActivityRecord(inserted[0] as Record<string, unknown>),
    );
  }

  async updateActivity(activity: CourseActivity): Promise<CourseActivity> {
    const token = await this.requireToken();
    const response = await this.service.updateActivity({
      accessToken: token,
      id: activity.id,
      updates: {
        title: activity.title,
        description: activity.description,
        category_id: activity.categoryId,
        course_id: activity.courseId,
        created_by: activity.createdBy,
        due_date: activity.dueDate,
        is_active: activity.isActive,
        reviewing: activity.reviewing,
        private_review: activity.privateReview,
      },
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapCourseActivityRecordToEntity(ensureActivityRecord(updated));
    }

    const refreshed = await this.getActivityById(activity.id);
    if (!refreshed) {
      throw new Error("No se pudo obtener la actividad actualizada");
    }
    return refreshed;
  }

  async deleteActivity(activityId: string): Promise<boolean> {
    const token = await this.requireToken();
    await this.service.updateActivity({
      accessToken: token,
      id: activityId,
      updates: { is_active: false },
    });
    return true;
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

  private extractUpdatedRecord(
    response: Record<string, unknown>,
  ): Record<string, unknown> | null {
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
