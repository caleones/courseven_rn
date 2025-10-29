import { Product } from "../entities/Product";
import { ProductRepository } from "../repositories/ProductRepository";

export class GetProductByIdUseCase {
  private repo: ProductRepository;

  constructor(repo: ProductRepository) {
    this.repo = repo;
  }

  async execute(id: string): Promise<Product | undefined> {
    return await this.repo.getProductById(id);
  }
}
