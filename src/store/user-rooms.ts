import { useEffect, useState } from "react";

/**
 * Locally-stored, AI-emptied room photos that the user can pick as a backdrop
 * in the moodboard composer. Persisted to localStorage as data URLs so they
 * survive reloads without a server round-trip.
 */

const KEY = "moods.user-rooms.v1";

export type UserRoom = {
  /** scene id, prefixed with "user:" so it can't collide with built-ins */
  id: string;
  name: string;
  /** data URL of the AI-emptied room */
  src: string;
  /** data URL of the original photo, kept for reference */
  originalSrc?: string;
  createdAt: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();

let rooms: UserRoom[] = [];
let hydrated = false;

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) rooms = JSON.parse(raw) as UserRoom[];
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rooms));
  } catch (e) {
    console.warn("Couldn't persist user rooms (storage full?)", e);
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  load();
}

function emit() {
  listeners.forEach((l) => l());
}

export const userRoomsStore = {
  list: () => rooms,
  hydrate,
  add(room: Omit<UserRoom, "id" | "createdAt"> & { id?: string }) {
    hydrate();
    const id = room.id ?? `user:${crypto.randomUUID().slice(0, 8)}`;
    const next: UserRoom = {
      id,
      name: room.name,
      src: room.src,
      originalSrc: room.originalSrc,
      createdAt: Date.now(),
    };
    rooms = [next, ...rooms];
    persist();
    emit();
    return next;
  },
  remove(id: string) {
    hydrate();
    rooms = rooms.filter((r) => r.id !== id);
    persist();
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useUserRooms() {
  const [, force] = useState(0);
  useEffect(() => {
    userRoomsStore.hydrate();
    force((n) => n + 1);
    const unsub = userRoomsStore.subscribe(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);
  return {
    rooms: userRoomsStore.list(),
    add: userRoomsStore.add,
    remove: userRoomsStore.remove,
  };
}