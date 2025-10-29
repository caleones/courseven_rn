import { AuthUser } from "../../domain/entities/AuthUser";

export interface IAuthDataSource {
  login(email: string, password: string): Promise<AuthUser>;
  signup(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
}