import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { CourseActivityRepository } from "@/src/domain/repositories/CourseActivityRepository";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

export type GetCourseActivitiesForStudentParams = {
  courseId: string;
  userId: string;
};

const toComparableDate = (value: string | null | undefined): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

export class GetCourseActivitiesForStudentUseCase {
  constructor(
    private readonly activityRepository: CourseActivityRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  async execute(params: GetCourseActivitiesForStudentParams): Promise<CourseActivity[]> {
    const allActivities = await this.activityRepository.getActivitiesByCourse(params.courseId);
    if (!allActivities.length) {
      return [];
    }

    const memberships = await this.membershipRepository.getMembershipsByUserId(params.userId);
    if (!memberships.length) {
      return [];
    }

    const categoryIds = new Set<string>();
    for (const membership of memberships) {
      const group = await this.groupRepository.getGroupById(membership.groupId);
      if (group && group.courseId === params.courseId) {
        categoryIds.add(group.categoryId);
      }
    }

    if (!categoryIds.size) {
      return [];
    }

    const visible = allActivities.filter((activity) =>
      categoryIds.has(activity.categoryId),
    );

    return visible.sort((a, b) => {
      const aDate = toComparableDate(a.dueDate ?? a.createdAt);
      const bDate = toComparableDate(b.dueDate ?? b.createdAt);
      return aDate - bDate;
    });
  }
}
