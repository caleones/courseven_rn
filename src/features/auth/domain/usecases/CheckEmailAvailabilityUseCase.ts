import { AuthRepository } from "../repositories/AuthRepository";

export class CheckEmailAvailabilityUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(email: string): Promise<boolean> {
    return this.repository.checkEmailAvailability(email);
  }
}
