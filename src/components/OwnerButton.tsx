import { LogOut } from "lucide-react";
import { signOut, useAuth } from "@/store/auth";
import { guestMode } from "@/store/guest";
import { useEffect, useState } from "react";

export function OwnerButton() {
  const { user } = useAuth();
  const [, force] = useState(0);
  useEffect(() => guestMode.subscribe(() => force((n) => n + 1)), []);
  const isGuest = guestMode.isGuest();
  if (!user && !isGuest) return null;
  const label = isGuest ? "Guest demo" : (user?.email ?? "Account");
  return (
    <button
      onClick={() => {
        if (isGuest) {
          guestMode.disable();
          window.location.reload();
        } else {
          signOut();
        }
      }}
      aria-label="Sign out"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs uppercase tracking-[0.18em] text-black/70 shadow-sm backdrop-blur-xl transition-all hover:bg-white hover:text-black hover:shadow-md"
    >
      <LogOut size={14} strokeWidth={1.4} />
      <span className="hidden sm:inline normal-case tracking-normal">{label}</span>
      <span className="hidden sm:inline">· {isGuest ? "Exit demo" : "Sign out"}</span>
    </button>
  );
}
