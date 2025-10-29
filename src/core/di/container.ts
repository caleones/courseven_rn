export class Container {
  private singletons = new Map<symbol, unknown>();
  register<T>(token: symbol, instance: T) {
    this.singletons.set(token, instance);
    return this;
  }
  resolve<T>(token: symbol): T {
    const v = this.singletons.get(token);
    if (!v) throw new Error(`No provider for ${String(token)}`);
    return v as T;
  }
}
