import { useMemo, useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@databricks/appkit-ui/react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronsUp,
  ChevronsDown,
  Gauge,
  GripVertical,
  Info,
  MessageSquare,
  Package,
  Printer,
  Wrench,
  MapPin,
} from "lucide-react";
import type { HsrEngine } from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";
import { buildRemovalPlan, MIN_REQUIRED_SPARES, type PlanConstraints, type RemovalPin } from "../scheduling/removalSchedule";
import { parsePlanCommand } from "../scheduling/planChatParser";
import RemovalPlanChat, {
  type ChatMsg,
  type ConstraintChip,
} from "../components/RemovalPlanChat";

// Fleet utilization + planning defaults. All adjustable live on the page; every
// projection is client-side so re-tuning re-plans instantly with no backend cost.
const DEFAULT_FH_PER_DAY = 7.5;
const DEFAULT_FC_PER_DAY = 6.0;
const DEFAULT_TAT_DAYS = 95; // shop turnaround (removal → back as spare)
const DEFAULT_SPACING_WEEKS = 3; // preferred cadence (future variability lever)
const DEFAULT_HORIZON_MONTHS = 24;

// The full, snapshot-able state of the plan: the numeric assumption levers plus
// the chat-authored constraints. Saving / undo / restore all operate on this.
interface PlanConfig {
  fhPerDay: number;
  fcPerDay: number;
  tatDays: number;
  spacingWeeks: number;
  horizonMonths: number;
  spareOverride: number | null;
  constraints: PlanConstraints;
}

const DEFAULT_CONFIG: PlanConfig = {
  fhPerDay: DEFAULT_FH_PER_DAY,
  fcPerDay: DEFAULT_FC_PER_DAY,
  tatDays: DEFAULT_TAT_DAYS,
  spacingWeeks: DEFAULT_SPACING_WEEKS,
  horizonMonths: DEFAULT_HORIZON_MONTHS,
  spareOverride: null,
  constraints: {},
};

interface SpareInfo {
  total: number;
  esns: string[];
  pendingTotal: number;
  pendingEsns: string[];
  repairTotal: number;
  repairEsns: string[];
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  tone?: "warn" | "ok";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-md bg-muted p-2">
          <Icon
            className={`h-5 w-5 ${
              tone === "warn"
                ? "text-[var(--warning)]"
                : tone === "ok"
                  ? "text-[var(--success)]"
                  : "text-muted-foreground"
            }`}
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact stepped area chart of the serviceable-spare balance over the horizon.
function SpareBalanceChart({
  series,
  minSpares,
}: {
  series: { date: string; spares: number }[];
  minSpares: number;
}) {
  if (series.length < 2) return null;
  const W = 720;
  const H = 120;
  const pad = { l: 24, r: 8, t: 8, b: 18 };
  const t0 = new Date(series[0].date).getTime();
  const t1 = new Date(series[series.length - 1].date).getTime();
  const span = Math.max(t1 - t0, 1);
  const maxY = Math.max(...series.map((p) => p.spares), 1);
  const minY = Math.min(minSpares, MIN_REQUIRED_SPARES);
  const x = (d: string) =>
    pad.l + ((new Date(d).getTime() - t0) / span) * (W - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - minY) / (maxY - minY || 1)) * (H - pad.t - pad.b);

  // Stepped path (balance holds until the next event).
  let dPath = `M ${x(series[0].date)} ${y(series[0].spares)}`;
  for (let i = 1; i < series.length; i++) {
    dPath += ` L ${x(series[i].date)} ${y(series[i - 1].spares)}`;
    dPath += ` L ${x(series[i].date)} ${y(series[i].spares)}`;
  }
  const zeroY = y(MIN_REQUIRED_SPARES);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Spare balance over time">
      {/* required-minimum / floor line */}
      <line x1={pad.l} x2={W - pad.r} y1={zeroY} y2={zeroY} stroke="var(--warning)" strokeDasharray="3 3" strokeWidth={1} />
      <text x={2} y={zeroY + 3} fontSize={9} fill="var(--warning)">{MIN_REQUIRED_SPARES}</text>
      <path d={dPath} fill="none" stroke="var(--primary)" strokeWidth={1.75} />
      {minSpares < MIN_REQUIRED_SPARES && (
        <text x={pad.l + 4} y={pad.t + 10} fontSize={10} fill="var(--destructive)" fontWeight="600">
          Shortfall: balance reaches {minSpares}
        </text>
      )}
    </svg>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = "1",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <Input
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(Math.max(parseFloat(e.target.value) || 0, 0))}
        className="w-20 tabular-nums"
        aria-label={label}
      />
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </label>
  );
}

