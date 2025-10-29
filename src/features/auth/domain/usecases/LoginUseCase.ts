import { AuthSession } from "../entities/AuthSession";
import { AuthRepository, LoginParams } from "../repositories/AuthRepository";

export class LoginUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(params: LoginParams): Promise<AuthSession> {
    return this.repository.login(params);
  }
}
