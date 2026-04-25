import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRoom = {
  id: string;
  name: string;
  src: string;
  originalSrc?: string;
  createdAt: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();
let rooms: UserRoom[] = [];
let currentUserId: string | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function rowToRoom(r: any): UserRoom {
  return {
    id: r.id,
    name: r.name,
    src: r.background_image ?? "",
    originalSrc: (r.scene && r.scene.originalSrc) || undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

async function loadFromServer(uid: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("rooms load failed", error);
    return;
  }
  rooms = (data ?? []).map(rowToRoom);
  emit();
}

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
      rooms = [];
      emit();
      if (uid) loadFromServer(uid);
    }
  });
}

export const userRoomsStore = {
  list: () => rooms,
  hydrate: () => {
    /* no-op */
  },
  add(room: Omit<UserRoom, "id" | "createdAt"> & { id?: string }) {
    if (!currentUserId) {
      throw new Error("Sign in required");
    }
    const id = room.id ?? crypto.randomUUID();
    const next: UserRoom = {
      id,
      name: room.name,
      src: room.src,
      originalSrc: room.originalSrc,
      createdAt: Date.now(),
    };
    rooms = [next, ...rooms];
    emit();
    supabase
      .from("rooms")
      .upsert({
        id,
        user_id: currentUserId,
        name: next.name,
        background_image: next.src,
        scene: { originalSrc: next.originalSrc ?? null },
      })
      .then(({ error }) => {
        if (error) {
          console.error("room save failed", error);
          rooms = rooms.filter((r) => r.id !== id);
          emit();
        }
      });
    return next;
  },
  remove(id: string) {
    if (!currentUserId) return;
    const prev = rooms;
    rooms = rooms.filter((r) => r.id !== id);
    emit();
    supabase
      .from("rooms")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUserId)
      .then(({ error }) => {
        if (error) {
          rooms = prev;
          emit();
        }
      });
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useUserRooms() {
  const [, force] = useState(0);
  useEffect(() => {
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
