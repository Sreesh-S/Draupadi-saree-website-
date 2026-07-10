import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Package, 
  Truck, 
  PackageCheck,
  ChevronRight,
  Search,
  Download,
  RotateCcw,
  XCircle,
  HelpCircle,
  Upload,
  AlertTriangle,
  ChevronLeft,
  X,
  DollarSign
} from "lucide-react";
import { Navbar, Footer } from "./index";
import { cart } from "@/lib/cart";

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

export const Route = createFileRoute("/orders")({
  ssr: false,
  component: OrdersPage,
});

const FLOW = ["placed", "accepted", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

const STATUS_DETAILS: Record<string, { label: string; desc: string; icon: any }> = {
  placed: { label: "Placed", desc: "We have received your order details.", icon: Clock },
  accepted: { label: "Accepted", desc: "Your order has been accepted by our atelier.", icon: CheckCircle2 },
  processing: { label: "Processing", desc: "Our master artisans are preparing your heirloom weave.", icon: Package },
  packed: { label: "Packed", desc: "Your saree has been hand-packed in our signature muslin.", icon: PackageCheck },
  shipped: { label: "Shipped", desc: "Your parcel is in transit with our premium courier partner.", icon: Truck },
  out_for_delivery: { label: "Out For Delivery", desc: "Our local courier is on their way to your doorstep.", icon: Truck },
  delivered: { label: "Delivered", desc: "Received. May this weave drape your moments in elegance!", icon: CheckCircle2 },
};

const RETURN_FLOW = ["requested", "under_review", "approved", "pickup_scheduled", "picked_up", "refund_initiated", "refund_completed"];

const RETURN_STATUS_DETAILS: Record<string, { label: string; desc: string; icon: any }> = {
  requested: { label: "Return Requested", desc: "Your return request has been submitted.", icon: Clock },
  under_review: { label: "Under Review", desc: "Our atelier quality specialists are reviewing the details.", icon: Package },
  approved: { label: "Approved", desc: "Your return request has been approved.", icon: CheckCircle2 },
  pickup_scheduled: { label: "Pickup Scheduled", desc: "Courier pickup has been scheduled for your drape.", icon: Truck },
  picked_up: { label: "Picked Up", desc: "The saree has been collected by our delivery partner.", icon: Truck },
  refund_initiated: { label: "Refund Initiated", desc: "Refund has been initiated to your source account.", icon: DollarSign },
  refund_completed: { label: "Refund Completed", desc: "Refund is processed. Thank you for shopping with us.", icon: CheckCircle2 },
};

function OrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [returnSettings, setReturnSettings] = useState<any>({
    enable_returns: true,
    return_window: 3,
    reasons: ["Wrong Product", "Damaged Product", "Defective Product", "Quality Issue", "Wrong Size", "Other"]
  });
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);

  // Filters, search, pagination state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Return modal/form state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrder, setReturnOrder] = useState<any | null>(null);
  const [returnItem, setReturnItem] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnComments, setReturnComments] = useState("");
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Support modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportOrder, setSupportOrder] = useState<any | null>(null);
  const [submittingSupport, setSubmittingSupport] = useState(false);

  async function loadData(userId: string) {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: oData, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (oErr) throw oErr;
      setOrders(oData ?? []);

      // Fetch Returns
      const { data: rData, error: rErr } = await supabase
        .from("returns")
        .select("*")
        .eq("user_id", userId);
      if (rErr) throw rErr;
      setReturns(rData ?? []);

      // Fetch Return Settings
      const { data: sData } = await supabase
        .from("return_settings")
        .select("*")
        .maybeSingle();
      if (sData) {
        setReturnSettings(sData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load order history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadData(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData(session.user.id);
      } else {
        setOrders([]);
        setReturns([]);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Cancel order before shipping
  async function handleCancelOrder(orderId: string) {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Order cancelled successfully");
      if (user) loadData(user.id);
      if (trackingOrder?.id === orderId) {
        setTrackingOrder({ ...trackingOrder, status: "cancelled" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  }

  // Add items back to cart (Reorder)
  const handleReorder = (orderItems: any[]) => {
    try {
      orderItems.forEach(item => {
        cart.add({
          id: item.id || item.name,
          name: item.name,
          price: Number(item.price),
          img: item.img || item.thumbnail || ""
        });
      });
      toast.success("Added all items to your cart!");
      // Force cart drawer open in homepage or navigate
      window.location.href = "/?cart=open";
    } catch (err) {
      toast.error("Failed to reorder items");
    }
  };

  // Buy a single item again
  const handleBuyAgain = (item: any) => {
    try {
      cart.add({
        id: item.id || item.name,
        name: item.name,
        price: Number(item.price),
        img: item.img || item.thumbnail || ""
      });
      toast.success(`Added "${item.name}" to cart`);
      window.location.href = "/?cart=open";
    } catch (err) {
      toast.error("Failed to add item to cart");
    }
  };

  // Printable Invoice view
  const downloadInvoice = (o: any) => {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Pop-up blocker is enabled. Please allow pop-ups to print.");
    
    const addr = o.shipping_address || {};
    const items = o.items || [];
    const itemsHtml = items.map((it: any) => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: left;">
          <strong>${it.name}</strong>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center;">${it.size || "Free Size"}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center;">${it.color || "Default"}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity ?? it.qty}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(it.price).toLocaleString("en-IN")}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right;">₹${((it.quantity ?? it.qty) * Number(it.price)).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    w.document.write(`
      <html>
        <head>
          <title>Invoice - ${o.invoice_no || o.id.slice(0, 8)}</title>
          <style>
            body { font-family: sans-serif; color: #1a0d0d; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #7A0019; padding-bottom: 15px; margin-bottom: 35px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 26px; color: #7A0019; font-weight: bold; font-family: serif; letter-spacing: 1px; }
            .invoice-title { font-size: 22px; text-transform: uppercase; color: #7A0019; letter-spacing: 2px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
            th { background-color: #fbf8f3; padding: 10px; border-bottom: 2px solid #ddd; text-align: left; }
            .totals { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; }
            .total-row { display: flex; justify-content: space-between; width: 280px; padding: 6px 0; }
            .grand-total { border-top: 1px dashed #7A0019; font-size: 16px; font-weight: bold; color: #7A0019; padding-top: 10px; margin-top: 5px; }
            .footer { margin-top: 70px; text-align: center; font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DRAUPADI ATELIER</div>
              <div style="font-size: 11px; color: #666; margin-top: 3px;">Heritage Silk & Bridal Sarees</div>
            </div>
            <div class="invoice-title">Tax Invoice</div>
          </div>
          
          <div class="details">
            <div>
              <strong>Billed To:</strong><br/>
              ${addr.full_name || "Valued Client"}<br/>
              ${addr.address_line1 || ""}, ${addr.address_line2 || ""}<br/>
              ${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}<br/>
              Phone: ${addr.phone || ""}
            </div>
            <div style="text-align: right;">
              <strong>Invoice Number:</strong> ${o.invoice_no || "INV-2026-" + o.id.slice(0,6).toUpperCase()}<br/>
              <strong>Order ID:</strong> #${o.id.slice(0, 8)}<br/>
              <strong>Order Date:</strong> ${new Date(o.created_at).toLocaleDateString("en-IN")}<br/>
              <strong>Payment Status:</strong> ${o.payment_status?.toUpperCase() || "PAID"}
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th style="text-align: left;">Saree Selection</th>
                <th style="text-align: center; width: 80px;">Size</th>
                <th style="text-align: center; width: 80px;">Color</th>
                <th style="text-align: center; width: 50px;">Qty</th>
                <th style="text-align: right; width: 100px;">Unit Price</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${Number(o.subtotal).toLocaleString("en-IN")}</span>
            </div>
            <div class="total-row">
              <span>Shipping & Handloom Packaging:</span>
              <span>${Number(o.shipping) === 0 ? "Free" : "₹" + Number(o.shipping).toLocaleString("en-IN")}</span>
            </div>
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>₹${Number(o.total).toLocaleString("en-IN")}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank you for choosing Draupadi Atelier. We celebrate your drape.<br/>
            For support and inquiries, please email support@draupadi.in
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  // Image Upload handler for returns
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const file = files[0];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;
      
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `return-${Math.random().toString(36).substring(2, 12)}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage.from("returns").upload(filePath, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from("returns").getPublicUrl(filePath);
      setReturnImages(prev => [...prev, publicUrl]);
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit return request
  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnReason) return toast.error("Please select a reason for return");
    if (!returnItem) return toast.error("Please select an item to return");
    setSubmittingReturn(true);

    try {
      const { error } = await supabase
        .from("returns")
        .insert({
          order_id: returnOrder.id,
          user_id: user.id,
          customer_name: returnOrder.shipping_address?.full_name || user.email,
          customer_email: user.email,
          product_name: returnItem.name,
          product_image: returnItem.img || returnItem.thumbnail || "",
          price: returnItem.price,
          item_details: {
            size: returnItem.size || "Free Size",
            color: returnItem.color || "Default"
          },
          reason: returnReason,
          comments: returnComments,
          images: returnImages,
          delivery_date: returnOrder.delivered_at || returnOrder.updated_at
        });

      if (error) throw error;

      toast.success("Return Request Submitted Successfully");
      setShowReturnModal(false);
      setReturnOrder(null);
      setReturnItem(null);
      setReturnReason("");
      setReturnComments("");
      setReturnImages([]);
      
      if (user) loadData(user.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setSubmittingReturn(false);
    }
  }

  // Submit support message
  async function handleSubmitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportMessage.trim()) return toast.error("Please write a message");
    setSubmittingSupport(true);

    try {
      // Simulate sending query
      const { error } = await supabase
        .from("contact_queries")
        .insert({
          name: supportOrder.shipping_address?.full_name || user.email,
          email: user.email,
          phone: supportOrder.shipping_address?.phone || "",
          message: `[Order #${supportOrder.id.slice(0, 8)} Support Query]:\n${supportMessage}`
        });

      if (error) throw error;

      toast.success("Support query submitted. We will contact you soon!");
      setShowSupportModal(false);
      setSupportMessage("");
      setSupportOrder(null);
    } catch (err: any) {
      toast.error("Failed to submit query");
    } finally {
      setSubmittingSupport(false);
    }
  }

  // Filtering & Sorting Logic
  const filteredOrders = orders.filter(o => {
    // Status Filter
    const activeStatuses = ["placed", "accepted", "processing", "packed", "shipped", "out_for_delivery"];
    if (statusFilter === "active" && !activeStatuses.includes(o.status)) return false;
    if (statusFilter === "delivered" && o.status !== "delivered") return false;
    if (statusFilter === "cancelled" && o.status !== "cancelled") return false;
    if (statusFilter === "returns") {
      const hasReturn = returns.some(r => r.order_id === o.id);
      if (!hasReturn) return false;
    }

    // Search Filter
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    const items = o.items || [];
    const matchesItem = items.some((it: any) => it.name.toLowerCase().includes(searchLower));
    return o.id.toLowerCase().startsWith(searchLower) || (o.invoice_no && o.invoice_no.toLowerCase().includes(searchLower)) || matchesItem;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "price_high") return Number(b.total) - Number(a.total);
    if (sortBy === "price_low") return Number(a.total) - Number(b.total);
    return 0;
  });

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrdersList = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bg-[var(--ivory)] min-h-screen text-[var(--ink)] flex flex-col pt-20">
      <Navbar wishlist={0} />

      <main className="flex-grow max-w-5xl w-full mx-auto px-4 md:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#7A0019] rounded-full animate-spin"></div>
            <p className="text-sm text-neutral-500 font-serif">Unfolding your history…</p>
          </div>
        ) : trackingOrder ? (
          <OrderDetailView 
            order={trackingOrder} 
            returns={returns}
            returnSettings={returnSettings}
            onBack={() => setTrackingOrder(null)} 
            onCancel={() => handleCancelOrder(trackingOrder.id)}
            onInvoice={() => downloadInvoice(trackingOrder)}
            onReorder={() => handleReorder(trackingOrder.items || [])}
            onSupport={() => { setSupportOrder(trackingOrder); setShowSupportModal(true); }}
            onReturn={() => { setReturnOrder(trackingOrder); setReturnItem(trackingOrder.items?.[0] || null); setShowReturnModal(true); }}
          />
        ) : (
          <div className="space-y-8 animate-[reveal-up_.35s_ease]">
            {/* Page Title */}
            <div>
              <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Heritage Atelier</div>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1a0d0d]">Your Orders</h1>
              <p className="text-sm text-neutral-500 mt-1">Review, track, and manage your heirloom saree selections.</p>
            </div>

            {user ? (
              <div className="space-y-6">
                
                {/* Search & Filter Bar */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Search */}
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
                    <input 
                      type="text" 
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      placeholder="Search by ID, product, invoice..." 
                      className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-md outline-none focus:border-[#7A0019] text-xs bg-neutral-50/50"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto text-xs">
                    <select 
                      value={statusFilter} 
                      onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="border border-neutral-200 rounded px-2.5 py-1.5 bg-white outline-none"
                    >
                      <option value="all">All Orders</option>
                      <option value="active">Active Track</option>
                      <option value="delivered">Delivered</option>
                      <option value="returns">Returns</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select 
                      value={sortBy} 
                      onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                      className="border border-neutral-200 rounded px-2.5 py-1.5 bg-white outline-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="price_low">Price: Low to High</option>
                    </select>
                  </div>
                </div>

                {/* Orders List */}
                {sortedOrders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-neutral-200 p-16 text-center text-neutral-400 space-y-4">
                    <ShoppingBag className="mx-auto mb-3 opacity-40 text-neutral-300" size={42} />
                    <p className="text-sm font-serif">No orders match your current selections.</p>
                    <Link to="/" className="inline-flex btn-luxe !px-5 !py-2.5">Shop Our Loom</Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentOrdersList.map((o) => {
                      const items = (o.items ?? []) as any[];
                      const retRequest = returns.find(r => r.order_id === o.id);
                      return (
                        <div 
                          key={o.id} 
                          className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Order Header */}
                          <header className="bg-neutral-50 px-6 py-4 border-b border-neutral-100 flex flex-wrap justify-between items-center gap-4 text-xs text-neutral-500">
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                              <div>
                                <span className="uppercase tracking-widest text-[0.6rem] block text-neutral-400 mb-0.5">Order Placed</span>
                                <span className="font-medium text-neutral-700">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </div>
                              <div>
                                <span className="uppercase tracking-widest text-[0.6rem] block text-neutral-400 mb-0.5">Total Amount</span>
                                <span className="font-semibold text-[#7A0019]">₹{Number(o.total).toLocaleString("en-IN")}</span>
                              </div>
                              <div>
                                <span className="uppercase tracking-widest text-[0.6rem] block text-neutral-400 mb-0.5">Order ID</span>
                                <span className="font-mono text-neutral-700">#{o.id.slice(0, 8)}</span>
                              </div>
                              {o.invoice_no && (
                                <div>
                                  <span className="uppercase tracking-widest text-[0.6rem] block text-neutral-400 mb-0.5">Invoice No</span>
                                  <span className="font-mono text-neutral-700">{o.invoice_no}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={o.status} />
                              {retRequest && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[0.65rem] font-medium tracking-wide uppercase px-2 py-0.5 rounded">
                                  Return requested
                                </span>
                              )}
                            </div>
                          </header>

                          {/* Order items */}
                          <div className="p-6 divide-y divide-neutral-100">
                            {items.map((it, idx) => (
                              <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 justify-between">
                                <div className="flex gap-4">
                                  {it.img || it.thumbnail ? (
                                    <img src={it.img || it.thumbnail} alt={it.name} className="w-16 h-20 object-cover rounded border border-neutral-200 shrink-0" />
                                  ) : (
                                    <div className="w-16 h-20 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 shrink-0"><ShoppingBag size={20} /></div>
                                  )}
                                  <div className="space-y-1">
                                    <h4 className="font-serif text-base text-[#1a0d0d] font-medium">{it.name}</h4>
                                    <div className="text-xs text-neutral-500">
                                      Qty: {it.quantity ?? it.qty} · price: ₹{Number(it.price).toLocaleString("en-IN")}
                                    </div>
                                    <div className="text-[0.7rem] text-neutral-400 flex flex-wrap gap-x-2.5">
                                      {it.color && <span>Color: {it.color}</span>}
                                      {it.size && <span>· Size: {it.size}</span>}
                                    </div>
                                    {o.status === "delivered" && (
                                      <button 
                                        onClick={() => handleBuyAgain(it)}
                                        className="text-xs text-[#7A0019] hover:underline flex items-center gap-1 mt-2.5"
                                      >
                                        <RotateCcw size={12} /> Buy Again
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Right Side item actions */}
                                <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 mt-2 sm:mt-0">
                                  <div className="text-sm font-semibold text-[#1a0d0d]">
                                    ₹{((it.quantity ?? it.qty) * Number(it.price)).toLocaleString("en-IN")}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order actions footer */}
                          <footer className="bg-neutral-50/50 px-6 py-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-neutral-400">
                              Estimated Delivery: <span className="text-neutral-700 font-medium">{new Date(o.estimated_delivery).toLocaleDateString("en-IN")}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setTrackingOrder(o)}
                                className="px-4 py-2 border border-neutral-200 hover:border-[#7A0019] text-neutral-700 hover:text-[#7A0019] rounded transition-all font-medium flex items-center gap-1.5 bg-white"
                              >
                                <Truck size={13} /> Track Order & Returns
                              </button>
                              <button 
                                onClick={() => downloadInvoice(o)}
                                className="px-4 py-2 border border-neutral-200 hover:border-[#7A0019] text-neutral-700 hover:text-[#7A0019] rounded transition-all font-medium flex items-center gap-1.5 bg-white"
                              >
                                <Download size={13} /> Invoice
                              </button>
                              <button 
                                onClick={() => handleReorder(items)}
                                className="px-4 py-2 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded transition-all font-medium"
                              >
                                Reorder Entire
                              </button>
                            </div>
                          </footer>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-neutral-200 rounded disabled:opacity-40 hover:bg-neutral-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`w-8 h-8 rounded text-xs font-semibold transition ${
                          currentPage === i + 1 
                            ? "bg-[#7A0019] text-white" 
                            : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-neutral-200 rounded disabled:opacity-40 hover:bg-neutral-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center shadow-sm max-w-xl mx-auto space-y-5">
                <div className="w-16 h-16 rounded-full bg-[var(--beige)] flex items-center justify-center text-[var(--maroon)] mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h2 className="font-serif text-2xl text-[#1a0d0d]">Sign In to View Orders</h2>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  To trace your heritage drapes and view order histories, please sign in to your Draupadi account.
                </p>
                <Link to="/auth" search={{ redirect: "/orders" }} className="inline-flex btn-luxe !px-6 !py-3">
                  Sign In to Account
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Return Request Modal */}
      {showReturnModal && returnOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-[reveal-up_.3s_ease]">
            <header className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-serif text-xl text-[#1a0d0d]">Return Request Form</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-5">
              
              {/* Product selector dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Select Item to Return</label>
                <select 
                  value={returnItem ? JSON.stringify(returnItem) : ""}
                  onChange={(e) => setReturnItem(e.target.value ? JSON.parse(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm bg-white"
                  required
                >
                  {(returnOrder.items || []).map((it: any, idx: number) => (
                    <option key={idx} value={JSON.stringify(it)}>{it.name} - ₹{Number(it.price).toLocaleString("en-IN")}</option>
                  ))}
                </select>
              </div>

              {/* Selected Item Card */}
              {returnItem && (
                <div className="flex gap-4 border border-neutral-100 p-3 rounded bg-neutral-50/30">
                  {returnItem.img || returnItem.thumbnail ? (
                    <img src={returnItem.img || returnItem.thumbnail} alt={returnItem.name} className="w-12 h-16 object-cover rounded border border-neutral-200" />
                  ) : (
                    <div className="w-12 h-16 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 shrink-0"><ShoppingBag size={16} /></div>
                  )}
                  <div className="space-y-0.5 text-xs text-neutral-500">
                    <div className="font-medium text-neutral-800 text-sm">{returnItem.name}</div>
                    <div>Qty: {returnItem.quantity ?? returnItem.qty} · Color: {returnItem.color || "Default"}</div>
                    <div className="font-semibold text-[#7A0019] mt-1">₹{Number(returnItem.price).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              )}

              {/* Reason selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Reason for Return</label>
                <select 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm bg-white"
                  required
                >
                  <option value="">Choose a reason...</option>
                  {(returnSettings.reasons || []).map((r: string) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Additional Comments</label>
                <textarea 
                  value={returnComments}
                  onChange={(e) => setReturnComments(e.target.value)}
                  placeholder="Explain why you wish to return this handwoven saree (optional)..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm"
                  rows={4}
                />
              </div>

              {/* Upload Proof Images */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Upload Product Images (Optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="w-16 h-16 rounded border-2 border-dashed border-neutral-200 hover:border-[#7A0019] flex flex-col items-center justify-center text-neutral-400 hover:text-[#7A0019] cursor-pointer transition-colors relative">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-neutral-200 border-t-[#7A0019] rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Add</span>
                      </>
                    )}
                  </label>
                  
                  {returnImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border border-neutral-200 overflow-hidden bg-neutral-50 shrink-0">
                      <img src={img} alt="Return product proof" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setReturnImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-black/55 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-5 flex justify-end gap-2 text-xs font-semibold uppercase tracking-wider">
                <button 
                  type="button" 
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2.5 border border-neutral-300 text-neutral-600 rounded bg-white hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReturn}
                  className="px-5 py-2.5 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded disabled:opacity-40"
                >
                  {submittingReturn ? "Submitting..." : "Submit Return Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Query Modal */}
      {showSupportModal && supportOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-md w-full animate-[reveal-up_.3s_ease]">
            <header className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-serif text-lg text-[#1a0d0d]">Contact Atelier Support</h2>
              <button onClick={() => setShowSupportModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmitSupport} className="p-6 space-y-4">
              <div className="text-xs text-neutral-500">
                You are contacting support regarding Order <span className="font-mono text-neutral-700">#{supportOrder.id.slice(0, 8)}</span>.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Describe Your Issue</label>
                <textarea 
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Tell us what you need help with (e.g., stitching edits, size corrections, courier delivery delays)..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded outline-none focus:border-[#7A0019] text-sm"
                  rows={5}
                  required
                />
              </div>

              <div className="border-t border-neutral-100 pt-4 flex justify-end gap-2 text-xs font-semibold uppercase tracking-wider">
                <button 
                  type="button" 
                  onClick={() => setShowSupportModal(false)}
                  className="px-4 py-2.5 border border-neutral-300 text-neutral-600 rounded bg-white hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingSupport}
                  className="px-5 py-2.5 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded disabled:opacity-40"
                >
                  {submittingSupport ? "Sending Query..." : "Submit Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetailView({ 
  order, 
  returns,
  returnSettings,
  onBack, 
  onCancel,
  onInvoice,
  onReorder,
  onSupport,
  onReturn
}: { 
  order: any; 
  returns: any[];
  returnSettings: any;
  onBack: () => void; 
  onCancel: () => void;
  onInvoice: () => void;
  onReorder: () => void;
  onSupport: () => void;
  onReturn: () => void;
}) {
  const addr = (order.shipping_address ?? {}) as any;
  const items = (order.items ?? []) as any[];
  
  const currentIdx = FLOW.indexOf(order.status);
  const isCancelled = ["cancelled", "rejected", "refunded"].includes(order.status);
  
  // Find associated return request
  const returnRequest = returns.find(r => r.order_id === order.id);
  const currentReturnIdx = returnRequest ? RETURN_FLOW.indexOf(returnRequest.status) : -1;

  // Calculate return active window eligibility (3 days from delivered_at or order.updated_at)
  const deliveryDate = order.delivered_at || order.updated_at;
  const deliveryTime = new Date(deliveryDate).getTime();
  const timePassed = Date.now() - deliveryTime;
  const returnWindowDays = returnSettings ? returnSettings.return_window : 3;
  const returnWindowInMs = returnWindowDays * 24 * 60 * 60 * 1000;
  
  const isReturnEnabled = returnSettings ? returnSettings.enable_returns : true;
  const isWithinReturnWindow = timePassed <= returnWindowInMs;
  const daysLeft = Math.max(0, returnWindowDays - Math.floor(timePassed / (24 * 60 * 60 * 1000)));

  return (
    <div className="space-y-8 animate-[reveal-up_.35s_ease]">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[var(--maroon)] transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Back to order list
        </button>
        
        <div className="flex gap-2">
          {/* Cancel Order (visible/active before shipping) */}
          {(order.status === "placed" || order.status === "accepted") && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              <XCircle size={14} /> Cancel Order
            </button>
          )}

          {/* Contact Support */}
          <button 
            onClick={onSupport}
            className="px-4 py-2 border border-neutral-200 hover:border-[#7A0019] text-neutral-700 hover:text-[#7A0019] rounded text-xs font-semibold flex items-center gap-1.5 bg-white transition-colors uppercase tracking-wider"
          >
            <HelpCircle size={14} /> Support
          </button>
          
          {/* Download Invoice */}
          <button 
            onClick={onInvoice}
            className="px-4 py-2 border border-neutral-200 hover:border-[#7A0019] text-neutral-700 hover:text-[#7A0019] rounded text-xs font-semibold flex items-center gap-1.5 bg-white transition-colors uppercase tracking-wider"
          >
            <Download size={14} /> Printable Invoice
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-[#1a0d0d]">Order #{order.id.slice(0, 8)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
            <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(order.created_at).toLocaleString()}</span>
            <span className="flex items-center gap-1"><CreditCard size={13} /> {order.payment_method?.toUpperCase()}</span>
          </div>
        </div>
        <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
          <div className="text-xs text-neutral-400">Total Invoice Amount</div>
          <div className="text-2xl font-serif text-[#7A0019] mt-0.5">₹{Number(order.total).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Return policy details card */}
      {isReturnEnabled && order.status === "delivered" && (
        <div className={`p-4 rounded-xl border text-sm flex items-center justify-between flex-wrap gap-4 ${
          isWithinReturnWindow && !returnRequest 
            ? "bg-amber-50 border-amber-200 text-amber-900 animate-pulse" 
            : "bg-neutral-50 border-neutral-200 text-neutral-700"
        }`}>
          <div>
            <strong>Return Window Details:</strong>
            <p className="text-xs mt-0.5">Returns are available for {returnWindowDays} days after successful delivery.</p>
          </div>
          <div>
            {returnRequest ? (
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7A0019]">Return requested</span>
            ) : isWithinReturnWindow ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-800">{daysLeft} days remaining</span>
                <button 
                  onClick={onReturn}
                  className="px-4.5 py-2 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Return Order
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium text-neutral-500 italic">Return window has expired.</span>
            )}
          </div>
        </div>
      )}

      {/* Return Status Tracking (If Return Requested) */}
      {returnRequest && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h2 className="font-serif text-lg text-[#1a0d0d]">Return Request Progress</h2>
            <ReturnStatusBadge status={returnRequest.status} />
          </div>

          {returnRequest.status === "rejected" ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm">
              <strong>Reason for Rejection:</strong>
              <p className="mt-1 italic">"{returnRequest.rejection_reason || "Does not meet our return quality guidelines."}"</p>
            </div>
          ) : (
            /* Return Progress Timeline */
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 pt-4 relative">
              <div className="hidden md:block absolute top-[22px] left-[10%] right-[10%] h-[2px] bg-neutral-100 -z-0" />
              {RETURN_FLOW.map((s, i) => {
                const step = RETURN_STATUS_DETAILS[s];
                if (!step) return null;
                const Icon = step.icon;
                
                const isCompleted = i < currentReturnIdx;
                const isActive = i === currentReturnIdx;

                return (
                  <div key={s} className="flex flex-col items-center text-center relative z-10">
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isCompleted 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : isActive 
                            ? "bg-[#7A0019] border-[#7A0019] text-white scale-110 shadow-md ring-4 ring-[#7A0019]/15" 
                            : "bg-white border-neutral-200 text-neutral-300"
                      }`}
                    >
                      <Icon size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="mt-2.5">
                      <div className={`text-xs font-semibold ${isActive ? "text-[#7A0019]" : "text-neutral-700"}`}>{step.label}</div>
                      <p className="text-[9px] text-neutral-400 max-w-[100px] mx-auto mt-0.5 leading-tight">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline Status */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
          <h2 className="font-serif text-lg text-[#1a0d0d] pb-2 border-b border-neutral-100">Delivery Status Timeline</h2>

          {isCancelled ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm">
              This order status is marked as <strong className="uppercase">{order.status}</strong>. Please contact support if you have questions.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-100">
              {FLOW.map((s, i) => {
                const step = STATUS_DETAILS[s];
                if (!step) return null;
                const Icon = step.icon;
                
                const isCompleted = i < currentIdx;
                const isActive = i === currentIdx;

                return (
                  <div key={s} className="relative flex gap-4 items-start">
                    <div 
                      className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 z-10 ${
                        isCompleted 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : isActive 
                            ? "bg-[#7A0019] border-[#7A0019] text-white scale-110 shadow-md ring-4 ring-[#7A0019]/15" 
                            : "bg-white border-neutral-200 text-neutral-300"
                      }`}
                    >
                      <Icon size={10} className="stroke-[3]" />
                    </div>

                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold transition-colors duration-300 ${
                        isActive ? "text-[#7A0019]" : isCompleted ? "text-neutral-800" : "text-neutral-400"
                      }`}>
                        {step.label}
                      </h3>
                      <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                        isActive ? "text-neutral-600" : isCompleted ? "text-neutral-500" : "text-neutral-400"
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice Summary and Shipping */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><MapPin size={13} /> Destination</h3>
            <div className="text-sm">
              <div className="font-semibold text-[#1a0d0d]">{addr.full_name}</div>
              <div className="text-neutral-500 mt-0.5">{addr.phone} · {addr.email}</div>
              <div className="text-neutral-600 mt-2 leading-relaxed">
                {addr.address_line1}
                {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                <br />
                {addr.city}, {addr.state} – <span className="font-mono">{addr.pincode}</span>
                <br />
                {addr.country ?? "India"}
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          {!isCancelled && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><Truck size={13} /> Shipment Details</h3>
              <div className="text-xs space-y-2 text-neutral-600">
                <div>
                  <span className="font-semibold text-neutral-400 uppercase tracking-wide block">Delivery Partner</span>
                  <span className="text-sm text-[#1a0d0d] mt-0.5 block">{order.delivery_partner || "Delhivery Luxe"}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-400 uppercase tracking-wide block">Tracking Number</span>
                  <span className="text-sm font-mono text-neutral-700 mt-0.5 block">{order.tracking_number || "TRK9876543210"}</span>
                </div>
                {order.status === "delivered" && (
                  <div>
                    <span className="font-semibold text-neutral-400 uppercase tracking-wide block">Delivered On</span>
                    <span className="text-sm text-neutral-700 mt-0.5 block">{new Date(deliveryDate).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ordered Items */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5"><ShoppingBag size={13} /> Saree Selection</h3>
            
            <div className="divide-y divide-neutral-100">
              {items.map((it, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 flex gap-3 text-sm">
                  {it.img || it.thumbnail ? (
                    <img src={it.img || it.thumbnail} alt={it.name} className="w-10 h-12 object-cover rounded border border-neutral-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-12 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 shrink-0"><ShoppingBag size={14} /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#1a0d0d] truncate">{it.name}</h4>
                    <p className="text-xs text-neutral-400">
                      Qty {it.quantity ?? it.qty} · ₹{Number(it.price).toLocaleString("en-IN")} each
                    </p>
                  </div>
                  <div className="font-medium text-[#1a0d0d] shrink-0 text-right">
                    ₹{((it.quantity ?? it.qty) * Number(it.price)).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Shipping & Packaging</span>
                <span>{Number(order.shipping) === 0 ? "Free" : `₹${Number(order.shipping).toLocaleString("en-IN")}`}</span>
              </div>
              <div className="flex justify-between font-serif text-base text-[#1a0d0d] pt-2 border-t border-dashed">
                <span>Grand Total</span>
                <span className="font-bold">₹{Number(order.total).toLocaleString("en-IN")}</span>
              </div>
            </div>
            
            {/* Reorder Button */}
            <button 
              onClick={onReorder}
              className="w-full py-2.5 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Reorder All Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
