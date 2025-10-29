import {
    CategoryRecord,
    mapCategoryEntityToRecord,
    mapCategoryRecordToEntity,
    toCategoryRecord,
} from "@/src/data/models/roble/CategoryRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { Category } from "@/src/domain/models/Category";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureCategoryRecord = (raw: Record<string, unknown>): CategoryRecord =>
  toCategoryRecord(raw);

export class CategoryRepositoryImpl implements CategoryRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getCategoryById(categoryId: string): Promise<Category | null> {
    if (!categoryId) return null;
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { _id: categoryId },
    });
    if (!rows.length) {
      return null;
    }
    return mapCategoryRecordToEntity(ensureCategoryRecord(rows[0] as Record<string, unknown>));
  }

  async getAllCategories(): Promise<Category[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({ accessToken: token });
    return rows.map((row) => mapCategoryRecordToEntity(ensureCategoryRecord(row)));
  }

  async createCategory(category: Category): Promise<Category> {
    const token = await this.requireToken();
    const payload: Record<string, unknown> = {
      ...mapCategoryEntityToRecord(category),
    };
    if (typeof payload._id !== "string" || payload._id.length === 0) {
      delete payload._id;
    }
    const response = await this.service.insertCategory({
      accessToken: token,
      record: payload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      throw new Error("La respuesta de inserción de categorías no contiene registros");
    }
    return mapCategoryRecordToEntity(
      ensureCategoryRecord(inserted[0] as Record<string, unknown>),
    );
  }

  async getCategoriesByCourse(courseId: string): Promise<Category[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { course_id: courseId, is_active: true },
    });
    return rows.map((row) => mapCategoryRecordToEntity(ensureCategoryRecord(row)));
  }

  async getCategoriesByTeacher(teacherId: string): Promise<Category[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { teacher_id: teacherId, is_active: true },
    });
    return rows.map((row) => mapCategoryRecordToEntity(ensureCategoryRecord(row)));
  }

  async updateCategory(category: Category): Promise<Category> {
    const token = await this.requireToken();
    const response = await this.service.updateCategory({
      accessToken: token,
      id: category.id,
      updates: {
        name: category.name,
        description: category.description,
        course_id: category.courseId,
        teacher_id: category.teacherId,
        grouping_method: category.groupingMethod,
        max_members_per_group: category.maxMembersPerGroup,
        is_active: category.isActive,
      },
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapCategoryRecordToEntity(ensureCategoryRecord(updated));
    }

    const refreshed = await this.getCategoryById(category.id);
    if (!refreshed) {
      throw new Error("No se pudo obtener la categoría actualizada");
    }
    return refreshed;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const token = await this.requireToken();
    await this.service.updateCategory({
      accessToken: token,
      id: categoryId,
      updates: { is_active: false },
    });
    return true;
  }

  async searchCategoriesByName(name: string): Promise<Category[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { name, is_active: true },
    });
    return rows.map((row) => mapCategoryRecordToEntity(ensureCategoryRecord(row)));
  }

  async getActiveCategories(): Promise<Category[]> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { is_active: true },
    });
    return rows.map((row) => mapCategoryRecordToEntity(ensureCategoryRecord(row)));
  }

  async getCategoriesOrdered(): Promise<Category[]> {
    const list = await this.getActiveCategories();
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updateCategoriesOrder(categoryIds: string[]): Promise<boolean> {
    console.debug(
      "[CATEGORY_REPO] updateCategoriesOrder not implemented for ids",
      categoryIds,
    );
    return false;
  }

  async isCategoryNameAvailable(name: string): Promise<boolean> {
    const token = await this.requireToken();
    const rows = await this.service.readCategories({
      accessToken: token,
      query: { name },
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
