import { ILocalPreferences } from "@/src/core/iLocalPreferences";
import { LocalPreferencesAsyncStorage } from "@/src/core/LocalPreferencesAsyncStorage";
import { AuthSession } from "../../domain/entities/AuthSession";
import { AuthTokens } from "../../domain/entities/AuthTokens";
import { AuthUser } from "../../domain/entities/AuthUser";

const TOKEN_KEY = "auth:accessToken";
const REFRESH_TOKEN_KEY = "auth:refreshToken";
const USER_KEY = "auth:user";
const KEEP_LOGGED_KEY = "auth:keepLoggedIn";

export type StoredSessionRecord = {
  session: AuthSession;
  keepLoggedIn: boolean;
};

export interface AuthLocalDataSource {
  saveSession(session: AuthSession, keepLoggedIn: boolean): Promise<void>;
  getSession(): Promise<StoredSessionRecord | null>;
  clearSession(): Promise<void>;
  updateTokens(tokens: AuthTokens): Promise<void>;
}

export class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  private readonly storage: ILocalPreferences;

  constructor(storage: ILocalPreferences = LocalPreferencesAsyncStorage.getInstance()) {
    this.storage = storage;
  }

  async saveSession(session: AuthSession, keepLoggedIn: boolean): Promise<void> {
    await Promise.all([
      this.storage.storeData(TOKEN_KEY, session.tokens.accessToken),
      this.storage.storeData(REFRESH_TOKEN_KEY, session.tokens.refreshToken ?? null),
      this.storage.storeData(USER_KEY, this.serializeUser(session.user)),
      this.storage.storeData(KEEP_LOGGED_KEY, keepLoggedIn),
    ]);
  }

  async getSession(): Promise<StoredSessionRecord | null> {
    const [accessToken, refreshToken, userRaw, keepLoggedIn] = await Promise.all([
      this.storage.retrieveData<string | null>(TOKEN_KEY),
      this.storage.retrieveData<string | null>(REFRESH_TOKEN_KEY),
      this.storage.retrieveData<string | null>(USER_KEY),
      this.storage.retrieveData<boolean | null>(KEEP_LOGGED_KEY),
    ]);

    if (!accessToken || !userRaw) {
      return null;
    }

    const keep = keepLoggedIn ?? false;
    const parsedUser = this.deserializeUser(userRaw);

    const session: AuthSession = {
      user: parsedUser,
      tokens: {
        accessToken,
        refreshToken: refreshToken ?? undefined,
      },
    };

    return { session, keepLoggedIn: keep };
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      this.storage.removeData(TOKEN_KEY),
      this.storage.removeData(REFRESH_TOKEN_KEY),
      this.storage.removeData(USER_KEY),
      this.storage.removeData(KEEP_LOGGED_KEY),
    ]);
  }

  async updateTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      this.storage.storeData(TOKEN_KEY, tokens.accessToken),
      this.storage.storeData(REFRESH_TOKEN_KEY, tokens.refreshToken ?? null),
    ]);
  }

  private serializeUser(user: AuthUser): string {
    return JSON.stringify({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
  }

  private deserializeUser(raw: string): AuthUser {
    const parsed = JSON.parse(raw) as AuthUser & { createdAt: string };
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
    };
  }
}
