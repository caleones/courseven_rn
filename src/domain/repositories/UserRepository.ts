import { User } from "../models/User";

type PaginatedUserParams = {
  page?: number;
  limit?: number;
};

export interface UserRepository {
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByStudentId(studentId: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(user: User): Promise<User>;
  deleteUser(userId: string): Promise<boolean>;
  searchUsersByName(name: string): Promise<User[]>;
  getUsersPaginated(params?: PaginatedUserParams): Promise<User[]>;
  isEmailAvailable(email: string): Promise<boolean>;
  isStudentIdAvailable(studentId: string): Promise<boolean>;
  isUsernameAvailable(username: string): Promise<boolean>;
  isValidEmail(email: string): boolean;
  isValidStudentId(studentId: string): boolean;
  isValidUsername(username: string): boolean;
}
