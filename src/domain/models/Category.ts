export interface Category {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  teacherId: string;
  groupingMethod: string;
  maxMembersPerGroup: number | null;
  createdAt: string;
  isActive: boolean;
}
