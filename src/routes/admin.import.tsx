import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Sparkles, AlertCircle, CheckCircle2, Scissors, X, Plus, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyAlphaCutout } from "@/lib/alpha-cutout";
import { userProductsStore } from "@/store/user-products";
import type { Category, Product as CatalogProduct, Role } from "@/data/catalog";
import { ProductDetail } from "@/components/ProductDetail";

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
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvSummary, setCsvSummary] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const toCatalogProduct = (p: Product, imageUrl: string): CatalogProduct => {
    const cat = inferCategory(p.category);
    const role = inferRole(cat);
    return {
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
  };

  const saveDirect = async (p: Product) => {
    if (!p.image_url) return;
    try {
      const ok = userProductsStore.add(toCatalogProduct(p, p.image_url));
      if (!ok) throw new Error(userProductsStore.getError() ?? "Could not save");
      await supabase
        .from("products")
        .update({ status: "approved" })
        .eq("id", p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setSavedCount((n) => n + 1);
    } catch (e) {
      console.error("save failed for", p.id, e);
      setErrorText(e instanceof Error ? e.message : "Save failed");
    }
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

      const ok = userProductsStore.add(toCatalogProduct(p, imageUrl));
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

  // ---- CSV import ----
  const parseCsv = (text: string): Record<string, string>[] => {
    // Minimal RFC4180-ish parser supporting quoted fields, commas, and escaped "" quotes.
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") {
          row.push(cur);
          cur = "";
        } else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(cur);
          cur = "";
          if (row.some((v) => v.length > 0)) rows.push(row);
          row = [];
        } else {
          cur += c;
        }
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur);
      if (row.some((v) => v.length > 0)) rows.push(row);
    }
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? "").trim();
      });
      return obj;
    });
  };

  const pickField = (row: Record<string, string>, candidates: string[]): string => {
    const keys = Object.keys(row);
    for (const cand in candidates) {
      // noop placeholder to satisfy lint about unused index — replaced below.
    }
    for (const c of candidates) {
      const hit = keys.find((k) => k.toLowerCase() === c.toLowerCase());
      if (hit && row[hit]) return row[hit];
    }
    return "";
  };

  const onCsvChosen = async (file: File) => {
    setErrorText(null);
    setCsvSummary(null);
    setCsvBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setErrorText("That CSV looks empty. It needs a header row plus at least one product.");
        return;
      }

      const records = rows
        .map((r) => {
          const name = pickField(r, ["Productnaam", "Product name", "Name", "Title"]);
          const source_url = pickField(r, ["Product URL", "URL", "Source URL", "Link"]);
          const image_url = pickField(r, [
            "Productafbeelding",
            "Product image",
            "Image",
            "Image URL",
            "Photo",
          ]);
          const priceRaw = pickField(r, ["Prijs (EUR)", "Prijs", "Price", "Price (EUR)"]);
          const maker = pickField(r, ["Merk", "Maker", "Brand", "Vendor"]);
          const category = pickField(r, ["Categorie", "Category", "Type"]);
          const description = pickField(r, [
            "Product omschrijving",
            "Omschrijving",
            "Description",
            "Beschrijving",
          ]);
          const price = priceRaw
            ? Number(priceRaw.replace(/[^0-9,.-]/g, "").replace(",", "."))
            : null;
          return {
            name,
            source_url,
            image_url: image_url || null,
            original_image_url: image_url || null,
            price: price != null && isFinite(price) ? price : null,
            currency: "EUR" as const,
            maker: maker || null,
            category: category || null,
            description: description || null,
            status: "pending" as const,
            job_id: null as string | null,
          };
        })
        .filter((r) => r.name && r.source_url);

      if (records.length === 0) {
        setErrorText(
          "Couldn't find usable rows. Make sure the CSV has at least a name column and a product URL column.",
        );
        return;
      }

      // Insert in chunks to stay friendly to the API.
      const chunkSize = 50;
      let inserted = 0;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      setCsvSummary(
        `Imported ${inserted} of ${rows.length} rows. Review them below, then run cutout or save as-is.`,
      );
    } catch (e) {
      console.error("CSV import failed", e);
      setErrorText(e instanceof Error ? e.message : "CSV import failed");
    } finally {
      setCsvBusy(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

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

      {/* CSV upload */}
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">
              Or upload a CSV
            </div>
            <h2
              className="mt-1 font-serif text-2xl"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bulk add from spreadsheet
            </h2>
            <p className="mt-2 text-xs text-black/50">
              Expected columns:{" "}
              <code className="rounded bg-black/5 px-1">Productnaam</code>,{" "}
              <code className="rounded bg-black/5 px-1">Product URL</code>,{" "}
              <code className="rounded bg-black/5 px-1">Productafbeelding</code>,{" "}
              <code className="rounded bg-black/5 px-1">Prijs (EUR)</code>,{" "}
              <code className="rounded bg-black/5 px-1">Product omschrijving</code>. English
              equivalents (Name, URL, Image, Price, Description) also work.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCsvChosen(f);
              }}
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={csvBusy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#1A1A1A", color: "#F9F7F2" }}
            >
              {csvBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {csvBusy ? "Importing…" : "Choose CSV file"}
            </button>
          </div>
        </div>
        {csvSummary && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <FileText size={14} /> {csvSummary}
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
                  <button
                    type="button"
                    onClick={() => setDetail(toCatalogProduct(p, p.image_url ?? ""))}
                    className="relative block aspect-square w-full cursor-zoom-in"
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
                  </button>
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
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => approve(p)}
                        disabled={cutting}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#1A1A1A", color: "#F9F7F2" }}
                        title="Run background cutout, then save"
                      >
                        {cutting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Scissors size={11} />
                        )}
                        {cutting ? "Cutting…" : "Cutout & save"}
                      </button>
                      <button
                        onClick={() => saveDirect(p)}
                        disabled={cutting || !p.image_url}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 px-2 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-black/80 transition-colors hover:bg-black/5 disabled:opacity-40"
                        title="Save with original background"
                      >
                        <Plus size={11} /> Save as-is
                      </button>
                    </div>
                    <button
                      onClick={() => dismiss(p)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg p-1.5 text-[10px] uppercase tracking-[0.14em] text-black/40 transition-colors hover:bg-black/5"
                    >
                      <X size={11} /> Dismiss
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <ProductDetail
        product={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        selected={false}
        onToggle={() => {
          // From the detail overlay "Add to board" triggers a save-as-is.
          if (!detail) return;
          const match = products.find((x) => `import-${x.id.slice(0, 8)}` === detail.id);
          if (match) saveDirect(match);
          setDetail(null);
        }}
      />
    </div>
  );
}