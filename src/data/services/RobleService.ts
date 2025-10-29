type QueryValue = string | number | boolean | undefined | null;

type RobleConfig = {
  authBaseUrl: string;
  databaseBaseUrl: string;
  databaseName: string;
  readonlyEmail?: string;
  readonlyPassword?: string;
};

type InsertResponse = Record<string, unknown>;
type UpdateResponse = Record<string, unknown>;
type RecordPayload = Record<string, unknown>;

type TokenCache = {
  token: string;
  expiresAt: number;
};

const DEFAULT_AUTH_URL = "https://roble-api.openlab.uninorte.edu.co/auth";
const DEFAULT_DATABASE_URL = "https://roble-api.openlab.uninorte.edu.co/database";
const DEFAULT_DB_NAME = "courseven_66a52df881";
const TEMP_TOKEN_TTL_MS = 5 * 60 * 1000;
const DATABASE_SEGMENT = "/database";

const ensureNoTrailingSlash = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const normaliseDatabaseUrl = (value: string) => {
  const trimmed = ensureNoTrailingSlash(value.trim());
  if (trimmed.endsWith(DATABASE_SEGMENT)) {
    return trimmed;
  }
  if (trimmed.includes(DATABASE_SEGMENT)) {
    return trimmed.slice(0, trimmed.indexOf(DATABASE_SEGMENT) + DATABASE_SEGMENT.length);
  }
  return `${trimmed}${DATABASE_SEGMENT}`;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Respuesta inválida del servicio ROBLE");
  }
};

const toQueryParamValue = (value: QueryValue): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

const buildQueryString = (input: Record<string, QueryValue> = {}) => {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(input)) {
    const value = toQueryParamValue(rawValue);
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
};

export class RobleService {
  private readonly config: RobleConfig;
  private readonly databaseFallbackBase: string;
  private tempTokenCache: TokenCache | null = null;
  private pendingTempToken?: Promise<string>;

  constructor(config: Partial<RobleConfig> = {}) {
    const envAuth = process.env.EXPO_PUBLIC_ROBLE_AUTH_BASE_URL;
    const envDbUrl = process.env.EXPO_PUBLIC_ROBLE_DB_BASE_URL;
    const envDbName =
      process.env.EXPO_PUBLIC_ROBLE_DB_NAME ?? process.env.EXPO_PUBLIC_ROBLE_PROJECT_ID;
    const envReadonlyEmail = process.env.EXPO_PUBLIC_ROBLE_READONLY_EMAIL;
    const envReadonlyPassword = process.env.EXPO_PUBLIC_ROBLE_READONLY_PASSWORD;

    const merged: RobleConfig = {
      authBaseUrl: ensureNoTrailingSlash(config.authBaseUrl ?? envAuth ?? DEFAULT_AUTH_URL),
      databaseBaseUrl: normaliseDatabaseUrl(
        config.databaseBaseUrl ?? envDbUrl ?? DEFAULT_DATABASE_URL,
      ),
      databaseName: config.databaseName ?? envDbName ?? DEFAULT_DB_NAME,
      readonlyEmail: config.readonlyEmail ?? envReadonlyEmail,
      readonlyPassword: config.readonlyPassword ?? envReadonlyPassword,
    };

    if (!merged.databaseName) {
      throw new Error("Falta la configuración del nombre de la base de datos ROBLE");
    }

    this.config = merged;
    this.databaseFallbackBase = merged.databaseBaseUrl.endsWith(DATABASE_SEGMENT)
      ? merged.databaseBaseUrl.slice(0, -DATABASE_SEGMENT.length)
      : merged.databaseBaseUrl;
  }

