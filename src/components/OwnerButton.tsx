import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UserCircle2, X } from "lucide-react";
import { isAdminAuthed, tryLogin } from "@/admin/auth";

export function OwnerButton() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const go = () => navigate({ to: "/admin" });

  const onClick = () => {
    if (isAdminAuthed()) {
      go();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        aria-label="Owner sign in"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs uppercase tracking-[0.18em] text-black/70 shadow-sm backdrop-blur-xl transition-all hover:bg-white hover:text-black hover:shadow-md"
      >
        <UserCircle2 size={16} strokeWidth={1.4} />
        <span className="hidden sm:inline">Owner</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-7 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">
                  Supermoods
                </div>
                <h2
                  className="mt-1 font-serif text-2xl text-black"
                  style={{
                    fontFamily:
                      "'Playfair Display', 'Cormorant Garamond', serif",
                  }}
                >
                  Owner sign in
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-black"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tryLogin(pw)) {
                  setOpen(false);
                  go();
                } else {
                  setErr("Incorrect passphrase");
                }
              }}
              className="mt-5"
            >
              <label className="block text-[10px] uppercase tracking-[0.24em] text-black/50">
                Passphrase
              </label>
              <input
                autoFocus
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-3 text-base outline-none focus:border-black/40"
              />
              {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
              <button
                type="submit"
                className="mt-5 w-full rounded-lg bg-black py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Enter atelier
              </button>
              <p className="mt-3 text-[11px] text-black/40">
                Private dashboard for the store owner.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
