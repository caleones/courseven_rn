import { Group } from "@/src/domain/models/Group";
import { Category } from "@/src/domain/models/Category";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

export type CreateGroupParams = {
  name: string;
  categoryId: string;
  courseId: string;
  teacherId: string;
};

export class CreateGroupUseCase {
  constructor(
    private readonly repository: GroupRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

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

    const category = await this.categoryRepository.getCategoryById(params.categoryId);
    if (!category) {
      throw new Error("Categoría no encontrada");
    }

    const created = await this.repository.createGroup(group);
    if (category.groupingMethod.toLowerCase() === "random") {
      await this.fillRandomGroup(created, category);
    }
    return created;
  }

  private async fillRandomGroup(group: Group, category: Category) {
    const currentMembers = await this.membershipRepository.getMembershipsByGroupId(group.id);
    const maxPerGroup = this.getMaxMembersPerGroup(category);
    const hasLimit = typeof maxPerGroup === "number";
    const remainingSlots = hasLimit
      ? Math.max(maxPerGroup - currentMembers.length, 0)
      : Number.POSITIVE_INFINITY;

    if (remainingSlots <= 0) {
      return;
    }

    const assignedStudents = await this.collectCourseMembers(group.courseId);
    const enrollments = await this.enrollmentRepository.getEnrollmentsByCourse(group.courseId);
    if (!enrollments.length) {
      return;
    }

    let slotsLeft = remainingSlots;
    for (const enrollment of enrollments) {
      if (!this.hasSlots(slotsLeft)) {
        break;
      }
      const studentId = enrollment.studentId;
      if (!studentId || assignedStudents.has(studentId)) {
        continue;
      }

      await this.membershipRepository.createMembership({
        id: "",
        userId: studentId,
        groupId: group.id,
        joinedAt: new Date().toISOString(),
        isActive: true,
      });
      assignedStudents.add(studentId);
      if (Number.isFinite(slotsLeft)) {
        slotsLeft = Math.max(slotsLeft - 1, 0);
      }
    }
  }

  private getMaxMembersPerGroup(category: Category): number | null {
    const value = category.maxMembersPerGroup;
    if (typeof value === "number" && value > 0) {
      return value;
    }
    return null;
  }

  private hasSlots(slots: number): boolean {
    return Number.isFinite(slots) ? slots > 0 : true;
  }

  private async collectCourseMembers(courseId: string): Promise<Set<string>> {
    const assigned = new Set<string>();
    const groups = await this.repository.getGroupsByCourse(courseId);
    if (!groups.length) {
      return assigned;
    }
    const membershipBatches = await Promise.all(
      groups.map((existingGroup) => this.membershipRepository.getMembershipsByGroupId(existingGroup.id)),
    );
    for (const members of membershipBatches) {
      for (const membership of members) {
        if (membership.userId) {
          assigned.add(membership.userId);
        }
      }
    }
    return assigned;
  }
}