export default function RemovalPlanPage() {
  const { data, source } = useLakebaseData<HsrEngine>("/api/removal-plan/hsr");
  const spares = useLakebaseData<SpareInfo>(
    "/api/serviceable-spares?type=ENGINE",
  );
  const loading = source === "loading";

  // Single source of truth for everything the user can tune. History enables a
  // one-step "return to previous plan"; `saved` is the Lakebase-persisted plan
  // reachable via "return to last saved plan".
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<PlanConfig[]>([]);
  const [saved, setSaved] = useState<{ config: PlanConfig; savedAt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  const liveSpares = spares.data[0];
  // Pull from ALL uninstalled spare engines — available now, pending inspection
  // (R/I BIN), and those out on an open Repair Order. We assume in-shop/pending
  // units will be returned serviceable by the time the plan needs them.
  const liveSpareTotal =
    (liveSpares?.total ?? 0) +
    (liveSpares?.pendingTotal ?? 0) +
    (liveSpares?.repairTotal ?? 0);
  const startSpares = config.spareOverride ?? liveSpareTotal;

  // Load the persisted plan once (constraints survive reloads / are shared).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/removal-plan/constraints")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.data?.config) return;
        const loaded = { ...DEFAULT_CONFIG, ...j.data.config } as PlanConfig;
        loaded.constraints = loaded.constraints ?? {};
        setConfig(loaded);
        setSaved({ config: loaded, savedAt: j.data.savedAt ?? new Date().toISOString() });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Live assumption edits are quick levers — they don't enter the undo history.
  const setField = (patch: Partial<PlanConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));

  // A tracked change (chat command / chip removal / restore) — pushes the
  // current config onto the undo stack, then applies the next one.
  const commit = (next: PlanConfig) => {
    setHistory((h) => [...h, config]);
    setConfig(next);
  };

  const handleChat = (raw: string) => {
    const installed = data
      .filter((e) => e.currentlyInstalled)
      .map((e) => ({ engineSN: e.engineSN, tail: e.installedAC, position: e.position }));
    const res = parsePlanCommand(raw, config.constraints, {
      today: new Date(),
      engines: installed,
      spacingWeeks: config.spacingWeeks,
    });
    setMessages((m) => [...m, { role: "user", text: raw }]);
    if (res.ok) {
      commit({
        ...config,
        constraints: res.nextConstraints ?? config.constraints,
        spacingWeeks: res.nextSpacingWeeks ?? config.spacingWeeks,
      });
    }
    setMessages((m) => [...m, { role: "system", text: res.summary, ok: res.ok }]);
  };

  const handleUndo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setConfig(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const handleRestoreSaved = () => {
    if (saved) commit(saved.config);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/removal-plan/constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const j = await r.json();
      if (j?.ok) {
        setSaved({ config, savedAt: j.savedAt ?? new Date().toISOString() });
        setMessages((m) => [...m, { role: "system", text: "Plan saved.", ok: true }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "system", text: "Could not save the plan to Lakebase.", ok: false },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "system", text: "Could not save the plan to Lakebase.", ok: false },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveChip = (chip: ConstraintChip) => {
    const c = config.constraints;
    const nextConstraints: PlanConstraints = { ...c };
    let nextSpacing = config.spacingWeeks;
    if (chip.kind === "pin")
      nextConstraints.pins = (c.pins ?? []).filter((_, i) => i !== chip.index);
    else if (chip.kind === "blackout")
      nextConstraints.blackouts = (c.blackouts ?? []).filter((_, i) => i !== chip.index);
    else if (chip.kind === "order") nextConstraints.order = undefined;
    else if (chip.kind === "ratecap") nextConstraints.maxPerMonth = undefined;
    else if (chip.kind === "floor") nextConstraints.minHrsFloor = undefined;
    else if (chip.kind === "cadence") nextSpacing = DEFAULT_SPACING_WEEKS;
    commit({ ...config, constraints: nextConstraints, spacingWeeks: nextSpacing });
  };

  // Handle drag-and-drop reordering — pin the dropped engine to the first available Monday.
  const handleDragReorder = (draggedEngineSN: string) => {
    // Create a pin to the first removal Monday in the schedule
    if (plan.rows.length > 0) {
      const firstMondayToPin = plan.rows[0]?.removalDate || new Date().toISOString().slice(0, 10);
      const pin: RemovalPin = { engineSN: draggedEngineSN, monday: firstMondayToPin };
      
      const nextConstraints: PlanConstraints = { ...config.constraints };
      nextConstraints.pins = [...(nextConstraints.pins ?? []), pin];
      
      commit({ ...config, constraints: nextConstraints });
      setMessages((m) => [...m, {
        role: "system",
        text: `Engine ${draggedEngineSN} moved to top of removal list (${firstMondayToPin}).`,
        ok: true,
      }]);
    }
  };

  // Move a removal up/down by one position via reordering constraint.
  const handleMoveRemoval = (engineSN: string, direction: "up" | "down") => {
    const currentOrder = config.constraints.order ?? [];
    const currentIndex = currentOrder.indexOf(engineSN);
    
    if (direction === "up" && currentIndex > 0) {
      const newOrder = [...currentOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
        newOrder[currentIndex],
        newOrder[currentIndex - 1],
      ];
      const nextConstraints: PlanConstraints = { ...config.constraints, order: newOrder };
      commit({ ...config, constraints: nextConstraints });
    } else if (direction === "down" && currentIndex < currentOrder.length - 1) {
      const newOrder = [...currentOrder];
      [newOrder[currentIndex + 1], newOrder[currentIndex]] = [
        newOrder[currentIndex],
        newOrder[currentIndex + 1],
      ];
      const nextConstraints: PlanConstraints = { ...config.constraints, order: newOrder };
      commit({ ...config, constraints: nextConstraints });
    }
  };

  // Normalize a raw engine position to the "#1" (left) / "#2" (right) label.
  // Source data can arrive as "ENG-1"/"ENG-2" (normalized by the server), the
  // raw "LH ENG"/"RH ENG", or a bare "L"/"R" — all map to the same two sides.
  const formatPosition = (position: string | undefined): string => {
    const p = (position ?? "").trim().toUpperCase();
    if (["ENG-1", "LH ENG", "LH", "L", "1", "#1"].includes(p)) return "#1";
    if (["ENG-2", "RH ENG", "RH", "R", "2", "#2"].includes(p)) return "#2";
    return p; // unknown position — show whatever we have
  };

  // Format location display: "Tail (#1)" / "Tail (#2)"
  const formatLocation = (tail: string | undefined, position: string | undefined): string => {
    if (!tail) return "Unknown";
    const pos = formatPosition(position);
    return pos ? `${tail} (${pos})` : tail;
  };

  const plan = useMemo(
    () =>
      buildRemovalPlan(data, {
        fhPerDay: config.fhPerDay,
        fcPerDay: config.fcPerDay,
        tatDays: config.tatDays,
        spacingWeeks: config.spacingWeeks,
        horizonMonths: config.horizonMonths,
        startSpares,
        startSpareEsns: liveSpares
          ? [
              ...(liveSpares.esns ?? []),
              ...(liveSpares.pendingEsns ?? []),
              ...(liveSpares.repairEsns ?? []),
            ]
          : undefined,
        constraints: config.constraints,
      }),
    [data, config, startSpares, liveSpares],
  );

  const asOf = data.find((r) => r.asOfDate)?.asOfDate ?? "";
  const nextRemoval = plan.rows[0]?.removalDate ?? "—";

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Engine Removal Plan — CF34-8E5
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 print:text-xs">
            Live HSR + binding-LLP projection, scheduled into a weekly removal
            plan. Removals fall on Mondays; each pulls a serviceable spare
            (“ESN on”) and the removed engine returns after shop turnaround.
            {asOf ? ` Data as of ${asOf}.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ConnectionStatus source={source} context={asOf ? `as of ${asOf}` : undefined} />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Feasibility banner */}
      {!loading && plan.rows.length > 0 && (
        <div
          className={`rounded-md border px-3 py-2 text-sm flex items-start gap-2 ${
            plan.feasible
              ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
              : "border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-[var(--destructive)]"
          }`}
        >
          {plan.feasible ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div>
            {plan.feasible ? (
              <span>
                Viable plan — serviceable spares stay at or above {MIN_REQUIRED_SPARES} across the
                {" "}
                {config.horizonMonths}-month window (minimum {plan.minSpares}).
              </span>
            ) : (
              <div>
                <span className="font-medium">
                  Plan not viable — spare balance would go below {MIN_REQUIRED_SPARES}
                  {plan.firstIssueDate ? ` on ${plan.firstIssueDate}` : ""}.
                </span>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {plan.issues.slice(0, 4).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <span className="text-xs">
                  Rework by acquiring/expediting a spare, widening the shop
                  turnaround, or adjusting the cadence.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assumptions */}
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            Assumptions:
          </span>
          <NumField label="FH/day" value={config.fhPerDay} onChange={(n) => setField({ fhPerDay: n })} step="0.1" />
          <NumField label="FC/day" value={config.fcPerDay} onChange={(n) => setField({ fcPerDay: n })} step="0.1" />
          <NumField label="Shop TAT" value={config.tatDays} onChange={(n) => setField({ tatDays: n })} suffix="days" />
          <NumField
            label="Spacing"
            value={config.spacingWeeks}
            onChange={(n) => setField({ spacingWeeks: Math.max(Math.round(n), 1) })}
            suffix="wks"
          />
          <NumField
            label="Horizon"
            value={config.horizonMonths}
            onChange={(n) => setField({ horizonMonths: n })}
            suffix="mo"
          />
          <NumField
            label="Spares @ start"
            value={startSpares}
            onChange={(n) => setField({ spareOverride: Math.round(n) })}
          />
        </CardContent>
      </Card>

      {/* Plan chat — adjust the schedule in plain English */}
      <Card className="print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Adjust the plan — chat
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What can the chat edit?"
                    className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-full"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-left">
                  <p className="font-medium mb-1">Edit the removal plan in plain English:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs">
                    <li><span className="font-medium">Pin a removal</span> — e.g. "first removal the first week of January 2027" or "remove ESN 12345 on 2027-03-15" (supports any date, not just Mondays)</li>
                    <li><span className="font-medium">By engine position</span> — e.g. "remove #1 engine on N5678" or "remove the #2 on N1234" (#1 = left, #2 = right)</li>
                    <li><span className="font-medium">Block out dates</span> — e.g. "no removals in March" or "no removals the week of 2027-02-15"</li>
                    <li><span className="font-medium">Set cadence</span> — e.g. "use a 5-week cadence"</li>
                    <li><span className="font-medium">Cap per month</span> — e.g. "at most one removal per month"</li>
                    <li><span className="font-medium">Set an hours floor</span> — e.g. "keep at least 1,000 remaining hours on the limit" (pulls engines earlier so none is run below that margin)</li>
                    <li><span className="font-medium">Reorder</span> — e.g. "remove ESN 12345 first" or use the up/down arrow buttons on each row</li>
                    <li><span className="font-medium">Drag-and-drop</span> — Drag an engine row to move it to the top of the removal list</li>
                    <li><span className="font-medium">Clear</span> — e.g. "clear all constraints"</li>
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requests that can't be met are applied as closely as possible with a warning. It can't edit engine data, due dates, or spare counts. Locations and manual reordering help with unscheduled removals and small adjustments.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RemovalPlanChat
            messages={messages}
            onSubmit={handleChat}
            constraints={config.constraints}
            spacingWeeks={config.spacingWeeks}
            defaultSpacingWeeks={DEFAULT_SPACING_WEEKS}
            warnings={plan.constraintWarnings}
            canUndo={history.length > 0}
            savedAt={saved?.savedAt ?? null}
            saving={saving}
            onSave={handleSave}
            onRestoreSaved={handleRestoreSaved}
            onUndo={handleUndo}
            onRemoveChip={handleRemoveChip}
          />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Package}
          label="Total spares (incl. in-shop)"
          value={fmt(startSpares)}
        />
        <StatCard
          icon={Gauge}
          label="Removals in window"
          value={fmt(plan.rows.length)}
        />
        <StatCard
          icon={CalendarClock}
          label="Next removal (Mon)"
          value={nextRemoval}
        />
        <StatCard
          icon={plan.feasible ? CheckCircle2 : AlertTriangle}
          label="Min spare balance"
          value={fmt(plan.minSpares)}
          tone={plan.minSpares < MIN_REQUIRED_SPARES ? "warn" : "ok"}
        />
      </div>

      {/* Spare balance chart */}
      {!loading && plan.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Serviceable Spare Balance ({config.horizonMonths} mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpareBalanceChart series={plan.balanceSeries} minSpares={plan.minSpares} />
          </CardContent>
        </Card>
      )}

      {/* The removal plan document */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Removal Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : plan.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No engines reach a removal limit within the {config.horizonMonths}-month
              window under the current assumptions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium w-6 print:hidden"></th>
                    <th className="py-2 pr-3 font-medium">Week (Mon)</th>
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </th>
                    <th className="py-2 pr-3 font-medium">ESN off</th>
                    <th className="py-2 pr-3 font-medium">ESN on</th>
                    <th className="py-2 pr-3 font-medium text-right">Spares @ QX</th>
                    <th className="py-2 pr-3 font-medium">Reason</th>
                    <th className="py-2 pr-3 font-medium text-right">Limit left now</th>
                    <th className="py-2 pr-3 font-medium text-right">Limit left @ removal</th>
                    <th className="py-2 pr-3 font-medium">Forecast return</th>
                    <th className="py-2 pr-3 font-medium print:hidden">Actions</th>
                    <th className="py-2 pr-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.weeks.map((w) => {
                    const r = w.removal;
                    const hasReturn = w.returnedEsns.length > 0;
                    const removalIndex = r ? plan.rows.indexOf(r) : -1;
                    const isFirstRemoval = removalIndex === 0;
                    const isLastRemoval = removalIndex === plan.rows.length - 1;
                    return (
                      <tr
                        key={w.weekDate}
                        className={`border-b last:border-0 ${
                          r
                            ? !r.feasible
                              ? "bg-[var(--destructive)]/10"
                              : "bg-muted/30 hover:bg-muted/50"
                            : "text-muted-foreground hover:bg-muted/20"
                        }`}
                        draggable={r ? true : false}
                        onDragStart={(e) => {
                          if (r) {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("engineSN", r.engineSN);
                          }
                        }}
                        onDragOver={(e) => {
                          if (r) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedSN = e.dataTransfer.getData("engineSN");
                          if (draggedSN && r && draggedSN !== r.engineSN) {
                            handleDragReorder(draggedSN);
                          }
                        }}
                      >
                        {/* Drag handle */}
                        <td className="py-2 pr-1 text-center print:hidden">
                          {r && (
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          )}
                        </td>
                        <td className="py-2 pr-3 tabular-nums font-medium">
                          {w.weekDate}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                          {r ? removalIndex + 1 : ""}
                        </td>
                        {/* Location column */}
                        <td className="py-2 pr-3">
                          {r ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatLocation(r.tail, r.position)}
                            </span>
                          ) : (
                            "·"
                          )}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {r ? r.engineSN : "·"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {r ? (
                            r.esnGoingOn || (
                              <span className="text-[var(--destructive)]">none</span>
                            )
                          ) : (
                            "·"
                          )}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right tabular-nums font-medium ${
                            w.sparesAtQx <= 0 ? "text-[var(--warning)]" : ""
                          }`}
                        >
                          {w.sparesAtQx}
                        </td>
                        <td className="py-2 pr-3">
                          {r ? (
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                                r.bindingConstraint === "HSR"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-[var(--warning)]/15 text-[var(--warning)]"
                              }`}
                            >
                              {r.bindingConstraint}
                            </span>
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r ? (
                            <>
                              {fmt(r.limitingRemainingNow)} {r.limitingUnit}
                            </>
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r ? (
                            <>
                              <span
                                className={
                                  r.limitingRemainingAtRemoval < 0
                                    ? "font-semibold text-red-600"
                                    : ""
                                }
                              >
                                {fmt(r.limitingRemainingAtRemoval)} {r.limitingUnit}
                              </span>
                              {r.weeksEarly >= 1 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({Math.round(r.weeksEarly)}w early)
                                </span>
                              )}
                              {r.weeksEarly <= -1 && (
                                <span className="ml-1 text-xs font-medium text-red-600">
                                  ({Math.round(-r.weeksEarly)}w late)
                                </span>
                              )}
                            </>
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                          {r ? r.returnDate : ""}
                        </td>
                        {/* Actions: Up/Down buttons */}
                        <td className="py-2 pr-3 text-center print:hidden">
                          {r && (
                            <div className="flex items-center justify-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleMoveRemoval(r.engineSN, "up")}
                                      disabled={isFirstRemoval}
                                      aria-label="Move removal up in schedule"
                                    >
                                      <ChevronsUp className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Move earlier</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleMoveRemoval(r.engineSN, "down")}
                                      disabled={isLastRemoval}
                                      aria-label="Move removal down in schedule"
                                    >
                                      <ChevronsDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Move later</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {r?.issue ? (
                            <span className="text-[var(--destructive)]">
                              {r.issue}
                            </span>
                          ) : hasReturn ? (
                            <span className="text-emerald-600">
                              +{w.returnedEsns.join(", ")} back from shop
                            </span>
                          ) : (
                            ""
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Due date = when the limiting factor (HSR hours-to-target or
            binding-LLP cycles-remaining) hits 0, dated with the fleet
            utilization assumption. Removals are scheduled on Mondays, one per
            week, ~{config.spacingWeeks}-week cadence, never past the due date — so
            engines are often pulled early (leftover life shown). There is a row
            for <strong>every week</strong>: removal weeks are shaded, quiet
            weeks are dimmed, and “+ESN back from shop” marks when a spare
            returns. “Spares @ QX” is the running serviceable-spare balance; the
            removed engine returns after {config.tatDays} days. Off-wing engines are
            excluded until they re-enter service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
