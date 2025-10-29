export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  EmailVerification: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  };
  ForgotPassword: undefined;
  ResetPassword: undefined;
  PasswordResetSuccess: undefined;
};
