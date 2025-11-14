import { Membership } from "@/src/domain/models/Membership";

export type MembershipRecord = {
  _id: string;
  user_id: string;
  group_id: string;
  joined_at?: string;
  joinet_at?: string; // Nombre correcto de la columna en la base de datos
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

export const toMembershipRecord = (raw: Record<string, unknown>): MembershipRecord => ({
  _id: typeof raw._id === "string" ? raw._id : "",
  user_id: typeof raw.user_id === "string" ? raw.user_id : "",
  group_id: typeof raw.group_id === "string" ? raw.group_id : "",
  joined_at:
    typeof raw.joined_at === "string"
      ? raw.joined_at
      : typeof raw.joinedAt === "string"
        ? raw.joinedAt
        : undefined,
  joinet_at:
    typeof raw.joinet_at === "string"
      ? raw.joinet_at
      : typeof raw.joined_at === "string"
        ? raw.joined_at
        : typeof raw.joinedAt === "string"
          ? raw.joinedAt
          : undefined,
  is_active: toBoolean(raw.is_active, true),
});

export const mapMembershipRecordToEntity = (
  record: MembershipRecord,
): Membership => ({
  id: record._id ?? "",
  userId: record.user_id ?? "",
  groupId: record.group_id ?? "",
  joinedAt: record.joinet_at ?? record.joined_at ?? new Date().toISOString(),
  isActive: toBoolean(record.is_active, true),
});

export const mapMembershipEntityToRecord = (
  membership: Membership,
): MembershipRecord => ({
  _id: membership.id,
  user_id: membership.userId,
  group_id: membership.groupId,
  joinet_at: membership.joinedAt ?? new Date().toISOString(), // Usar el nombre correcto de la columna
  is_active: membership.isActive,
});
