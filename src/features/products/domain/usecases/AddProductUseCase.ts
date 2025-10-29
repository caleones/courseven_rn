import { NewProduct } from "../entities/Product";
import { ProductRepository } from "../repositories/ProductRepository";

export class AddProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(data: NewProduct): Promise<void> {
    return this.repo.addProduct(data);
  }
}
