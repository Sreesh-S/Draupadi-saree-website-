import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

function AdminAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: p }, { data: r }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: true }),
        supabase.from("products").select("id, name, sold_stock, stock, category"),
        supabase.from("returns").select("*"),
      ]);
      setOrders(o ?? []);
      setProducts(p ?? []);
      setReturns(r ?? []);
    })();
  }, []);

  // Revenue by day (last 30 days)
  const byDay = new Map<string, { revenue: number; orders: number }>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  orders.forEach((o) => {
    const k = String(o.created_at).slice(0, 10);
    if (!byDay.has(k)) return;
    const cur = byDay.get(k)!;
    cur.orders += 1;
    if (o.status === "delivered") cur.revenue += Number(o.total || 0);
  });
  const revenueData = Array.from(byDay.entries()).map(([d, v]) => ({ date: d.slice(5), ...v }));

  // Status pie
  const statusMap = new Map<string, number>();
  orders.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1));
  const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ["#7A0019", "#D4AF37", "#1a0d0d", "#92400e", "#065f46", "#1e3a8a", "#4c1d95"];

  // Category bar
  const catMap = new Map<string, number>();
  products.forEach((p) => catMap.set(p.category ?? "Uncategorized", (catMap.get(p.category ?? "Uncategorized") ?? 0) + 1));
  const catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  // Top sellers
  const topSellers = [...products].sort((a, b) => (b.sold_stock ?? 0) - (a.sold_stock ?? 0)).slice(0, 8);

  return (
    <div className="p-8 max-w-[1400px] space-y-6">
      <header>
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Insights</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Analytics</h1>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="font-serif text-lg mb-4">Revenue — Last 30 days</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueData}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7A0019" stopOpacity={0.4}/><stop offset="95%" stopColor="#7A0019" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#7A0019" fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-serif text-lg mb-4">Orders by Status</h2>
          {statusData.length === 0
            ? <div className="text-sm text-neutral-400 text-center py-12">No orders yet.</div>
            : <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>}
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-serif text-lg mb-4">Products by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={60} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#D4AF37" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="font-serif text-lg mb-4">Top Sellers</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-neutral-500"><tr><th className="text-left py-2">Product</th><th className="text-right">Sold</th><th className="text-right">In Stock</th></tr></thead>
          <tbody>
            {topSellers.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-right">{p.sold_stock ?? 0}</td>
                <td className="py-2 text-right">{p.stock}</td>
              </tr>
            ))}
            {topSellers.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-neutral-400">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Reverse Logistics / Returns Analytics */}
      <div className="space-y-6 pt-4">
        <div className="border-t border-neutral-200 pt-6">
          <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Reverse Logistics</div>
          <h2 className="font-serif text-2xl text-[#1a0d0d] mb-4">Returns & Refunds</h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Global Return Rate</div>
            <div className="text-2xl font-serif text-[#7A0019] mt-2">
              {((returns.length / Math.max(1, orders.length)) * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">{returns.length} returns out of {orders.length} total orders.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Total Refunded Amount</div>
            <div className="text-2xl font-serif text-emerald-700 mt-2">
              ₹{returns.filter(r => r.status === "refund_completed").reduce((sum, r) => sum + Number(r.price || 0), 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Processed successfully back to clients.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Pending Claims</div>
            <div className="text-2xl font-serif text-amber-600 mt-2">
              {returns.filter(r => ["requested", "under_review", "approved", "pickup_scheduled", "picked_up"].includes(r.status)).length}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Active claims requiring administrative attention.</p>
          </div>
        </div>

        {/* Return reasons and statuses */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <h3 className="font-serif text-base mb-4">Returns by Reason</h3>
            {(() => {
              const reasonMap = new Map<string, number>();
              returns.forEach(r => reasonMap.set(r.reason, (reasonMap.get(r.reason) ?? 0) + 1));
              const reasonsData = Array.from(reasonMap.entries()).map(([name, value]) => ({ name, value }));
              return reasonsData.length === 0 ? (
                <div className="text-sm text-neutral-400 text-center py-12">No return requests submitted yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={reasonsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7A0019" />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <h3 className="font-serif text-base mb-4">Returns by Status</h3>
            {(() => {
              const returnStatusMap = new Map<string, number>();
              returns.forEach(r => returnStatusMap.set(r.status.replace(/_/g, " "), (returnStatusMap.get(r.status) ?? 0) + 1));
              const returnsStatusData = Array.from(returnStatusMap.entries()).map(([name, value]) => ({ name, value }));
              return returnsStatusData.length === 0 ? (
                <div className="text-sm text-neutral-400 text-center py-12">No return requests submitted yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={returnsStatusData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {returnsStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
