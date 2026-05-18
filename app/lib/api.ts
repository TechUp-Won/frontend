export function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; message?: string; raw: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: { data?: T; message?: string } = {};
  try {
    if (text) json = JSON.parse(text);
  } catch {
    // ignore parse error
  }
  return {
    ok: res.ok,
    status: res.status,
    data: json.data,
    message: json.message,
    raw: json,
  };
}
