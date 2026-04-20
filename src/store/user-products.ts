import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";

const KEY = "moods.userProducts.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let products: Product[] = [];
let hydrated = false;
let lastError: string | null = null;

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
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(products));
    lastError = null;
    return true;
  } catch (err) {
    lastError =
      err instanceof Error
        ? err.name === "QuotaExceededError" || /quota/i.test(err.message)
          ? "Browser storage is full — your additions can't be saved. Remove some pieces or images and try again."
          : err.message
        : "Could not save your additions.";
    console.error("user-products persist failed", err);
    return false;
  }
}
function emit() {
  listeners.forEach((l) => l());
}

export const userProductsStore = {
  hydrate,
  list: () => products,
  getError: () => lastError,
  clearError: () => {
    lastError = null;
    emit();
  },
  add(p: Product) {
    hydrate();
    // de-dupe by id
    products = [p, ...products.filter((x) => x.id !== p.id)];
    const ok = persist();
    if (!ok) {
      // Roll back so UI matches storage.
      products = products.filter((x) => x.id !== p.id);
    }
    emit();
    return ok;
  },
  remove(id: string) {
    hydrate();
    products = products.filter((p) => p.id !== id);
    persist();
    emit();
  },
  update(id: string, patch: Partial<Product>) {
    hydrate();
    const prev = products;
    products = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
    const ok = persist();
    if (!ok) products = prev;
    emit();
    return ok;
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
    update: (id: string, patch: Partial<Product>) =>
      userProductsStore.update(id, patch),
    removeImage: (id: string, imageUrl: string) =>
      userProductsStore.removeImage(id, imageUrl),
    error: userProductsStore.getError(),
    clearError: () => userProductsStore.clearError(),
  };
}
