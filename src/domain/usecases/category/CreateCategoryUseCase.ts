import { Category } from "@/src/domain/models/Category";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";

export type CreateCategoryParams = {
  name: string;
  description?: string | null;
  courseId: string;
  teacherId: string;
  groupingMethod: string;
  maxMembersPerGroup?: number | null;
};

export class CreateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(params: CreateCategoryParams): Promise<Category> {
    const name = params.name.trim();
    const rawDescription = params.description ?? null;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() : rawDescription;

    const maxMembers = params.maxMembersPerGroup;
    const category: Category = {
      id: "",
      name,
      description,
      courseId: params.courseId,
      teacherId: params.teacherId,
      groupingMethod: params.groupingMethod,
      maxMembersPerGroup:
        typeof maxMembers === "number" && Number.isFinite(maxMembers)
          ? maxMembers
          : null,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    return this.repository.createCategory(category);
  }
}
