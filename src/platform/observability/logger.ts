// Keep log payloads closed: raw exceptions, URLs, request bodies, and tokens are never accepted.
export function logServiceFailure(event: string, requestId: string) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      requestId,
      code: "DEPENDENCY_UNAVAILABLE",
      time: new Date().toISOString(),
    }),
  );
}
