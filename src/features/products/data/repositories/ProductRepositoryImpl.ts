import { NewProduct, Product } from "../../domain/entities/Product";
import { ProductRepository } from "../../domain/repositories/ProductRepository";
import { ProductDataSource } from "../datasources/ProductDataSource";


export class ProductRepositoryImpl implements ProductRepository {
  constructor(private local: ProductDataSource) {}

  async getProducts(): Promise<Product[]> {
    return this.local.getProducts();
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.local.getProductById(id);
  }

  async addProduct(product: NewProduct): Promise<void> {
    return this.local.addProduct(product);
  }

  async updateProduct(product: Product): Promise<void> {
    return this.local.updateProduct(product);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.local.deleteProduct(id);
  }


}
