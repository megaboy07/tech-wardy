import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE } from "../config.js";

if (!SUPABASE.url || !SUPABASE.publishableKey) {
    console.error("[supabase] بيانات الاتصال ناقصة في config.js");
    throw new Error("Supabase credentials missing");
}

export const supabase = createClient(
    SUPABASE.url,
    SUPABASE.publishableKey
);