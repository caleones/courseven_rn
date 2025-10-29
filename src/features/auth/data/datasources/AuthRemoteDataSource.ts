export type RawRobleUser = {
  _id?: string;
  student_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  created_at?: string;
  is_active?: boolean;
};

export type LoginRemoteResponse = {
  accessToken: string;
  refreshToken?: string;
  user: RawRobleUser;
};

export type SignupRemoteResponse = {
  message: string;
};

export type VerifyEmailRemoteResponse = {
  success: boolean;
  message?: string;
};

export type ResetPasswordRemoteResponse = {
  message: string;
};

export interface AuthRemoteDataSource {
  login(params: { identifier: string; password: string }): Promise<LoginRemoteResponse>;
  signup(params: { email: string; password: string; name: string }): Promise<SignupRemoteResponse>;
  verifyEmail(params: { email: string; code: string }): Promise<VerifyEmailRemoteResponse>;
  loginAuth(params: { email: string; password: string }): Promise<{ accessToken: string; refreshToken?: string; user?: RawRobleUser }>;
  createUserInDatabase(params: {
    accessToken: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    studentId?: string;
  }): Promise<void>;
  getUserByEmail(params: { accessToken: string; email: string }): Promise<RawRobleUser | null>;
  requestPasswordReset(email: string): Promise<{ message: string }>;
  validateResetToken(token: string): Promise<boolean>;
  resetPassword(params: { token: string; newPassword: string }): Promise<ResetPasswordRemoteResponse>;
  checkEmailAvailability(email: string): Promise<boolean>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null>;
  verifyToken(accessToken: string): Promise<boolean>;
  logout(accessToken: string): Promise<void>;
}