import { AuthRepository, SignupParams } from "../repositories/AuthRepository";

export class SignupUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(params: SignupParams): Promise<{ message: string }> {
    return this.repository.signup(params);
  }
}
