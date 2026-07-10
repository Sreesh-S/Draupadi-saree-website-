import { createClient } from "@supabase/supabase-js";
import { localDbAuthDeleteUser } from "./local-db.functions";

const supabaseUrl = (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : undefined) || "";
const serviceRoleKey = (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined) || "";

const useRealSupabase = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin = useRealSupabase
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : {
      auth: {
        admin: {
          async deleteUser(userId: string) {
            return localDbAuthDeleteUser({ data: userId });
          }
        }
      }
    };
