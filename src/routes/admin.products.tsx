import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Copy, Archive, Package, Star } from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string | null;
  price: number;
  offer_price: number | null;
  stock: number;
  low_stock_threshold: number;
  thumbnail: string | null;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  is_archived: boolean;
  status: string;
};

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, sku, category, price, offer_price, stock, low_stock_threshold, thumbnail, is_featured, is_trending, is_new_arrival, is_bestseller, is_archived, status")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  async function remove(id: string) {
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    load();
  }

  async function duplicate(p: Product) {
    const { data: full } = await supabase.from("products").select("*").eq("id", p.id).single();
    if (!full) return;
    const copy = { ...full } as any;
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy.name = `${full.name} (Copy)`;
    copy.slug = `${full.slug}-copy-${Date.now().toString(36)}`;
    copy.sku = full.sku ? `${full.sku}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}` : null;
    const { error } = await supabase.from("products").insert(copy);
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    load();
  }

  async function toggleArchive(p: Product) {
    const { error } = await supabase.from("products").update({ is_archived: !p.is_archived }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.is_archived ? "Restored" : "Archived");
    load();
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[#7A0019] mb-2">Catalogue</div>
          <h1 className="font-serif text-3xl text-[#1a0d0d]">Products</h1>
          <p className="text-sm text-neutral-500 mt-1">{products.length} pieces in your atelier.</p>
        </div>
        <button
          onClick={() => setEditing({ name: "", price: 0, stock: 0, low_stock_threshold: 5, images: [] })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a0d0d] text-[var(--ivory)] rounded-md hover:bg-[#7A0019] text-sm"
        >
          <Plus size={16} /> Add Product
        </button>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-neutral-100 flex items-center gap-3">
          <Search size={16} className="text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Product</th>
                <th className="text-left px-6 py-3">SKU</th>
                <th className="text-left px-6 py-3">Category</th>
                <th className="text-right px-6 py-3">Price</th>
                <th className="text-right px-6 py-3">Stock</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center px-6 py-12 text-neutral-400">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center px-6 py-16 text-neutral-400">
                  <Package className="mx-auto mb-2 opacity-40" size={28} />
                  <div className="text-sm">No products yet. Click "Add Product" to begin.</div>
                </td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="w-10 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-12 bg-neutral-100 rounded grid place-items-center text-neutral-400"><Package size={14} /></div>
                      )}
                      <div>
                        <div className="font-medium text-[#1a0d0d]">{p.name}</div>
                        <div className="flex gap-1 mt-1">
                          {p.is_featured && <span className="text-[0.6rem] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">FEATURED</span>}
                          {p.is_trending && <span className="text-[0.6rem] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">TRENDING</span>}
                          {p.is_new_arrival && <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">NEW</span>}
                          {p.is_bestseller && <span className="text-[0.6rem] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">BESTSELLER</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-neutral-500">{p.sku ?? "—"}</td>
                  <td className="px-6 py-3 text-neutral-600">{p.category ?? "—"}</td>
                  <td className="px-6 py-3 text-right">
                    {p.offer_price ? (
                      <div>
                        <div className="text-[#7A0019] font-medium">₹{Number(p.offer_price).toLocaleString("en-IN")}</div>
                        <div className="text-xs line-through text-neutral-400">₹{Number(p.price).toLocaleString("en-IN")}</div>
                      </div>
                    ) : <div>₹{Number(p.price).toLocaleString("en-IN")}</div>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={p.stock === 0 ? "text-rose-600 font-medium" : p.stock <= p.low_stock_threshold ? "text-amber-600 font-medium" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-6 py-3">
                    {p.is_archived ? <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-600 rounded">ARCHIVED</span>
                      : p.stock === 0 ? <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded">OUT OF STOCK</span>
                      : <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">ACTIVE</span>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Edit" onClick={() => setEditing(p)}><Edit2 size={14} /></IconBtn>
                      <IconBtn title="Duplicate" onClick={() => duplicate(p)}><Copy size={14} /></IconBtn>
                      <IconBtn title={p.is_archived ? "Restore" : "Archive"} onClick={() => toggleArchive(p)}><Archive size={14} /></IconBtn>
                      <IconBtn title="Delete" onClick={() => remove(p.id)} danger><Trash2 size={14} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, danger, ...p }: any) {
  return (
    <button {...p} className={`p-2 rounded hover:bg-neutral-100 ${danger ? "text-rose-600 hover:bg-rose-50" : "text-neutral-600"}`}>{children}</button>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function compressImage(file: File): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ file, dataUrl: event.target?.result as string });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG with 0.8 quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            resolve({ file: compressedFile, dataUrl });
          } else {
            resolve({ file, dataUrl });
          }
        }, "image/jpeg", 0.8);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image for compression."));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadToSupabase(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  if (error) {
    throw error;
  }
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);
  return publicUrl;
}

