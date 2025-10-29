import {
    AuthRemoteDataSource,
    LoginRemoteResponse,
    RawRobleUser,
    ResetPasswordRemoteResponse,
    SignupRemoteResponse,
    VerifyEmailRemoteResponse,
} from "./AuthRemoteDataSource";

type RobleConfig = {
  authBaseUrl: string;
  databaseBaseUrl: string;
  databaseName: string;
  readonlyEmail?: string;
  readonlyPassword?: string;
};

const DEFAULT_AUTH_URL = "https://roble-api.openlab.uninorte.edu.co/auth";
const DEFAULT_DATABASE_URL = "https://roble-api.openlab.uninorte.edu.co/database";
const DEFAULT_DB_NAME = "courseven_66a52df881";

const ensureNoTrailingSlash = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const normaliseDatabaseUrl = (value: string) => {
  const trimmed = ensureNoTrailingSlash(value.trim());
  const segment = "/database";
  if (trimmed.endsWith(segment)) {
    return trimmed;
  }
  if (trimmed.includes(segment)) {
    return trimmed.slice(0, trimmed.indexOf(segment) + segment.length);
  }
  return `${trimmed}${segment}`;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON response from ROBLE API");
  }
};

export class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  private readonly config: RobleConfig;

  constructor(config: Partial<RobleConfig> = {}) {
    const envAuth = process.env.EXPO_PUBLIC_ROBLE_AUTH_BASE_URL;
    const envDbUrl = process.env.EXPO_PUBLIC_ROBLE_DB_BASE_URL;
    const envDbName =
      process.env.EXPO_PUBLIC_ROBLE_DB_NAME ??
      process.env.EXPO_PUBLIC_ROBLE_PROJECT_ID;
    const envReadonlyEmail = process.env.EXPO_PUBLIC_ROBLE_READONLY_EMAIL;
    const envReadonlyPassword = process.env.EXPO_PUBLIC_ROBLE_READONLY_PASSWORD;

    const merged: RobleConfig = {
      authBaseUrl: ensureNoTrailingSlash(
        config.authBaseUrl ?? envAuth ?? DEFAULT_AUTH_URL,
      ),
      databaseBaseUrl: normaliseDatabaseUrl(
        config.databaseBaseUrl ?? envDbUrl ?? DEFAULT_DATABASE_URL,
      ),
      databaseName: config.databaseName ?? envDbName ?? DEFAULT_DB_NAME,
      readonlyEmail: config.readonlyEmail ?? envReadonlyEmail,
      readonlyPassword: config.readonlyPassword ?? envReadonlyPassword,
    };

    if (!merged.databaseName) {
      throw new Error("Missing ROBLE database name configuration");
    }

    this.config = merged;
  }

  async login({ identifier, password }: { identifier: string; password: string }): Promise<LoginRemoteResponse> {
    const cleanedIdentifier = identifier.trim();
    const email = cleanedIdentifier.includes("@")
      ? cleanedIdentifier.toLowerCase()
      : await this.getEmailFromUsername(cleanedIdentifier);

    if (!email) {
      throw new Error("Usuario no encontrado");
    }

    const authResult = await this.loginAuth({ email, password });
    const accessToken = authResult.accessToken;

    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso");
    }

    const user = await this.getUserByEmail({ accessToken, email });
    if (!user) {
      throw new Error("No se pudieron cargar los datos del usuario");
    }

    return {
      accessToken,
      refreshToken: authResult.refreshToken,
      user,
    };
  }

  async signup({ email, password, name }: { email: string; password: string; name: string }): Promise<SignupRemoteResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      },
    );

    if (response.status === 200 || response.status === 201) {
      const data = await parseJson<{ message?: string }>(response);
      return { message: data.message ?? "Registro exitoso" };
    }

    const error = await parseJson<{ message?: string }>(response);
    throw new Error(error.message ?? "Error en registro");
  }

  async verifyEmail({ email, code }: { email: string; code: string }): Promise<VerifyEmailRemoteResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/verify-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      },
    );

    const data = await parseJson<{ success?: boolean; message?: string }>(response);

    if (response.status === 200 || response.status === 201) {
      return {
        success: data.success ?? true,
        message: data.message,
      };
    }

    throw new Error(data.message ?? "Código de verificación inválido");
  }

  async loginAuth({ email, password }: { email: string; password: string }): Promise<{ accessToken: string; refreshToken?: string; user?: RawRobleUser }> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const data = await parseJson<{
      accessToken?: string;
      refreshToken?: string;
      user?: RawRobleUser;
      message?: string;
    }>(response);

    if (response.status === 200 || response.status === 201) {
      if (!data.accessToken) {
        throw new Error("Respuesta inválida del servicio de autenticación");
      }
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      };
    }

    throw new Error(data.message ?? "Error en login");
  }

  async createUserInDatabase({
    accessToken,
    email,
    firstName,
    lastName,
    username,
    studentId,
  }: {
    accessToken: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    studentId?: string;
  }): Promise<void> {
    const response = await fetch(
      `${this.config.databaseBaseUrl}/${this.config.databaseName}/insert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tableName: "users",
          records: [
            {
              email,
              first_name: firstName,
              last_name: lastName,
              username,
              student_id: studentId ?? "",
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      },
    );

    if (response.status === 200 || response.status === 201) {
      return;
    }

    const data = await parseJson<{ message?: string }>(response);
    throw new Error(data.message ?? "No se pudo crear el usuario en la base de datos");
  }

  async getUserByEmail({ accessToken, email }: { accessToken: string; email: string }): Promise<RawRobleUser | null> {
    const response = await fetch(
      `${this.config.databaseBaseUrl}/${this.config.databaseName}/read?tableName=users&email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 200) {
      const data = await parseJson<RawRobleUser[] | Record<string, unknown>>(response);
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return null;
    }

    if (response.status === 404) {
      return null;
    }

    const error = await parseJson<{ message?: string }>(response);
    throw new Error(error.message ?? "Error consultando usuario en base de datos");
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );

    const data = await parseJson<{ message?: string }>(response);

    if (response.status === 200 || response.status === 201) {
      return { message: data.message ?? "Se envió un enlace al correo electrónico" };
    }

    throw new Error(data.message ?? "Error solicitando restablecimiento de contraseña");
  }

  async validateResetToken(token: string): Promise<boolean> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword: "" }),
      },
    );

    if (response.status === 200 || response.status === 201) {
      return true;
    }

    if (response.status === 400) {
      const data = await parseJson<{ message?: string }>(response);
      const message = data.message?.toLowerCase() ?? "";
      if (message.includes("password") || message.includes("contr")) {
        return true;
      }
      if (message.includes("token") || message.includes("expired")) {
        return false;
      }
    }

    return false;
  }

  async resetPassword({ token, newPassword }: { token: string; newPassword: string }): Promise<ResetPasswordRemoteResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      },
    );

    const data = await parseJson<{ message?: string }>(response);

    if (response.status === 200 || response.status === 201) {
      return { message: data.message ?? "Contraseña restablecida correctamente" };
    }

    throw new Error(data.message ?? "Error restableciendo la contraseña");
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    const token = await this.getTempAccessToken();
    const response = await fetch(
      `${this.config.databaseBaseUrl}/${this.config.databaseName}/read?tableName=users&email=${encodeURIComponent(
        email.trim().toLowerCase(),
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200) {
      const data = await parseJson<RawRobleUser[] | Record<string, unknown>>(response);
      if (Array.isArray(data)) {
        return data.length === 0;
      }
      return true;
    }

    return false;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const token = await this.getTempAccessToken();
    const response = await fetch(
      `${this.config.databaseBaseUrl}/${this.config.databaseName}/read?tableName=users&username=${encodeURIComponent(
        username.trim(),
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200) {
      const data = await parseJson<RawRobleUser[] | Record<string, unknown>>(response);
      if (Array.isArray(data)) {
        return data.length === 0;
      }
      return true;
    }

    return false;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
    const response = await fetch(`${this.config.authBaseUrl}/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.status === 200) {
      const data = await parseJson<{ accessToken?: string; refreshToken?: string }>(response);
      if (data.accessToken) {
        return {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      }
    }

    return null;
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    if (!accessToken) {
      return false;
    }

    const response = await fetch(
      `${this.config.authBaseUrl}/${this.config.databaseName}/verify-token`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 200) {
      return true;
    }

    return false;
  }

  async logout(accessToken: string): Promise<void> {
    if (!accessToken) {
      return;
    }

    await fetch(`${this.config.authBaseUrl}/${this.config.databaseName}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private async getTempAccessToken(): Promise<string> {
    if (!this.config.readonlyEmail || !this.config.readonlyPassword) {
      throw new Error(
        "Faltan las credenciales de solo lectura (EXPO_PUBLIC_ROBLE_READONLY_EMAIL / PASSWORD)",
      );
    }

    const auth = await this.loginAuth({
      email: this.config.readonlyEmail,
      password: this.config.readonlyPassword,
    });

    if (!auth.accessToken) {
      throw new Error("No se pudo obtener token temporal");
    }

    return auth.accessToken;
  }

  private async getEmailFromUsername(username: string): Promise<string | null> {
    const token = await this.getTempAccessToken();
    const response = await fetch(
      `${this.config.databaseBaseUrl}/${this.config.databaseName}/read?tableName=users&username=${encodeURIComponent(
        username,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200) {
      const data = await parseJson<RawRobleUser[] | Record<string, unknown>>(response);
      if (Array.isArray(data) && data.length > 0) {
        const candidate = data[0];
        return (candidate.email ?? "").toString();
      }
    }

    return null;
  }
}
