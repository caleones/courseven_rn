import { ProductRepository } from "../repositories/ProductRepository";

export class DeleteProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.deleteProduct(id);
  }
}
