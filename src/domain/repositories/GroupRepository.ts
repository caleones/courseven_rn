import { Group } from "../models/Group";

export type PaginatedGroupParams = {
  page?: number;
  limit?: number;
  courseId?: string;
};

export interface GroupRepository {
  getGroupById(groupId: string): Promise<Group | null>;
  getGroupsByCourse(courseId: string): Promise<Group[]>;
  createGroup(group: Group): Promise<Group>;
  getGroupsByCategory(categoryId: string): Promise<Group[]>;
  getGroupsByTeacher(teacherId: string): Promise<Group[]>;
  updateGroup(group: Group): Promise<Group>;
  deleteGroup(groupId: string): Promise<boolean>;
  searchGroupsByName(name: string): Promise<Group[]>;
  getActiveGroups(): Promise<Group[]>;
  getGroupsPaginated(params?: PaginatedGroupParams): Promise<Group[]>;
  isGroupNameAvailableInCourse(name: string, courseId: string): Promise<boolean>;
}
