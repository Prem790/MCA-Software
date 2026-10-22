import { randomUUID } from "node:crypto";

export function requestId() {
  return randomUUID();
}

export function serviceUnavailable(id: string) {
  return Response.json(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service is not ready",
        requestId: id,
      },
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Request-Id": id },
    },
  );
}
