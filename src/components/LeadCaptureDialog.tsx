import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mail, User, ArrowRight } from "lucide-react";

const LEAD_KEY = "supermoods.lead";

export type Lead = { name: string; email: string; capturedAt: string };

export function getStoredLead(): Lead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEAD_KEY);
    return raw ? (JSON.parse(raw) as Lead) : null;
  } catch {
    return null;
  }
}

export function saveLead(lead: Lead) {
  localStorage.setItem(LEAD_KEY, JSON.stringify(lead));
}

export function LeadCaptureDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (lead: Lead) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    const lead: Lead = {
      name: trimmedName,
      email: trimmedEmail,
      capturedAt: new Date().toISOString(),
    };
    saveLead(lead);
    onSubmit(lead);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            One last step
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tell us where to send your moodboard and presentation. We'll keep it
            in your inbox so you can revisit it anytime.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <User size={12} /> Your name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Mail size={12} /> Email address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              maxLength={160}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            Send it to me <ArrowRight size={14} />
          </button>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            By continuing you agree to receive your moodboard by email. We'll
            never share your details.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}