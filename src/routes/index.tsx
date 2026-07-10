import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { toast } from "sonner";
import logoLight from "@/assets/draupadi-logo-transparent.png";
import logoDark from "@/assets/draupadi-logo-white.png";
import heroImg from "@/assets/hero-saree.jpg";
import bridalImg from "@/assets/bridal.jpg";
import sareeSilk from "@/assets/saree-silk.jpg";
import sareeDesigner from "@/assets/saree-designer.jpg";
import sareeBridal from "@/assets/saree-bridal.jpg";
import sareeParty from "@/assets/saree-party.jpg";
import sareeCotton from "@/assets/saree-cotton.jpg";
import sareeFestive from "@/assets/saree-festive.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DRAUPADI — Heritage Sarees Reimagined" },
      { name: "description", content: "Discover timeless silk, bridal and designer sarees crafted for every celebration. Elegance woven into every thread." },
      { property: "og:title", content: "DRAUPADI — Heritage Sarees Reimagined" },
      { property: "og:description", content: "Elegance woven into every thread." },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: Home,
});

/* ---------------- Small UI atoms ---------------- */

export const Logo = ({ className = "h-9", variant = "light" }: { className?: string; variant?: "light" | "dark" }) => {
  const src = variant === "dark" ? logoDark : logoLight;
  return (
    <img src={src} alt="Draupadi" className={`${className} object-contain`} />
  );
};

const GoldFlourish = () => (
  <svg width="80" height="14" viewBox="0 0 80 14" fill="none" className="text-[var(--gold)]">
    <path d="M0 7h28M52 7h28" stroke="currentColor" strokeWidth="1" />
    <path d="M40 1l3 6-3 6-3-6z" stroke="currentColor" strokeWidth="1" fill="none" />
    <circle cx="30" cy="7" r="1.2" fill="currentColor" />
    <circle cx="50" cy="7" r="1.2" fill="currentColor" />
  </svg>
);

const Stars = ({ n = 5 }: { n?: number }) => (
  <div className="flex gap-0.5 text-[var(--gold)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
    ))}
  </div>
);

/* ---------------- Reveal-on-scroll ---------------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------------- Data ---------------- */
export const navLinks: { label: string; href: string }[] = [
  { label: "Home", href: "/#home" },
  { label: "New Arrivals", href: "/#new-arrivals" },
  { label: "Wedding", href: "/#wedding" },
  { label: "Contact", href: "/#contact" },
  { label: "Your Orders", href: "/orders" },
];

const staticProducts = [
  { name: "Rukmini Kanchipuram Silk", price: 24999, old: 32999, img: sareeSilk, tag: "-24%", rating: 5, stock: 10 },
  { name: "Ivory Pearl Designer Drape", price: 38500, old: 45000, img: sareeDesigner, tag: "New", rating: 5, stock: 10 },
  { name: "Crimson Bridal Banarasi", price: 64999, old: 78000, img: sareeBridal, tag: "-17%", rating: 5, stock: 10 },
  { name: "Emerald Mysore Silk", price: 18999, old: 23999, img: sareeParty, tag: "Hot", rating: 4, stock: 10 },
  { name: "Blush Handloom Cotton", price: 7499, old: 9999, img: sareeCotton, tag: "-25%", rating: 4, stock: 10 },
  { name: "Royal Purple Banarasi", price: 29999, old: 36500, img: sareeFestive, tag: "New", rating: 5, stock: 10 },
  { name: "Maroon Zari Heritage", price: 21999, old: 27500, img: sareeSilk, tag: "-20%", rating: 5, stock: 10 },
  { name: "Garnet Wedding Couture", price: 54999, old: 68000, img: sareeBridal, tag: "Bridal", rating: 5, stock: 10 },
];

function useDbProducts() {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => {
    supabase.from("products").select("id, name, price, offer_price, thumbnail, images, discount_pct, is_new_arrival, is_bestseller, is_trending, stock")
      .eq("is_archived", false).order("created_at", { ascending: false }).then(({ data }) => {
        if (!data || data.length === 0) { setList(null); return; }
        setList(data.map((p: any) => ({
          name: p.name,
          price: Number(p.offer_price ?? p.price),
          old: p.offer_price ? Number(p.price) : Math.round(Number(p.price) * 1.25),
          img: p.thumbnail || (Array.isArray(p.images) && p.images[0]) || sareeSilk,
          tag: p.is_new_arrival ? "New" : p.is_bestseller ? "Hot" : p.discount_pct ? `-${p.discount_pct}%` : "Bridal",
          rating: 5,
          stock: p.stock !== undefined ? Number(p.stock) : 10,
        })));
      });
  }, []);
  return list ?? staticProducts;
}


