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

export async function uploadWorkspaceDocument(
  url: string,
  file: File,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : (body?.error?.message ??
            "Upload failed. Refresh the document list before retrying."),
    );
  }
}

export async function downloadWorkspaceReport(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : (result?.error?.message ??
            "Report download failed. Try again later."),
    );
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
