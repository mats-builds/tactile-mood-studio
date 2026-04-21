import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, EyeOff, Eye } from "lucide-react";
import { catalog, categories, type Category } from "@/data/catalog";
import { parsePrice, formatEUR } from "@/admin/sample-data";

const VIS_KEY = "supermoods.admin.catalog.hidden";

function loadHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(VIS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveHidden(s: Set<string>) {
  window.localStorage.setItem(VIS_KEY, JSON.stringify(Array.from(s)));
}

export const Route = createFileRoute("/admin/catalog")({
  component: CatalogPage,
});

function CatalogPage() {
  const [query, setQuery] = useState("");
  const [maker, setMaker] = useState<string>("");
  const [cat, setCat] = useState<Category | "">("");
  const [hidden, setHidden] = useState<Set<string>>(() => loadHidden());

  const makers = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.maker))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (maker && p.maker !== maker) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.maker.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [query, maker, cat]);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveHidden(next);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Inventory</div>
        <h1
          className="font-serif text-5xl mt-3"
          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
        >
          Product Catalog
        </h1>
        <p className="mt-2 text-sm text-black/50">
          Toggle visibility for items currently in or out of stock. {hidden.size} hidden.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black/40"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as Category | "")}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-black/40"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={maker}
          onChange={(e) => setMaker(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-black/40"
        >
          <option value="">All brand partners</option>
          {makers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => {
          const isHidden = hidden.has(p.id);
          return (
            <article
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all hover:shadow-md"
              style={{ opacity: isHidden ? 0.55 : 1 }}
            >
              <div
                className="relative aspect-square w-full"
                style={{
                  background: "#F4F1EA",
                  backgroundImage: `url(${p.src})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <span
                  className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    background: isHidden ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
                    color: isHidden ? "#F9F7F2" : "#1A1A1A",
                  }}
                >
                  {isHidden ? "Out of stock" : "In stock"}
                </span>
              </div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">
                  {p.maker}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-medium">{p.name}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm">{formatEUR(parsePrice(p.price))}</span>
                  <button
                    onClick={() => toggle(p.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[11px] transition-colors hover:bg-black hover:text-white"
                  >
                    {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {isHidden ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-16 text-center text-sm text-black/40">
          No products match these filters.
        </div>
      )}
    </div>
  );
}