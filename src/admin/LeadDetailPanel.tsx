import { useEffect } from "react";
import { X, ExternalLink, Clock, Plus, Repeat, Eye, Share2 } from "lucide-react";
import {
  leads,
  moodboards,
  activity,
  getProduct,
  boardValue,
  formatEUR,
  parsePrice,
  timeAgo,
  isHighIntent,
  type Moodboard,
  type ActivityEvent,
} from "./sample-data";

export function LeadDetailPanel({
  leadId,
  onClose,
}: {
  leadId: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lead = leadId ? leads.find((l) => l.id === leadId) : null;
  const isOpen = !!lead;

  // Always render so the slide-out can animate; just hide off-screen.
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(26,26,26,0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col overflow-hidden border-l border-black/10 bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {lead && <PanelBody lead={lead} onClose={onClose} />}
      </aside>
    </>
  );
}

function PanelBody({
  lead,
  onClose,
}: {
  lead: (typeof leads)[number];
  onClose: () => void;
}) {
  const boards = moodboards.filter((b) => b.leadId === lead.id);
  const events = activity
    .filter((e) => e.leadId === lead.id)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const total = boards.reduce((s, b) => s + boardValue(b), 0);
  const high = isHighIntent(lead);

  return (
    <>
      <header className="flex items-start justify-between border-b border-black/5 p-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Lead</div>
          <h2
            className="font-serif text-3xl mt-2"
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
          >
            {lead.name}
          </h2>
          <a
            href={`mailto:${lead.email}`}
            className="mt-1 inline-flex items-center gap-1 text-sm text-black/60 hover:text-black"
          >
            {lead.email} <ExternalLink size={12} />
          </a>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-black/50">
            <span>{lead.source}</span>
            <span>·</span>
            <span>{lead.magicLinkOpens} opens</span>
            <span>·</span>
            <span>{lead.totalEditMinutes}m editing</span>
            {high && (
              <span
                className="ml-1 rounded-full px-2 py-0.5"
                style={{ background: "rgba(184,118,62,0.12)", color: "#B8763E" }}
              >
                High intent
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-black/50 transition-colors hover:bg-black/5 hover:text-black"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-px border-b border-black/5 bg-black/5 text-center">
          <Metric label="Boards" value={String(boards.length)} />
          <Metric label="Items" value={String(boards.reduce((s, b) => s + b.items.length, 0))} />
          <Metric label="Total value" value={formatEUR(total)} accent />
        </div>

        {boards.map((board) => (
          <BoardSection key={board.id} board={board} />
        ))}

        <section className="p-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">
            Activity timeline
          </div>
          <ol className="mt-4 space-y-4 border-l border-black/10 pl-5">
            {events.map((ev) => (
              <TimelineItem key={ev.id} ev={ev} />
            ))}
            {events.length === 0 && (
              <li className="text-sm text-black/40">No tracked activity yet.</li>
            )}
          </ol>
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-5">
      <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">{label}</div>
      <div
        className="mt-2 font-serif text-2xl"
        style={{
          fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
          color: accent ? "#B8763E" : "#1A1A1A",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BoardSection({ board }: { board: Moodboard }) {
  const value = boardValue(board);
  return (
    <section className="border-b border-black/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">Moodboard</div>
          <h3
            className="font-serif text-xl mt-1"
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
          >
            {board.title}
          </h3>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">{formatEUR(value)}</div>
          <div className="text-xs text-black/40">{board.items.length} items</div>
        </div>
      </div>

      <BoardPreview board={board} />

      <ul className="mt-4 divide-y divide-black/5 rounded-xl border border-black/5">
        {board.items.map((it) => {
          const p = getProduct(it.productId);
          if (!p) return null;
          return (
            <li key={it.productId} className="flex items-center gap-4 p-3">
              <div
                className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5"
                style={{
                  backgroundImage: `url(${p.src})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-black/40">{p.maker}</div>
              </div>
              <div className="font-mono text-sm">{formatEUR(parsePrice(p.price))}</div>
              {p.sourceUrl && (
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BoardPreview({ board }: { board: Moodboard }) {
  const colors = board.paletteColors.length
    ? board.paletteColors
    : ["oklch(0.94 0.018 80)", "oklch(0.86 0.025 75)"];
  const bg = `linear-gradient(135deg, ${colors.join(", ")})`;
  return (
    <div
      className="relative mt-4 h-44 w-full overflow-hidden rounded-xl border border-black/5"
      style={{ background: bg }}
    >
      {board.items.map((it) => {
        const p = getProduct(it.productId);
        if (!p) return null;
        return (
          <div
            key={it.productId}
            className="absolute"
            style={{
              left: `${it.x * 100}%`,
              top: `${it.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${0.5 + it.scale * 0.6})`,
              width: 60,
              height: 60,
              backgroundImage: `url(${p.src})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.18))",
            }}
          />
        );
      })}
    </div>
  );
}

function TimelineItem({ ev }: { ev: ActivityEvent }) {
  const Icon =
    ev.kind === "create"
      ? Plus
      : ev.kind === "open"
        ? Eye
        : ev.kind === "swap"
          ? Repeat
          : ev.kind === "share"
            ? Share2
            : Clock;
  const at = new Date(ev.at);
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = at.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <li className="relative">
      <span
        className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full"
        style={{ background: "#1A1A1A", color: "#F9F7F2" }}
      >
        <Icon size={9} />
      </span>
      <div className="text-sm">{ev.label}</div>
      <div className="text-xs text-black/40">
        {date} · {time} · {timeAgo(ev.at)}
      </div>
      {ev.detail && <div className="mt-1 text-xs text-black/50">{ev.detail}</div>}
    </li>
  );
}