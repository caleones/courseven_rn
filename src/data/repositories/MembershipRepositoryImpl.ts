import {
    mapMembershipEntityToRecord,
    mapMembershipRecordToEntity,
    MembershipRecord,
    toMembershipRecord,
} from "@/src/data/models/roble/MembershipRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { Membership } from "@/src/domain/models/Membership";
import {
    MembershipRepository,
    PaginatedMembershipParams,
} from "@/src/domain/repositories/MembershipRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureMembershipRecord = (raw: Record<string, unknown>): MembershipRecord =>
  toMembershipRecord(raw);

export class MembershipRepositoryImpl implements MembershipRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getMembershipById(membershipId: string): Promise<Membership | null> {
    if (!membershipId) return null;
    const token = await this.requireToken();
    const rows = await this.service.readMemberships({
      accessToken: token,
      query: { _id: membershipId },
    });
    if (!rows.length) {
      return null;
    }
    return mapMembershipRecordToEntity(ensureMembershipRecord(rows[0] as Record<string, unknown>));
  }

  async getMembershipsByUserId(userId: string): Promise<Membership[]> {
    const token = await this.requireToken();
    const rows = await this.service.readMemberships({
      accessToken: token,
      query: { user_id: userId, is_active: true },
    });
    return rows.map((row) => mapMembershipRecordToEntity(ensureMembershipRecord(row)));
  }

  async getMembershipsByGroupId(groupId: string): Promise<Membership[]> {
    const token = await this.requireToken();
    const rows = await this.service.readMemberships({
      accessToken: token,
      query: { group_id: groupId, is_active: true },
    });
    return rows.map((row) => mapMembershipRecordToEntity(ensureMembershipRecord(row)));
  }

  async createMembership(membership: Membership): Promise<Membership> {
    const token = await this.requireToken();
    const payload: Record<string, unknown> = {
      ...mapMembershipEntityToRecord(membership),
    };
    if (typeof payload._id !== "string" || payload._id.length === 0) {
      delete payload._id;
    }
    const response = await this.service.insertMembership({
      accessToken: token,
      record: payload,
    });
    const inserted = Array.isArray(response.inserted) ? response.inserted : undefined;
    if (!inserted || !inserted.length) {
      const skipped = Array.isArray(response.skipped) ? response.skipped : [];
      const reason = skipped
        .map((entry) =>
          entry && typeof entry === "object" && "reason" in entry
            ? String((entry as Record<string, unknown>).reason ?? "")
            : "",
        )
        .find((msg) => msg.length > 0);
      throw new Error(reason || "La respuesta de membresías no retornó registros");
    }
    return mapMembershipRecordToEntity(
      ensureMembershipRecord(inserted[0] as Record<string, unknown>),
    );
  }

  async updateMembership(membership: Membership): Promise<Membership> {
    const token = await this.requireToken();
    const response = await this.service.updateMembership({
      accessToken: token,
      id: membership.id,
      updates: {
        user_id: membership.userId,
        group_id: membership.groupId,
        joined_at: membership.joinedAt,
        is_active: membership.isActive,
      },
    });

    const updated = this.extractUpdatedRecord(response);
    if (updated) {
      return mapMembershipRecordToEntity(ensureMembershipRecord(updated));
    }

    const refreshed = await this.getMembershipById(membership.id);
    if (!refreshed) {
      throw new Error("No se pudo obtener la membresía actualizada");
    }
    return refreshed;
  }

  async deleteMembership(membershipId: string): Promise<boolean> {
    const token = await this.requireToken();
    await this.service.updateMembership({
      accessToken: token,
      id: membershipId,
      updates: { is_active: false },
    });
    return true;
  }

  async isUserMemberOfGroup(userId: string, groupId: string): Promise<boolean> {
    const token = await this.requireToken();
    const rows = await this.service.readMemberships({
      accessToken: token,
      query: { user_id: userId, group_id: groupId, is_active: true },
    });
    return rows.length > 0;
  }

  async getActiveMemberships(): Promise<Membership[]> {
    const token = await this.requireToken();
    const rows = await this.service.readMemberships({
      accessToken: token,
      query: { is_active: true },
    });
    return rows.map((row) => mapMembershipRecordToEntity(ensureMembershipRecord(row)));
  }

  async getMembershipsPaginated(
    _params?: PaginatedMembershipParams,
  ): Promise<Membership[]> {
    console.debug("[MEMBERSHIP_REPO] getMembershipsPaginated not implemented");
    return this.getActiveMemberships();
  }

  private async requireToken(): Promise<string> {
    if (!this.getAccessToken) {
      throw new Error("Access token no disponible");
    }
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error("Access token no disponible");
    }
    return token;
  }

  private extractUpdatedRecord(
    response: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const updated = response.updated;
    if (Array.isArray(updated) && updated.length > 0) {
      return updated[0] as Record<string, unknown>;
    }
    if (response.data && typeof response.data === "object") {
      return response.data as Record<string, unknown>;
    }
    if (Array.isArray(response.inserted) && response.inserted.length > 0) {
      return response.inserted[0] as Record<string, unknown>;
    }
    return null;
  }
}
