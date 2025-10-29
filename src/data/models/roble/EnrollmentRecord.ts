import { Enrollment } from "@/src/domain/models/Enrollment";

export type EnrollmentRecord = {
  _id: string;
  user_id?: string;
  student_id?: string;
  course_id: string;
  enrolled_at?: string;
  is_active?: boolean;
  status?: string;
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

export const toEnrollmentRecord = (
  raw: Record<string, unknown>,
): EnrollmentRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  user_id: typeof raw.user_id === "string" ? raw.user_id : undefined,
  student_id: typeof raw.student_id === "string" ? raw.student_id : undefined,
  course_id: typeof raw.course_id === "string" ? raw.course_id : "",
  enrolled_at:
    typeof raw.enrolled_at === "string"
      ? raw.enrolled_at
      : typeof raw.enrolledAt === "string"
        ? raw.enrolledAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
  status: typeof raw.status === "string" ? raw.status : undefined,
});

const resolveStudentId = (record: EnrollmentRecord): string => {
  if (record.user_id && record.user_id.length > 0) {
    return record.user_id;
  }
  if (record.student_id && record.student_id.length > 0) {
    return record.student_id;
  }
  return "";
};

export const mapEnrollmentRecordToEntity = (
  record: EnrollmentRecord,
): Enrollment => ({
  id: record._id ?? "",
  studentId: resolveStudentId(record),
  courseId: record.course_id ?? "",
  enrolledAt: record.enrolled_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapEnrollmentEntityToRecord = (
  enrollment: Enrollment,
): EnrollmentRecord => ({
  _id: enrollment.id,
  user_id: enrollment.studentId,
  course_id: enrollment.courseId,
  enrolled_at: enrollment.enrolledAt ?? new Date().toISOString(),
  is_active: enrollment.isActive,
});
