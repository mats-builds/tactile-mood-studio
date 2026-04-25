import { useEffect, useState } from "react";

const KEY = "moods.selection.v1";
const PALETTE_KEY = "moods.palette.v1";
const SCENE_KEY = "moods.scene.v1";
const LAYOUT_KEY = "moods.layout.v1";

export type LayoutOverride = {
  /** position in % of the room scene container */
  xPct?: number;
  yPct?: number;
  /** scale multiplier applied on top of dimension-derived size */
  scale?: number;
  /** horizontally flipped */
  flipX?: boolean;
  /** stacking order; higher renders in front. Default 0. */
  z?: number;
  /** locked in place: not draggable/selectable, rendered behind unlocked items */
  locked?: boolean;
  /** in-plane tilt (z-axis) in degrees, e.g. -45..45 */
  rotateZ?: number;
  /** 3D yaw (y-axis) in degrees for a perspective turn, e.g. -60..60 */
  rotateY?: number;
};

export type LayoutMap = Record<string, LayoutOverride>;

type Listener = () => void;
const listeners = new Set<Listener>();

let selected: Set<string> = new Set();
let paletteId: string | null = null;
let sceneId: string | null = null;
let layout: LayoutMap = {};
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
    const l = window.localStorage.getItem(LAYOUT_KEY);
    if (l) layout = JSON.parse(l) as LayoutMap;
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
  window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
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
  setAll(ids: string[]) {
    hydrate();
    selected = new Set(ids);
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
  getLayout: () => layout,
  setLayoutFor(id: string, patch: Partial<LayoutOverride>) {
    hydrate();
    layout = { ...layout, [id]: { ...layout[id], ...patch } };
    persist();
    emit();
  },
  resetLayoutFor(id: string) {
    hydrate();
    if (!layout[id]) return;
    const next = { ...layout };
    delete next[id];
    layout = next;
    persist();
    emit();
  },
  resetAllLayout() {
    hydrate();
    layout = {};
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
    setAll: (ids: string[]) => selectionStore.setAll(ids),
    paletteId: selectionStore.getPaletteId(),
    setPaletteId: (id: string | null) => selectionStore.setPaletteId(id),
    sceneId: selectionStore.getSceneId(),
    setSceneId: (id: string | null) => selectionStore.setSceneId(id),
    layout: selectionStore.getLayout(),
    setLayoutFor: (id: string, patch: Partial<LayoutOverride>) =>
      selectionStore.setLayoutFor(id, patch),
    resetLayoutFor: (id: string) => selectionStore.resetLayoutFor(id),
    resetAllLayout: () => selectionStore.resetAllLayout(),
  };
}
