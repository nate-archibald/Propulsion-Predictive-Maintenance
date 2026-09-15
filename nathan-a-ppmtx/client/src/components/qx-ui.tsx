/**
 * QX Propulsion — shared "Instrument Panel" design-system primitives.
 * Consolidates the badge/KPI-card variants that were previously
 * duplicated per-page into one consistent, tone-driven set.
 */
import { Card, CardContent } from "@databricks/appkit-ui/react";
import { CalendarRange } from "lucide-react";
import { cn } from "../lib/utils";

export type Tone = "success" | "warning" | "destructive" | "accent" | "muted";

const TONE_BADGE_STYLES: Record<Tone, string> = {
  success: "bg-[var(--success)] text-[var(--success-foreground)]",
  warning: "bg-[var(--warning)] text-[var(--warning-foreground)]",
  destructive: "bg-destructive text-destructive-foreground",
  accent: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
};

/**
 * Generic status badge. Pass a `tone` (semantic color) and the label to
 * display. `pulse` marks the small set of statuses that genuinely need
 * urgent visual attention (e.g. AOG, HIGH risk) — used sparingly.
 */
export function StatusBadge({
  label,
  tone,
  title,
  pulse = false,
  className,
}: {
  label: string;
  tone: Tone;
  title?: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-technical tracking-wide",
        TONE_BADGE_STYLES[tone],
        pulse && "qx-pulse",
        className
      )}
    >
      {label}
    </span>
  );
}

/** Condition codes used on Parts. */
const CONDITION_TONE: Record<string, Tone> = {
  SVC: "success",
  UNS: "warning",
  SCR: "muted",
  AOG: "destructive",
  "IN-SHOP": "accent",
};
const CONDITION_LABEL: Record<string, string> = {
  SVC: "Serviceable",
  UNS: "Unserviceable",
  SCR: "Scrapped",
  AOG: "Aircraft on Ground",
  "IN-SHOP": "In Shop / Repair",
};
export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <StatusBadge
      label={condition}
      tone={CONDITION_TONE[condition] ?? "muted"}
      title={CONDITION_LABEL[condition] ?? condition}
      pulse={condition === "AOG"}
    />
  );
}

/** Confidence levels used on Defects. */
const CONFIDENCE_TONE: Record<string, Tone> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "destructive",
};
export function ConfidenceBadge({ level }: { level: string }) {
  return <StatusBadge label={level} tone={CONFIDENCE_TONE[level] ?? "muted"} />;
}

/** Flight impact used on Defects. */
const IMPACT_TONE: Record<string, Tone> = {
  CANCEL: "destructive",
  DELAY: "warning",
  NONE: "muted",
};
export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <StatusBadge
      label={impact}
      tone={IMPACT_TONE[impact] ?? "muted"}
      pulse={impact === "CANCEL"}
    />
  );
}

/** Risk levels used on Spares. */
const RISK_TONE: Record<string, Tone> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "success",
};
export function RiskBadge({ risk }: { risk: string }) {
  return (
    <StatusBadge label={risk} tone={RISK_TONE[risk] ?? "muted"} pulse={risk === "HIGH"} />
  );
}

/**
 * "+N more" overflow badge for compressing multi-value lists (e.g. a list
 * of part numbers on the Spares Quick View) without losing information —
 * the full list is always available via the `title` tooltip.
 */
export function OverflowBadge({ count, title }: { count: number; title?: string }) {
  if (count <= 0) return null;
  return (
    <span
      title={title}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-technical font-medium bg-muted text-muted-foreground border border-border"
    >
      +{count} more
    </span>
  );
}

const KPI_VARIANT_VALUE_COLOR: Record<string, string> = {
  default: "text-foreground",
  warning: "text-[var(--warning)]",
  destructive: "text-destructive",
  success: "text-[var(--success)]",
};

const KPI_VARIANT_BORDER: Record<string, string> = {
  default: "border-border",
  warning: "border-[var(--warning)]",
  destructive: "border-destructive",
  success: "border-[var(--success)]",
};

/**
 * Unified KPI card — replaces the previously-separate `MetricCard`
 * (Home) and `StatBox` (Reliability) idioms with one component. Value
 * text is colored by variant so status reads at a glance, matching the
 * "instrument panel" gauge language used elsewhere in the app.
 */
export function KpiCard({
  title,
  value,
  subtitle,
  unit,
  icon: Icon,
  variant = "default",
  testId,
  scoped = false,
  titleHint,
  dense = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "destructive" | "success";
  testId?: string;
  /** Whether this metric is affected by the Timeframe filter above. */
  scoped?: boolean;
  /** Optional tooltip explaining an abbreviated/jargon title. */
  titleHint?: string;
  /** Compact rendering for tighter grids (e.g. Reliability KPI strip). */
  dense?: boolean;
}) {
  const display = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className={cn(KPI_VARIANT_BORDER[variant], "border-l-4")} data-testid={testId}>
      <CardContent className={dense ? "py-3" : "pt-4 pb-4"}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"
              title={titleHint}
            >
              {title}
              {scoped && (
                <CalendarRange
                  className="h-3 w-3 text-muted-foreground/60"
                  aria-label="Affected by timeframe filter"
                />
              )}
            </p>
            <p className={cn("text-2xl font-bold font-technical mt-1", KPI_VARIANT_VALUE_COLOR[variant])}>
              {display}
              {unit ? (
                <span className="text-xs font-normal font-sans text-muted-foreground ml-1">{unit}</span>
              ) : null}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-md p-2 bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Lightweight on/off switch, used in place of two-button toggle pairs. */
export function Toggle({
  checked,
  onChange,
  leftLabel,
  rightLabel,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? `${leftLabel} / ${rightLabel} toggle`}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center h-8 rounded-full border border-border bg-muted px-1 text-xs font-semibold select-none"
    >
      <span
        className={cn(
          "px-2.5 py-1 rounded-full transition-colors z-10",
          !checked ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {leftLabel}
      </span>
      <span
        className={cn(
          "px-2.5 py-1 rounded-full transition-colors z-10",
          checked ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {rightLabel}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 rounded-full bg-primary transition-transform duration-150 ease-out",
          "w-[calc(50%-4px)]",
          checked ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
        )}
      />
    </button>
  );
}

/** Formats an ISO date as a human "N days ago" / "today" caption. */
export function formatDaysAgo(isoDate: string | undefined | null): string {
  if (!isoDate) return "—";
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
