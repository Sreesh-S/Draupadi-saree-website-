import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Users, Shield, ShieldOff, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const deleteCustomerUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    const currentUserId = context.userId;

    // Check if requester is an admin
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Only administrators can perform this action.");
    }

    if (currentUserId === userId) {
      throw new Error("Conflict: You cannot delete your own admin account.");
    }

    // Dynamic import to keep service role logic out of client bundle
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete user from auth (which will cascade-delete the profile row)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return { success: true };
  });

export const Route = createFileRoute("/admin/customers")({ component: AdminCustomers });

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_blocked: boolean;
  created_at: string;
  orders_count?: number;
  total_spent?: number;
  is_admin?: boolean;
};

function AdminCustomers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: profiles, error }, { data: roles }, { data: orders }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("orders").select("user_id, total, status"),
    ]);
    if (error) toast.error(error.message);
    const adminIds = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    const stats = new Map<string, { c: number; s: number }>();
    (orders ?? []).forEach((o: any) => {
      const cur = stats.get(o.user_id) ?? { c: 0, s: 0 };
      cur.c += 1;
      if (o.status === "delivered") cur.s += Number(o.total || 0);
      stats.set(o.user_id, cur);
    });
    setRows((profiles ?? []).map((p: any) => ({
      ...p,
      orders_count: stats.get(p.id)?.c ?? 0,
      total_spent: stats.get(p.id)?.s ?? 0,
      is_admin: adminIds.has(p.id),
    })));
    setLoading(false);
  }
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => { 
    load(); 
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });
  }, []);

  async function toggleBlock(c: Customer) {
    const { error } = await supabase.from("profiles").update({ is_blocked: !c.is_blocked }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.is_blocked ? "Customer unblocked" : "Customer blocked");
    load();
  }

  async function toggleAdmin(c: Customer) {
    if (c.is_admin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", c.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin role revoked");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: c.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin role granted");
    }
    load();
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Are you sure you want to permanently delete the customer account for ${c.full_name || c.email}? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await deleteCustomerUser({ data: c.id });
      if (res.success) {
        toast.success("Customer account deleted successfully.");
        load();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer account.");
      setLoading(false);
    }
  }

  const filtered = rows.filter((r) =>
    !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">People</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Customers</h1>
        <p className="text-sm text-neutral-500 mt-1">{rows.length} registered patrons.</p>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-neutral-100 flex items-center gap-3">
          <Search size={16} className="text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone…" className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Phone</th>
                <th className="text-right px-6 py-3">Orders</th>
                <th className="text-right px-6 py-3">Spent</th>
                <th className="text-left px-6 py-3">Role</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Joined</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center px-6 py-16 text-neutral-400">
                  <Users className="mx-auto mb-2 opacity-40" size={28} />
                  <div className="text-sm">No customers yet.</div>
                </td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="px-6 py-3">
                    <div className="font-medium text-[#1a0d0d]">{c.full_name || "—"}</div>
                    <div className="text-xs text-neutral-500">{c.email}</div>
                  </td>
                  <td className="px-6 py-3 text-neutral-600">{c.phone ?? "—"}</td>
                  <td className="px-6 py-3 text-right">{c.orders_count}</td>
                  <td className="px-6 py-3 text-right">₹{Number(c.total_spent).toLocaleString("en-IN")}</td>
                  <td className="px-6 py-3">
                    {c.is_admin
                      ? <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">ADMIN</span>
                      : <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">CUSTOMER</span>}
                  </td>
                  <td className="px-6 py-3">
                    {c.is_blocked
                      ? <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded">BLOCKED</span>
                      : <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">ACTIVE</span>}
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title={c.is_admin ? "Revoke admin" : "Grant admin"} onClick={() => toggleAdmin(c)}
                        className="p-2 rounded hover:bg-neutral-100 text-neutral-600">
                        {c.is_admin ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button title={c.is_blocked ? "Unblock" : "Block"} onClick={() => toggleBlock(c)}
                        className={`p-2 rounded hover:bg-neutral-100 ${c.is_blocked ? "text-emerald-600" : "text-rose-600"}`}>
                        {c.is_blocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                      </button>
                      <button 
                        title={currentUser?.id === c.id ? "You cannot delete yourself" : "Delete customer account"} 
                        onClick={() => handleDelete(c)}
                        disabled={currentUser?.id === c.id}
                        className="p-2 rounded hover:bg-neutral-100 text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
