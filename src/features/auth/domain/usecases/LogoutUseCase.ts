import { AuthRepository } from "../repositories/AuthRepository";

export class LogoutUseCase {
  constructor(private repo: AuthRepository) {}

  async execute(): Promise<void> {
    return this.repo.logout();
  }
}
