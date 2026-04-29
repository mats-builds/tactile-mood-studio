import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BarChart3, Users, Package, LogOut, Sparkles, Download, ArrowLeft } from "lucide-react";
import { isAdminAuthed, logout, tryLogin } from "./auth";

type NavItem = {
  to: string;
  label: string;
  icon: typeof BarChart3;
  exact?: boolean;
};

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { to: "/admin/leads", label: "Lead Feed", icon: Users },
  { to: "/admin/catalog", label: "Catalog", icon: Package },
  { to: "/admin/import", label: "Bulk Import", icon: Download },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(isAdminAuthed());
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="min-h-screen" style={{ background: "#F9F7F2" }} />;
  }

  if (!authed) {
    return <PasswordGate onPass={() => setAuthed(true)} />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F9F7F2", color: "#1A1A1A" }}>
      {/* Glassmorphic sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-64 flex-col border-r border-black/5 p-6 backdrop-blur-xl md:flex"
        style={{ background: "rgba(255,255,255,0.55)" }}
      >
        <div className="mb-10">
          <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Supermoods</div>
          <div className="font-serif text-2xl leading-none mt-2" style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}>
            Atelier
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.exact
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
                style={{
                  background: active ? "#1A1A1A" : "transparent",
                  color: active ? "#F9F7F2" : "#1A1A1A",
                }}
              >
                <Icon size={16} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link
            to="/"
            className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black"
          >
            <ArrowLeft size={14} /> Back to app
          </Link>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/admin" });
              setAuthed(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-black"
          >
            <LogOut size={14} /> Sign out
          </button>
          <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-black/40">
            <Sparkles size={10} /> Store owner
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-black/5 bg-white/70 px-4 py-3 backdrop-blur-xl">
        <div
          className="font-serif text-lg"
          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
        >
          Atelier
        </div>
        <div className="flex gap-1">
          <Link
            to="/"
            className="rounded-lg p-2 text-black/70"
            aria-label="Back to app"
          >
            <ArrowLeft size={16} />
          </Link>
          {nav.map((n) => {
            const active = n.exact
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className="rounded-lg p-2"
                style={{
                  background: active ? "#1A1A1A" : "transparent",
                  color: active ? "#F9F7F2" : "#1A1A1A",
                }}
              >
                <Icon size={16} />
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 px-6 py-8 pt-20 md:px-12 md:pt-12">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function PasswordGate({ onPass }: { onPass: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#F9F7F2", color: "#1A1A1A" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Supermoods</div>
          <h1
            className="font-serif text-5xl mt-3"
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
          >
            Atelier
          </h1>
          <p className="mt-3 text-sm text-black/50">Private admin · enter passphrase to continue</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tryLogin(pw)) {
              onPass();
            } else {
              setErr("Incorrect passphrase");
            }
          }}
          className="rounded-2xl border border-black/5 bg-white/70 p-8 shadow-sm backdrop-blur-xl"
        >
          <label className="block text-[10px] uppercase tracking-[0.24em] text-black/50">
            Passphrase
          </label>
          <input
            type="password"
            autoFocus
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
            className="mt-6 w-full rounded-lg py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1A1A1A", color: "#F9F7F2" }}
          >
            Enter
          </button>
          <p className="mt-4 text-[11px] text-black/40">
            Hint for demo: <span className="font-mono">supermoods2025</span>
          </p>
        </form>
      </div>
    </div>
  );
}