  async readCourses(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "courses",
      query: params.query,
    });
  }

  async readCoursesByTeacher(params: {
    accessToken: string;
    teacherId: string;
    limit?: number;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "courses",
      query: {
        teacher_id: params.teacherId,
        _limit: params.limit,
      },
    });
  }

  async readCoursesByJoinCode(params: {
    accessToken: string;
    joinCode: string;
  }): Promise<RecordPayload[]> {
    return this.readCourses({
      accessToken: params.accessToken,
      query: { join_code: params.joinCode },
    });
  }

  async insertCourse(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "courses",
      records: [params.record],
    });
  }

  async updateCourse(params: {
    accessToken: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    return this.updateRow({
      accessToken: params.accessToken,
      table: "courses",
      id: params.id,
      updates: params.updates,
    });
  }

  async readEnrollments(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "enrollments",
      query: params.query,
    });
  }

  async readUsers(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "users",
      query: params.query,
    });
  }

  async insertEnrollment(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "enrollments",
      records: [params.record],
    });
  }

  async readCategories(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "categories",
      query: params.query,
    });
  }

  async insertCategory(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "categories",
      records: [params.record],
    });
  }

  async updateCategory(params: {
    accessToken: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    return this.updateRow({
      accessToken: params.accessToken,
      table: "categories",
      id: params.id,
      updates: params.updates,
    });
  }

  async readGroups(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "groups",
      query: params.query,
    });
  }

  async insertGroup(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "groups",
      records: [params.record],
    });
  }

  async updateGroup(params: {
    accessToken: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    return this.updateRow({
      accessToken: params.accessToken,
      table: "groups",
      id: params.id,
      updates: params.updates,
    });
  }

  async readActivities(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "activities",
      query: params.query,
    });
  }

  async insertActivity(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "activities",
      records: [params.record],
    });
  }

  async updateActivity(params: {
    accessToken: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    return this.updateRow({
      accessToken: params.accessToken,
      table: "activities",
      id: params.id,
      updates: params.updates,
    });
  }

  async readMemberships(params: {
    accessToken: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    return this.readTable({
      accessToken: params.accessToken,
      table: "memberships",
      query: params.query,
    });
  }

  async insertMembership(params: {
    accessToken: string;
    record: RecordPayload;
  }): Promise<InsertResponse> {
    return this.insertRecords({
      accessToken: params.accessToken,
      table: "memberships",
      records: [params.record],
    });
  }

  async updateMembership(params: {
    accessToken: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    return this.updateRow({
      accessToken: params.accessToken,
      table: "memberships",
      id: params.id,
      updates: params.updates,
    });
  }

  async updateRow(params: {
    accessToken: string;
    table: string;
    id: string;
    updates: RecordPayload;
  }): Promise<UpdateResponse> {
    const payload = {
      tableName: params.table,
      idColumn: "_id",
      idValue: params.id,
      updates: params.updates,
    };

    const primaryUrl = `${this.config.databaseBaseUrl}/${this.config.databaseName}/update`;
    const fallbackUrl = `${this.databaseFallbackBase}/${this.config.databaseName}/update`;

    const headers = this.authHeaders(params.accessToken);
    const first = await this.fetchJson<UpdateResponse>(primaryUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    if (first.status === 200 || first.status === 201) {
      return first.data;
    }

    if (first.status === 404 && fallbackUrl !== primaryUrl) {
      const retry = await this.fetchJson<UpdateResponse>(fallbackUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (retry.status === 200 || retry.status === 201) {
        return retry.data;
      }
      throw this.buildDbError(params.table, retry.status, retry.data);
    }

    throw this.buildDbError(params.table, first.status, first.data);
  }

  async readTable(params: {
    accessToken: string;
    table: string;
    query?: Record<string, QueryValue>;
  }): Promise<RecordPayload[]> {
    const query = buildQueryString({ tableName: params.table, ...params.query });
    const url = `${this.config.databaseBaseUrl}/${this.config.databaseName}/read${query}`;

    const response = await this.fetchJson<unknown>(url, {
      method: "GET",
      headers: this.authHeaders(params.accessToken),
    });

    if (response.status === 200) {
      const data = response.data;
      if (Array.isArray(data)) {
        return data as RecordPayload[];
      }
      return [];
    }

    throw this.buildDbError(params.table, response.status, response.data);
  }

  async insertRecords(params: {
    accessToken: string;
    table: string;
    records: RecordPayload[];
  }): Promise<InsertResponse> {
    const url = `${this.config.databaseBaseUrl}/${this.config.databaseName}/insert`;
    const payload = {
      tableName: params.table,
      records: params.records,
    };

    const response = await this.fetchJson<InsertResponse>(url, {
      method: "POST",
      headers: this.authHeaders(params.accessToken),
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 201) {
      return response.data;
    }

    throw this.buildDbError(params.table, response.status, response.data);
  }

  async loginAuth(params: { email: string; password: string }): Promise<{
    accessToken?: string;
    refreshToken?: string;
    user?: Record<string, unknown>;
  }> {
    const url = `${this.config.authBaseUrl}/${this.config.databaseName}/login`;
    const response = await this.fetchJson<Record<string, unknown>>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
      }),
    });

    if (response.status === 200 || response.status === 201) {
      return response.data ?? {};
    }

    throw new Error(this.extractErrorMessage(response.data) ?? "Error en login auth");
  }

  async getTempAccessToken(): Promise<string> {
    const cached = this.tempTokenCache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    if (this.pendingTempToken) {
      return this.pendingTempToken;
    }

    if (!this.config.readonlyEmail || !this.config.readonlyPassword) {
      throw new Error(
        "Faltan credenciales de solo lectura (EXPO_PUBLIC_ROBLE_READONLY_EMAIL / PASSWORD)",
      );
    }

    this.pendingTempToken = this.loginAuth({
      email: this.config.readonlyEmail,
      password: this.config.readonlyPassword,
    })
      .then((auth) => {
        if (!auth.accessToken) {
          throw new Error("No se pudo obtener token temporal");
        }
        this.tempTokenCache = {
          token: auth.accessToken,
          expiresAt: Date.now() + TEMP_TOKEN_TTL_MS,
        };
        return auth.accessToken;
      })
      .finally(() => {
        this.pendingTempToken = undefined;
      });

    return this.pendingTempToken;
  }

  private authHeaders(accessToken: string) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<{
    status: number;
    data: T;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      const data = await parseJson<T>(response);
      return { status: response.status, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildDbError(
    table: string,
    status: number,
    data: unknown,
  ): Error {
    const base = `Error en base de datos (${table}) - status ${status}`;
    const detail = this.extractErrorMessage(data);
    return new Error(detail ? `${base}: ${detail}` : base);
  }

  private extractErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== "object") {
      return null;
    }
    if ("message" in data && typeof data.message === "string") {
      return data.message;
    }
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }
    return null;
  }
}
