import { useRef, useState, useEffect } from "react";
import { Button, Input } from "@databricks/appkit-ui/react";
import {
  AlertTriangle,
  CalendarOff,
  Gauge,
  History,
  ListOrdered,
  MessageSquare,
  Pin,
  RotateCcw,
  Save,
  Send,
  Timer,
  X,
} from "lucide-react";
import type { PlanConstraints } from "../scheduling/removalSchedule";

export interface ChatMsg {
  role: "user" | "system";
  text: string;
  ok?: boolean;
}

export type ConstraintChip =
  | { kind: "pin"; index: number; label: string }
  | { kind: "blackout"; index: number; label: string }
  | { kind: "order"; label: string }
  | { kind: "ratecap"; label: string }
  | { kind: "floor"; label: string }
  | { kind: "cadence"; label: string };

const EXAMPLES = [
  "Have the first removal be the first week of January 2027",
  "No removals in March 2027",
  "Keep at least 1,000 remaining hours on the limit",
  "Max one removal per month",
  "Space removals 4 weeks apart",
];

function chipsFromConstraints(
  constraints: PlanConstraints,
  spacingWeeks: number,
  defaultSpacingWeeks: number,
): ConstraintChip[] {
  const chips: ConstraintChip[] = [];
  (constraints.pins ?? []).forEach((p, i) => {
    const who = p.ordinal != null ? `Removal #${p.ordinal}` : `Engine ${p.engineSN}`;
    chips.push({ kind: "pin", index: i, label: `${who} → ${p.monday}` });
  });
  (constraints.blackouts ?? []).forEach((b, i) => {
    chips.push({ kind: "blackout", index: i, label: b.label ?? `${b.start}…${b.end}` });
  });
  if (constraints.order && constraints.order.length) {
    chips.push({ kind: "order", label: `Order: ${constraints.order.join(" → ")}` });
  }
  if (constraints.maxPerMonth != null) {
    chips.push({ kind: "ratecap", label: `Max ${constraints.maxPerMonth}/month` });
  }
  if (constraints.minHrsFloor != null && constraints.minHrsFloor > 0) {
    chips.push({
      kind: "floor",
      label: `≥ ${constraints.minHrsFloor.toLocaleString()} hr at removal`,
    });
  }
  if (spacingWeeks !== defaultSpacingWeeks) {
    chips.push({ kind: "cadence", label: `Cadence ${spacingWeeks}w` });
  }
  return chips;
}

const CHIP_ICON = {
  pin: Pin,
  blackout: CalendarOff,
  order: ListOrdered,
  ratecap: Timer,
  floor: Gauge,
  cadence: Timer,
} as const;

export default function RemovalPlanChat({
  messages,
  onSubmit,
  constraints,
  spacingWeeks,
  defaultSpacingWeeks,
  warnings,
  canUndo,
  savedAt,
  saving,
  onSave,
  onRestoreSaved,
  onUndo,
  onRemoveChip,
}: {
  messages: ChatMsg[];
  onSubmit: (text: string) => void;
  constraints: PlanConstraints;
  spacingWeeks: number;
  defaultSpacingWeeks: number;
  warnings: string[];
  canUndo: boolean;
  savedAt: string | null;
  saving: boolean;
  onSave: () => void;
  onRestoreSaved: () => void;
  onUndo: () => void;
  onRemoveChip: (chip: ConstraintChip) => void;
}) {
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const chips = chipsFromConstraints(constraints, spacingWeeks, defaultSpacingWeeks);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {/* Active constraints */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Active overrides:</span>
          {chips.map((c, i) => {
            const Icon = CHIP_ICON[c.kind];
            return (
              <span
                key={`${c.kind}-${i}`}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                {c.label}
                <button
                  type="button"
                  aria-label={`Remove ${c.label}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  onClick={() => onRemoveChip(c)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Constraint warnings */}
      {warnings.length > 0 && (
        <div className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Applied with warnings
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Message log */}
      {messages.length > 0 && (
        <div
          ref={logRef}
          className="max-h-48 overflow-y-auto rounded-md border bg-background p-2 text-sm"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-1.5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`inline-block max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  m.role === "user"
                    ? "bg-primary/10 text-foreground"
                    : m.ok === false
                      ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                      : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Examples (only before the first message) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onSubmit(ex)}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MessageSquare className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Adjust the plan in plain English…  e.g. “no removals in March 2027”"
            className="pl-8"
            aria-label="Removal plan chat input"
          />
        </div>
        <Button onClick={submit} size="sm" disabled={!text.trim()}>
          <Send className="mr-1 h-4 w-4" />
          Send
        </Button>
      </div>

      {/* Plan action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Return to previous plan
        </Button>
        <Button variant="outline" size="sm" onClick={onRestoreSaved} disabled={!savedAt}>
          <History className="mr-1 h-4 w-4" />
          Return to last saved plan
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving…" : "Save plan"}
        </Button>
        {savedAt && (
          <span className="text-xs text-muted-foreground">
            Last saved {new Date(savedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