const features = [
  { t: "Premium Quality", d: "Loomed by master weavers from heritage looms.", i: "M12 2l2.4 6.9H22l-6.1 4.5 2.3 7L12 16l-6.2 4.4 2.3-7L2 8.9h7.6z" },
  { t: "Handcrafted Designs", d: "Each piece is signed by the artisan who wove it.", i: "M3 12c2-4 6-7 9-7s7 3 9 7-3 9-9 9-11-5-9-9z" },
  { t: "Secure Payments", d: "256-bit encrypted checkout with global gateways.", i: "M5 11V8a7 7 0 0114 0v3M4 11h16v10H4z" },
  { t: "Fast Delivery", d: "Hand-packed and shipped within 48 hours worldwide.", i: "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" },
  { t: "Easy Returns", d: "Seven-day no-questions return on every order.", i: "M3 12a9 9 0 1015-7l3-3M3 5v5h5" },
  { t: "Atelier Support", d: "A personal stylist on call to drape your story.", i: "M21 11.5a8.4 8.4 0 11-17 0 8.4 8.4 0 0117 0zM8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" },
];

const testimonials = [
  { name: "Ananya Iyer", city: "Chennai", text: "The Kanchipuram I ordered for my wedding was unbelievable — the gold zari catches light like a memory.", rating: 5 },
  { name: "Priya Mehta", city: "Mumbai", text: "Draupadi feels like the boutique my grandmother would have approved of. Heirloom craft, modern service.", rating: 5 },
  { name: "Ritika Sharma", city: "Delhi", text: "Three sarees, three flawless drapes. The packaging alone made me cry.", rating: 5 },
  { name: "Meera Nair", city: "Bangalore", text: "I styled their Banarasi for an editorial — the fabric photographs like silk poetry.", rating: 5 },
];

const careTips = [
  { t: "Washing", d: "Dry-clean silks. Cold hand-wash cottons with mild soap, never wring.", i: "M5 4h14l-1 7H6zM8 14h8v6H8z" },
  { t: "Storage", d: "Wrap in muslin. Refold along new creases every three months.", i: "M3 7h18v4H3zM5 11v9h14v-9" },
  { t: "Ironing", d: "Low heat, reverse side, always with a cotton press cloth.", i: "M4 17h16M6 17V9a4 4 0 014-4h6l4 4v8" },
  { t: "Fabric Care", d: "Keep away from perfume. Air for an hour after every wear.", i: "M12 2v20M5 9c0-4 7-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7z" },
];

/* ---------------- Components ---------------- */

