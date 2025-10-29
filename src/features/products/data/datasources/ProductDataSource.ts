import { NewProduct, Product } from "../../domain/entities/Product";

export interface  ProductDataSource {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  addProduct(product: NewProduct): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
}

