import { User } from "@/src/domain/models/User";

export type UserRecord = {
  _id: string;
  student_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  created_at?: string;
  is_active?: boolean;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return fallback;
};

export const toUserRecord = (raw: Record<string, unknown>): UserRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  student_id:
    typeof raw.student_id === "string"
      ? raw.student_id
      : typeof raw.user_id === "string"
        ? raw.user_id
        : undefined,
  email: typeof raw.email === "string" ? raw.email : undefined,
  first_name: typeof raw.first_name === "string" ? raw.first_name : undefined,
  last_name: typeof raw.last_name === "string" ? raw.last_name : undefined,
  username: typeof raw.username === "string" ? raw.username : undefined,
  created_at:
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : undefined,
  is_active: toBoolean(raw.is_active, true),
});

export const mapUserRecordToEntity = (record: UserRecord): User => ({
  id: record._id ?? "",
  studentId: record.student_id ?? "",
  email: record.email ?? "",
  firstName: record.first_name ?? "",
  lastName: record.last_name ?? "",
  username: record.username ?? "",
  createdAt: record.created_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapUserEntityToRecord = (user: User): UserRecord => ({
  _id: user.id,
  student_id: user.studentId,
  email: user.email,
  first_name: user.firstName,
  last_name: user.lastName,
  username: user.username,
  created_at: user.createdAt ?? new Date().toISOString(),
  is_active: user.isActive,
});
