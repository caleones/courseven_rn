import { Product } from "../entities/Product";
import { ProductRepository } from "../repositories/ProductRepository";

export class GetProductsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(): Promise<Product[]> {
    return this.repo.getProducts();
  }
}
