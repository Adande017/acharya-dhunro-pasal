import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./supabase-config";

const config = getSupabaseConfig();
export const supabase = config
  ? createClient<Database>(config.url, config.anonKey)
  : null;
