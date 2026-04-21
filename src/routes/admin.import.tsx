import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Sparkles, AlertCircle, CheckCircle2, Scissors, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyAlphaCutout } from "@/lib/alpha-cutout";
import { userProductsStore } from "@/store/user-products";
import type { Category, Product as CatalogProduct, Role } from "@/data/catalog";

export const Route = createFileRoute("/admin/import")({
  component: BulkImportPage,
});

type Job = {
  id: string;
  category_url: string;
  max_items: number;
  status: "running" | "completed" | "failed";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  current_label: string | null;
  error_message: string | null;
  created_at: string;
};

type Product = {
  id: string;
  job_id: string | null;
  name: string;
  maker: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  image_url: string | null;
  original_image_url: string | null;
  source_url: string;
  status: string;
  created_at: string;
};

function BulkImportPage() {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(10);
  const [starting, setStarting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const cutoutRunning = useRef<Set<string>>(new Set());
  const [cuttingIds, setCuttingIds] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);

  // Load all pending products (from any job) on mount so the user can review
  // anything imported in previous sessions.
  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
      });

    // Subscribe to all new pending product inserts even without an active job.
    const allChan = supabase
      .channel("pending-products")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        (payload) => {
          const p = payload.new as Product;
          if (p.status !== "pending") return;
          setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(allChan);
    };
  }, []);

  // Subscribe to current job + its products
  useEffect(() => {
    if (!job) return;
    const jobChan = supabase
      .channel(`job-${job.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "import_jobs", filter: `id=eq.${job.id}` },
        (payload) => setJob(payload.new as Job),
      )
      .subscribe();

    const prodChan = supabase
      .channel(`prods-${job.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products", filter: `job_id=eq.${job.id}` },
        (payload) => {
          const p = payload.new as Product;
          setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `job_id=eq.${job.id}` },
        (payload) => {
          const p = payload.new as Product;
          setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        },
      )
      .subscribe();

    // backfill anything inserted before subscription connected
    supabase
      .from("products")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
      });

    return () => {
      supabase.removeChannel(jobChan);
      supabase.removeChannel(prodChan);
    };
  }, [job?.id]);

  // Background removal is now triggered manually per product via the
  // "Cutout & approve" button so the user can first review which items to keep.
  const runCutout = async (p: Product) => {
    if (!p.image_url || p.image_url.startsWith("data:")) return;
    if (cutoutRunning.current.has(p.id)) return;
    cutoutRunning.current.add(p.id);
    setCuttingIds((s) => new Set(s).add(p.id));
    try {
      const dataUrl = await applyAlphaCutout(p.image_url);
      await supabase
        .from("products")
        .update({ image_url: dataUrl, status: "approved" })
        .eq("id", p.id);
    } catch (e) {
      console.error("cutout failed for", p.id, e);
    } finally {
      cutoutRunning.current.delete(p.id);
      setCuttingIds((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  };

  const dismiss = async (p: Product) => {
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    await supabase.from("products").update({ status: "rejected" }).eq("id", p.id);
  };

  const inferCategory = (raw: string | null): Category => {
    const c = (raw ?? "").toLowerCase();
    if (/(sofa|chair|stool|bench|seat|bank)/.test(c)) return "Seating";
    if (/(table|tafel|desk)/.test(c)) return "Tables";
    if (/(lamp|light|pendant|sconce)/.test(c)) return "Lighting";
    if (/(shelf|cabinet|sideboard|storage|kast)/.test(c)) return "Storage";
    if (/(rug|textile|cushion|pillow|throw)/.test(c)) return "Textiles";
    if (/(art|print|poster|mirror)/.test(c)) return "Art";
    return "Decor";
  };

  const inferRole = (cat: Category): Role => {
    if (cat === "Seating" || cat === "Storage") return "ground";
    if (cat === "Tables") return "surface";
    if (cat === "Lighting") return "standing";
    if (cat === "Textiles") return "floor";
    if (cat === "Art") return "wall";
    return "prop";
  };

  const approve = async (p: Product) => {
    if (!p.image_url) return;
    if (cutoutRunning.current.has(p.id)) return;
    cutoutRunning.current.add(p.id);
    setCuttingIds((s) => new Set(s).add(p.id));
    try {
      // Run cutout if not already a transparent data URL
      const imageUrl = p.image_url.startsWith("data:")
        ? p.image_url
        : await applyAlphaCutout(p.image_url);

      const cat = inferCategory(p.category);
      const role = inferRole(cat);
      const catalogProduct: CatalogProduct = {
        id: `import-${p.id.slice(0, 8)}`,
        name: p.name,
        maker: p.maker ?? "—",
        price: p.price != null ? `€ ${Number(p.price).toLocaleString("nl-NL")}` : "—",
        category: cat,
        src: imageUrl,
        colors: ["linen", "bone"],
        role,
        sourceUrl: p.source_url,
      };
      const ok = userProductsStore.add(catalogProduct);
      if (!ok) throw new Error(userProductsStore.getError() ?? "Could not save");

      await supabase
        .from("products")
        .update({ image_url: imageUrl, status: "approved" })
        .eq("id", p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setSavedCount((n) => n + 1);
    } catch (e) {
      console.error("approve failed for", p.id, e);
      setErrorText(e instanceof Error ? e.message : "Approve failed");
    } finally {
      cutoutRunning.current.delete(p.id);
      setCuttingIds((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  };

  const startSync = async () => {
    setErrorText(null);
    setProducts([]);
    setJob(null);
    if (!url.trim()) {
      setErrorText("Enter a category URL first.");
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-import", {
        body: { categoryUrl: url.trim(), limit },
      });
      if (error) throw error;
      const jobId = (data as { jobId: string }).jobId;
      const { data: row, error: rowErr } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (rowErr) throw rowErr;
      setJob(row as Job);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "Failed to start sync");
    } finally {
      setStarting(false);
    }
  };

  const progress = useMemo(() => {
    if (!job || job.total === 0) return 0;
    return Math.round((job.processed / job.total) * 100);
  }, [job]);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Pipeline</div>
        <h1
          className="font-serif text-5xl mt-3"
          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
        >
          Bulk Import
        </h1>
        <p className="mt-2 max-w-xl text-sm text-black/50">
          Paste a category page URL. We crawl it, extract structured product details with AI, cut
          backgrounds, and stage everything for your approval.
        </p>
      </header>

      {/* Form */}
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_auto]">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.24em] text-black/50">
              Category URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://brand.com/sofas"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-3 text-sm outline-none focus:border-black/40"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.24em] text-black/50">
              Limit
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-3 text-sm outline-none focus:border-black/40"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startSync}
              disabled={starting || (job?.status === "running")}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 md:w-auto"
              style={{ background: "#1A1A1A", color: "#F9F7F2" }}
            >
              {starting || job?.status === "running" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Start Sync
            </button>
          </div>
        </div>
        {errorText && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle size={14} /> {errorText}
          </div>
        )}
      </div>

      {/* Progress */}
      {job && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">
                {job.status === "running" ? "In progress" : job.status}
              </div>
              <div className="mt-1 font-serif text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                {job.current_label ?? "Starting…"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-3xl">{progress}%</div>
              <div className="text-[11px] text-black/50">
                {job.processed} / {job.total || job.max_items} · {job.succeeded} ok ·{" "}
                {job.failed} skipped
              </div>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full bg-black transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {job.error_message && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertCircle size={14} /> {job.error_message}
            </div>
          )}
          {job.status === "completed" && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 size={14} /> Sync complete. Items staged in Catalog → pending.
            </div>
          )}
        </div>
      )}

      {/* Live gallery */}
      {(products.length > 0 || savedCount > 0) && (
        <section>
          <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-black/50">
            <span className="flex items-center gap-2">
              <Sparkles size={10} /> Pending review · {products.length}
            </span>
            {savedCount > 0 && (
              <span className="text-emerald-700">{savedCount} saved to catalog</span>
            )}
          </div>
          {products.length === 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-10 text-center text-sm text-black/40">
              All caught up. Approved items live in your catalog.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => {
              const cutout = p.image_url?.startsWith("data:");
              const cutting = cuttingIds.has(p.id);
              return (
                <article
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                >
                  <div
                    className="relative aspect-square w-full"
                    style={{
                      background: "#F4F1EA",
                      backgroundImage: p.image_url ? `url(${p.image_url})` : undefined,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {cutout && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">
                        <CheckCircle2 size={10} /> Cutout
                      </span>
                    )}
                    {cutting && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-black/70">
                        <Loader2 size={10} className="animate-spin" /> Cutting…
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">
                      {p.maker ?? "—"}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm font-medium">{p.name}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-black/60">
                      <span>{p.category ?? "Uncategorised"}</span>
                      <span className="font-mono">
                        {p.price != null ? `${p.currency ?? "EUR"} ${p.price}` : "—"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => approve(p)}
                        disabled={cutout || cutting}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#1A1A1A", color: "#F9F7F2" }}
                      >
                        {cutting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Scissors size={11} />
                        )}
                        {cutting ? "Saving…" : "Approve & save"}
                      </button>
                      <button
                        onClick={() => dismiss(p)}
                        className="inline-flex items-center justify-center rounded-lg border border-black/10 p-2 text-black/50 transition-colors hover:bg-black/5"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}