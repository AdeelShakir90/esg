export function getUserInitials(email: string): string {
  const local = email.split("@")[0]?.trim() || "?";
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "U";
}
