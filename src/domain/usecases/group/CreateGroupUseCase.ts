import { Group } from "@/src/domain/models/Group";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";

export type CreateGroupParams = {
  name: string;
  categoryId: string;
  courseId: string;
  teacherId: string;
};

export class CreateGroupUseCase {
  constructor(private readonly repository: GroupRepository) {}

  async execute(params: CreateGroupParams): Promise<Group> {
    const name = params.name.trim();

    const group: Group = {
      id: "",
      name,
      categoryId: params.categoryId,
      courseId: params.courseId,
      teacherId: params.teacherId,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    return this.repository.createGroup(group);
  }
}
