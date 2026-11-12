export function safeAuthRedirect(value: unknown): string {
  // Deliberately allow paths only, without encoding, query strings or fragments.
  if (typeof value !== "string" || !/^\/[a-zA-Z0-9/_-]*$/.test(value) || value.startsWith("//")) {
    return "/dashboard";
  }
  const path = new URL(value, "https://local.invalid").pathname;
  if (path.startsWith("/auth") || path === "/login" || path === "/register" || path.startsWith("/api")) {
    return "/dashboard";
  }
  return path;
}

export function authConfiguration(url: string | undefined, key: string | undefined) {
  // Recovery phase is deliberately restricted to the isolated test project.
  if (url !== "https://gkhrtrakukqdhgvucudv.supabase.co" || !key) {
    throw new Error("Authentication configuration is unavailable.");
  }
  if (!key.startsWith("sb_publishable_")) {
    // Legacy anon JWTs are allowed; service-role JWTs and secret keys are not.
    try {
      const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error("Authentication configuration is unavailable.");
    }
  }
  return { url, key };
}

export function confirmationOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    if (url.origin !== value || url.username || url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error();
    return url.origin;
  } catch {
    throw new Error("Confirmation origin is unavailable.");
  }
}
