import { ILocalPreferences } from "@/src/core/iLocalPreferences";
import { LocalPreferencesAsyncStorage } from "@/src/core/LocalPreferencesAsyncStorage";
import { AuthRemoteDataSourceImpl } from "@/src/features/auth/data/datasources/AuthRemoteDataSourceImp";
import { NewProduct, Product } from "../../domain/entities/Product";
import { ProductDataSource } from "./ProductDataSource";

const ACCESS_TOKEN_KEY = "auth:accessToken";
const REFRESH_TOKEN_KEY = "auth:refreshToken";

export class ProductRemoteDataSourceImp implements ProductDataSource {
  private readonly projectId: string;
  private readonly baseUrl: string;
  private readonly table = "Product";

  private prefs: ILocalPreferences;

  constructor(
    private authService: AuthRemoteDataSourceImpl,
    projectId = process.env.EXPO_PUBLIC_ROBLE_PROJECT_ID
  ) {
    if (!projectId) {
      throw new Error("Missing EXPO_PUBLIC_ROBLE_PROJECT_ID env var");
    }
    this.prefs = LocalPreferencesAsyncStorage.getInstance();
    this.projectId = projectId;
    this.baseUrl = `https://roble-api.openlab.uninorte.edu.co/database/${this.projectId}`;
  }

  private async authorizedFetch(
    url: string,
    options: RequestInit,
    retry = true
  ): Promise<Response> {
    const token = await this.prefs.retrieveData<string | null>(ACCESS_TOKEN_KEY);
    const headers = new Headers(options.headers as HeadersInit | undefined);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && retry) {
      console.warn("401 detected, trying to refresh token…");
      try {
        const refreshToken = await this.prefs.retrieveData<string | null>(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error("Missing refresh token for retry");
        }
        const refreshed = await this.authService.refreshToken(refreshToken);
        if (refreshed?.accessToken) {
          await Promise.all([
            this.prefs.storeData(ACCESS_TOKEN_KEY, refreshed.accessToken),
            this.prefs.storeData(
              REFRESH_TOKEN_KEY,
              refreshed.refreshToken ?? refreshToken
            ),
          ]);
          const newToken = await this.prefs.retrieveData<string | null>(ACCESS_TOKEN_KEY);
          const retryHeaders = new Headers(options.headers as HeadersInit | undefined);
          if (newToken) {
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
          } else {
            retryHeaders.delete("Authorization");
          }
          return await fetch(url, {
            ...options,
            headers: retryHeaders,
          });
        }
      } catch (e) {
        console.warn("Token refresh failed, forcing logout", e);
        // Here you might trigger logout context/state
      }
    }

    return response;
  }


  async getProducts(): Promise<Product[]> {
    const url = `${this.baseUrl}/read?tableName=${this.table}`;

    const response = await this.authorizedFetch(url, { method: "GET" });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized (token issue)");
      }
      throw new Error(`Error fetching products: ${response.status}`);
    }

    const data = await response.json();

    // Here we assume the API returns a valid Product[]
    return data as Product[];
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const url = `${this.baseUrl}/read?tableName=${this.table}&_id=${id}`;

    const response = await this.authorizedFetch(url, { method: "GET" });

    if (response.status === 200) {
      const data: Product[] = await response.json();
      return data.length > 0 ? data[0] : undefined;
    } else if (response.status === 401) {
      throw new Error("Unauthorized (token issue)");
    } else {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Error fetching product by id: ${response.status} - ${
          errorBody.message ?? "Unknown error"
        }`
      );
    }
  }
  async addProduct(product: NewProduct): Promise<void> {
    const url = `${this.baseUrl}/insert`;

    const body = JSON.stringify({
      tableName: this.table,
      records: [product], // 👈 the API expects an array of records
    });

    const response = await this.authorizedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.status === 201) {
      return Promise.resolve();
    } else if (response.status === 401) {
      throw new Error("Unauthorized (token issue)");
    } else {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Error adding product: ${response.status} - ${
          errorBody.message ?? "Unknown error"
        }`
      );
    }
  }

  async updateProduct(product: Product): Promise<void> {
    const url = `${this.baseUrl}/update`;

    const { _id, ...updates } = product; // 👈 separate id from fields

    const body = JSON.stringify({
      tableName: this.table,
      idColumn: "_id",
      idValue: _id,
      updates,
    });

    const response = await this.authorizedFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.status === 200) {
      return Promise.resolve();
    } else if (response.status === 401) {
      throw new Error("Unauthorized (token issue)");
    } else {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Error updating product: ${response.status} - ${
          errorBody.message ?? "Unknown error"
        }`
      );
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const url = `${this.baseUrl}/delete`;

    const body = JSON.stringify({
      tableName: this.table,
      idColumn: "_id",
      idValue: id,
    });

    const response = await this.authorizedFetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.status === 200) {
      return Promise.resolve();
    } else if (response.status === 401) {
      throw new Error("Unauthorized (token issue)");
    } else {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Error deleting product: ${response.status} - ${
          errorBody.message ?? "Unknown error"
        }`
      );
    }
  }
}
