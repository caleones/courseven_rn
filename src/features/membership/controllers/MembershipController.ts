import { AppEventBus, MembershipJoinedEvent } from "@/src/core/events/AppEventBus";
import { Membership } from "@/src/domain/models/Membership";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";
import { JoinGroupUseCase } from "@/src/domain/usecases/membership/JoinGroupUseCase";

export type MembershipControllerState = {
  isLoading: boolean;
  error: string | null;
  myGroupIds: string[];
  groupMemberCounts: Record<string, number>;
};

type Dependencies = {
  joinGroupUseCase: JoinGroupUseCase;
  membershipRepository: MembershipRepository;
  groupRepository: GroupRepository;
  appEventBus: AppEventBus;
  getCurrentUserId: () => Promise<string | null>;
};

const INITIAL_STATE: MembershipControllerState = {
  isLoading: false,
  error: null,
  myGroupIds: [],
  groupMemberCounts: {},
};

export class MembershipController {
  private state: MembershipControllerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly myGroupIdsSet = new Set<string>();
  private readonly loadingCounts = new Set<string>();

  private readonly joinGroupUseCase: JoinGroupUseCase;
  private readonly membershipRepository: MembershipRepository;
  private readonly groupRepository: GroupRepository;
  private readonly appEventBus: AppEventBus;
  private readonly getCurrentUserId: () => Promise<string | null>;

  constructor({
    joinGroupUseCase,
    membershipRepository,
    groupRepository,
    appEventBus,
    getCurrentUserId,
  }: Dependencies) {
    this.joinGroupUseCase = joinGroupUseCase;
    this.membershipRepository = membershipRepository;
    this.groupRepository = groupRepository;
    this.appEventBus = appEventBus;
    this.getCurrentUserId = getCurrentUserId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): MembershipControllerState {
    return this.state;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  hasJoined(groupId: string): boolean {
    return this.myGroupIdsSet.has(groupId);
  }

  async preloadMembershipsForGroups(groupIds: string[]) {
    if (!groupIds.length) return;

    const userId = await this.getCurrentUserId();
    if (!userId) return;

    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const myMemberships = await this.membershipRepository.getMembershipsByUserId(userId);
      const joinedIds = new Set(myMemberships.map((membership) => membership.groupId));
      this.myGroupIdsSet.clear();
      for (const groupId of groupIds) {
        if (joinedIds.has(groupId)) {
          this.myGroupIdsSet.add(groupId);
        }
      }
      this.syncGroupIds();
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async preloadMemberCountsForGroups(groupIds: string[]) {
    const targetIds = groupIds.filter((id) => !this.loadingCounts.has(id));
    if (!targetIds.length) return;

    for (const groupId of targetIds) {
      this.loadingCounts.add(groupId);
    }
    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const entries = await Promise.all(
        targetIds.map(async (groupId) => {
          const members = await this.membershipRepository.getMembershipsByGroupId(groupId);
          return [groupId, members.length] as const;
        }),
      );
      this.setState((prev) => ({
        ...prev,
        groupMemberCounts: {
          ...prev.groupMemberCounts,
          ...Object.fromEntries(entries),
        },
      }));
    } catch (error) {
      this.setError(error);
    } finally {
      for (const id of targetIds) {
        this.loadingCounts.delete(id);
      }
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async getMemberCount(groupId: string): Promise<number> {
    const cached = this.state.groupMemberCounts[groupId];
    if (typeof cached === "number") {
      return cached;
    }
    try {
      const members = await this.membershipRepository.getMembershipsByGroupId(groupId);
      this.setState((prev) => ({
        ...prev,
        groupMemberCounts: { ...prev.groupMemberCounts, [groupId]: members.length },
      }));
      return members.length;
    } catch (error) {
      this.setError(error);
      return 0;
    }
  }

  async joinGroup(groupId: string): Promise<Membership | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.setError("Usuario no autenticado");
      return null;
    }

    this.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const membership = await this.joinGroupUseCase.execute({ userId, groupId });
      this.myGroupIdsSet.add(groupId);
      this.syncGroupIds();

      await this.getMemberCount(groupId);

      const group = await this.groupRepository.getGroupById(groupId);
      if (group) {
        this.appEventBus.publish({
          type: "MembershipJoinedEvent",
          groupId,
          courseId: group.courseId,
        } satisfies MembershipJoinedEvent);
      }

      return membership;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  clearError() {
    this.setState((prev) => ({ ...prev, error: null }));
  }

  private syncGroupIds() {
    this.setState((prev) => ({
      ...prev,
      myGroupIds: Array.from(this.myGroupIdsSet),
    }));
  }

  private setState(updater: (prev: MembershipControllerState) => MembershipControllerState) {
    const next = updater(this.state);
    this.state = next;
    this.notify();
  }

  private setError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
    this.setState((prev) => ({ ...prev, error: message }));
  }

  private notify() {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch (error) {
        console.error("MembershipController listener error", error);
      }
    }
  }
}
