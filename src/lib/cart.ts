// Lightweight client-side cart backed by localStorage.
import { useEffect, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  img: string;
  qty: number;
};

const KEY = "draupadi_cart_v1";
const EVT = "draupadi:cart";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const items = read();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx].qty += qty;
    else items.push({ ...item, qty });
    write(items);
  },
  setQty(id: string, qty: number) {
    const items = read().map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i));
    write(items);
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  return { items, subtotal, count };
}
