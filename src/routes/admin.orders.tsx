import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, ShoppingBag, Construction } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8">
      <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Admin</div>
      <h1 className="font-serif text-3xl text-[#1a0d0d]">{title}</h1>
      <div className="mt-12 max-w-md mx-auto text-center text-neutral-400">
        <Construction className="mx-auto mb-3" size={36} />
        <p className="text-sm">This module ships in the next phase.</p>
      </div>
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

const FLOW = ["placed","accepted","processing","packed","shipped","out_for_delivery","delivered"];

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "delivered") patch.payment_status = "paid";
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status.replace(/_/g, " ")}`);
    load();
    if (open?.id === id) setOpen({ ...open, ...patch });
  }

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!search) return true;
    const a = (o.shipping_address ?? {}) as any;
    return o.id.startsWith(search) || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.phone?.includes(search);
  });

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Fulfilment</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Orders</h1>
        <p className="text-sm text-neutral-500 mt-1">{orders.length} orders received.</p>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-neutral-100 flex items-center gap-3 flex-wrap">
          <Search size={16} className="text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by id, name, phone…" className="flex-1 min-w-[200px] bg-transparent outline-none text-sm" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-sm border border-neutral-200 rounded px-2 py-1 bg-white">
            <option value="all">All statuses</option>
            {["placed","accepted","processing","packed","shipped","out_for_delivery","delivered","cancelled","rejected","refunded"].map((s: string) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Order</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Payment</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Total</th>
                <th className="text-right px-6 py-3">Date</th>
                <th className="text-right px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center px-6 py-16 text-neutral-400">
                  <ShoppingBag className="mx-auto mb-2 opacity-40" size={28} />
                  <div className="text-sm">No orders match.</div>
                </td></tr>
              )}
              {filtered.map((o) => {
                const a = (o.shipping_address ?? {}) as any;
                return (
                  <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50/50 cursor-pointer" onClick={() => setOpen(o)}>
                    <td className="px-6 py-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-[#1a0d0d]">{a.full_name ?? "—"}</div>
                      <div className="text-xs text-neutral-500">{a.phone ?? ""}</div>
                    </td>
                    <td className="px-6 py-3 uppercase text-xs">
                      {o.payment_method}
                      <div className="text-[0.65rem] text-neutral-500">{o.payment_status}</div>
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-3 text-right">₹{Number(o.total).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-xs text-neutral-500">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      <select
                        value={o.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setStatus(o.id, e.target.value)}
                        className="text-xs border border-neutral-200 rounded px-2 py-1 bg-white"
                      >
                        {["placed","accepted","processing","packed","shipped","out_for_delivery","delivered","cancelled","rejected","refunded"].map((s: string) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && <OrderDetail order={open} onClose={() => setOpen(null)} onAdvance={(s: string) => setStatus(open.id, s)} />}
    </div>
  );
}

function OrderDetail({ order, onClose, onAdvance }: any) {
  const a = (order.shipping_address ?? {}) as any;
  const items = (order.items ?? []) as any[];
  const idx = FLOW.indexOf(order.status);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-6 py-4 border-b sticky top-0 bg-white flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#1a0d0d]">Order #{order.id.slice(0, 8)}</h2>
            <div className="text-xs text-neutral-500 mt-0.5">{new Date(order.created_at).toLocaleString()}</div>
          </div>
          <StatusBadge status={order.status} />
        </header>
        <div className="p-6 space-y-6">
          <section>
            <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mb-2">Shipping to</div>
            <div className="text-sm">
              <div className="font-medium">{a.full_name}</div>
              <div className="text-neutral-600">{a.phone} · {a.email ?? ""}</div>
              <div className="text-neutral-600 mt-1">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}, {a.state} – {a.pincode}</div>
            </div>
          </section>
          <section>
            <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mb-2">Items</div>
            <div className="border border-neutral-200 rounded-lg divide-y">
              {items.map((it, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-neutral-500">Qty {it.quantity ?? it.qty} · ₹{Number(it.price).toLocaleString("en-IN")} each</div>
                  </div>
                  <div className="font-medium">₹{((it.quantity ?? it.qty) * Number(it.price)).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm space-y-1">
              <Row k="Subtotal" v={`₹${Number(order.subtotal).toLocaleString("en-IN")}`} />
              <Row k="Shipping" v={`₹${Number(order.shipping).toLocaleString("en-IN")}`} />
              <Row k="Total" v={`₹${Number(order.total).toLocaleString("en-IN")}`} bold />
              <Row k="Payment" v={`${(order.payment_method as string).toUpperCase()} · ${order.payment_status}`} />
            </div>
          </section>
          <section>
            <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mb-3">Fulfilment timeline</div>
            <div className="space-y-2">
              {FLOW.map((s, i) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${i <= idx ? "bg-emerald-500" : "bg-neutral-200"}`} />
                  <div className={i <= idx ? "text-[#1a0d0d]" : "text-neutral-400"}>{s.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {idx >= 0 && idx < FLOW.length - 1 && (
                <button onClick={() => onAdvance(FLOW[idx + 1])} className="px-4 py-2 bg-[#1a0d0d] text-white text-sm rounded hover:bg-[#7A0019]">
                  Advance to "{FLOW[idx + 1].replace(/_/g, " ")}"
                </button>
              )}
              {!["cancelled","rejected","refunded","delivered"].includes(order.status) && (
                <>
                  <button onClick={() => onAdvance("cancelled")} className="px-4 py-2 border border-rose-200 text-rose-700 text-sm rounded hover:bg-rose-50">Cancel</button>
                  <button onClick={() => onAdvance("rejected")} className="px-4 py-2 border border-neutral-200 text-neutral-700 text-sm rounded hover:bg-neutral-100">Reject</button>
                </>
              )}
              {order.status === "delivered" && (
                <button onClick={() => onAdvance("refunded")} className="px-4 py-2 border border-neutral-200 text-neutral-700 text-sm rounded hover:bg-neutral-100">Mark refunded</button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{k}</span>
      <span className={bold ? "font-semibold text-[#1a0d0d]" : ""}>{v}</span>
    </div>
  );
}
