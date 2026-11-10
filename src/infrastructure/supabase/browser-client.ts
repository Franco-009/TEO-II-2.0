import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/config/env";

export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();
  if (!config.isConfigured) {
    return null;
  }

  return createBrowserClient(config.url, config.anonKey);
}
