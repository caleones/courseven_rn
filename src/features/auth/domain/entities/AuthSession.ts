import { AuthTokens } from "./AuthTokens";
import { AuthUser } from "./AuthUser";

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};
