export type Product = {
  _id: string;
  name: string;
  description: string;
  quantity: number;
};

export type NewProduct = Omit<Product, "_id">;