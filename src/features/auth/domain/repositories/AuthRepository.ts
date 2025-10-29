import { AuthSession } from "../entities/AuthSession";

export type LoginParams = {
  identifier: string;
  password: string;
  keepLoggedIn: boolean;
};

export type SignupParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
};

export type VerifyEmailParams = SignupParams & {
  code: string;
};

export interface AuthRepository {
  login(params: LoginParams): Promise<AuthSession>;
  signup(params: SignupParams): Promise<{ message: string }>;
  verifyEmail(params: VerifyEmailParams): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  requestPasswordReset(email: string): Promise<{ message: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ message: string }>;
  validateResetToken(token: string): Promise<boolean>;
  checkEmailAvailability(email: string): Promise<boolean>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  extractResetToken(url: string): string | null;
}
