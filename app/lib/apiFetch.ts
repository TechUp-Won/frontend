const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

const setToken = (token: string) => localStorage.setItem("accessToken", token);

const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("tokenExpiresAt");
};

let reissuePromise: Promise<string | null> | null = null;

async function reissueToken(): Promise<string | null> {
  if (reissuePromise) return reissuePromise;

  reissuePromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/reissue", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return null;

      const json = await res.json();
      const newToken = json.data?.tokenInfo?.accessToken;
      if (!newToken) return null;

      setToken(newToken);

      const expiresIn = json.data?.tokenInfo?.expiresIn;
      if (expiresIn) {
        localStorage.setItem("tokenExpiresAt", String(Date.now() + expiresIn * 1000));
      }

      return newToken;
    } catch {
      return null;
    } finally {
      reissuePromise = null;
    }
  })();

  return reissuePromise;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers, credentials: "include" });

  if (res.status !== 401) return res;

  const newToken = await reissueToken();

  if (!newToken) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return res;
  }

  headers.set("Authorization", `Bearer ${newToken}`);
  return fetch(input, { ...init, headers, credentials: "include" });
}
