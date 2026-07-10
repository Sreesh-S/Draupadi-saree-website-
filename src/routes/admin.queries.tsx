import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/queries")({ component: AdminQueries });

function AdminQueries() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any).from("contact_queries").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await (supabase as any).from("contact_queries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
    if (open?.id === id) setOpen({ ...open, status });
  }
  async function saveReply() {
    if (!open) return;
    const { error } = await (supabase as any).from("contact_queries").update({ admin_reply: open.admin_reply, status: "resolved" }).eq("id", open.id);
    if (error) return toast.error(error.message);
    toast.success("Reply saved");
    setOpen(null); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this query?")) return;
    const { error } = await (supabase as any).from("contact_queries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Inbox</div>
        <h1 className="font-serif text-3xl text-[#1a0d0d]">Customer Queries</h1>
        <p className="text-sm text-neutral-500 mt-1">{rows.length} messages received.</p>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">From</th>
              <th className="text-left px-6 py-3">Subject</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-right px-6 py-3">Received</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center px-6 py-16 text-neutral-400">
                <MessageSquare className="mx-auto mb-2 opacity-40" size={28} /><div className="text-sm">No queries yet.</div>
              </td></tr>
            )}
            {rows.map((q) => (
              <tr key={q.id} className="border-t border-neutral-100 hover:bg-neutral-50/50 cursor-pointer" onClick={() => setOpen(q)}>
                <td className="px-6 py-3">
                  <div className="font-medium text-[#1a0d0d]">{q.name}</div>
                  <div className="text-xs text-neutral-500">{q.email}{q.phone ? ` · ${q.phone}` : ""}</div>
                </td>
                <td className="px-6 py-3 text-neutral-600">{q.subject ?? "—"}</td>
                <td className="px-6 py-3">
                  <select value={q.status} onClick={(e) => e.stopPropagation()} onChange={(e) => setStatus(q.id, e.target.value)} className="text-xs border border-neutral-200 rounded px-2 py-1 bg-white">
                    {["open","in_progress","resolved","closed"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </td>
                <td className="px-6 py-3 text-right text-xs text-neutral-500">{new Date(q.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={(e) => { e.stopPropagation(); remove(q.id); }} className="p-2 rounded hover:bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <header className="px-6 py-4 border-b">
              <h2 className="font-serif text-xl">{open.subject || "Query"}</h2>
              <div className="text-xs text-neutral-500 mt-1">{open.name} · {open.email}</div>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mb-1">Message</div>
                <div className="text-sm whitespace-pre-wrap p-3 bg-neutral-50 rounded border">{open.message}</div>
              </div>
              <div>
                <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mb-1">Admin notes / reply</div>
                <textarea rows={4} value={open.admin_reply ?? ""} onChange={(e) => setOpen({ ...open, admin_reply: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-[#7A0019] outline-none" />
              </div>
            </div>
            <footer className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded">Close</button>
              <button onClick={saveReply} className="px-5 py-2 text-sm bg-[#1a0d0d] text-white rounded hover:bg-[#7A0019]">Save & Mark Resolved</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
