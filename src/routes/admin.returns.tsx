import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Check, 
  X, 
  Settings, 
  AlertCircle, 
  Truck, 
  ImageIcon, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2,
  Clock,
  User,
  ShoppingBag,
  ExternalLink,
  MessageSquare
} from "lucide-react";

export const Route = createFileRoute("/admin/returns")({
  ssr: false,
  component: AdminReturns,
});

// Reuse or define status badge for returns
export function ReturnStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    requested: "bg-amber-100 text-amber-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-cyan-100 text-cyan-700",
    rejected: "bg-rose-100 text-rose-700",
    pickup_scheduled: "bg-indigo-100 text-indigo-700",
    picked_up: "bg-violet-100 text-violet-700",
    refund_initiated: "bg-fuchsia-100 text-fuchsia-700",
    refund_completed: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] font-medium uppercase tracking-wider ${map[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function AdminReturns() {
  const [activeTab, setActiveTab] = useState<"requests" | "settings">("requests");
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  
  // Rejection/Pickup inputs
  const [rejectionReason, setRejectionReason] = useState("");
  const [pickupDetails, setPickupDetails] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<any>({
    enable_returns: true,
    return_window: 3,
    reasons: [],
    refund_method: "original_payment",
    auto_approval: false,
    eligible_categories: [],
  });
  const [newReason, setNewReason] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      // Load Returns
      const { data: retData, error: retErr } = await supabase
        .from("returns")
        .select("*")
        .order("created_at", { ascending: false });
      if (retErr) throw retErr;
      setReturns(retData ?? []);

      // Load Settings
      const { data: setRes, error: setErr } = await supabase
        .from("return_settings")
        .select("*")
        .maybeSingle();
      if (setErr) throw setErr;
      if (setRes) {
        setSettings(setRes);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(ret: any) {
    if (!confirm("Approve this return request?")) return;
    try {
      const { error } = await supabase
        .from("returns")
        .update({ status: "approved" })
        .eq("id", ret.id);
      if (error) throw error;
      toast.success("Return approved");
      loadData();
      if (selectedReturn?.id === ret.id) setSelectedReturn({ ...selectedReturn, status: "approved" });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleReject(ret: any) {
    if (!rejectionReason.trim()) return toast.error("Please enter a reason for rejection");
    try {
      const { error } = await supabase
        .from("returns")
        .update({ 
          status: "rejected", 
          rejection_reason: rejectionReason.trim() 
        })
        .eq("id", ret.id);
      if (error) throw error;
      toast.success("Return rejected");
      setRejectionReason("");
      setShowRejectForm(false);
      loadData();
      if (selectedReturn?.id === ret.id) {
        setSelectedReturn({ 
          ...selectedReturn, 
          status: "rejected", 
          rejection_reason: rejectionReason.trim() 
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSchedulePickup(ret: any) {
    if (!pickupDetails.trim()) return toast.error("Please enter pickup courier details");
    try {
      const { error } = await supabase
        .from("returns")
        .update({ 
          status: "pickup_scheduled", 
          pickup_details: pickupDetails.trim() 
        })
        .eq("id", ret.id);
      if (error) throw error;
      toast.success("Pickup scheduled");
      setPickupDetails("");
      setShowPickupForm(false);
      loadData();
      if (selectedReturn?.id === ret.id) {
        setSelectedReturn({ 
          ...selectedReturn, 
          status: "pickup_scheduled", 
          pickup_details: pickupDetails.trim() 
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function updateStatus(ret: any, nextStatus: string) {
    try {
      const { error } = await supabase
        .from("returns")
        .update({ status: nextStatus })
        .eq("id", ret.id);
      if (error) throw error;
      toast.success(`Status updated to ${nextStatus.replace(/_/g, " ")}`);
      loadData();
      if (selectedReturn?.id === ret.id) setSelectedReturn({ ...selectedReturn, status: nextStatus });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("return_settings")
        .update({
          enable_returns: settings.enable_returns,
          return_window: Number(settings.return_window),
          reasons: settings.reasons,
          refund_method: settings.refund_method,
          auto_approval: settings.auto_approval,
          eligible_categories: settings.eligible_categories,
        })
        .eq("id", settings.id || "default-settings");
      if (error) throw error;
      toast.success("Return settings saved");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  const addReason = () => {
    if (!newReason.trim()) return;
    if (settings.reasons.includes(newReason.trim())) return toast.error("Reason already exists");
    setSettings({
      ...settings,
      reasons: [...settings.reasons, newReason.trim()]
    });
    setNewReason("");
  };

  const removeReason = (idx: number) => {
    const updated = [...settings.reasons];
    updated.splice(idx, 1);
    setSettings({ ...settings, reasons: updated });
  };

  const toggleCategory = (cat: string) => {
    const updated = [...(settings.eligible_categories || [])];
    const idx = updated.indexOf(cat);
    if (idx > -1) updated.splice(idx, 1);
    else updated.push(cat);
    setSettings({ ...settings, eligible_categories: updated });
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Reverse Logistics</div>
          <h1 className="font-serif text-3xl text-[#1a0d0d]">Returns Panel</h1>
          <p className="text-sm text-neutral-500 mt-1">Review return requests and manage global return policies.</p>
        </div>
        
        {/* Tab triggers */}
        <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button 
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
              activeTab === "requests" 
                ? "bg-white text-[#7A0019] shadow-sm" 
                : "text-neutral-500 hover:text-[#1a0d0d]"
            }`}
          >
            Return Requests ({returns.filter(r => r.status === "requested" || r.status === "under_review").length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
              activeTab === "settings" 
                ? "bg-white text-[#7A0019] shadow-sm" 
                : "text-neutral-500 hover:text-[#1a0d0d]"
            }`}
          >
            <Settings size={13} className="inline mr-1.5" /> Policy Settings
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading returns module…</div>
      ) : activeTab === "requests" ? (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm animate-[reveal-up_.3s_ease]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Request Details</th>
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Saree / Product</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Days Left</th>
                  <th className="text-right px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-neutral-400">
                      <AlertCircle className="mx-auto mb-2 opacity-40" size={32} />
                      <p>No return requests found in database.</p>
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => {
                    const daysRemaining = Math.max(0, settings.return_window - Math.floor((Date.now() - new Date(ret.created_at).getTime()) / (24 * 60 * 60 * 1000)));
                    return (
                      <tr 
                        key={ret.id} 
                        className="hover:bg-neutral-50/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedReturn(ret);
                          setShowRejectForm(false);
                          setShowPickupForm(false);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-bold text-[#1a0d0d]">RET-{ret.id.slice(0, 6).toUpperCase()}</div>
                          <div className="text-[0.65rem] text-neutral-400 mt-1">Order: #{ret.order_id.slice(0, 8)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#1a0d0d]">{ret.customer_name || "Draupadi Customer"}</div>
                          <div className="text-xs text-neutral-400">{new Date(ret.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          {ret.product_image ? (
                            <img src={ret.product_image} alt={ret.product_name} className="w-10 h-10 object-cover rounded border border-neutral-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 shrink-0"><ShoppingBag size={16} /></div>
                          )}
                          <div className="max-w-[200px] truncate font-medium text-[#1a0d0d]">{ret.product_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-neutral-800">{ret.reason}</div>
                          {ret.comments && <div className="text-xs text-neutral-400 max-w-[180px] truncate mt-0.5">{ret.comments}</div>}
                        </td>
                        <td className="px-6 py-4"><ReturnStatusBadge status={ret.status} /></td>
                        <td className="px-6 py-4 text-right font-medium text-[#7A0019]">
                          {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={ret.status} 
                            onChange={(e) => updateStatus(ret, e.target.value)}
                            className="text-xs border border-neutral-200 rounded px-2 py-1 bg-white outline-none"
                          >
                            {["requested","under_review","approved","rejected","pickup_scheduled","picked_up","refund_initiated","refund_completed"].map(s => (
                              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <form onSubmit={saveSettings} className="bg-white rounded-xl border border-neutral-200 p-8 shadow-sm space-y-8 max-w-4xl animate-[reveal-up_.3s_ease]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: General Policy */}
            <div className="space-y-6">
              <h2 className="font-serif text-xl text-[#1a0d0d] pb-2 border-b border-neutral-100 flex items-center gap-2">
                <Settings size={18} className="text-[#7A0019]" /> Return Eligibility Rules
              </h2>
              
              {/* Master Switch */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                <div>
                  <label className="font-medium text-sm text-neutral-800">Enable Returns Policy</label>
                  <p className="text-xs text-neutral-500 mt-0.5">Toggle returns option customer-wide across the platform.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({ ...settings, enable_returns: !settings.enable_returns })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    settings.enable_returns ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    settings.enable_returns ? "translate-x-6" : ""
                  }`} />
                </button>
              </div>

              {/* Return Window */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Return Window Duration</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min={1} 
                    max={30} 
                    value={settings.return_window} 
                    onChange={(e) => setSettings({ ...settings, return_window: e.target.value })}
                    className="w-24 px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm"
                  />
                  <span className="text-sm text-neutral-600">days after successful delivery</span>
                </div>
              </div>

              {/* Refund Method */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Refund Destination Method</label>
                <select 
                  value={settings.refund_method}
                  onChange={(e) => setSettings({ ...settings, refund_method: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm bg-white"
                >
                  <option value="original_payment">Original Source Payment Method</option>
                  <option value="store_credit">Atelier Wallet (Store Credit)</option>
                  <option value="either">Customer Choice (Source or Store Credit)</option>
                </select>
              </div>

              {/* Auto Approval Switch */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                <div>
                  <label className="font-medium text-sm text-neutral-800">Auto-Approve Return Requests</label>
                  <p className="text-xs text-neutral-500 mt-0.5">Automatically approve return requests upon submission.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({ ...settings, auto_approval: !settings.auto_approval })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    settings.auto_approval ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    settings.auto_approval ? "translate-x-6" : ""
                  }`} />
                </button>
              </div>
            </div>

            {/* Right Column: Return Reasons & Categories */}
            <div className="space-y-6">
              <h2 className="font-serif text-xl text-[#1a0d0d] pb-2 border-b border-neutral-100 flex items-center gap-2">
                <MessageSquare size={18} className="text-[#7A0019]" /> Return Reasons & Categories
              </h2>

              {/* Return Reasons list */}
              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Supported Return Reasons</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newReason} 
                    onChange={(e) => setNewReason(e.target.value)} 
                    placeholder="Add return reason..." 
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm"
                  />
                  <button 
                    type="button" 
                    onClick={addReason}
                    className="p-2 border border-[#7A0019] text-[#7A0019] hover:bg-[#7A0019] hover:text-white rounded transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="border border-neutral-100 rounded divide-y divide-neutral-50 max-h-48 overflow-y-auto bg-neutral-50/50">
                  {settings.reasons.map((r: string, idx: number) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-2 text-sm text-neutral-700">
                      <span>{r}</span>
                      <button 
                        type="button" 
                        onClick={() => removeReason(idx)}
                        className="text-neutral-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligible Categories */}
              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Eligible Product Categories</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {["Silk", "Wedding", "Designer", "Cotton", "Festive"].map(cat => {
                    const active = (settings.eligible_categories || []).includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-2 text-xs font-medium border rounded text-left transition-all ${
                          active
                            ? "border-[#7A0019] bg-[#7A0019]/5 text-[#7A0019]"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-current" /> {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Form Submit Button */}
          <div className="border-t border-neutral-100 pt-6 flex justify-end">
            <button 
              type="submit" 
              disabled={savingSettings}
              className="btn-luxe !px-8"
            >
              {savingSettings ? "Saving Settings..." : "Save Policy Config"}
            </button>
          </div>
        </form>
      )}

      {/* Return Request Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto animate-[reveal-up_.3s_ease]">
            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3.5">
                <h2 className="font-serif text-xl text-[#1a0d0d]">Return Request Details</h2>
                <ReturnStatusBadge status={selectedReturn.status} />
              </div>
              <button 
                type="button"
                onClick={() => setSelectedReturn(null)} 
                className="text-neutral-400 hover:text-neutral-600 p-1.5"
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Tracking ID & Dates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-xs">
                <div>
                  <div className="text-neutral-400 uppercase tracking-widest font-semibold mb-1">Return ID</div>
                  <div className="font-mono font-bold text-[#1a0d0d]">RET-{selectedReturn.id.slice(0, 8).toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-neutral-400 uppercase tracking-widest font-semibold mb-1">Order ID</div>
                  <div className="font-mono text-neutral-700">#{selectedReturn.order_id.slice(0, 8)}</div>
                </div>
                <div>
                  <div className="text-neutral-400 uppercase tracking-widest font-semibold mb-1">Requested On</div>
                  <div className="text-neutral-700">{new Date(selectedReturn.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-neutral-400 uppercase tracking-widest font-semibold mb-1">Delivered On</div>
                  <div className="text-neutral-700">{selectedReturn.delivery_date ? new Date(selectedReturn.delivery_date).toLocaleDateString() : "Not recorded"}</div>
                </div>
              </div>

              {/* Saree & Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Product details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><ShoppingBag size={13} /> Saree / Product</h4>
                  <div className="flex gap-4 border border-neutral-100 p-3 rounded-lg bg-neutral-50/20">
                    {selectedReturn.product_image ? (
                      <img src={selectedReturn.product_image} alt={selectedReturn.product_name} className="w-16 h-20 object-cover rounded border border-neutral-200 shrink-0" />
                    ) : (
                      <div className="w-16 h-20 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 shrink-0"><ShoppingBag size={20} /></div>
                    )}
                    <div className="space-y-1">
                      <div className="font-serif text-base text-[#1a0d0d] font-medium">{selectedReturn.product_name}</div>
                      {selectedReturn.item_details && (
                        <div className="text-xs text-neutral-500">
                          {selectedReturn.item_details.color && `Color: ${selectedReturn.item_details.color} `}
                          {selectedReturn.item_details.size && `· Size: ${selectedReturn.item_details.size}`}
                        </div>
                      )}
                      <div className="text-sm font-semibold text-[#7A0019] mt-2">
                        {selectedReturn.price ? `₹${Number(selectedReturn.price).toLocaleString("en-IN")}` : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><User size={13} /> Customer details</h4>
                  <div className="border border-neutral-100 p-3.5 rounded-lg bg-neutral-50/20 space-y-1.5 text-sm">
                    <div className="font-semibold text-[#1a0d0d]">{selectedReturn.customer_name || "Draupadi Customer"}</div>
                    {selectedReturn.customer_email && <div className="text-neutral-500 text-xs">{selectedReturn.customer_email}</div>}
                    <div className="text-xs text-neutral-400 flex items-center gap-1 pt-1.5 border-t border-neutral-100 mt-2">
                      <Clock size={12} /> Registered on system
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason & Comments */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><MessageSquare size={13} /> Reason & Explanations</h4>
                <div className="border border-neutral-100 p-4 rounded-lg bg-neutral-50/40 space-y-2.5">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400">Reason dropdown selected:</span>
                    <p className="text-sm font-medium text-[#7A0019]">{selectedReturn.reason}</p>
                  </div>
                  {selectedReturn.comments && (
                    <div>
                      <span className="text-xs font-semibold text-neutral-400">Additional details:</span>
                      <p className="text-sm text-neutral-700 leading-relaxed bg-white p-2.5 rounded border border-neutral-100 mt-1">{selectedReturn.comments}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Return images */}
              {selectedReturn.images && selectedReturn.images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><ImageIcon size={13} /> Uploaded Product Images</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {selectedReturn.images.map((img: string, idx: number) => (
                      <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="relative group aspect-square rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 hover:border-[#7A0019] transition-all">
                        <img src={img} alt="Return product proof" className="w-full h-full object-cover transition group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <ExternalLink size={14} className="text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reject / Pickup forms */}
              {showRejectForm && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3 animate-[reveal-up_.25s_ease]">
                  <label className="text-xs font-semibold text-rose-800 uppercase tracking-widest">Provide Decline Reason</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter why this return is rejected (shown to customer)..."
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded text-sm outline-none focus:border-rose-500"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button type="button" onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 border border-neutral-300 text-neutral-600 rounded bg-white hover:bg-neutral-50">Cancel</button>
                    <button type="button" onClick={() => handleReject(selectedReturn)} className="px-3 py-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 font-semibold">Submit Reject</button>
                  </div>
                </div>
              )}

              {showPickupForm && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3 animate-[reveal-up_.25s_ease]">
                  <label className="text-xs font-semibold text-indigo-800 uppercase tracking-widest">Pickup Schedule Details</label>
                  <input 
                    type="text"
                    value={pickupDetails}
                    onChange={(e) => setPickupDetails(e.target.value)}
                    placeholder="e.g. Courier: Delhivery, Date: 8th July, Tracking: RET-TRK-987"
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded text-sm outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button type="button" onClick={() => setShowPickupForm(false)} className="px-3 py-1.5 border border-neutral-300 text-neutral-600 rounded bg-white hover:bg-neutral-50">Cancel</button>
                    <button type="button" onClick={() => handleSchedulePickup(selectedReturn)} className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold">Schedule Pickup</button>
                  </div>
                </div>
              )}

              {/* Show rejection details if rejected */}
              {selectedReturn.status === "rejected" && selectedReturn.rejection_reason && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm">
                  <strong>Rejection Reason entered:</strong>
                  <p className="mt-1 font-serif italic">"{selectedReturn.rejection_reason}"</p>
                </div>
              )}

              {/* Show pickup details if scheduled */}
              {selectedReturn.pickup_details && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-sm">
                  <strong>Pickup Courier Details:</strong>
                  <p className="mt-1 font-mono">{selectedReturn.pickup_details}</p>
                </div>
              )}
            </div>

            {/* Modal Footer / Workflows */}
            <footer className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex flex-wrap justify-between items-center gap-3">
              <div className="text-xs text-neutral-500 font-serif">
                Select actions to advance this reverse request.
              </div>
              <div className="flex gap-2">
                {selectedReturn.status === "requested" && (
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowRejectForm(true);
                        setShowPickupForm(false);
                      }} 
                      className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <X size={14} /> Reject Request
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleApprove(selectedReturn)} 
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Check size={14} /> Approve Return
                    </button>
                  </>
                )}

                {selectedReturn.status === "approved" && (
                  <button 
                    type="button"
                    onClick={() => {
                      setShowPickupForm(true);
                      setShowRejectForm(false);
                    }} 
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Calendar size={14} /> Schedule Pickup
                  </button>
                )}

                {selectedReturn.status === "pickup_scheduled" && (
                  <button 
                    type="button"
                    onClick={() => updateStatus(selectedReturn, "picked_up")} 
                    className="px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Truck size={14} /> Mark Picked Up
                  </button>
                )}

                {selectedReturn.status === "picked_up" && (
                  <button 
                    type="button"
                    onClick={() => updateStatus(selectedReturn, "refund_initiated")} 
                    className="px-4 py-2 bg-fuchsia-600 text-white hover:bg-fuchsia-700 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <DollarSign size={14} /> Initiate Refund
                  </button>
                )}

                {selectedReturn.status === "refund_initiated" && (
                  <button 
                    type="button"
                    onClick={() => updateStatus(selectedReturn, "refund_completed")} 
                    className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check size={14} /> Mark Refund Completed
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => setSelectedReturn(null)} 
                  className="px-4 py-2 border border-neutral-300 text-neutral-600 bg-white hover:bg-neutral-50 rounded text-xs"
                >
                  Close
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
