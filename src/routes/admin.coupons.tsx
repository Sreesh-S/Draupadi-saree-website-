import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Tag } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });

type Coupon = any;

function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any).from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(c: Coupon) {
    const { error } = await (supabase as any).from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    load();
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Promotions</div>
          <h1 className="font-serif text-3xl text-[#1a0d0d]">Coupons</h1>
          <p className="text-sm text-neutral-500 mt-1">{rows.length} coupons created.</p>
        </div>
        <button onClick={() => setEditing({ code: "", discount_type: "percent", discount_value: 10, min_order_amount: 0, active: true })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a0d0d] text-white rounded-md hover:bg-[#7A0019] text-sm">
          <Plus size={16} /> New Coupon
        </button>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">Code</th>
              <th className="text-left px-6 py-3">Discount</th>
              <th className="text-right px-6 py-3">Min Order</th>
              <th className="text-right px-6 py-3">Used</th>
              <th className="text-left px-6 py-3">Active</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center px-6 py-16 text-neutral-400">
                <Tag className="mx-auto mb-2 opacity-40" size={28} /><div className="text-sm">No coupons yet.</div>
              </td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-6 py-3 font-mono font-medium text-[#1a0d0d]">{c.code}</td>
                <td className="px-6 py-3">{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</td>
                <td className="px-6 py-3 text-right">₹{Number(c.min_order_amount).toLocaleString("en-IN")}</td>
                <td className="px-6 py-3 text-right">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="px-6 py-3">
                  <button onClick={() => toggleActive(c)} className={`text-xs px-2 py-0.5 rounded ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"}`}>
                    {c.active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(c)} className="p-2 rounded hover:bg-neutral-100 text-neutral-600"><Edit2 size={14} /></button>
                    <button onClick={() => remove(c.id)} className="p-2 rounded hover:bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <CouponEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CouponEditor({ initial, onClose, onSaved }: any) {
  const isNew = !initial.id;
  const [f, setF] = useState({
    code: initial.code ?? "",
    description: initial.description ?? "",
    discount_type: initial.discount_type ?? "percent",
    discount_value: initial.discount_value ?? 10,
    min_order_amount: initial.min_order_amount ?? 0,
    max_discount: initial.max_discount ?? "",
    usage_limit: initial.usage_limit ?? "",
    active: initial.active ?? true,
    valid_until: initial.valid_until ? String(initial.valid_until).slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.code) return toast.error("Code is required");
    setSaving(true);
    const payload: any = {
      code: f.code.toUpperCase().trim(),
      description: f.description || null,
      discount_type: f.discount_type,
      discount_value: Number(f.discount_value),
      min_order_amount: Number(f.min_order_amount),
      max_discount: f.max_discount === "" ? null : Number(f.max_discount),
      usage_limit: f.usage_limit === "" ? null : Number(f.usage_limit),
      active: f.active,
      valid_until: f.valid_until || null,
    };
    const { error } = isNew
      ? await (supabase as any).from("coupons").insert(payload)
      : await (supabase as any).from("coupons").update(payload).eq("id", initial.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Coupon created" : "Coupon updated");
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="px-6 py-4 border-b"><h2 className="font-serif text-xl">{isNew ? "New Coupon" : "Edit Coupon"}</h2></header>
        <div className="p-6 space-y-4">
          <Inp label="Code *" value={f.code} onChange={(v: string) => setF({ ...f, code: v })} />
          <Inp label="Description" value={f.description} onChange={(v: string) => setF({ ...f, description: v })} />
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500">Type</span>
              <select value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })} className="mt-1.5 w-full px-3 py-2 border border-neutral-200 rounded text-sm">
                <option value="percent">Percent</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </label>
            <Inp label="Value" type="number" value={f.discount_value} onChange={(v: string) => setF({ ...f, discount_value: v })} />
            <Inp label="Min Order (₹)" type="number" value={f.min_order_amount} onChange={(v: string) => setF({ ...f, min_order_amount: v })} />
            <Inp label="Max Discount (₹)" type="number" value={f.max_discount} onChange={(v: string) => setF({ ...f, max_discount: v })} />
            <Inp label="Usage Limit" type="number" value={f.usage_limit} onChange={(v: string) => setF({ ...f, usage_limit: v })} />
            <Inp label="Valid Until" type="date" value={f.valid_until} onChange={(v: string) => setF({ ...f, valid_until: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
        </div>
        <footer className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-[#1a0d0d] text-white rounded hover:bg-[#7A0019] disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </footer>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-[#7A0019] outline-none" />
    </label>
  );
}
