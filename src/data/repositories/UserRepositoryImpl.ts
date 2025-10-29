import {
    UserRecord,
    mapUserRecordToEntity,
    toUserRecord,
} from "@/src/data/models/roble/UserRecord";
import { RobleService } from "@/src/data/services/RobleService";
import { User } from "@/src/domain/models/User";
import { UserRepository } from "@/src/domain/repositories/UserRepository";

type AccessTokenProvider = () => Promise<string | null>;

type Dependencies = {
  getAccessToken?: AccessTokenProvider;
};

const ensureUserRecord = (raw: Record<string, unknown>): UserRecord => toUserRecord(raw);

export class UserRepositoryImpl implements UserRepository {
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(private readonly service: RobleService, deps: Dependencies = {}) {
    this.getAccessToken = deps.getAccessToken;
  }

  async getUserById(userId: string): Promise<User | null> {
    const token = await this.requireToken();
    const rows = await this.service.readUsers({
      accessToken: token,
      query: { _id: userId },
    });
    if (!rows.length) {
      return null;
    }
    return mapUserRecordToEntity(ensureUserRecord(rows[0]));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const token = await this.requireToken();
    const rows = await this.service.readUsers({
      accessToken: token,
      query: { email: email.trim().toLowerCase() },
    });
    if (!rows.length) {
      return null;
    }
    return mapUserRecordToEntity(ensureUserRecord(rows[0]));
  }

  async getUserByStudentId(studentId: string): Promise<User | null> {
    const token = await this.requireToken();
    const rows = await this.service.readUsers({
      accessToken: token,
      query: { student_id: studentId },
    });
    if (!rows.length) {
      return null;
    }
    return mapUserRecordToEntity(ensureUserRecord(rows[0]));
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const token = await this.requireToken();
    const rows = await this.service.readUsers({
      accessToken: token,
      query: { username: username.trim() },
    });
    if (!rows.length) {
      return null;
    }
    return mapUserRecordToEntity(ensureUserRecord(rows[0]));
  }

  async createUser(): Promise<User> {
    throw new Error("createUser no está implementado");
  }

  async updateUser(): Promise<User> {
    throw new Error("updateUser no está implementado");
  }

  async deleteUser(): Promise<boolean> {
    throw new Error("deleteUser no está implementado");
  }

  async searchUsersByName(): Promise<User[]> {
    return [];
  }

  async getUsersPaginated(): Promise<User[]> {
    return [];
  }

  async isEmailAvailable(): Promise<boolean> {
    return false;
  }

  async isStudentIdAvailable(): Promise<boolean> {
    return false;
  }

  async isUsernameAvailable(): Promise<boolean> {
    return false;
  }

  isValidEmail(email: string): boolean {
    return email.includes("@");
  }

  isValidStudentId(studentId: string): boolean {
    return studentId.trim().length > 0;
  }

  isValidUsername(username: string): boolean {
    return username.trim().length > 0;
  }

  private async requireToken(): Promise<string> {
    if (!this.getAccessToken) {
      throw new Error("Access token no disponible");
    }
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error("Access token no disponible");
    }
    return token;
  }
}
