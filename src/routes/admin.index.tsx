import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Mail, Clock, Wallet } from "lucide-react";
import {
  leads,
  moodboards,
  boardValue,
  formatEUR,
  isHighIntent,
  sessionsLast30Days,
} from "@/admin/sample-data";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const weekAgo = Date.now() - 7 * 86400000;
  const boardsThisWeek = moodboards.filter(
    (b) => new Date(b.createdAt).getTime() > weekAgo,
  ).length;
  const totalLeads = leads.length;
  const highIntent = leads.filter(isHighIntent).length;
  const potentialRevenue = moodboards.reduce((s, b) => s + boardValue(b), 0);
  const data = sessionsLast30Days();

  return (
    <div className="space-y-10">
      <header>
        <div className="text-[10px] uppercase tracking-[0.32em] text-black/50">Dashboard</div>
        <h1
          className="font-serif text-5xl mt-3"
          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
        >
          Overview
        </h1>
        <p className="mt-2 text-sm text-black/50">
          What's been happening across your store and at home, this week.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Users size={14} />}
          label="Moodboards created"
          sub="this week"
          value={String(boardsThisWeek)}
        />
        <Stat
          icon={<Mail size={14} />}
          label="Total email leads"
          sub="all time"
          value={String(totalLeads)}
        />
        <Stat
          icon={<Clock size={14} />}
          label="High-intent sessions"
          sub="opens > 3 or > 15m editing"
          value={String(highIntent)}
          accent
        />
        <Stat
          icon={<Wallet size={14} />}
          label="Potential revenue"
          sub="across saved boards"
          value={formatEUR(potentialRevenue)}
        />
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-black/50">Activity</div>
            <h2
              className="font-serif text-2xl mt-2"
              style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
            >
              In-store vs at-home, last 30 days
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-black/60">
            <LegendDot color="#1A1A1A" label="In Store" />
            <LegendDot color="#B8763E" label="At Home" />
          </div>
        </div>
        <div className="mt-6 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1A1A1A",
                  border: "none",
                  borderRadius: 8,
                  color: "#F9F7F2",
                  fontSize: 12,
                }}
                cursor={{ stroke: "rgba(0,0,0,0.15)", strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Line
                type="monotone"
                dataKey="inStore"
                name="In Store"
                stroke="#1A1A1A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="atHome"
                name="At Home"
                stroke="#B8763E"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  sub,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      style={accent ? { borderColor: "rgba(184, 118, 62, 0.35)" } : undefined}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-black/50">
        <span style={{ color: accent ? "#B8763E" : undefined }}>{icon}</span>
        {label}
      </div>
      <div
        className="mt-4 font-serif text-4xl leading-none"
        style={{
          fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
          color: accent ? "#B8763E" : "#1A1A1A",
        }}
      >
        {value}
      </div>
      <div className="mt-2 text-xs text-black/40">{sub}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}