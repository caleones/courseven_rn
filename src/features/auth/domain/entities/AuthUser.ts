export type AuthUser = {
  id: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  createdAt: Date;
  isActive: boolean;
};

export const createEmptyAuthUser = (): AuthUser => ({
  id: "",
  studentId: "",
  email: "",
  firstName: "",
  lastName: "",
  username: "",
  createdAt: new Date(0),
  isActive: true,
});
