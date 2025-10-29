import { Course } from "@/src/domain/models/Course";

export type CourseRecord = {
  _id: string;
  name: string;
  description: string;
  join_code?: string;
  teacher_id: string;
  created_at?: string;
  is_active?: boolean;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return fallback;
};

export const toCourseRecord = (raw: Record<string, unknown>): CourseRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  name: typeof raw.name === "string" ? raw.name : "",
  description: typeof raw.description === "string" ? raw.description : "",
  join_code: typeof raw.join_code === "string" ? raw.join_code : undefined,
  teacher_id: typeof raw.teacher_id === "string" ? raw.teacher_id : "",
  created_at:
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
});

export const mapCourseRecordToEntity = (record: CourseRecord): Course => ({
  id: record._id ?? "",
  name: record.name ?? "",
  description: record.description ?? "",
  joinCode: record.join_code ?? "",
  teacherId: record.teacher_id ?? "",
  createdAt: record.created_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapCourseEntityToRecord = (course: Course): CourseRecord => ({
  _id: course.id,
  name: course.name,
  description: course.description,
  join_code: course.joinCode,
  teacher_id: course.teacherId,
  created_at: course.createdAt ?? new Date().toISOString(),
  is_active: course.isActive,
});
