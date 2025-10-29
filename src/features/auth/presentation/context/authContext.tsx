import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { AuthUser } from "../../domain/entities/AuthUser";
import { CheckEmailAvailabilityUseCase } from "../../domain/usecases/CheckEmailAvailabilityUseCase";
import { CheckUsernameAvailabilityUseCase } from "../../domain/usecases/CheckUsernameAvailabilityUseCase";
import { ExtractResetTokenUseCase } from "../../domain/usecases/ExtractResetTokenUseCase";
import { GetCurrentUserUseCase } from "../../domain/usecases/GetCurrentUserUseCase";
import { LoginUseCase } from "../../domain/usecases/LoginUseCase";
import { LogoutUseCase } from "../../domain/usecases/LogoutUseCase";
import { RequestPasswordResetUseCase } from "../../domain/usecases/RequestPasswordResetUseCase";
import { ResetPasswordUseCase } from "../../domain/usecases/ResetPasswordUseCase";
import { SignupUseCase } from "../../domain/usecases/SignupUseCase";
import { ValidateResetTokenUseCase } from "../../domain/usecases/ValidateResetTokenUseCase";
import { VerifyEmailUseCase } from "../../domain/usecases/VerifyEmailUseCase";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthContextType = {
  status: AuthStatus;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (params: { identifier: string; password: string; keepLoggedIn: boolean }) => Promise<void>;
  signup: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  }) => Promise<{ message: string }>;
  verifyEmail: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
    code: string;
  }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  validateResetToken: (token: string) => Promise<boolean>;
  resetPassword: (params: { token: string; newPassword: string }) => Promise<{ message: string }>;
  extractResetToken: (url: string) => string | null;
  checkEmailAvailability: (email: string) => Promise<boolean>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const di = useDI();

  const {
    loginUseCase,
    signupUseCase,
    verifyEmailUseCase,
    logoutUseCase,
    getCurrentSessionUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    validateResetTokenUseCase,
    extractResetTokenUseCase,
    checkEmailAvailabilityUseCase,
    checkUsernameAvailabilityUseCase,
  } = useMemo(() => ({
    loginUseCase: di.resolve<LoginUseCase>(TOKENS.LoginUC),
    signupUseCase: di.resolve<SignupUseCase>(TOKENS.SignupUC),
    verifyEmailUseCase: di.resolve<VerifyEmailUseCase>(TOKENS.VerifyEmailUC),
    logoutUseCase: di.resolve<LogoutUseCase>(TOKENS.LogoutUC),
    getCurrentSessionUseCase: di.resolve<GetCurrentUserUseCase>(TOKENS.GetCurrentUserUC),
    requestPasswordResetUseCase: di.resolve<RequestPasswordResetUseCase>(TOKENS.RequestPasswordResetUC),
    resetPasswordUseCase: di.resolve<ResetPasswordUseCase>(TOKENS.ResetPasswordUC),
    validateResetTokenUseCase: di.resolve<ValidateResetTokenUseCase>(TOKENS.ValidateResetTokenUC),
    extractResetTokenUseCase: di.resolve<ExtractResetTokenUseCase>(TOKENS.ExtractResetTokenUC),
    checkEmailAvailabilityUseCase: di.resolve<CheckEmailAvailabilityUseCase>(TOKENS.CheckEmailAvailabilityUC),
    checkUsernameAvailabilityUseCase: di.resolve<CheckUsernameAvailabilityUseCase>(TOKENS.CheckUsernameAvailabilityUC),
  }), [di]);

  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await getCurrentSessionUseCase.execute();
        if (!mounted) return;
        if (session) {
          setUser(session.user);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error cargando la sesión");
        setStatus("unauthenticated");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getCurrentSessionUseCase]);

  const runWithLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ha ocurrido un error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async ({ identifier, password, keepLoggedIn }: { identifier: string; password: string; keepLoggedIn: boolean }) => {
      const session = await runWithLoading(() =>
        loginUseCase.execute({ identifier, password, keepLoggedIn }),
      );
      setUser(session.user);
      setStatus("authenticated");
    },
    [loginUseCase, runWithLoading],
  );

  const signup = useCallback((params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  }) =>
    runWithLoading(() =>
      signupUseCase.execute({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username,
      }),
    ),
    [runWithLoading, signupUseCase],
  );

  const verifyEmail = useCallback(async (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
    code: string;
  }) => {
    const session = await runWithLoading(() =>
      verifyEmailUseCase.execute({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username,
        code: params.code,
      }),
    );
    setUser(session.user);
    setStatus("authenticated");
  }, [runWithLoading, verifyEmailUseCase]);

  const requestPasswordReset = useCallback(
    (email: string) => runWithLoading(() => requestPasswordResetUseCase.execute(email)),
    [requestPasswordResetUseCase, runWithLoading],
  );

  const validateResetToken = useCallback(
    (token: string) => runWithLoading(() => validateResetTokenUseCase.execute(token)),
    [runWithLoading, validateResetTokenUseCase],
  );

  const resetPassword = useCallback(
    (params: { token: string; newPassword: string }) =>
      runWithLoading(() => resetPasswordUseCase.execute(params)),
    [resetPasswordUseCase, runWithLoading],
  );

  const extractResetToken = useCallback(
    (url: string) => extractResetTokenUseCase.execute(url),
    [extractResetTokenUseCase],
  );

  const checkEmailAvailability = useCallback(
    (email: string) => checkEmailAvailabilityUseCase.execute(email),
    [checkEmailAvailabilityUseCase],
  );

  const checkUsernameAvailability = useCallback(
    (username: string) => checkUsernameAvailabilityUseCase.execute(username),
    [checkUsernameAvailabilityUseCase],
  );

  const logout = useCallback(async () => {
    await runWithLoading(() => logoutUseCase.execute());
    setUser(null);
    setStatus("unauthenticated");
  }, [logoutUseCase, runWithLoading]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextType>(
    () => ({
      status,
      user,
      loading,
      error,
      login,
      signup,
      verifyEmail,
      requestPasswordReset,
      validateResetToken,
      resetPassword,
      extractResetToken,
      checkEmailAvailability,
      checkUsernameAvailability,
      logout,
      clearError,
    }),
    [
      status,
      user,
      loading,
      error,
      login,
      signup,
      verifyEmail,
      requestPasswordReset,
      validateResetToken,
      resetPassword,
      extractResetToken,
      checkEmailAvailability,
      checkUsernameAvailability,
      logout,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
