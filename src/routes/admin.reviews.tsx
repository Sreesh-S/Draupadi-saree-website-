import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Trash2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });

function AdminReviews() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [{ data: revs, error }, { data: prods }] = await Promise.all([
      (supabase as any).from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name"),
    ]);
    if (error) toast.error(error.message);
    const map: Record<string, string> = {};
    (prods ?? []).forEach((p: any) => (map[p.id] = p.name));
    setProducts(map);
    setRows(revs ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleApprove(r: any) {
    const { error } = await (supabase as any).from("reviews").update({ approved: !r.approved }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    const { error } = await (supabase as any).from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Voice of Customer</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Reviews & Ratings</h1>
        <p className="text-sm text-neutral-500 mt-1">{rows.length} reviews submitted.</p>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">Product</th>
              <th className="text-left px-6 py-3">Rating</th>
              <th className="text-left px-6 py-3">Review</th>
              <th className="text-left px-6 py-3">Approved</th>
              <th className="text-right px-6 py-3">Date</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center px-6 py-16 text-neutral-400">
                <Star className="mx-auto mb-2 opacity-40" size={28} /><div className="text-sm">No reviews yet.</div>
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-6 py-3 font-medium">{products[r.product_id] ?? r.product_id.slice(0, 8)}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} strokeWidth={1.5} />)}
                  </div>
                </td>
                <td className="px-6 py-3 text-neutral-600 max-w-md">
                  {r.title && <div className="font-medium text-[#1a0d0d]">{r.title}</div>}
                  <div className="text-xs">{r.comment}</div>
                </td>
                <td className="px-6 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.approved ? "VISIBLE" : "HIDDEN"}</span>
                </td>
                <td className="px-6 py-3 text-right text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => toggleApprove(r)} className="p-2 rounded hover:bg-neutral-100 text-neutral-600" title={r.approved ? "Hide" : "Show"}>
                      {r.approved ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => remove(r.id)} className="p-2 rounded hover:bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