export function Navbar({ onOpenCart, onOpenSearch, wishlist }: any) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h(); window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const loadNotifications = () => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle().then(({ data: roleData }) => {
      const isUserAdmin = roleData?.role === "admin";
      supabase.from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.eq.${isUserAdmin ? "admin" : "none"}`)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setNotifications(data ?? []);
        });
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    loadNotifications();
  };

  const isHome = typeof window !== "undefined" && window.location.pathname === "/";

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "glass shadow-[0_8px_30px_-12px_rgba(122,0,25,0.18)]" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 lg:px-8 h-20">
        <Link to="/" className="flex items-center gap-2">
          <Logo variant={isHome && !scrolled ? "dark" : "light"} className="h-10 md:h-12" />
        </Link>
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((l) => {
            const isHash = l.href.startsWith("/#") || l.href.startsWith("#");
            const href = isHash 
              ? (isHome ? l.href.replace(/^\//, "") : l.href) 
              : l.href;
            
            if (isHash) {
              return (
                <a key={l.label} href={href}
                  className="relative text-[0.78rem] tracking-[0.22em] uppercase text-[var(--maroon-deep)] hover:text-[var(--maroon)] transition-colors group">
                  {l.label}
                  <span className="absolute left-0 -bottom-1 h-px w-0 bg-[var(--gold)] group-hover:w-full transition-all duration-500" />
                </a>
              );
            }
            
            return (
              <Link key={l.label} to={href as any}
                className="relative text-[0.78rem] tracking-[0.22em] uppercase text-[var(--maroon-deep)] hover:text-[var(--maroon)] transition-colors group">
                {l.label}
                <span className="absolute left-0 -bottom-1 h-px w-0 bg-[var(--gold)] group-hover:w-full transition-all duration-500" />
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 md:gap-2">
          <IconBtn onClick={isHome ? onOpenSearch : () => { window.location.href = "/?search=open"; }} label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          </IconBtn>
          <IconBtn label="Wishlist" badge={wishlist}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
          </IconBtn>
          <IconBtn onClick={isHome ? onOpenCart : () => { window.location.href = "/?cart=open"; }} label="Cart" badge={count}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4h2l2.5 12h11L21 7H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
          </IconBtn>
          {user && (
            <div className="relative">
              <IconBtn 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) handleMarkAllRead();
                }} 
                label="Notifications" 
                badge={unreadCount}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </IconBtn>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden z-50 text-[11px] animate-[reveal-up_.25s_ease]">
                  <header className="px-4 py-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                    <span className="font-serif font-bold text-neutral-800 text-sm">Notifications</span>
                    {unreadCount > 0 && <span className="text-[10px] text-[#7A0019] font-semibold">{unreadCount} new</span>}
                  </header>
                  <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-neutral-400">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 hover:bg-neutral-50 transition-colors text-left ${!n.read ? "bg-[#7A0019]/5" : ""}`}>
                          <div className="font-semibold text-neutral-800 flex items-center justify-between">
                            <span>{n.title}</span>
                            <span className="text-[9px] text-neutral-400 font-normal">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-neutral-500 mt-1 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <footer className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 text-center">
                    <Link to="/orders" onClick={() => setShowNotifications(false)} className="text-[#7A0019] hover:underline font-semibold tracking-wider uppercase text-[10px]">
                      View All Orders
                    </Link>
                  </footer>
                </div>
              )}
            </div>
          )}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--maroon-deep)] max-w-[120px] truncate" title={user.email}>
                {(user.user_metadata?.full_name as string)?.split(" ")[0] || user.email?.split("@")[0]}
              </span>
              <button onClick={() => supabase.auth.signOut()} className="btn-luxe !py-2 !px-4">Logout</button>
            </div>
          ) : (
            <Link to="/auth" className="btn-luxe hidden md:inline-flex !py-2 !px-4">Login</Link>
          )}
          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 text-[var(--maroon)]" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={open ? "M6 6l12 12M6 18L18 6" : "M3 6h18M3 12h18M3 18h18"}/></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden glass border-t border-[var(--gold)]/30 animate-[reveal-up_.35s_ease]">
          <div className="px-6 py-6 flex flex-col gap-4">
            {navLinks.map((l) => {
              const isHash = l.href.startsWith("/#") || l.href.startsWith("#");
              const href = isHash 
                ? (isHome ? l.href.replace(/^\//, "") : l.href) 
                : l.href;
              
              if (isHash) {
                return (
                  <a key={l.label} href={href} onClick={() => setOpen(false)}
                    className="text-sm tracking-[0.22em] uppercase text-[var(--maroon-deep)]">{l.label}</a>
                );
              }
              
              return (
                <Link key={l.label} to={href as any} onClick={() => setOpen(false)}
                  className="text-sm tracking-[0.22em] uppercase text-[var(--maroon-deep)]">{l.label}</Link>
              );
            })}
            {user ? (
              <button onClick={() => { supabase.auth.signOut(); setOpen(false); }} className="btn-luxe self-start mt-2">Logout</button>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="btn-luxe self-start mt-2">Login</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function IconBtn({ children, onClick, label, badge }: any) {
  return (
    <button onClick={onClick} aria-label={label}
      className="relative w-10 h-10 inline-flex items-center justify-center rounded-full text-[var(--maroon-deep)] hover:text-[var(--maroon)] hover:bg-[var(--beige)]/60 transition-all">
      {children}
      {!!badge && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--maroon)] text-[10px] text-[var(--ivory)] grid place-items-center">{badge}</span>
      )}
    </button>
  );
}

/* ---------------- Sections ---------------- */

function Hero() {
  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-[var(--ink)] text-[var(--ivory)]">
      <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 animate-kenburns" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, transparent, rgba(0,0,0,0.65))" }} />
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="absolute block rounded-full"
            style={{
              left: `${(i * 53) % 100}%`,
              width: `${4 + (i % 5)}px`, height: `${4 + (i % 5)}px`,
              background: "radial-gradient(circle, rgba(212,175,55,0.9), rgba(212,175,55,0))",
              animation: `float-up ${14 + (i % 8)}s linear ${i * 0.7}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-40 pb-32 min-h-screen flex flex-col justify-center">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-7 opacity-0 animate-[reveal-up_1s_.2s_forwards]">
            <GoldFlourish />
            <span className="text-[0.7rem] tracking-[0.4em] uppercase text-[var(--gold)]">Heritage Atelier</span>
          </div>
          <h1 className="font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[1.02] font-light opacity-0 animate-[reveal-up_1.1s_.35s_forwards]">
            Elegance <em className="text-gold-gradient not-italic font-medium">Woven</em><br/>
            Into Every Thread
          </h1>
          <p className="mt-6 max-w-lg text-[var(--ivory)]/75 text-base md:text-lg leading-relaxed opacity-0 animate-[reveal-up_1.1s_.55s_forwards]">
            Discover timeless sarees crafted for every celebration — from the hush of an evening soirée to the splendor of your wedding mandap.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 opacity-0 animate-[reveal-up_1.1s_.75s_forwards]">
            <a href="#new-arrivals" className="btn-luxe">Shop Collection</a>
            <a href="#wedding" className="btn-ghost-luxe">Wedding Collection</a>
          </div>
        </div>

        <div className="absolute bottom-10 left-6 right-6 lg:left-10 lg:right-10 flex items-end justify-between gap-6">
          <div className="hidden md:flex items-center gap-3 text-[var(--ivory)]/70 text-xs tracking-[0.3em] uppercase">
            <div className="w-12 h-px bg-[var(--gold)]" />
            Scroll to explore
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, kicker, light = false }: any) {
  return (
    <div className={`text-center max-w-2xl mx-auto reveal ${light ? "text-[var(--ivory)]" : ""}`}>
      <div className="inline-flex items-center gap-3 mb-4">
        <span className={`h-px w-10 ${light ? "bg-[var(--gold)]" : "bg-[var(--maroon)]"}`} />
        <span className={`text-[0.7rem] tracking-[0.35em] uppercase ${light ? "text-[var(--gold)]" : "text-[var(--maroon)]"}`}>{eyebrow}</span>
        <span className={`h-px w-10 ${light ? "bg-[var(--gold)]" : "bg-[var(--maroon)]"}`} />
      </div>
      <h2 className="font-serif text-4xl md:text-5xl font-light leading-tight">{title}</h2>
      {kicker && <p className={`mt-4 ${light ? "text-[var(--ivory)]/70" : "text-[var(--muted-foreground)]"}`}>{kicker}</p>}
    </div>
  );
}



function ProductCard({ p, onWish, wished, onQuick }: any) {
  const isOutOfStock = p.stock <= 0;
  return (
    <div className="group relative bg-[var(--card)] rounded-sm overflow-hidden border border-[var(--border)] hover:border-[var(--gold)]/60 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-luxe">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--beige)]">
        <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-110" />
        
        {isOutOfStock ? (
          <span className="absolute top-3 left-3 bg-neutral-600 text-white text-[0.6rem] tracking-[0.25em] uppercase px-2.5 py-1 font-semibold z-10">Out of Stock</span>
        ) : (
          <span className="absolute top-3 left-3 bg-[var(--maroon)] text-[var(--ivory)] text-[0.6rem] tracking-[0.25em] uppercase px-2.5 py-1 z-10">{p.tag}</span>
        )}
        
        <button onClick={onWish} aria-label="Wishlist" className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full glass text-[var(--maroon)] hover:bg-[var(--maroon)] hover:text-[var(--ivory)] transition-all z-10">
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
        <div className="absolute inset-x-3 bottom-3 flex gap-2 transition-all duration-500 opacity-100 translate-y-0 lg:opacity-0 lg:translate-y-4 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 z-10">
          <button onClick={onQuick} className="flex-1 py-2.5 text-[0.65rem] tracking-[0.28em] uppercase bg-[var(--ivory)] text-[var(--ink)] hover:bg-[var(--gold)] transition-colors">Quick View</button>
          {!isOutOfStock ? (
            <button onClick={() => { cart.add({ id: p.name, name: p.name, price: p.price, img: p.img }); toast.success("Added to cart"); }} className="flex-1 py-2.5 text-[0.65rem] tracking-[0.28em] uppercase bg-[var(--maroon)] text-[var(--ivory)] hover:bg-[var(--maroon-deep)] transition-colors">Add to Cart</button>
          ) : (
            <button disabled className="flex-1 py-2.5 text-[0.65rem] tracking-[0.28em] uppercase bg-neutral-400 text-neutral-200 cursor-not-allowed opacity-80">Out of Stock</button>
          )}
        </div>
      </div>
      <div className="p-5">
        <Stars n={p.rating} />
        <h3 className="mt-2 font-serif text-lg leading-tight">{p.name}</h3>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-[var(--maroon)] font-medium">₹{p.price.toLocaleString("en-IN")}</span>
          <span className="text-xs text-[var(--muted-foreground)] line-through">₹{p.old.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

function NewArrivals({ wishlist, toggleWish, openQuick }: any) {
  const products = useDbProducts();
  return (
    <section id="new-arrivals" className="py-24 md:py-32 bg-[var(--beige)]/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
          <div>
            <div className="eyebrow mb-3"><span className="h-px w-10 bg-[var(--maroon)]"/>New Arrivals</div>
            <h2 className="font-serif text-4xl md:text-5xl font-light">Fresh off the loom</h2>
          </div>
          <a href="#" className="text-sm tracking-[0.25em] uppercase text-[var(--maroon)] border-b border-[var(--gold)] pb-1 hover:text-[var(--maroon-deep)]">View all {products.length} pieces →</a>
        </div>
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p: any, i: number) => (
            <div key={i} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
              <ProductCard p={p} wished={wishlist.has(i)} onWish={() => toggleWish(i)} onQuick={() => openQuick(p)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trending() {
  const products = useDbProducts();
  const loop = [...products, ...products];
  return (
    <section className="py-24 md:py-32 bg-[var(--ink)] text-[var(--ivory)] overflow-hidden">
      <SectionHeader eyebrow="Trending Now" title="The Atelier's Most Loved" kicker="A revolving showcase of pieces women keep returning for." light />
      <div className="mt-14 relative">
        <div className="flex gap-6 animate-marquee" style={{ width: "max-content" }}>
          {loop.map((p, i) => (
            <div key={i} className="w-[260px] shrink-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm gold-border">
                <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="font-serif text-base">{p.name}</div>
                  <div className="text-[var(--gold)] text-sm mt-1">₹{p.price.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--ink)] to-transparent"/>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--ink)] to-transparent"/>
      </div>
    </section>
  );
}

function WhyUs() {
  return (
    <section className="py-24 md:py-32 bg-[var(--ivory)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionHeader eyebrow="The Draupadi Promise" title="Why women choose us" />
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.t} className="reveal group p-8 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--gold)]/60 hover:shadow-luxe transition-all duration-500" style={{ transitionDelay: `${i*60}ms` }}>
              <div className="w-14 h-14 rounded-full grid place-items-center mb-5 text-[var(--maroon)] bg-[var(--beige)]/60 group-hover:bg-[var(--gold)] group-hover:text-[var(--ink)] transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={f.i}/></svg>
              </div>
              <h3 className="font-serif text-xl mb-2">{f.t}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.d}</p>
              <div className="divider-gold mt-6 opacity-0 group-hover:opacity-100 transition-opacity"/>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bridal() {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = window.innerHeight / 2 - (rect.top + rect.height / 2);
      setY(center * 0.08);
    };
    h(); window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <section id="wedding" ref={ref} className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-b from-[var(--maroon-deep)] to-[var(--maroon)] text-[var(--ivory)]">
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full opacity-20" style={{ background: "var(--gradient-gold)", filter: "blur(80px)" }} />
      <svg className="absolute top-10 right-10 w-40 h-40 text-[var(--gold)]/30 animate-spin-slow" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeDasharray="2 4"/>
        <circle cx="50" cy="50" r="36" stroke="currentColor"/>
      </svg>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-14 items-center relative">
        <div className="relative reveal">
          <div className="absolute -inset-4 border border-[var(--gold)]/40"/>
          <div className="relative overflow-hidden">
            <img src={bridalImg} alt="Bridal saree" loading="lazy" className="w-full h-[560px] object-cover" style={{ transform: `translateY(${y}px) scale(1.06)` }} />
          </div>
        </div>
        <div className="reveal">
          <div className="eyebrow text-[var(--gold)] mb-5"><span className="h-px w-10 bg-[var(--gold)]"/>The Bridal Atelier</div>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05]">
            A bride deserves a saree<br/><em className="text-gold-gradient not-italic">that remembers her</em>.
          </h2>
          <p className="mt-6 text-[var(--ivory)]/75 leading-relaxed max-w-md">
            Our bridal house weaves real gold zari into Banarasi and Kanchipuram silks — heirlooms designed to be passed from one generation of daughters to the next.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Personal stylist consultation","Custom blouse stitching","Heirloom-grade packaging","Lifetime restoration service"].map(l => (
              <li key={l} className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"/> {l}</li>
            ))}
          </ul>
          <div className="mt-10"><a href="#" onClick={(e) => e.preventDefault()} className="btn-ghost-luxe opacity-80">Coming soon</a></div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x+1) % testimonials.length), 5500); return () => clearInterval(t); }, []);
  return (
    <section className="py-24 md:py-32 bg-[var(--beige)]/40">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <SectionHeader eyebrow="Whispered Praise" title="From women who wear us" />
        <div className="mt-14 relative">
          <div className="relative h-[280px] md:h-[220px]">
            {testimonials.map((t, idx) => (
              <div key={idx} className={`absolute inset-0 transition-all duration-700 ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className="bg-[var(--card)] p-10 md:p-14 rounded-sm shadow-luxe gold-border text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="mx-auto text-[var(--gold)] mb-4 opacity-60"><path d="M9 7H5a2 2 0 0 0-2 2v4h4v6H3v-2H1V9a4 4 0 0 1 4-4h4v2zm12 0h-4a2 2 0 0 0-2 2v4h4v6h-4v-2h-2V9a4 4 0 0 1 4-4h4v2z"/></svg>
                  <p className="font-serif text-xl md:text-2xl italic leading-snug text-[var(--maroon-deep)]">"{t.text}"</p>
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <Stars n={t.rating}/>
                    <div className="font-serif text-lg">{t.name}</div>
                    <div className="text-xs tracking-[0.25em] uppercase text-[var(--muted-foreground)]">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            {testimonials.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} className={`h-1 transition-all rounded-full ${idx === i ? "w-10 bg-[var(--maroon)]" : "w-4 bg-[var(--border)]"}`}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InstagramGallery() {
  const imgs = [sareeSilk, sareeDesigner, sareeBridal, sareeParty, sareeCotton, sareeFestive, heroImg, bridalImg];
  return (
    <section className="py-24 md:py-32 bg-[var(--ivory)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionHeader eyebrow="@draupadi.atelier" title="As styled by you" kicker="Tag us in your drape — be featured in our atelier feed."/>
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3">
          {imgs.map((src, i) => (
            <div key={i} className={`reveal group relative overflow-hidden ${i % 5 === 0 ? "md:row-span-2 aspect-[3/4] md:aspect-auto" : "aspect-square"}`} style={{ transitionDelay: `${i*60}ms` }}>
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"/>
              <a href="https://www.instagram.com/draupadi.in" target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-[var(--maroon)]/0 group-hover:bg-[var(--maroon)]/60 transition-colors duration-500 grid place-items-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white"/>
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CareGuide() {
  return (
    <section className="py-24 md:py-32 bg-[var(--beige)]/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionHeader eyebrow="Heirloom Ritual" title="Caring for your saree" kicker="A handful of rituals to keep your weave alive for decades."/>
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {careTips.map((c, i) => (
            <div key={c.t} className="reveal relative p-8 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--gold)] transition-all hover:-translate-y-1.5 hover:shadow-luxe" style={{transitionDelay:`${i*70}ms`}}>
              <div className="text-[var(--gold)] font-serif text-5xl absolute top-3 right-5 opacity-30">0{i+1}</div>
              <div className="w-12 h-12 rounded-sm grid place-items-center mb-5 bg-[var(--maroon)] text-[var(--gold)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={c.i}/></svg>
              </div>
              <h3 className="font-serif text-xl mb-2">{c.t}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert({ email });
        if (error) throw error;
      }
      setDone(true);
      toast.success("Thank you for subscribing!");
      setEmail("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: "var(--gradient-royal)" }}>
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-30" style={{ background: "var(--gradient-gold)", filter: "blur(100px)" }}/>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20" style={{ background: "var(--gradient-gold)", filter: "blur(100px)" }}/>
      <svg className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-32 text-[var(--gold)]/20 animate-spin-slow" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeDasharray="1 3"/>
      </svg>
      <div className="relative max-w-3xl mx-auto px-6 lg:px-10 text-center text-[var(--ivory)] reveal">
        <div className="eyebrow text-[var(--gold)] justify-center mb-4 flex items-center gap-3 uppercase tracking-[0.35em] text-xs"><span className="h-px w-10 bg-[var(--gold)]"/>The List<span className="h-px w-10 bg-[var(--gold)]"/></div>
        <h2 className="font-serif text-4xl md:text-5xl font-light leading-tight">Be first to glimpse<br/><em className="text-gold-gradient not-italic">our next collection</em>.</h2>
        <p className="mt-5 text-[var(--ivory)]/75">Private previews, atelier stories and invitations — once a month, never more.</p>
        <form onSubmit={handleSubmit} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="your@email.com" disabled={done || loading}
            className="flex-1 px-5 py-4 bg-[var(--ivory)]/95 text-[var(--ink)] placeholder:text-[var(--muted-foreground)] outline-none focus:ring-2 focus:ring-[var(--gold)] rounded-sm"/>
          <button type="submit" disabled={done || loading} className="btn-luxe !bg-[var(--gold)] !text-[var(--ink)]" style={{ background: "var(--gradient-gold)" }}>
            {done ? "Subscribed ✓" : loading ? "Submitting..." : "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="bg-[var(--ink)] text-[var(--ivory)] pt-24 pb-10 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: "var(--gradient-gold)" }}/>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
        <div className="col-span-2 lg:col-span-2">
          <Logo variant="dark" className="h-12" />
          <p className="mt-5 text-sm text-[var(--ivory)]/65 max-w-xs leading-relaxed">An atelier of heritage sarees, woven for the modern woman who dresses in stories.</p>
          <div className="mt-6 flex gap-3">
            {["instagram","facebook","pinterest","youtube"].map(s => (
              <a key={s} href="https://www.instagram.com/draupadi.in" target="_blank" rel="noopener noreferrer" aria-label={s} className="w-9 h-9 grid place-items-center rounded-full border border-[var(--gold)]/40 hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-all">
                <span className="text-[10px] uppercase">{s[0]}</span>
              </a>
            ))}
          </div>
        </div>
        {[
          { h: "Shop", l: ["Silk", "Wedding", "Designer", "Cotton", "Festive"] },
          { h: "Service", l: ["Contact", "Shipping", "Returns", "Stitching", "Atelier Visit"] },
          { h: "About", l: ["Our Story", "Artisans", "Sustainability", "Press", "Journal"] },
        ].map(c => (
          <div key={c.h}>
            <h4 className="font-serif text-lg mb-4 text-[var(--gold)]">{c.h}</h4>
            <ul className="space-y-2 text-sm text-[var(--ivory)]/65">
              {c.l.map(x => {
                const isContact = x === "Contact";
                return (
                  <li key={x}>
                    <a 
                      href={isContact ? "https://www.instagram.com/draupadi.in" : "#"} 
                      target={isContact ? "_blank" : undefined}
                      rel={isContact ? "noopener noreferrer" : undefined}
                      className="hover:text-[var(--gold)] transition-colors"
                    >
                      {x}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 pt-8 border-t border-[var(--ivory)]/10 flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-[var(--ivory)]/55">
        <div>© {new Date().getFullYear()} Draupadi Atelier · Handwoven in India.</div>
        <div className="flex items-center gap-3">
          {["VISA","MC","AMEX","UPI","PAYPAL"].map(p => (
            <span key={p} className="px-2 py-1 border border-[var(--ivory)]/15 rounded text-[10px] tracking-widest">{p}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Floating UI ---------------- */
function CartDrawer({ open, onClose }: any) {
  const { items, subtotal, count } = useCart();
  const navigate = useNavigate();
  const goCheckout = async () => {
    onClose();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.message("Please sign in to checkout");
      navigate({ to: "/auth", search: { redirect: "/checkout" } as any });
    } else {
      navigate({ to: "/checkout" });
    }
  };
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}/>
      <aside className={`fixed top-0 right-0 z-[90] h-full w-full sm:w-[420px] bg-[var(--ivory)] shadow-luxe transition-transform duration-500 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-serif text-xl">Your Drape · <span className="text-[var(--maroon)]">{count}</span></div>
          <button onClick={onClose} className="p-2" aria-label="Close">✕</button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto" style={{maxHeight:"calc(100vh - 220px)"}}>
          {items.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-10">Your cart is empty.</p>}
          {items.map((it) => (
            <div key={it.id} className="flex gap-4">
              <img src={it.img} className="w-20 h-24 object-cover rounded-sm" alt={it.name}/>
              <div className="flex-1">
                <div className="font-serif text-sm">{it.name}</div>
                <div className="text-[var(--maroon)] mt-1 text-sm">₹{it.price.toLocaleString("en-IN")}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <button onClick={() => cart.setQty(it.id, it.qty - 1)} className="w-6 h-6 border border-[var(--border)]">−</button>
                  <span>{it.qty}</span>
                  <button onClick={() => cart.setQty(it.id, it.qty + 1)} className="w-6 h-6 border border-[var(--border)]">+</button>
                  <button onClick={() => cart.remove(it.id)} className="ml-auto text-[var(--maroon)] underline">remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-6 border-t border-[var(--border)] bg-[var(--ivory)]">
          <div className="flex justify-between mb-4 text-sm"><span>Subtotal</span><span className="font-serif text-lg text-[var(--maroon)]">₹{subtotal.toLocaleString("en-IN")}</span></div>
          <button onClick={goCheckout} disabled={items.length === 0} className="btn-luxe w-full disabled:opacity-50">Checkout</button>
        </div>
      </aside>
    </>
  );
}


function SearchModal({ open, onClose }: any) {
  return (
    <div className={`fixed inset-0 z-[90] transition-all ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md"/>
      <div className="relative max-w-2xl mx-auto mt-32 px-6">
        <div className="glass rounded-sm p-8 shadow-luxe">
          <div className="eyebrow mb-3"><span className="h-px w-10 bg-[var(--maroon)]"/>Search the Atelier</div>
          <input autoFocus placeholder="Try 'Kanchipuram', 'bridal red', 'designer ivory'…"
            className="w-full text-2xl font-serif bg-transparent outline-none border-b border-[var(--gold)] pb-3"/>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {["Bridal","Kanchipuram","Banarasi","Pastel","Cotton"].map(t => (
              <span key={t} className="px-3 py-1 border border-[var(--gold)]/50 rounded-full cursor-pointer hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickView({ p, onClose }: any) {
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4 animate-[scale-in-soft_.3s_ease]">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <div className="relative bg-[var(--ivory)] max-w-3xl w-full grid md:grid-cols-2 gap-0 shadow-luxe">
        <img src={p.img} alt={p.name} className="w-full h-full object-cover max-h-[500px]"/>
        <div className="p-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-2" aria-label="Close">✕</button>
          <Stars n={p.rating}/>
          <h3 className="font-serif text-3xl mt-3">{p.name}</h3>
          <div className="mt-3 flex items-baseline gap-3"><span className="text-2xl text-[var(--maroon)]">₹{p.price.toLocaleString("en-IN")}</span><span className="line-through text-[var(--muted-foreground)]">₹{p.old.toLocaleString("en-IN")}</span></div>
          <p className="mt-5 text-sm text-[var(--muted-foreground)] leading-relaxed">Hand-loomed pure silk with real zari weave. Comes with matching blouse piece and complimentary tailoring consultation.</p>
          <div className="mt-7 flex gap-3">
            {p.stock > 0 ? (
              <button onClick={() => { cart.add({ id: p.name, name: p.name, price: p.price, img: p.img }); toast.success("Added to cart"); onClose(); }} className="btn-luxe">Add to Cart</button>
            ) : (
              <button disabled className="btn-luxe !bg-neutral-400 !border-neutral-400 text-neutral-200 cursor-not-allowed opacity-75">Out of Stock</button>
            )}
            <button className="btn-ghost-luxe !text-[var(--maroon)] !border-[var(--maroon)] hover:!bg-[var(--maroon)] hover:!text-[var(--ivory)]">Wishlist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrollProgress() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const h = () => {
      const sh = document.documentElement.scrollHeight - window.innerHeight;
      setW(sh > 0 ? (window.scrollY / sh) * 100 : 0);
    };
    h(); window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return <div className="fixed top-0 left-0 h-[2px] z-[100]" style={{ width: `${w}%`, background: "var(--gradient-gold)" }}/>;
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const h = () => setShow(window.scrollY > 600); h(); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"
      className={`fixed bottom-8 right-8 z-[90] w-12 h-12 rounded-full grid place-items-center text-[var(--ivory)] shadow-luxe transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      style={{ background: "var(--gradient-royal)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    </button>
  );
}

function Loader() {
  const [hide, setHide] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHide(true), 1200); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed inset-0 z-[200] grid place-items-center bg-[var(--ivory)] transition-opacity duration-700 ${hide ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="text-center">
        <Logo variant="light" className="h-16 mx-auto animate-[scale-in-soft_.8s_ease]"/>
        <div className="mt-6 mx-auto w-40 h-px bg-[var(--border)] overflow-hidden">
          <div className="h-full w-full" style={{ background: "var(--gradient-royal)", animation: "shimmer 1.2s linear" }}/>
        </div>
        <div className="mt-4 text-[0.65rem] tracking-[0.45em] uppercase text-[var(--maroon)]">Unfolding the weave…</div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
function Home() {
  useReveal();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quick, setQuick] = useState<any>(null);
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const toggleWish = (i: number) => setWishlist(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // Close on Esc
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setCartOpen(false); setSearchOpen(false); setQuick(null); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Check URL params for search/cart
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cart") === "open") {
      setCartOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
    }
    if (params.get("search") === "open") {
      setSearchOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("search");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <div className="bg-[var(--ivory)] text-[var(--ink)]">
      <Loader />
      <ScrollProgress />
      <Navbar onOpenCart={() => setCartOpen(true)} onOpenSearch={() => setSearchOpen(true)} wishlist={wishlist.size}/>
      <main>
        <Hero />
        <NewArrivals wishlist={wishlist} toggleWish={toggleWish} openQuick={setQuick}/>
        <Trending />
        <WhyUs />
        <Bridal />
        <Testimonials />
        <InstagramGallery />
        <CareGuide />
        <Newsletter />
      </main>
      <Footer />
      <BackToTop />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)}/>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)}/>
      <QuickView p={quick} onClose={() => setQuick(null)}/>
    </div>
  );
}
