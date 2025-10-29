import { AuthRepository } from "../repositories/AuthRepository";

export class RequestPasswordResetUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(email: string): Promise<{ message: string }> {
    return this.repository.requestPasswordReset(email);
  }
}
