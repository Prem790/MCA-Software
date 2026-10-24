export class ApplicationError extends Error {
  constructor(
    readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "RATE_LIMITED"
      | "SERVICE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
