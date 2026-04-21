import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Sparkles, AlertCircle, CheckCircle2, Scissors, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyAlphaCutout } from "@/lib/alpha-cutout";

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

  // Run client-side background removal on each new product image, then update the row.
  useEffect(() => {
    products.forEach(async (p) => {
      if (!p.image_url) return;
      if (p.image_url.startsWith("data:")) return; // already cutout
      if (cutoutRunning.current.has(p.id)) return;
      cutoutRunning.current.add(p.id);
      try {
        const dataUrl = await applyAlphaCutout(p.image_url);
        await supabase.from("products").update({ image_url: dataUrl }).eq("id", p.id);
      } catch (e) {
        console.error("cutout failed for", p.id, e);
      } finally {
        cutoutRunning.current.delete(p.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.map((p) => p.id + (p.image_url?.startsWith("data:") ? "1" : "0")).join(",")]);

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
      {products.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-black/50">
            <Sparkles size={10} /> Moods-ified products
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => {
              const cutout = p.image_url?.startsWith("data:");
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
                    {!cutout && p.image_url && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-black/70">
                        <Loader2 size={10} className="animate-spin" /> Cutout…
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