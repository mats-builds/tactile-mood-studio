import { LogOut } from "lucide-react";
import { signOut, useAuth } from "@/store/auth";

export function OwnerButton() {
  const { user } = useAuth();
  if (!user) return null;
  const label = user.email ?? "Account";
  return (
    <button
      onClick={() => signOut()}
      aria-label="Sign out"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs uppercase tracking-[0.18em] text-black/70 shadow-sm backdrop-blur-xl transition-all hover:bg-white hover:text-black hover:shadow-md"
    >
      <LogOut size={14} strokeWidth={1.4} />
      <span className="hidden sm:inline normal-case tracking-normal">{label}</span>
      <span className="hidden sm:inline">· Sign out</span>
    </button>
  );
}
