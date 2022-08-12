export class OrderSideCollisionError extends Error {
  constructor(message: string, options?: any) {
    super(message, options);
    this.name = "OrderSideCollisionError";
  }
}
