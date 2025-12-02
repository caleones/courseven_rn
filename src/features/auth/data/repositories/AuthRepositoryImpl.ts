import { AuthSession } from "../../domain/entities/AuthSession";
import { AuthUser } from "../../domain/entities/AuthUser";
import {
    AuthRepository,
    LoginParams,
    SignupParams,
    VerifyEmailParams,
} from "../../domain/repositories/AuthRepository";
import { AuthLocalDataSource } from "../datasources/AuthLocalDataSource";
import {
    AuthRemoteDataSource,
    LoginRemoteResponse,
    RawRobleUser,
} from "../datasources/AuthRemoteDataSource";

const extractFallbackUsername = (email: string) => {
  if (!email.includes("@")) {
    return email;
  }
  return email.split("@")[0];
};

export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly remote: AuthRemoteDataSource,
    private readonly local: AuthLocalDataSource,
  ) {}

  async login(params: LoginParams): Promise<AuthSession> {
    const loginResponse = await this.remote.login({
      identifier: params.identifier,
      password: params.password,
    });

    const session = this.toSession(loginResponse);
    await this.local.saveSession(session, params.keepLoggedIn);
    return session;
  }

  async signup(params: SignupParams): Promise<{ message: string }> {
    const name = `${params.firstName} ${params.lastName}`.trim();
    return this.remote.signup({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      name,
    });
  }

  async verifyEmail(params: VerifyEmailParams): Promise<AuthSession> {
    // Delegate orchestration to VerifyEmailUseCase to keep business logic in domain
    const { VerifyEmailUseCase } = await import("@/src/features/auth/domain/usecases/VerifyEmailUseCase");
    const uc = new VerifyEmailUseCase(this.remote as any, this.local as any);
    return uc.execute(params as any);
  }

  async logout(): Promise<void> {
    const existing = await this.local.getSession();
    await this.local.clearSession();

    if (existing?.session.tokens.accessToken) {
      await this.remote.logout(existing.session.tokens.accessToken);
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const stored = await this.local.getSession();
    if (!stored) {
      return null;
    }

    if (!stored.keepLoggedIn) {
      await this.local.clearSession();
      return null;
    }

    const valid = await this.remote.verifyToken(stored.session.tokens.accessToken);
    if (valid) {
      return stored.session;
    }

    if (stored.session.tokens.refreshToken) {
      const refreshed = await this.remote.refreshToken(stored.session.tokens.refreshToken);
      if (refreshed?.accessToken) {
        const updatedSession: AuthSession = {
          user: stored.session.user,
          tokens: {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? stored.session.tokens.refreshToken,
          },
        };
        await this.local.saveSession(updatedSession, stored.keepLoggedIn);
        return updatedSession;
      }
    }

    await this.local.clearSession();
    return null;
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.remote.requestPasswordReset(email.trim().toLowerCase());
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.remote.resetPassword({ token, newPassword });
  }

  async validateResetToken(token: string): Promise<boolean> {
    return this.remote.validateResetToken(token);
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    return this.remote.checkEmailAvailability(email);
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return this.remote.checkUsernameAvailability(username);
  }

  extractResetToken(url: string): string | null {
    try {
      const parsed = new URL(url.trim());
      if (
        !parsed.host.includes("roble.openlab.uninorte.edu.co") ||
        !parsed.pathname.includes("reset-password")
      ) {
        return null;
      }
      const token = parsed.searchParams.get("token");
      return token && token.length > 0 ? token : null;
    } catch {
      return null;
    }
  }

  private toSession(response: LoginRemoteResponse): AuthSession {
    return {
      user: this.mapUser(response.user),
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      },
    };
  }

  private mapUser(raw: RawRobleUser): AuthUser {
    const email = raw.email ?? "";
    return {
      id: raw._id ?? "",
      studentId: raw.student_id ?? "",
      email,
      firstName: raw.first_name ?? "",
      lastName: raw.last_name ?? "",
      username: raw.username ?? extractFallbackUsername(email),
      createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
      isActive: raw.is_active ?? true,
    };
  }
}
