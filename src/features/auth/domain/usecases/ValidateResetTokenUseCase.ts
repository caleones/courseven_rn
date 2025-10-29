import { AuthRepository } from "../repositories/AuthRepository";

export class ValidateResetTokenUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(token: string): Promise<boolean> {
    return this.repository.validateResetToken(token);
  }
}
