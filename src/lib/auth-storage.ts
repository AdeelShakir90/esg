const USER_KEY = "user";
const PROFILE_KEY = "envario_profile";

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setStoredUser(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, email.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function setRegisteredProfile(data: {
  name: string;
  email: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getUserInitials(email: string): string {
  const local = email.split("@")[0]?.trim() || "?";
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "U";
}
