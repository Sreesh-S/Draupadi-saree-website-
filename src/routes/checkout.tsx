import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, cart, type CartItem } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — DRAUPADI" }] }),
  component: Checkout,
});

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
};

type AddressForm = Omit<Address, "id" | "is_default"> & { is_default: boolean };

const emptyForm: AddressForm = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  is_default: false,
};

const SHIPPING_FLAT = 0;

function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, count } = useCart();
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [savingAddr, setSavingAddr] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("upi");
  const [upiId, setUpiId] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "awaiting_approval" | "verifying" | "success" | "timeout">("idle");
  const [timer, setTimer] = useState(45);

  // Auth gate
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } as any });
        return;
      }
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [navigate]);

  // UPI payment countdown timer
  useEffect(() => {
    let t: any;
    if (paymentState === "awaiting_approval" && timer > 0) {
      t = setTimeout(() => setTimer(timer - 1), 1000);
    } else if (paymentState === "awaiting_approval" && timer === 0) {
      setPaymentState("timeout");
    }
    return () => clearTimeout(t);
  }, [paymentState, timer]);

  // Load addresses
  const loadAddresses = async () => {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setAddresses(data as Address[]);
    if (data && data.length > 0 && !selectedId) {
      setSelectedId(data.find((a) => a.is_default)?.id || data[0].id);
    } else if (!data || data.length === 0) {
      setShowForm(true);
    }
  };
  useEffect(() => { if (user) loadAddresses(); /* eslint-disable-next-line */ }, [user]);

  const shipping = items.length > 0 ? SHIPPING_FLAT : 0;
  const total = subtotal + shipping;
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedId) || null,
    [addresses, selectedId]
  );

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAddr(true);
    // Validate basics
    if (!/^\d{10}$/.test(form.phone)) { toast.error("Enter a valid 10-digit phone"); setSavingAddr(false); return; }
    if (!/^\d{6}$/.test(form.pincode)) { toast.error("Enter a valid 6-digit pincode"); setSavingAddr(false); return; }

    if (form.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...form, user_id: user.id, address_line2: form.address_line2 || null })
      .select()
      .single();
    setSavingAddr(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Address saved");
    setShowForm(false);
    setForm(emptyForm);
    await loadAddresses();
    setSelectedId((data as Address).id);
  };

  const removeAddress = async (id: string) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Address removed");
    if (selectedId === id) setSelectedId(null);
    loadAddresses();
  };

  const handlePlaceOrderClick = () => {
    if (!user || !selectedAddress) return;
    if (paymentMethod === "upi" && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
      toast.error("Enter a valid UPI ID like name@bank");
      return;
    }
    setTimer(45);
    setPaymentState("awaiting_approval");
  };

  const completePaymentAndOrder = async () => {
    setPaymentState("verifying");
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentState("success");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setPlacing(true);
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id,
      items: items as any,
      subtotal,
      shipping,
      total,
      payment_method: paymentMethod,
      payment_status: "paid",
      shipping_address: selectedAddress as any,
    }).select().single();
    
    setPlacing(false);
    setPaymentState("idle");
    
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrderId((data as any).id);
    cart.clear();
  };

  const handleRetryPayment = () => {
    setTimer(45);
    setPaymentState("awaiting_approval");
  };

  if (checkingAuth) {
    return <div className="min-h-screen grid place-items-center bg-[var(--ivory)]">Loading…</div>;
  }

  if (orderId) {
    return (
      <div className="min-h-screen bg-[var(--ivory)] grid place-items-center px-6">
        <div className="max-w-lg w-full text-center bg-[var(--card)] p-10 border border-[var(--gold)]/40 shadow-luxe">
          <div className="text-5xl mb-4">✨</div>
          <h1 className="font-serif text-3xl text-[var(--maroon-deep)]">Order placed!</h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Order ID <span className="font-mono">{orderId.slice(0, 8)}</span>. We have emailed your receipt.
          </p>
          <Link to="/" className="btn-luxe mt-8 inline-flex">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--ivory)] px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl">Your cart is empty</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Add a saree to begin checkout.</p>
          <Link to="/" className="btn-luxe mt-6 inline-flex">Browse Collection</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ivory)] py-10 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm tracking-[0.25em] uppercase text-[var(--maroon)]">← Back</Link>
          <h1 className="font-serif text-2xl md:text-3xl text-[var(--maroon-deep)]">Checkout</h1>
          <div className="w-12" />
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-10 text-xs tracking-[0.25em] uppercase">
          {["Address", "Payment", "Review"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span className={`w-7 h-7 grid place-items-center rounded-full border ${step >= ((i + 1) as any) ? "bg-[var(--maroon)] text-[var(--ivory)] border-[var(--maroon)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
                {i + 1}
              </span>
              <span className={step >= ((i + 1) as any) ? "text-[var(--maroon-deep)]" : "text-[var(--muted-foreground)]"}>{s}</span>
              {i < 2 && <span className="w-10 h-px bg-[var(--border)]" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            {/* STEP 1 - ADDRESS */}
            {step === 1 && (
              <section className="bg-[var(--card)] border border-[var(--border)] p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-xl">Delivery Address</h2>
                  <button onClick={() => setShowForm((v) => !v)} className="text-sm text-[var(--maroon)] underline">
                    {showForm ? "Cancel" : "+ Add new"}
                  </button>
                </div>

                <div className="space-y-3">
                  {addresses.map((a) => (
                    <label key={a.id} className={`flex gap-3 p-4 border cursor-pointer transition ${selectedId === a.id ? "border-[var(--gold)] bg-[var(--beige)]/30" : "border-[var(--border)]"}`}>
                      <input type="radio" name="addr" checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.full_name}</span>
                          <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 bg-[var(--beige)] text-[var(--maroon-deep)]">{a.label}</span>
                          {a.is_default && <span className="text-[10px] uppercase text-[var(--gold)]">Default</span>}
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)] mt-1">
                          {a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}, {a.state} {a.pincode}, {a.country}
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">📞 {a.phone}</div>
                        <button type="button" onClick={(e) => { e.preventDefault(); removeAddress(a.id); }} className="mt-2 text-xs text-[var(--maroon)] underline">Remove</button>
                      </div>
                    </label>
                  ))}
                  {addresses.length === 0 && !showForm && (
                    <p className="text-sm text-[var(--muted-foreground)]">No saved addresses yet. Add one to continue.</p>
                  )}
                </div>

                {showForm && (
                  <form onSubmit={saveAddress} className="mt-6 grid sm:grid-cols-2 gap-3 border-t border-[var(--border)] pt-6">
                    <Field label="Label">
                      <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inp}>
                        <option>Home</option><option>Work</option><option>Other</option>
                      </select>
                    </Field>
                    <Field label="Full name" required>
                      <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inp} />
                    </Field>
                    <Field label="Phone (10 digits)" required>
                      <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
                    </Field>
                    <Field label="Pincode" required>
                      <input required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inp} />
                    </Field>
                    <Field label="Address line 1" required className="sm:col-span-2">
                      <input required value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} className={inp} placeholder="House no., street" />
                    </Field>
                    <Field label="Address line 2" className="sm:col-span-2">
                      <input value={form.address_line2 || ""} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} className={inp} placeholder="Apartment, landmark (optional)" />
                    </Field>
                    <Field label="City" required>
                      <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inp} />
                    </Field>
                    <Field label="State" required>
                      <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inp} />
                    </Field>
                    <Field label="Country">
                      <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inp} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm mt-2 sm:col-span-2">
                      <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                      Make this my default address
                    </label>
                    <div className="sm:col-span-2 flex gap-3 mt-2">
                      <button disabled={savingAddr} type="submit" className="btn-luxe">{savingAddr ? "Saving…" : "Save address"}</button>
                      <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="btn-ghost-luxe !text-[var(--ink)]">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!selectedId}
                    onClick={() => setStep(2)}
                    className="btn-luxe disabled:opacity-50"
                  >Continue to Payment →</button>
                </div>
              </section>
            )}

            {/* STEP 2 - PAYMENT */}
            {step === 2 && (
              <section className="bg-[var(--card)] border border-[var(--border)] p-6 md:p-8">
                <h2 className="font-serif text-xl mb-5">Payment Method</h2>
                <div className="space-y-3">
                  {[
                    { id: "upi", title: "UPI", sub: "Pay using GPay, PhonePe, Paytm, BHIM" },
                  ].map((m) => (
                    <label key={m.id} className={`flex items-start gap-3 p-4 border cursor-pointer ${paymentMethod === m.id ? "border-[var(--gold)] bg-[var(--beige)]/30" : "border-[var(--border)]"}`}>
                      <input type="radio" checked={paymentMethod === (m.id as any)} onChange={() => setPaymentMethod(m.id as any)} className="mt-1" />
                      <div>
                        <div className="font-medium">{m.title}</div>
                        <div className="text-sm text-[var(--muted-foreground)]">{m.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {paymentMethod === "upi" && (
                  <div className="mt-5">
                    <Field label="UPI ID" required>
                      <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className={inp} />
                    </Field>
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-ghost-luxe !text-[var(--ink)]">← Back</button>
                  <button onClick={() => setStep(3)} className="btn-luxe">Review Order →</button>
                </div>
              </section>
            )}

            {/* STEP 3 - REVIEW */}
            {step === 3 && (
              <section className="bg-[var(--card)] border border-[var(--border)] p-6 md:p-8 space-y-6">
                <h2 className="font-serif text-xl">Review & Place Order</h2>
                <ReviewBlock title="Shipping to" onEdit={() => setStep(1)}>
                  {selectedAddress && (
                    <>
                      <div>{selectedAddress.full_name} · {selectedAddress.phone}</div>
                      <div className="text-[var(--muted-foreground)]">
                        {selectedAddress.address_line1}{selectedAddress.address_line2 ? `, ${selectedAddress.address_line2}` : ""}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
                      </div>
                    </>
                  )}
                </ReviewBlock>
                <ReviewBlock title="Payment" onEdit={() => setStep(2)}>
                  <div>{paymentMethod === "upi" ? `UPI · ${upiId}` : paymentMethod === "card" ? `Card ending ${card.number.slice(-4)}` : "Cash on Delivery"}</div>
                </ReviewBlock>
                <ReviewBlock title="Items">
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.id} className="flex gap-3 items-center">
                        <img src={it.img} alt="" className="w-14 h-16 object-cover" />
                        <div className="flex-1 text-sm">
                          <div>{it.name}</div>
                          <div className="text-[var(--muted-foreground)]">Qty {it.qty} · ₹{it.price.toLocaleString("en-IN")}</div>
                        </div>
                        <div className="text-sm">₹{(it.price * it.qty).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </ReviewBlock>
                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(2)} className="btn-ghost-luxe !text-[var(--ink)]">← Back</button>
                  <button disabled={placing} onClick={handlePlaceOrderClick} className="btn-luxe disabled:opacity-60">
                    {placing ? "Placing…" : `Place Order · ₹${total.toLocaleString("en-IN")}`}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* SUMMARY */}
          <aside className="bg-[var(--card)] border border-[var(--border)] p-6 h-fit lg:sticky lg:top-6">
            <h3 className="font-serif text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 max-h-64 overflow-auto pr-1">
              {items.map((it) => (
                <CartLine key={it.id} item={it} />
              ))}
            </div>
            <div className="border-t border-[var(--border)] mt-5 pt-4 text-sm space-y-2">
              <Row k="Subtotal" v={`₹${subtotal.toLocaleString("en-IN")}`} />
              <Row k="Shipping" v={`₹${shipping.toLocaleString("en-IN")}`} />
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-serif text-lg text-[var(--maroon-deep)]">
                <span>Total</span><span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {paymentState !== "idle" && (
        <div className="fixed inset-0 z-50 bg-[#1a0d0d]/85 backdrop-blur-md grid place-items-center p-4">
          <div className="bg-white rounded-xl border border-[var(--gold)]/30 max-w-md w-full p-8 text-center shadow-2xl relative overflow-hidden animate-[reveal-up_.3s_ease]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[var(--maroon)] via-[var(--gold)] to-[var(--maroon)]" />
            
            {paymentState === "awaiting_approval" && (
              <div className="space-y-6 pt-2">
                <div className="w-16 h-16 rounded-full border-4 border-neutral-100 border-t-[#7A0019] animate-spin mx-auto flex items-center justify-center">
                  <span className="font-mono text-xs font-bold text-neutral-500">{timer}s</span>
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-[#1a0d0d] font-semibold">Awaiting Payment PIN</h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    We've sent a UPI payment request of <span className="font-bold text-[#7A0019]">₹{total.toLocaleString("en-IN")}</span> to <span className="font-mono text-neutral-800 font-semibold">{upiId}</span>.
                  </p>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 text-xs text-left space-y-2 text-neutral-600">
                  <strong className="text-neutral-700 block">How to complete payment:</strong>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-normal">
                    <li>Open your mobile UPI app (GPay, PhonePe, Paytm, BHIM).</li>
                    <li>Look for a pending request from <strong>Draupadi Atelier</strong>.</li>
                    <li>Enter your secure 4-digit or 6-digit UPI PIN to approve the transaction.</li>
                  </ol>
                </div>

                <div className="pt-2 space-y-2">
                  <button 
                    type="button"
                    onClick={completePaymentAndOrder}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Simulate Payment Approval (Demo)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPaymentState("idle")} 
                    className="w-full py-2.5 border border-neutral-300 text-neutral-600 hover:bg-neutral-50 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>
            )}

            {paymentState === "verifying" && (
              <div className="space-y-5 py-6">
                <div className="w-12 h-12 border-4 border-neutral-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <div>
                  <h3 className="font-serif text-xl text-[#1a0d0d] font-semibold">Verifying Secure Payment</h3>
                  <p className="text-xs text-neutral-400 mt-1">Contacting your banking partner for clearance...</p>
                </div>
              </div>
            )}

            {paymentState === "success" && (
              <div className="space-y-5 py-6">
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-pulse">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-emerald-800 font-semibold">Payment Successful</h3>
                  <p className="text-xs text-neutral-400 mt-1">Clearance code: TXN-{Math.floor(100000 + Math.random() * 900000)}</p>
                </div>
              </div>
            )}

            {paymentState === "timeout" && (
              <div className="space-y-6 pt-2">
                <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[#1a0d0d] font-semibold">Transaction Timed Out</h3>
                  <p className="text-xs text-neutral-400 mt-1">We couldn't confirm payment in the allocated window.</p>
                </div>
                <div className="space-y-2">
                  <button 
                    type="button" 
                    onClick={handleRetryPayment} 
                    className="w-full py-3 bg-[#7A0019] text-white hover:bg-[#5A0013] rounded text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Retry Payment
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPaymentState("idle")} 
                    className="w-full py-2.5 border border-neutral-300 text-neutral-600 hover:bg-neutral-50 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Back to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full px-3 py-2 bg-[var(--ivory)] border border-[var(--border)] focus:border-[var(--gold)] outline-none rounded-sm text-sm";

function Field({ label, required, children, className = "" }: any) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs tracking-[0.2em] uppercase text-[var(--muted-foreground)]">{label}{required && " *"}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ReviewBlock({ title, onEdit, children }: any) {
  return (
    <div className="border border-[var(--border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs tracking-[0.25em] uppercase text-[var(--muted-foreground)]">{title}</div>
        {onEdit && <button onClick={onEdit} className="text-xs underline text-[var(--maroon)]">Edit</button>}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">{k}</span><span>{v}</span></div>;
}

function CartLine({ item }: { item: CartItem }) {
  return (
    <div className="flex gap-3 items-center">
      <img src={item.img} className="w-12 h-14 object-cover" alt="" />
      <div className="flex-1 text-sm">
        <div className="truncate">{item.name}</div>
        <div className="flex items-center gap-2 text-[var(--muted-foreground)] mt-1">
          <button onClick={() => cart.setQty(item.id, item.qty - 1)} className="w-5 h-5 border border-[var(--border)]">−</button>
          <span>{item.qty}</span>
          <button onClick={() => cart.setQty(item.id, item.qty + 1)} className="w-5 h-5 border border-[var(--border)]">+</button>
          <button onClick={() => cart.remove(item.id)} className="ml-2 text-[var(--maroon)] underline">remove</button>
        </div>
      </div>
      <div className="text-sm">₹{(item.price * item.qty).toLocaleString("en-IN")}</div>
    </div>
  );
}
