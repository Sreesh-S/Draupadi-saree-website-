import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUserRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Tag,
  Star,
  BarChart3,
  LogOut,
  Home,
  RotateCcw,
} from "lucide-react";
import { Logo } from "./index";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/returns", label: "Returns", icon: RotateCcw },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/queries", label: "Queries", icon: MessageSquare },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useUserRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = () => {
    if (!user || role !== "admin") return;
    supabase.from("notifications")
      .select("*")
      .eq("user_id", "admin")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifications(data ?? []);
      });
  };

  useEffect(() => {
    if (!user || role !== "admin") return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user, role, pathname]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    loadNotifications();
  };

  const handleNotificationClick = (n: any) => {
    supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => {
      loadNotifications();
    });

    if (n.type === "order_placed") navigate({ to: "/admin/orders" as any });
    else if (n.type === "return_requested") navigate({ to: "/admin/returns" as any });
    else if (n.type === "query_received") navigate({ to: "/admin/queries" as any });
    else if (n.type === "review_added") navigate({ to: "/admin/reviews" as any });

    setShowNotifications(false);
  };

  // Fetch pending returns count
  useEffect(() => {
    if (!user || role !== "admin") return;
    supabase
      .from("returns")
      .select("id", { head: true, count: "exact" })
      .eq("status", "requested")
      .then(({ count }) => {
        setPendingCount(count ?? 0);
      });
  }, [pathname, user, role]);

  // Dashboard Alert for active return requests on mount
  useEffect(() => {
    if (!user || role !== "admin") return;
    supabase
      .from("returns")
      .select("*")
      .eq("status", "requested")
      .then(({ data }) => {
        if (data && data.length > 0) {
          toast.info("Return Requests Pending", {
            description: `There are ${data.length} new return requests awaiting your review.`,
            duration: 8000
          });
        }
      });
  }, [user, role]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { redirect: "/admin" } as any });
    else if (role !== "admin") navigate({ to: "/" });
  }, [user, role, loading, navigate]);

  if (loading || !user || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0a0a] text-[var(--ivory)]">
        <div className="text-sm tracking-[0.3em] uppercase opacity-70">Verifying access…</div>
      </div>
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-[#fbf8f3] flex">
      <aside className="w-64 shrink-0 bg-[#1a0d0d] text-[var(--ivory)] flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo variant="dark" className="h-9" />
            <div>
              <div className="font-serif text-lg leading-none">Draupadi</div>
              <div className="text-[0.6rem] tracking-[0.3em] uppercase text-[var(--gold)] mt-1">Atelier Admin</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                    : "text-[var(--ivory)]/70 hover:bg-white/5 hover:text-[var(--ivory)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{n.label}</span>
                </div>
                {n.label === "Returns" && pendingCount > 0 && (
                  <span className="bg-[#7A0019] text-[var(--gold)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--gold)]/20 animate-pulse shrink-0">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--ivory)]/70 hover:bg-white/5">
            <Home size={16} /> View Site
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--ivory)]/70 hover:bg-white/5">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-400 font-semibold font-mono">
            Secure Atelier Layer
          </div>
          
          <div className="relative">
            <button 
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) handleMarkAllRead();
              }}
              className="relative w-10 h-10 inline-flex items-center justify-center rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-all outline-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#7A0019] text-[9px] font-bold text-[var(--gold)] border border-[var(--gold)]/20 grid place-items-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden z-50 text-[11px] animate-[reveal-up_.25s_ease]">
                <header className="px-4 py-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                  <span className="font-serif font-bold text-neutral-800 text-sm">Admin Alerts</span>
                  {unreadCount > 0 && <span className="text-[10px] text-[#7A0019] font-semibold">{unreadCount} new</span>}
                </header>
                <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors text-left ${!n.read ? "bg-[#7A0019]/5" : ""}`}
                      >
                        <div className="font-semibold text-neutral-800 flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[9px] text-neutral-400 font-normal">{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-neutral-500 mt-1 leading-normal">{n.message}</p>
                        <span className="text-[9px] text-[#7A0019] hover:underline block mt-1.5 font-medium">Review details →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="flex-grow">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
