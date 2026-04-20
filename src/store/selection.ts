import { useEffect, useState } from "react";

const KEY = "moods.selection.v1";
const PALETTE_KEY = "moods.palette.v1";
const SCENE_KEY = "moods.scene.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

let selected: Set<string> = new Set();
let paletteId: string | null = null;
let sceneId: string | null = null;
let hydrated = false;

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) selected = new Set(JSON.parse(raw));
    const p = window.localStorage.getItem(PALETTE_KEY);
    if (p) paletteId = p;
    const s = window.localStorage.getItem(SCENE_KEY);
    if (s) sceneId = s;
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
  window.localStorage.setItem(KEY, JSON.stringify(Array.from(selected)));
  if (paletteId) window.localStorage.setItem(PALETTE_KEY, paletteId);
  else window.localStorage.removeItem(PALETTE_KEY);
  if (sceneId) window.localStorage.setItem(SCENE_KEY, sceneId);
  else window.localStorage.removeItem(SCENE_KEY);
}

function emit() {
  listeners.forEach((l) => l());
}

export const selectionStore = {
  has: (id: string) => selected.has(id),
  list: () => Array.from(selected),
  count: () => selected.size,
  hydrate,
  toggle(id: string) {
    hydrate();
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    persist();
    emit();
  },
  clear() {
    hydrate();
    selected.clear();
    persist();
    emit();
  },
  getPaletteId: () => paletteId,
  setPaletteId(id: string | null) {
    hydrate();
    paletteId = id;
    persist();
    emit();
  },
  getSceneId: () => sceneId,
  setSceneId(id: string | null) {
    hydrate();
    sceneId = id;
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

export function useSelection() {
  const [, force] = useState(0);
  useEffect(() => {
    selectionStore.hydrate();
    force((n) => n + 1);
    const unsub = selectionStore.subscribe(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);
  return {
    ids: selectionStore.list(),
    count: selectionStore.count(),
    has: (id: string) => selectionStore.has(id),
    toggle: (id: string) => selectionStore.toggle(id),
    clear: () => selectionStore.clear(),
    paletteId: selectionStore.getPaletteId(),
    setPaletteId: (id: string | null) => selectionStore.setPaletteId(id),
    sceneId: selectionStore.getSceneId(),
    setSceneId: (id: string | null) => selectionStore.setSceneId(id),
  };
}
