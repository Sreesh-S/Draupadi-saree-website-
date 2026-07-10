import {
  executeLocalQuery,
  localDbAuthSignIn,
  localDbAuthSignUp,
  localDbAuthUpdateUser,
  uploadLocalFile,
} from "./local-db.functions";

class MockQueryBuilder {
  table: string;
  action: "select" | "insert" | "update" | "delete" = "select";
  selectFields = "*";
  selectOptions: any = null;
  filters: any[] = [];
  orderConfig: any = null;
  limitVal: number | null = null;
  singleVal = false;
  maybeSingleVal = false;
  insertData: any = null;
  updateData: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = "*", options: any = null) {
    this.selectFields = fields;
    this.selectOptions = options;
    return this;
  }

  insert(data: any) {
    this.action = "insert";
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.action = "update";
    this.updateData = data;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, operator: "eq", value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, operator: "neq", value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ field, operator: "gt", value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, operator: "gte", value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ field, operator: "lt", value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, operator: "lte", value });
    return this;
  }

  like(field: string, value: any) {
    this.filters.push({ field, operator: "like", value });
    return this;
  }

  ilike(field: string, value: any) {
    this.filters.push({ field, operator: "ilike", value });
    return this;
  }

  in(field: string, value: any) {
    this.filters.push({ field, operator: "in", value });
    return this;
  }

  or(expr: string) {
    this.filters.push({ field: "", operator: "or", value: expr });
    return this;
  }

  order(field: string, config: any = {}) {
    this.orderConfig = { field, ascending: config.ascending !== false };
    return this;
  }

  limit(val: number) {
    this.limitVal = val;
    return this;
  }

  single() {
    this.singleVal = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleVal = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await executeLocalQuery({
        data: {
          table: this.table,
          action: this.action,
          selectFields: this.selectFields,
          selectOptions: this.selectOptions,
          filters: this.filters,
          orderConfig: this.orderConfig,
          limitVal: this.limitVal,
          singleVal: this.singleVal,
          maybeSingleVal: this.maybeSingleVal,
          insertData: this.insertData,
          updateData: this.updateData,
        }
      });
      if (onfulfilled) return onfulfilled(res);
      return res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

// Callbacks for auth state change
const authListeners = new Set<(event: string, session: any) => void>();

const getStoredSession = () => {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("sb-mock-session");
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const setStoredSession = (session: any) => {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem("sb-mock-session", JSON.stringify(session));
  } else {
    localStorage.removeItem("sb-mock-session");
  }
};

export const supabase = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(filePath: string, file: File, options?: any) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          try {
            const res = (await uploadLocalFile({ data: { filename: filePath, base64 } })) as any;
            if (res.error) throw new Error(res.error.message);
            return { data: { path: filePath }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        getPublicUrl(filePath: string) {
          return { data: { publicUrl: `/uploads/${filePath}` } };
        }
      };
    }
  },

  channel(name: string) {
    return {
      on(event: string, config: any, callback: () => void) {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },

  removeChannel(ch: any) {
    // no-op
  },

  auth: {
    async getSession() {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    async getUser() {
      const session = getStoredSession();
      return { data: { user: session?.user ?? null }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      const session = getStoredSession();
      // Immediately invoke with initial state
      callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signInWithPassword({ email, password }: any) {
      const res = await localDbAuthSignIn({ data: { email, password } });
      if (res.error) return res;
      setStoredSession(res.data.session);
      authListeners.forEach((cb) => cb("SIGNED_IN", res.data.session));
      return res;
    },

    async signUp({ email, password, options }: any) {
      const fullName = options?.data?.full_name || "Guest";
      const phone = options?.data?.phone || null;
      const res = await localDbAuthSignUp({ data: { email, password, fullName, phone } });
      if (res.error) return res;
      setStoredSession(res.data.session);
      authListeners.forEach((cb) => cb("SIGNED_IN", res.data.session));
      return res;
    },

    async signOut() {
      setStoredSession(null);
      authListeners.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },

    async resetPasswordForEmail(email: string) {
      return { data: {}, error: null };
    },

    async updateUser({ password }: any) {
      const session = getStoredSession();
      if (!session || !session.user) {
        return { data: null, error: { message: "Not authenticated" } };
      }
      return localDbAuthUpdateUser({ data: { userId: session.user.id, password } });
    }
  }
};