const SAREE_TYPES = ["Kanchipuram Silk", "Banarasi Silk", "Chanderi Cotton", "Tussar Silk", "Organza Zari", "Georgette", "Linen Silk", "Kalamkari Printed"];
const FABRICS = ["Pure Silk", "Mulberry Silk", "Cotton Blend", "Organza", "Linen", "Georgette", "Chiffon", "Tussar Silk"];
const CATEGORIES = ["Silk", "Wedding", "Designer", "Cotton", "Festive"];
const SUBCATEGORIES = ["Handloom", "Powerloom", "Embroidered", "Printed", "Traditional", "Contemporary"];
const OCCASIONS = ["Bridal / Wedding", "Festive wear", "Ceremonial", "Evening Soirée", "Daily wear"];

function ProductEditor({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const isNew = !initial.id;
  const [form, setForm] = useState<any>({
    name: initial.name ?? "",
    description: initial.description ?? "",
    sku: initial.sku ?? "",
    saree_type: initial.saree_type ?? "",
    fabric: initial.fabric ?? "",
    category: initial.category ?? "",
    sub_category: initial.sub_category ?? "",
    price: initial.price ?? 0,
    offer_price: initial.offer_price ?? "",
    stock: initial.stock ?? 0,
    low_stock_threshold: initial.low_stock_threshold ?? 5,
    weight: initial.weight ?? "",
    length: initial.length ?? "",
    color: initial.color ?? "",
    occasion: initial.occasion ?? "",
    wash_care: initial.wash_care ?? "",
    is_featured: !!initial.is_featured,
    is_trending: !!initial.is_trending,
    is_bestseller: !!initial.is_bestseller,
    is_new_arrival: !!initial.is_new_arrival,
  });

  const [images, setImages] = useState<string[]>(() => {
    if (Array.isArray(initial.images)) return initial.images;
    if (typeof initial.images === "string") {
      return initial.images.split("\n").map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [thumbnail, setThumbnail] = useState<string>(initial.thumbnail ?? "");
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [customSareeType, setCustomSareeType] = useState(false);
  const [customFabric, setCustomFabric] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [customSubCategory, setCustomSubCategory] = useState(false);
  const [customOccasion, setCustomOccasion] = useState(false);

  useEffect(() => {
    if (initial.saree_type && !SAREE_TYPES.includes(initial.saree_type)) setCustomSareeType(true);
    if (initial.fabric && !FABRICS.includes(initial.fabric)) setCustomFabric(true);
    if (initial.category && !CATEGORIES.includes(initial.category)) setCustomCategory(true);
    if (initial.sub_category && !SUBCATEGORIES.includes(initial.sub_category)) setCustomSubCategory(true);
    if (initial.occasion && !OCCASIONS.includes(initial.occasion)) setCustomOccasion(true);
  }, [initial]);

  function set<K extends string>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name || !form.price) return toast.error("Name and price are required");
    setSaving(true);
    const validImages = images.filter(Boolean);
    const payload = {
      ...form,
      images: validImages,
      thumbnail: thumbnail || validImages[0] || null,
      offer_price: form.offer_price === "" ? null : Number(form.offer_price),
      price: Number(form.price),
      stock: Number(form.stock),
      low_stock_threshold: Number(form.low_stock_threshold),
      slug: isNew ? `${slugify(form.name)}-${Date.now().toString(36)}` : initial.slug,
      discount_pct: form.offer_price && form.price ? Math.round((1 - Number(form.offer_price) / Number(form.price)) * 100) : 0,
    };
    const { error } = isNew
      ? await supabase.from("products").insert(payload)
      : await supabase.from("products").update(payload).eq("id", initial.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Product created" : "Product updated");
    onSaved();
  }

  const handleImageFiles = async (files: File[]) => {
    setUploading(true);
    let addedCount = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`File "${file.name}" is not an image.`);
        continue;
      }
      try {
        const { file: compressedFile, dataUrl } = await compressImage(file);
        try {
          const publicUrl = await uploadToSupabase(compressedFile);
          setImages(prev => [...prev, publicUrl]);
          if (!thumbnail) {
            setThumbnail(publicUrl);
          }
          addedCount++;
        } catch (uploadError) {
          console.warn("Supabase upload failed, falling back to Base64:", uploadError);
          setImages(prev => [...prev, dataUrl]);
          if (!thumbnail) {
            setThumbnail(dataUrl);
          }
          addedCount++;
          toast.info(`Saved "${file.name}" locally as Base64.`);
        }
      } catch (err: any) {
        toast.error(`Error processing image "${file.name}": ${err.message}`);
      }
    }
    setUploading(false);
    if (addedCount > 0) {
      toast.success(`Added ${addedCount} image(s)`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleImageFiles(Array.from(e.dataTransfer.files));
      return;
    }

    const url = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (url) {
      handleAddUrlValue(url);
    }
  };

  const handleAddUrl = () => {
    handleAddUrlValue(urlInput);
  };

  const handleAddUrlValue = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("data:image/")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    const toastId = toast.loading("Validating image URL...");

    const tempImg = new Image();
    tempImg.onload = () => {
      toast.dismiss(toastId);
      setImages(prev => [...prev, cleanUrl]);
      if (!thumbnail) {
        setThumbnail(cleanUrl);
      }
      setUrlInput("");
      toast.success("Image URL added successfully!");
    };
    tempImg.onerror = () => {
      toast.dismiss(toastId);
      if (cleanUrl.includes("gemini.google.com") || cleanUrl.includes("drive.google.com") || !cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i)) {
        toast.error(
          "Could not load image. This URL appears to be a webpage link (like a Gemini share page) rather than a direct image link. Please download the image and drag-and-drop the file instead.",
          { duration: 7000 }
        );
      } else {
        toast.error("Could not load image. It might be blocked by the server's security/CORS policy. Downloading the image and dragging it here will work!");
      }
    };
    tempImg.src = cleanUrl;
  };

  const removeImage = (index: number) => {
    const removedUrl = images[index];
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (thumbnail === removedUrl) {
      setThumbnail(newImages[0] || "");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" 
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10 flex items-center justify-between">
          <h2 className="font-serif text-xl text-[#1a0d0d]">{isNew ? "Add Product" : "Edit Product"}</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-[#7A0019] transition-colors outline-none"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Inp label="Name *" value={form.name} onChange={(v: string) => set("name", v)} />
            <Inp label="SKU" value={form.sku} onChange={(v: string) => set("sku", v)} />
            
            {!customSareeType ? (
              <Inp 
                label="Saree Type" 
                select 
                options={SAREE_TYPES} 
                value={form.saree_type} 
                onChange={(v: string) => {
                  if (v === "custom") {
                    setCustomSareeType(true);
                    set("saree_type", "");
                  } else {
                    set("saree_type", v);
                  }
                }} 
              />
            ) : (
              <div className="relative">
                <Inp label="Saree Type (Custom)" value={form.saree_type} onChange={(v: string) => set("saree_type", v)} />
                <button 
                  type="button" 
                  onClick={() => { setCustomSareeType(false); set("saree_type", ""); }}
                  className="absolute right-2 top-8 text-[10px] text-[var(--maroon)] hover:text-[#5A0013] underline font-medium outline-none"
                >
                  Select Preset
                </button>
              </div>
            )}

            {!customFabric ? (
              <Inp 
                label="Fabric" 
                select 
                options={FABRICS} 
                value={form.fabric} 
                onChange={(v: string) => {
                  if (v === "custom") {
                    setCustomFabric(true);
                    set("fabric", "");
                  } else {
                    set("fabric", v);
                  }
                }} 
              />
            ) : (
              <div className="relative">
                <Inp label="Fabric (Custom)" value={form.fabric} onChange={(v: string) => set("fabric", v)} />
                <button 
                  type="button" 
                  onClick={() => { setCustomFabric(false); set("fabric", ""); }}
                  className="absolute right-2 top-8 text-[10px] text-[var(--maroon)] hover:text-[#5A0013] underline font-medium outline-none"
                >
                  Select Preset
                </button>
              </div>
            )}

            {!customCategory ? (
              <Inp 
                label="Category" 
                select 
                options={CATEGORIES} 
                value={form.category} 
                onChange={(v: string) => {
                  if (v === "custom") {
                    setCustomCategory(true);
                    set("category", "");
                  } else {
                    set("category", v);
                  }
                }} 
              />
            ) : (
              <div className="relative">
                <Inp label="Category (Custom)" value={form.category} onChange={(v: string) => set("category", v)} />
                <button 
                  type="button" 
                  onClick={() => { setCustomCategory(false); set("category", ""); }}
                  className="absolute right-2 top-8 text-[10px] text-[var(--maroon)] hover:text-[#5A0013] underline font-medium outline-none"
                >
                  Select Preset
                </button>
              </div>
            )}

            {!customSubCategory ? (
              <Inp 
                label="Sub-category" 
                select 
                options={SUBCATEGORIES} 
                value={form.sub_category} 
                onChange={(v: string) => {
                  if (v === "custom") {
                    setCustomSubCategory(true);
                    set("sub_category", "");
                  } else {
                    set("sub_category", v);
                  }
                }} 
              />
            ) : (
              <div className="relative">
                <Inp label="Sub-category (Custom)" value={form.sub_category} onChange={(v: string) => set("sub_category", v)} />
                <button 
                  type="button" 
                  onClick={() => { setCustomSubCategory(false); set("sub_category", ""); }}
                  className="absolute right-2 top-8 text-[10px] text-[var(--maroon)] hover:text-[#5A0013] underline font-medium outline-none"
                >
                  Select Preset
                </button>
              </div>
            )}

            <Inp label="Color" value={form.color} onChange={(v: string) => set("color", v)} />

            {!customOccasion ? (
              <Inp 
                label="Occasion" 
                select 
                options={OCCASIONS} 
                value={form.occasion} 
                onChange={(v: string) => {
                  if (v === "custom") {
                    setCustomOccasion(true);
                    set("occasion", "");
                  } else {
                    set("occasion", v);
                  }
                }} 
              />
            ) : (
              <div className="relative">
                <Inp label="Occasion (Custom)" value={form.occasion} onChange={(v: string) => set("occasion", v)} />
                <button 
                  type="button" 
                  onClick={() => { setCustomOccasion(false); set("occasion", ""); }}
                  className="absolute right-2 top-8 text-[10px] text-[var(--maroon)] hover:text-[#5A0013] underline font-medium outline-none"
                >
                  Select Preset
                </button>
              </div>
            )}

            <Inp label="Weight" value={form.weight} onChange={(v: string) => set("weight", v)} placeholder="850g" />
            <Inp label="Length" value={form.length} onChange={(v: string) => set("length", v)} placeholder="6.5 m" />
          </div>
          <Inp label="Description" textarea value={form.description} onChange={(v: string) => set("description", v)} />
          <Inp label="Wash Care" textarea value={form.wash_care} onChange={(v: string) => set("wash_care", v)} />
          
          {/* Custom Image Manager */}
          <div className="space-y-4">
            <span className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 block">Product Gallery & Images</span>
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? "border-[#7A0019] bg-[#7A0019]/5" 
                  : "border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#7A0019] rounded-full animate-spin"></div>
                  <p className="text-xs text-neutral-500">Compressing & uploading image(s)...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-plus"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="m21 16-4-4-5 5-4-4-5 5"/><circle cx="9" cy="9" r="2"/><path d="M16 5h6"/><path d="M19 2v6"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a0d0d]">Drag & drop images here, or click to browse</p>
                    <p className="text-xs text-neutral-400 mt-1">Supports JPEG, PNG, WebP. Automatically optimized.</p>
                  </div>
                </>
              )}
            </div>

            {/* URL Link Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste direct image URL (e.g. https://example.com/saree.jpg)..."
                className="flex-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:border-[#7A0019] outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-4 py-2 bg-[#1a0d0d] text-[var(--ivory)] hover:bg-[#7A0019] text-sm rounded transition-colors duration-150"
              >
                Add URL
              </button>
            </div>

            {/* Image Gallery Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {images.map((url, index) => {
                  const isThumb = url === thumbnail || (!thumbnail && index === 0);
                  return (
                    <div key={index} className="relative group border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50 aspect-[3/4]">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                      
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                            title="Remove Image"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setThumbnail(url)}
                          className={`w-full py-1.5 text-xs font-medium rounded transition-colors ${
                            isThumb 
                              ? "bg-amber-500 text-white" 
                              : "bg-white/95 text-neutral-800 hover:bg-white"
                          }`}
                        >
                          {isThumb ? "★ Main Thumbnail" : "☆ Set as Main"}
                        </button>
                      </div>

                      {/* Thumbnail Badge */}
                      {isThumb && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[0.65rem] font-bold rounded shadow-sm">
                          Main
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Inp label="Price *" type="number" value={form.price} onChange={(v: string) => set("price", v)} />
            <Inp label="Offer Price" type="number" value={form.offer_price} onChange={(v: string) => set("offer_price", v)} />
            <Inp label="Stock" type="number" value={form.stock} onChange={(v: string) => set("stock", v)} />
            <Inp label="Low Stock Alert" type="number" value={form.low_stock_threshold} onChange={(v: string) => set("low_stock_threshold", v)} />
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            {(["is_featured", "is_trending", "is_bestseller", "is_new_arrival"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
                {k.replace("is_", "").replace("_", " ")}
              </label>
            ))}
          </div>
        </div>
        <footer className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-[#1a0d0d] text-[var(--ivory)] rounded hover:bg-[#7A0019] disabled:opacity-60">
            {saving ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", textarea, select, options, placeholder }: any) {
  return (
    <label className="block">
      <span className="text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500">{label}</span>
      {select ? (
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full px-3 py-2 border border-neutral-200 rounded text-sm bg-white focus:border-[#7A0019] outline-none cursor-pointer"
        >
          <option value="">Select {label}...</option>
          {options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="custom">── Custom Value ──</option>
        </select>
      ) : textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="mt-1.5 w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-[#7A0019] outline-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1.5 w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-[#7A0019] outline-none" />
      )}
    </label>
  );
}
