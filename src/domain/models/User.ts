export interface User {
  id: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  createdAt: string;
  isActive: boolean;
}

export const createEmptyUser = (): User => ({
  id: "",
  studentId: "",
  email: "",
  firstName: "",
  lastName: "",
  username: "",
  createdAt: new Date().toISOString(),
  isActive: true,
});
