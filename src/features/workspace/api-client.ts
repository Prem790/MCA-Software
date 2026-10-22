export async function workspaceRequest<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Your session expired. Sign in again before saving.");
    throw new Error(
      typeof result.error?.message === "string"
        ? result.error.message
        : "The request failed. Please try again.",
    );
  }
  return result.data as T;
}
