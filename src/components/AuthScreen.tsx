import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(
        result.error instanceof Error ? result.error.message : "Google sign-in failed"
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          Supermoods
        </div>
        <h1
          className="mt-2 font-serif text-3xl text-foreground"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {mode === "signin" ? "Welcome back" : "Create your atelier"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Build moodboards from your own curated furniture.
        </p>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="mt-6 w-full rounded-lg border border-border bg-background py-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground/40"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground/40"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
