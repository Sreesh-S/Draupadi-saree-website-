import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Users, IndianRupee, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Stats = {
  totalProducts: number;
  lowStock: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalUsers: number;
};

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("admin-dash")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function loadAll() {
    const [products, orders, profiles] = await Promise.all([
      supabase.from("products").select("id, stock, low_stock_threshold"),
      supabase.from("orders").select("id, status, total, created_at, payment_method, shipping_address").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    const p = products.data ?? [];
    const o = orders.data ?? [];
    setStats({
      totalProducts: p.length,
      lowStock: p.filter((x) => x.stock <= x.low_stock_threshold).length,
      totalOrders: o.length,
      pendingOrders: o.filter((x) => ["placed", "pending", "accepted", "processing", "packed", "shipped", "out_for_delivery"].includes(x.status)).length,
      completedOrders: o.filter((x) => x.status === "delivered").length,
      cancelledOrders: o.filter((x) => ["cancelled", "rejected"].includes(x.status)).length,
      totalRevenue: o.filter((x) => x.status === "delivered").reduce((s, x) => s + Number(x.total || 0), 0),
      totalUsers: profiles.count ?? 0,
    });
    setRecentOrders(o.slice(0, 8));
  }

  const cards = [
    { label: "Total Revenue", value: stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : "—", icon: IndianRupee, color: "from-emerald-500/10 to-emerald-500/0", iconColor: "text-emerald-600" },
    { label: "Total Orders", value: stats?.totalOrders ?? "—", icon: ShoppingBag, color: "from-blue-500/10 to-blue-500/0", iconColor: "text-blue-600" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? "—", icon: Clock, color: "from-amber-500/10 to-amber-500/0", iconColor: "text-amber-600" },
    { label: "Completed", value: stats?.completedOrders ?? "—", icon: CheckCircle2, color: "from-green-500/10 to-green-500/0", iconColor: "text-green-600" },
    { label: "Cancelled", value: stats?.cancelledOrders ?? "—", icon: XCircle, color: "from-rose-500/10 to-rose-500/0", iconColor: "text-rose-600" },
    { label: "Total Products", value: stats?.totalProducts ?? "—", icon: Package, color: "from-violet-500/10 to-violet-500/0", iconColor: "text-violet-600" },
    { label: "Low Stock", value: stats?.lowStock ?? "—", icon: AlertTriangle, color: "from-orange-500/10 to-orange-500/0", iconColor: "text-orange-600" },
    { label: "Customers", value: stats?.totalUsers ?? "—", icon: Users, color: "from-cyan-500/10 to-cyan-500/0", iconColor: "text-cyan-600" },
  ];

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-8">
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Overview</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Welcome back. Here's what's happening at the atelier.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 bg-gradient-to-br ${c.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wider">{c.label}</div>
                  <div className="mt-2 text-2xl font-serif text-[#1a0d0d]">{c.value}</div>
                </div>
                <Icon className={`${c.iconColor}`} size={22} />
              </div>
            </div>
          );
        })}
      </div>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-serif text-lg text-[#1a0d0d]">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs tracking-[0.2em] uppercase text-[#7A0019] hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Order ID</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Payment</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Total</th>
                <th className="text-right px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="text-center px-6 py-12 text-neutral-400 text-sm">No orders yet.</td></tr>
              )}
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-neutral-100">
                  <td className="px-6 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-6 py-3">{(o.shipping_address as any)?.full_name ?? "—"}</td>
                  <td className="px-6 py-3 uppercase text-xs">{o.payment_method}</td>
                  <td className="px-6 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-6 py-3 text-right">₹{Number(o.total).toLocaleString("en-IN")}</td>
                  <td className="px-6 py-3 text-right text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    placed: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-cyan-100 text-cyan-700",
    processing: "bg-indigo-100 text-indigo-700",
    packed: "bg-violet-100 text-violet-700",
    shipped: "bg-purple-100 text-purple-700",
    out_for_delivery: "bg-fuchsia-100 text-fuchsia-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
    rejected: "bg-red-100 text-red-700",
    refunded: "bg-neutral-200 text-neutral-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] font-medium uppercase tracking-wider ${map[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
