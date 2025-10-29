import { AuthRepository } from "../repositories/AuthRepository";

export class ExtractResetTokenUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(url: string): string | null {
    return this.repository.extractResetToken(url);
  }
}
