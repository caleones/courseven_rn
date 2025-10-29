import { Category } from "../models/Category";

export interface CategoryRepository {
  getCategoryById(categoryId: string): Promise<Category | null>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<Category>;
  getCategoriesByCourse(courseId: string): Promise<Category[]>;
  getCategoriesByTeacher(teacherId: string): Promise<Category[]>;
  updateCategory(category: Category): Promise<Category>;
  deleteCategory(categoryId: string): Promise<boolean>;
  searchCategoriesByName(name: string): Promise<Category[]>;
  getActiveCategories(): Promise<Category[]>;
  getCategoriesOrdered(): Promise<Category[]>;
  updateCategoriesOrder(categoryIds: string[]): Promise<boolean>;
  isCategoryNameAvailable(name: string): Promise<boolean>;
}
