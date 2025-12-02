import { Enrollment } from "@/src/domain/models/Enrollment";
import { Category } from "@/src/domain/models/Category";
import { Group } from "@/src/domain/models/Group";
import { CourseRepository } from "@/src/domain/repositories/CourseRepository";
import { EnrollmentRepository } from "@/src/domain/repositories/EnrollmentRepository";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

export type EnrollToCourseParams = {
  userId: string;
  joinCode: string;
};

export class EnrollToCourseUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly groupRepository: GroupRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(params: EnrollToCourseParams): Promise<Enrollment> {
    const joinCode = params.joinCode.trim();
    const userId = params.userId;

    const course = await this.courseRepository.getCourseByJoinCode(joinCode);
    if (!course) {
      throw new Error("Código de ingreso inválido");
    }

    if (course.teacherId === userId) {
      throw new Error("No puedes inscribirte como estudiante en tu propio curso");
    }

    const myEnrollments = await this.enrollmentRepository.getEnrollmentsByStudent(userId);
    const existing = myEnrollments.find((enrollment) => enrollment.courseId === course.id);

    if (existing && existing.isActive) {
      throw new Error("Ya estás inscrito en este curso");
    }

    if (existing && !existing.isActive) {
      const updated = await this.enrollmentRepository.updateEnrollment({
        ...existing,
        isActive: true,
        enrolledAt: new Date().toISOString(),
      });
      return updated;
    }

    const newEnrollment: Enrollment = {
      id: "",
      studentId: userId,
      courseId: course.id,
      enrolledAt: new Date().toISOString(),
      isActive: true,
    };

    const created = await this.enrollmentRepository.createEnrollment(newEnrollment);
    try {
      await this.assignToRandomGroups(course.id, userId);
    } catch (error) {
      console.warn("No se pudo asignar automáticamente a un grupo aleatorio", error);
    }
    return created;
  }

  private async assignToRandomGroups(courseId: string, userId: string) {
    const categories = await this.categoryRepository.getCategoriesByCourse(courseId);
    const randomCategories = categories.filter(
      (category) => category.groupingMethod.toLowerCase() === "random",
    );
    if (!randomCategories.length) {
      return;
    }

    const assignedCategories = await this.collectAssignedCategoryIds(userId);

    for (const category of randomCategories) {
      if (assignedCategories.has(category.id)) {
        continue;
      }
      const groups = await this.groupRepository.getGroupsByCategory(category.id);
      const targetGroup = await this.findGroupWithCapacity(groups, category);
      if (!targetGroup) {
        continue;
      }
      await this.membershipRepository.createMembership({
        id: "",
        userId,
        groupId: targetGroup.id,
        joinedAt: new Date().toISOString(),
        isActive: true,
      });
      assignedCategories.add(category.id);
    }
  }

  private async collectAssignedCategoryIds(userId: string): Promise<Set<string>> {
    const assigned = new Set<string>();
    const memberships = await this.membershipRepository.getMembershipsByUserId(userId);
    for (const membership of memberships) {
      const group = await this.groupRepository.getGroupById(membership.groupId);
      if (group) {
        assigned.add(group.categoryId);
      }
    }
    return assigned;
  }

  private async findGroupWithCapacity(groups: Group[], category: Category): Promise<Group | null> {
    const limit = this.getMaxMembersPerGroup(category);
    for (const group of groups) {
      const members = await this.membershipRepository.getMembershipsByGroupId(group.id);
      if (limit !== null && members.length >= limit) {
        continue;
      }
      return group;
    }
    return null;
  }

  private getMaxMembersPerGroup(category: Category): number | null {
    const value = category.maxMembersPerGroup;
    if (typeof value === "number" && value > 0) {
      return value;
    }
    return null;
  }
}
