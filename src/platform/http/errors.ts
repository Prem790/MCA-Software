export class ApplicationError extends Error {
  constructor(
    readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "SERVICE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
