import { Membership } from "@/src/domain/models/Membership";
import { CategoryRepository } from "@/src/domain/repositories/CategoryRepository";
import { GroupRepository } from "@/src/domain/repositories/GroupRepository";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

export type JoinGroupParams = {
  userId: string;
  groupId: string;
};

export class JoinGroupUseCase {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly groupRepository: GroupRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(params: JoinGroupParams): Promise<Membership> {
    const { userId, groupId } = params;

    if (await this.membershipRepository.isUserMemberOfGroup(userId, groupId)) {
      throw new Error("Ya eres miembro de este grupo");
    }

    const group = await this.groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    const category = await this.categoryRepository.getCategoryById(group.categoryId);
    if (!category) {
      throw new Error("Categoría no encontrada");
    }

    if (category.groupingMethod.toLowerCase() !== "manual") {
      throw new Error("No puedes unirte manualmente. Asignación aleatoria");
    }

    const myMemberships = await this.membershipRepository.getMembershipsByUserId(userId);
    for (const membership of myMemberships) {
      const otherGroup = await this.groupRepository.getGroupById(membership.groupId);
      if (otherGroup && otherGroup.categoryId === category.id) {
        throw new Error(
          `Ya perteneces a un grupo de la categoría "${category.name}"`,
        );
      }
    }

    if (
      typeof category.maxMembersPerGroup === "number" &&
      category.maxMembersPerGroup > 0
    ) {
      const members = await this.membershipRepository.getMembershipsByGroupId(group.id);
      if (members.length >= category.maxMembersPerGroup) {
        throw new Error("Este grupo alcanzó su capacidad máxima");
      }
    }

    const membership: Membership = {
      id: "",
      userId,
      groupId,
      joinedAt: new Date().toISOString(),
      isActive: true,
    };

    return this.membershipRepository.createMembership(membership);
  }
}
