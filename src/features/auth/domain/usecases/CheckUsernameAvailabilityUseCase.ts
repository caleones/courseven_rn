import { AuthRepository } from "../repositories/AuthRepository";

export class CheckUsernameAvailabilityUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(username: string): Promise<boolean> {
    return this.repository.checkUsernameAvailability(username);
  }
}
