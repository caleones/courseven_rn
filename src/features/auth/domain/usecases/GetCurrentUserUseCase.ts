import { AuthSession } from "../entities/AuthSession";
import { AuthRepository } from "../repositories/AuthRepository";

export class GetCurrentUserUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(): Promise<AuthSession | null> {
    return this.repository.getCurrentSession();
  }
}
