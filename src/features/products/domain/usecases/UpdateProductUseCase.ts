import { Product } from "../entities/Product";
import { ProductRepository } from "../repositories/ProductRepository";

export class UpdateProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(product: Product): Promise<void> {
    return this.repo.updateProduct(product);
  }
}
