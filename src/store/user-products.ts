import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";

const KEY = "moods.userProducts.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let products: Product[] = [];
let hydrated = false;

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) products = JSON.parse(raw) as Product[];
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  load();
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(products));
}
function emit() {
  listeners.forEach((l) => l());
}

export const userProductsStore = {
  hydrate,
  list: () => products,
  add(p: Product) {
    hydrate();
    // de-dupe by id
    products = [p, ...products.filter((x) => x.id !== p.id)];
    persist();
    emit();
  },
  remove(id: string) {
    hydrate();
    products = products.filter((p) => p.id !== id);
    persist();
    emit();
  },
  update(id: string, patch: Partial<Product>) {
    hydrate();
    products = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
    persist();
    emit();
  },
  removeImage(id: string, imageUrl: string) {
    hydrate();
    products = products.map((p) => {
      if (p.id !== id) return p;
      const gallery = (p.gallery ?? []).filter((g) => g !== imageUrl);
      // If removing the main showcase, promote the first gallery image.
      if (p.src === imageUrl) {
        const next = gallery[0];
        return {
          ...p,
          src: next ?? "",
          gallery: next ? gallery.slice(1) : [],
        };
      }
      return { ...p, gallery };
    });
    persist();
    emit();
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
    userProductsStore.hydrate();
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
    update: (id: string, patch: Partial<Product>) => userProductsStore.update(id, patch),
    removeImage: (id: string, imageUrl: string) =>
      userProductsStore.removeImage(id, imageUrl),
  };
}
