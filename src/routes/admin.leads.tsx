import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Sparkles, ArrowUpRight } from "lucide-react";
import {
  leads,
  isHighIntent,
  leadBoardValue,
  formatEUR,
  timeAgo,
  type Lead,
} from "@/admin/sample-data";
import { LeadDetailPanel } from "@/admin/LeadDetailPanel";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...leads].sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    );
    if (!q) return sorted;
    return sorted.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }, [query]);

  const open = (l: Lead) => {
    setOpenId(l.id);
    navigate({ to: "/admin/leads", search: { id: l.id } as never, replace: true });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Customers</div>
          <h1
            className="font-serif text-5xl mt-3"
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
          >
            Lead Feed
          </h1>
          <p className="mt-2 text-sm text-black/50">
            Live activity from magic-link visitors. Click a row to see their boards.
          </p>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-72 rounded-full border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black/40"
          />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5 text-left text-[10px] uppercase tracking-[0.24em] text-black/50">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Latest activity</th>
              <th className="px-6 py-4 font-medium text-right">Board value</th>
              <th className="px-6 py-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const high = isHighIntent(lead);
              const value = leadBoardValue(lead.id);
              return (
                <tr
                  key={lead.id}
                  onClick={() => open(lead)}
                  className="cursor-pointer border-b border-black/5 transition-colors last:border-b-0 hover:bg-black/[0.025]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} />
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-black/40">{lead.source}</div>
                      </div>
                      {high && <HighIntentBadge />}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-black/60">{lead.email}</td>
                  <td className="px-6 py-5">
                    <div className="text-sm">{lead.lastActivityLabel}</div>
                    <div className="text-xs text-black/40">{timeAgo(lead.lastActivity)}</div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-sm">{formatEUR(value)}</td>
                  <td className="px-6 py-5 text-right">
                    <ArrowUpRight size={14} className="inline text-black/40" />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-black/40">
                  No leads match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadDetailPanel
        leadId={openId}
        onClose={() => {
          setOpenId(null);
          navigate({ to: "/admin/leads", replace: true });
        }}
      />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium"
      style={{ background: "#1A1A1A", color: "#F9F7F2" }}
    >
      {initials}
    </div>
  );
}

function HighIntentBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
      style={{ background: "rgba(184,118,62,0.12)", color: "#B8763E" }}
    >
      <Sparkles size={10} /> High intent
    </span>
  );
}