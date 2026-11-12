"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicAuthConfiguration } from "./public-config";

export function createAuthBrowserClient() {
  const { url, key } = getPublicAuthConfiguration();
  return createBrowserClient(url, key);
}
