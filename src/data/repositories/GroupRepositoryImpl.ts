import {
    GroupRecord,
    mapGroupEntityToRecord,
    mapGroupRecordToEntity,
    toGroupRecord,
} from "@/src/data/models/roble/GroupRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { Group } from "@/src/domain/models/Group";
import {
    GroupRepository,
    PaginatedGroupParams,
} from "@/src/domain/repositories/GroupRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureGroupRecord = (raw: Record<string, unknown>): GroupRecord => toGroupRecord(raw);

export class GroupRepositoryImpl implements GroupRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getGroupById(groupId: string): Promise<Group | null> {
    if (!groupId) return null;
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { _id: groupId, is_active: true },
    });
    if (!rows.length) {
      return null;
    }
    return mapGroupRecordToEntity(ensureGroupRecord(rows[0] as Record<string, unknown>));
  }

  async getGroupsByCourse(courseId: string): Promise<Group[]> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { course_id: courseId, is_active: true },
    });
    return rows.map((row) => mapGroupRecordToEntity(ensureGroupRecord(row)));
  }

  async createGroup(group: Group): Promise<Group> {
    const token = await this.requireToken();
    const payload: Record<string, unknown> = {
      ...mapGroupEntityToRecord(group),
    };
    if (typeof payload._id !== "string" || payload._id.length === 0) {
      delete payload._id;
    }
    const response = await this.service.insertGroup({
      accessToken: token,
      record: payload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      throw new Error("La respuesta de inserción de grupos no contiene registros");
    }
    return mapGroupRecordToEntity(ensureGroupRecord(inserted[0] as Record<string, unknown>));
  }

  async getGroupsByCategory(categoryId: string): Promise<Group[]> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { category_id: categoryId, is_active: true },
    });
    return rows.map((row) => mapGroupRecordToEntity(ensureGroupRecord(row)));
  }

  async getGroupsByTeacher(teacherId: string): Promise<Group[]> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { teacher_id: teacherId, is_active: true },
    });
    return rows.map((row) => mapGroupRecordToEntity(ensureGroupRecord(row)));
  }

  async updateGroup(group: Group): Promise<Group> {
    const token = await this.requireToken();
    const response = await this.service.updateGroup({
      accessToken: token,
      id: group.id,
      updates: {
        name: group.name,
        category_id: group.categoryId,
        course_id: group.courseId,
        teacher_id: group.teacherId,
        is_active: group.isActive,
      },
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapGroupRecordToEntity(ensureGroupRecord(updated));
    }

    const refreshed = await this.getGroupById(group.id);
    if (!refreshed) {
      throw new Error("No se pudo obtener el grupo actualizado");
    }
    return refreshed;
  }

  async deleteGroup(groupId: string): Promise<boolean> {
    const token = await this.requireToken();
    await this.service.updateGroup({
      accessToken: token,
      id: groupId,
      updates: { is_active: false },
    });
    return true;
  }

  async searchGroupsByName(name: string): Promise<Group[]> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { name, is_active: true },
    });
    return rows.map((row) => mapGroupRecordToEntity(ensureGroupRecord(row)));
  }

  async getActiveGroups(): Promise<Group[]> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { is_active: true },
    });
    return rows.map((row) => mapGroupRecordToEntity(ensureGroupRecord(row)));
  }

  async getGroupsPaginated(_params?: PaginatedGroupParams): Promise<Group[]> {
    console.debug("[GROUP_REPO] getGroupsPaginated not implemented");
    return this.getActiveGroups();
  }

  async isGroupNameAvailableInCourse(name: string, courseId: string): Promise<boolean> {
    const token = await this.requireToken();
    const rows = await this.service.readGroups({
      accessToken: token,
      query: { name, course_id: courseId, is_active: true },
    });
    return rows.length === 0;
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
