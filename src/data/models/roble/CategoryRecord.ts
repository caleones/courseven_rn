import { Category } from "@/src/domain/models/Category";

export type CategoryRecord = {
  _id: string;
  name: string;
  description?: string | null;
  course_id: string;
  teacher_id: string;
  grouping_method: string;
  max_members_per_group?: number | null;
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

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toCategoryRecord = (raw: Record<string, unknown>): CategoryRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  name: typeof raw.name === "string" ? raw.name : "",
  description:
    typeof raw.description === "string"
      ? raw.description
      : typeof raw.description === "object" && raw.description !== null
        ? String(raw.description)
        : null,
  course_id: typeof raw.course_id === "string" ? raw.course_id : "",
  teacher_id: typeof raw.teacher_id === "string" ? raw.teacher_id : "",
  grouping_method: typeof raw.grouping_method === "string" ? raw.grouping_method : "manual",
  max_members_per_group: toNullableNumber(raw.max_members_per_group),
  created_at:
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
});

export const mapCategoryRecordToEntity = (record: CategoryRecord): Category => ({
  id: record._id ?? "",
  name: record.name ?? "",
  description: record.description ?? null,
  courseId: record.course_id ?? "",
  teacherId: record.teacher_id ?? "",
  groupingMethod: record.grouping_method ?? "manual",
  maxMembersPerGroup: record.max_members_per_group ?? null,
  createdAt: record.created_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapCategoryEntityToRecord = (category: Category): CategoryRecord => ({
  _id: category.id,
  name: category.name,
  description: category.description,
  course_id: category.courseId,
  teacher_id: category.teacherId,
  grouping_method: category.groupingMethod,
  max_members_per_group: category.maxMembersPerGroup ?? null,
  created_at: category.createdAt ?? new Date().toISOString(),
  is_active: category.isActive,
});
