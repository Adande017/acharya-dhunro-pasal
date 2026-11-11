import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey);

export const supabase =
  isSupabaseConfigured && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function getAuthRedirectUrl(): string {
  const baseUrl = import.meta.env.BASE_URL;
  const path = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, window.location.origin).toString();
}
