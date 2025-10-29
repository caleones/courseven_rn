export interface CourseActivity {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  courseId: string;
  createdBy: string;
  dueDate: string | null;
  createdAt: string;
  isActive: boolean;
  reviewing: boolean;
  privateReview: boolean;
}
