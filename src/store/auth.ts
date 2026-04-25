import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type State = { session: Session | null; user: User | null; loading: boolean };
let state: State = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;

function emit() {
  listeners.forEach((l) => l());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // Set up listener BEFORE getSession (per Lovable Cloud guidance)
  supabase.auth.onAuthStateChange((_event, session) => {
    state = { session, user: session?.user ?? null, loading: false };
    emit();
  });
  supabase.auth.getSession().then(({ data }) => {
    state = {
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    };
    emit();
  });
}

export function useAuth() {
  const [, force] = useState(0);
  useEffect(() => {
    init();
    force((n) => n + 1);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
