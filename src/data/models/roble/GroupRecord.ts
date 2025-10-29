import { Group } from "@/src/domain/models/Group";

export type GroupRecord = {
  _id: string;
  name: string;
  category_id: string;
  course_id: string;
  teacher_id: string;
  created_at?: string;
  is_active?: boolean;
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

export const toGroupRecord = (raw: Record<string, unknown>): GroupRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  name: typeof raw.name === "string" ? raw.name : "",
  category_id: typeof raw.category_id === "string" ? raw.category_id : "",
  course_id: typeof raw.course_id === "string" ? raw.course_id : "",
  teacher_id: typeof raw.teacher_id === "string" ? raw.teacher_id : "",
  created_at:
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
});

export const mapGroupRecordToEntity = (record: GroupRecord): Group => ({
  id: record._id ?? "",
  name: record.name ?? "",
  categoryId: record.category_id ?? "",
  courseId: record.course_id ?? "",
  teacherId: record.teacher_id ?? "",
  createdAt: record.created_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapGroupEntityToRecord = (group: Group): GroupRecord => ({
  _id: group.id,
  name: group.name,
  category_id: group.categoryId,
  course_id: group.courseId,
  teacher_id: group.teacherId,
  created_at: group.createdAt ?? new Date().toISOString(),
  is_active: group.isActive,
});
