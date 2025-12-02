import { AuthSession } from "../entities/AuthSession";
import { VerifyEmailParams } from "../repositories/AuthRepository";
import { AuthLocalDataSource } from "../../data/datasources/AuthLocalDataSource";
import { AuthRemoteDataSource } from "../../data/datasources/AuthRemoteDataSource";

const extractFallbackUsername = (email: string) => {
  if (!email.includes("@")) return email;
  return email.split("@")[0];
};

export class VerifyEmailUseCase {
  constructor(
    private readonly remote: AuthRemoteDataSource,
    private readonly local: AuthLocalDataSource,
  ) {}

  async execute(params: VerifyEmailParams): Promise<AuthSession> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const verifyResponse = await this.remote.verifyEmail({
      email: normalizedEmail,
      code: params.code.trim(),
    });

    if (!verifyResponse.success) {
      throw new Error(verifyResponse.message ?? "No se pudo verificar el correo electrónico");
    }

    const authLogin = await this.remote.loginAuth({
      email: normalizedEmail,
      password: params.password,
    });

    const tempToken = authLogin.accessToken;
    if (!tempToken) {
      throw new Error("No se pudo completar la verificación de la cuenta");
    }

    try {
      await this.remote.createUserInDatabase({
        accessToken: tempToken,
        email: normalizedEmail,
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username ?? extractFallbackUsername(normalizedEmail),
        studentId: authLogin.user?._id ?? authLogin.user?.student_id,
      });
    } catch (error) {
      const maybeExisting = await this.remote.getUserByEmail({
        accessToken: tempToken,
        email: normalizedEmail,
      });

      if (!maybeExisting) {
        throw error instanceof Error ? error : new Error("Error creando el usuario en la base de datos");
      }
    }

    const finalLogin = await this.remote.login({
      identifier: normalizedEmail,
      password: params.password,
    });

    const session = {
      user: finalLogin.user,
      tokens: {
        accessToken: finalLogin.accessToken,
        refreshToken: finalLogin.refreshToken,
      },
    } as AuthSession;

    await this.local.saveSession(session, true);
    return session;
  }
}

export default VerifyEmailUseCase;
