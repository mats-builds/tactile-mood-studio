import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";

const KEY = "moods.userProducts.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let products: Product[] = [];

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) products = JSON.parse(raw) as Product[];
  } catch {
    /* ignore */
  }
}
load();

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(products));
}
function emit() {
  listeners.forEach((l) => l());
}

export const userProductsStore = {
  list: () => products,
  add(p: Product) {
    // de-dupe by id
    products = [p, ...products.filter((x) => x.id !== p.id)];
    persist();
    emit();
  },
  remove(id: string) {
    products = products.filter((p) => p.id !== id);
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
  };
}
