import VerifyEmailUseCase from "../VerifyEmailUseCase";

describe("VerifyEmailUseCase", () => {
  it("performs verification and saves session on success", async () => {
    const mockRemote: any = {
      verifyEmail: async ({ email, code }: any) => ({ success: true }),
      loginAuth: async ({ email, password }: any) => ({ accessToken: "tmp", user: { _id: "u1" } }),
      createUserInDatabase: async (_: any) => ({}),
      getUserByEmail: async (_: any) => null,
      login: async ({ identifier, password }: any) => ({
        accessToken: "a1",
        refreshToken: "r1",
        user: { _id: "u1", email: identifier },
      }),
    };

    let savedSession: any = null;
    const mockLocal: any = {
      saveSession: async (session: any, keep: boolean) => { savedSession = { session, keep }; },
      getSession: async () => null,
    };

    const uc = new VerifyEmailUseCase(mockRemote, mockLocal);

    const params = {
      email: "test@example.com",
      code: "1234",
      password: "pass",
      firstName: "First",
      lastName: "Last",
    } as any;

    const result = await uc.execute(params);

    expect(result).toBeDefined();
    expect(savedSession).not.toBeNull();
    expect(savedSession.keep).toBe(true);
    expect(savedSession.session.tokens.accessToken).toBe("a1");
  });
});
