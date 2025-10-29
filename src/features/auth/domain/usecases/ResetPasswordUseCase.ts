import { AuthRepository } from "../repositories/AuthRepository";

export type ResetPasswordParams = {
  token: string;
  newPassword: string;
};

export class ResetPasswordUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(params: ResetPasswordParams): Promise<{ message: string }> {
    return this.repository.resetPassword(params.token, params.newPassword);
  }
}
