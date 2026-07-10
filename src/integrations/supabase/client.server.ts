import { localDbAuthDeleteUser } from "./local-db.functions";

export const supabaseAdmin = {
  auth: {
    admin: {
      async deleteUser(userId: string) {
        return localDbAuthDeleteUser({ data: userId });
      }
    }
  }
};
