import { CourseActivity } from "@/src/domain/models/CourseActivity";

export type CourseActivityRecord = {
  _id: string;
  title: string;
  description?: string | null;
  category_id: string;
  course_id: string;
  created_by: string;
  due_date?: string | null;
  created_at?: string;
  is_active?: boolean;
  reviewing?: boolean;
  private_review?: boolean;
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return fallback;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
};

export const toCourseActivityRecord = (
  raw: Record<string, unknown>,
): CourseActivityRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  title: typeof raw.title === "string" ? raw.title : "",
  description: toNullableString(raw.description),
  category_id: typeof raw.category_id === "string" ? raw.category_id : "",
  course_id: typeof raw.course_id === "string" ? raw.course_id : "",
  created_by: typeof raw.created_by === "string" ? raw.created_by : "",
  due_date: toNullableString(raw.due_date),
  created_at:
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
  reviewing: toBoolean(raw.reviewing, false),
  private_review: toBoolean(raw.private_review, false),
});

export const mapCourseActivityRecordToEntity = (
  record: CourseActivityRecord,
): CourseActivity => ({
  id: record._id ?? "",
  title: record.title ?? "",
  description: record.description ?? null,
  categoryId: record.category_id ?? "",
  courseId: record.course_id ?? "",
  createdBy: record.created_by ?? "",
  dueDate: record.due_date ?? null,
  createdAt: record.created_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
  reviewing: toBoolean(record.reviewing, false),
  privateReview: toBoolean(record.private_review, false),
});

export const mapCourseActivityEntityToRecord = (
  activity: CourseActivity,
): CourseActivityRecord => ({
  _id: activity.id,
  title: activity.title,
  description: activity.description,
  category_id: activity.categoryId,
  course_id: activity.courseId,
  created_by: activity.createdBy,
  due_date: activity.dueDate,
  created_at: activity.createdAt ?? new Date().toISOString(),
  is_active: activity.isActive,
  reviewing: activity.reviewing,
  private_review: activity.privateReview,
});
