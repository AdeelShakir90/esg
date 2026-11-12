import { authConfiguration } from "@/lib/auth/policy";

export function getPublicAuthConfiguration() {
  return authConfiguration(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
