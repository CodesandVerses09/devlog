import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://fxnvfphphkjwgimfwzaj.supabase.co";
const SUPABASE_KEY = "sb_publishable_o5ZKRnW9SZj8C9gJk_brfg_AQiW7nqT";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
