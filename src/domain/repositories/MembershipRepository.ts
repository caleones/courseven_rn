import { Membership } from "../models/Membership";

export type PaginatedMembershipParams = {
  page?: number;
  limit?: number;
};

export interface MembershipRepository {
  getMembershipById(membershipId: string): Promise<Membership | null>;
  getMembershipsByUserId(userId: string): Promise<Membership[]>;
  getMembershipsByGroupId(groupId: string): Promise<Membership[]>;
  createMembership(membership: Membership): Promise<Membership>;
  updateMembership(membership: Membership): Promise<Membership>;
  deleteMembership(membershipId: string): Promise<boolean>;
  isUserMemberOfGroup(userId: string, groupId: string): Promise<boolean>;
  getActiveMemberships(): Promise<Membership[]>;
  getMembershipsPaginated(params?: PaginatedMembershipParams): Promise<Membership[]>;
}
