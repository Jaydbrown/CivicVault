import { BACKEND_URL } from "./backendUrl";

/**
 * Authenticated fetch wrapper. The backend derives the caller from the Privy
 * access token, so every mutating request must carry it. Register the token
 * getter once, near the Privy provider (see App.tsx).
 */

type TokenGetter = () => Promise<string | null>;

let _getToken: TokenGetter | null = null;

export function registerAccessTokenGetter(getter: TokenGetter): void {
  _getToken = getter;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;

  const h = new Headers(headers);
  if (rest.body && !h.has("Content-Type")) h.set("Content-Type", "application/json");

  if (auth && _getToken) {
    const token = await _getToken().catch(() => null);
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...rest, headers: h });
  const text = await res.text();
  const json = text ? safeParse(text) : {};

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return json as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
