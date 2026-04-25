import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import { guestMode } from "@/store/guest";

type Listener = () => void;
const listeners = new Set<Listener>();
let products: Product[] = [];
let currentUserId: string | null = null;
let lastError: string | null = null;
let loaded = false;

function emit() {
  listeners.forEach((l) => l());
}

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    maker: r.maker ?? "",
    price: r.price != null ? `${r.currency ?? "EUR"} ${r.price}` : "",
    category: (r.category as Product["category"]) ?? "Decor",
    src: r.src ?? "",
    colors: [],
    role: "ground",
    description: r.description ?? undefined,
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    sourceUrl: r.source_url ?? undefined,
    details: r.specs && typeof r.specs === "object" ? r.specs : undefined,
  };
}

function productToRow(p: Product, userId: string) {
  // Try to extract a numeric price if present in the formatted string.
  const priceNum = Number((p.price ?? "").replace(/[^\d.]/g, "")) || null;
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    maker: p.maker || null,
    category: p.category || null,
    price: priceNum,
    currency: "EUR",
    source_url: p.sourceUrl || null,
    src: p.src || null,
    gallery: p.gallery ?? [],
    description: p.description || null,
    specs: p.details ?? {},
  };
}

async function loadFromServer(userId: string) {
  const { data, error } = await supabase
    .from("furniture")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    lastError = error.message;
    console.error("furniture load failed", error);
    return;
  }
  products = (data ?? []).map(rowToProduct);
  loaded = true;
  emit();
}

// Re-sync whenever auth state changes
if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user?.id ?? null;
    if (uid) {
      currentUserId = uid;
      loadFromServer(uid);
    }
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    const uid = session?.user?.id ?? null;
    if (uid !== currentUserId) {
      currentUserId = uid;
      products = [];
      loaded = false;
      emit();
      if (uid) loadFromServer(uid);
    }
  });
}

export const userProductsStore = {
  hydrate: () => {
    /* no-op (kept for API compat) */
  },
  list: () => products,
  isLoaded: () => loaded,
  getError: () => lastError,
  clearError: () => {
    lastError = null;
    emit();
  },
  add(p: Product) {
    if (guestMode.isGuest()) {
      products = [p, ...products.filter((x) => x.id !== p.id)];
      loaded = true;
      emit();
      return true;
    }
    if (!currentUserId) return false;
    products = [p, ...products.filter((x) => x.id !== p.id)];
    emit();
    supabase
      .from("furniture")
      .upsert(productToRow(p, currentUserId))
      .then(({ error }) => {
        if (error) {
          lastError = error.message;
          console.error("furniture add failed", error);
          // rollback
          products = products.filter((x) => x.id !== p.id);
          emit();
        }
      });
    return true;
  },
  remove(id: string) {
    if (guestMode.isGuest()) {
      products = products.filter((p) => p.id !== id);
      emit();
      return;
    }
    if (!currentUserId) return;
    const prev = products;
    products = products.filter((p) => p.id !== id);
    emit();
    supabase
      .from("furniture")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUserId)
      .then(({ error }) => {
        if (error) {
          products = prev;
          emit();
        }
      });
  },
  update(id: string, patch: Partial<Product>) {
    if (guestMode.isGuest()) {
      products = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
      emit();
      return true;
    }
    if (!currentUserId) return false;
    const prev = products;
    products = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
    emit();
    const updated = products.find((p) => p.id === id);
    if (updated) {
      supabase
        .from("furniture")
        .upsert(productToRow(updated, currentUserId))
        .then(({ error }) => {
          if (error) {
            products = prev;
            emit();
          }
        });
    }
    return true;
  },
  removeImage(id: string, imageUrl: string) {
    const prev = products;
    products = products.map((p) => {
      if (p.id !== id) return p;
      const gallery = (p.gallery ?? []).filter((g) => g !== imageUrl);
      if (p.src === imageUrl) {
        const next = gallery[0];
        return { ...p, src: next ?? "", gallery: next ? gallery.slice(1) : [] };
      }
      return { ...p, gallery };
    });
    emit();
    const updated = products.find((p) => p.id === id);
    if (updated && currentUserId) {
      supabase
        .from("furniture")
        .upsert(productToRow(updated, currentUserId))
        .then(({ error }) => {
          if (error) {
            products = prev;
            emit();
          }
        });
    }
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUserProducts() {
  const [, force] = useState(0);
  useEffect(() => {
    force((n) => n + 1);
    const unsub = userProductsStore.subscribe(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);
  return {
    products: userProductsStore.list(),
    add: (p: Product) => userProductsStore.add(p),
    remove: (id: string) => userProductsStore.remove(id),
    update: (id: string, patch: Partial<Product>) =>
      userProductsStore.update(id, patch),
    removeImage: (id: string, imageUrl: string) =>
      userProductsStore.removeImage(id, imageUrl),
    error: userProductsStore.getError(),
    clearError: () => userProductsStore.clearError(),
  };
}
