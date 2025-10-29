import { AuthSession } from "../entities/AuthSession";
import { AuthRepository, VerifyEmailParams } from "../repositories/AuthRepository";

export class VerifyEmailUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(params: VerifyEmailParams): Promise<AuthSession> {
    return this.repository.verifyEmail(params);
  }
}
