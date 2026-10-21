import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@databricks/appkit-ui/react";
import { Search, Package, Clock, CalendarClock, AlertTriangle, ArrowLeftRight, Star, ShieldAlert, Plane, ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import type { Part } from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";

interface SoftTimeRow {
  displayName: string;
  partNumbers: string;
  softLimit: number;
  unitCount: number;
  maxTso: number;
  avgTso: number;
  minTso: number;
}

// Fuel Injector overhauls happen at shop visit and aren't reliably posted back
// to the ERP, so its soft-time figures are known to be unreliable. Both
// widgets on this page share one toggle (lifted to PartsPage) to show/hide it.
const FUEL_INJECTOR_NAME = "Fuel Injector";

// When shown, the Fuel Injector row is moved to the bottom of the table
// instead of sitting in its natural (3rd) position.
function moveFuelInjectorToEnd<T extends { displayName: string }>(rows: T[]): T[] {
  const rest = rows.filter((r) => r.displayName !== FUEL_INJECTOR_NAME);
  const fuelInjector = rows.filter((r) => r.displayName === FUEL_INJECTOR_NAME);
  return [...rest, ...fuelInjector];
}

function applyFuelInjectorVisibility<T extends { displayName: string }>(
  rows: T[],
  showFuelInjector: boolean,
): T[] {
  if (!showFuelInjector) return rows.filter((r) => r.displayName !== FUEL_INJECTOR_NAME);
  return moveFuelInjectorToEnd(rows);
}

function SoftTimesTable({
  showFuelInjector,
  onToggleFuelInjector,
  inclInterchange,
  onToggleInterchange,
}: {
  showFuelInjector: boolean;
  onToggleFuelInjector: (value: boolean) => void;
  inclInterchange: boolean;
  onToggleInterchange: (value: boolean) => void;
}) {
  const { data, source } = useLakebaseData<SoftTimeRow>(
    `/api/soft-times?interchange=${inclInterchange ? 1 : 0}`,
  );
  const loading = source === "loading";

  const rows = applyFuelInjectorVisibility(data, showFuelInjector);

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Component Soft Time Recommendations
            </CardTitle>
            {inclInterchange && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                Includes interchangeable P/Ns
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={inclInterchange}
                onChange={(e) => onToggleInterchange(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                aria-label="Include interchangeable part numbers"
              />
              Include interchangeable P/Ns
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showFuelInjector}
                onChange={(e) => onToggleFuelInjector(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                aria-label="Show Fuel Injector Data"
              />
              Show Fuel Injector Data
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Component</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Part Number(s)</th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Soft Limit (hrs)</th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Fleet Units</th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground" title="Time Since Overhaul (flight hours)">Min TSO</th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground" title="Time Since Overhaul (flight hours)">Avg TSO</th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground" title="Time Since Overhaul (flight hours)">Max TSO</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = row.softLimit > 0 ? Math.min(100, Math.round((row.maxTso / row.softLimit) * 100)) : 0;
                const barColor =
                  pct >= 90 ? "bg-destructive/50" :
                  pct >= 75 ? "bg-[var(--warning)]" :
                  "bg-[var(--success)]";
                return (
                  <tr key={row.displayName} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 px-3 font-medium">{row.displayName}</td>
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{row.partNumbers || "—"}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{row.softLimit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{row.unitCount > 0 ? row.unitCount : "—"}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{row.minTso > 0 ? row.minTso.toLocaleString() : "—"}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{row.avgTso > 0 ? row.avgTso.toLocaleString() : "—"}</td>
                    <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${pct >= 90 ? "text-destructive/70" : pct >= 75 ? "text-[var(--warning)]" : ""}`}>
                      {row.maxTso > 0 ? row.maxTso.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {row.maxTso > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-16">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface ForecastUnit {
  pn: string;
  sn: string;
  tso: number;
  hoursRemaining: number;
  projectedCrossDate: string;
  status: "overdue" | "due";
}

interface ForecastGroup {
  displayName: string;
  softLimit: number;
  alreadyDue: number;
  dueInWindow: number;
  totalFlagged: number;
  units: ForecastUnit[];
}

const WINDOW_OPTIONS = [
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
];

// Overhaul budget planner: pick a utilization rate + forward window and see
// which soft-time units will cross their limit — the LLP/overhaul budget view.
function OverhaulForecast({ showFuelInjector, inclInterchange }: { showFuelInjector: boolean; inclInterchange: boolean }) {
  const [hrsPerDay, setHrsPerDay] = useState(7.5);
  const [months, setMonths] = useState(12);

  const endpoint = `/api/overhaul-forecast?hrsPerDay=${hrsPerDay}&months=${months}&interchange=${inclInterchange ? 1 : 0}`;
  const { data: rawData, source } = useLakebaseData<ForecastGroup>(endpoint);
  const loading = source === "loading";

  const data = applyFuelInjectorVisibility(rawData, showFuelInjector);

  const windowLabel = WINDOW_OPTIONS.find((w) => w.months === months)?.label ?? `${months} months`;
  const totalDue = data.reduce((s, g) => s + (g.dueInWindow ?? 0), 0);
  const totalOverdue = data.reduce((s, g) => s + (g.alreadyDue ?? 0), 0);

  // Flatten all flagged units for the detail table, tagged with their component.
  // Group order already has Fuel Injector last (when shown), so its units
  // naturally land at the bottom of this list too.
  const allUnits = data.flatMap((g) =>
    (g.units ?? []).map((u) => ({ ...u, component: g.displayName })),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Overhaul Budget Forecast
            </CardTitle>
            {inclInterchange && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                Includes interchangeable P/Ns
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 text-muted-foreground">
              Rate
              <input
                type="number"
                value={hrsPerDay}
                min={0.1}
                max={24}
                step={0.1}
                onChange={(e) => setHrsPerDay(Number(e.target.value))}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v <= 0) setHrsPerDay(7.5);
                }}
                className="w-20 rounded-md border bg-background px-2 py-1 text-foreground text-sm"
                aria-label="Utilization rate (hours per day)"
              />
              <span className="text-xs">hrs/day</span>
            </label>
            <label className="flex items-center gap-1.5 text-muted-foreground">
              Window
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-foreground text-sm"
                aria-label="Forecast window"
              >
                {WINDOW_OPTIONS.map((w) => (
                  <option key={w.months} value={w.months}>{w.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            {/* Headline numbers */}
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{totalDue}</div>
                <div className="text-xs text-muted-foreground">
                  units reach soft limit within {windowLabel}
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${totalOverdue > 0 ? "border-destructive/40" : ""}`}>
                <div className={`text-2xl font-bold flex items-center gap-1.5 ${totalOverdue > 0 ? "text-destructive/70" : ""}`}>
                  {totalOverdue > 0 && <AlertTriangle className="h-5 w-5" />}
                  {totalOverdue}
                </div>
                <div className="text-xs text-muted-foreground">already past soft limit</div>
              </div>
            </div>

            {/* Per-component breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Component</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Soft Limit (hrs)</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Limit reached in {windowLabel}</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Soft Limit Surpassed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((g) => (
                    <tr key={g.displayName} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-medium">{g.displayName}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">{g.softLimit.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-semibold">{g.dueInWindow > 0 ? g.dueInWindow : "—"}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${g.alreadyDue > 0 ? "text-destructive/70" : "text-muted-foreground"}`}>
                        {g.alreadyDue > 0 ? g.alreadyDue : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Affected unit detail */}
            {allUnits.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                  Affected units ({allUnits.length})
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground">Component</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground">P/N</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground">S/N</th>
                        <th className="py-2 px-3 text-right font-medium text-muted-foreground" title="Time Since Overhaul (flight hours)">TSO (hrs)</th>
                        <th className="py-2 px-3 text-right font-medium text-muted-foreground">Hrs Remaining</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground">Est. Limit Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUnits.map((u, i) => (
                        <tr key={`${u.pn}-${u.sn}-${i}`} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-1.5 px-3">{u.component}</td>
                          <td className="py-1.5 px-3 font-mono text-xs">{u.pn}</td>
                          <td className="py-1.5 px-3 font-mono text-xs">{u.sn}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-xs">{u.tso.toLocaleString()}</td>
                          <td className={`py-1.5 px-3 text-right font-mono text-xs ${u.status === "overdue" ? "text-destructive/70 font-semibold" : ""}`}>
                            {u.hoursRemaining.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-xs">
                            {u.status === "overdue" ? (
                              <span className="text-destructive/70 font-medium">Past Limit</span>
                            ) : (
                              u.projectedCrossDate
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InterchangeableRow {
  pn: string;
  interchangeClass: string;
  type: string;
  prefer: boolean;
  manufacturer: string;
}

// Shows all part numbers interchangeable with the selected part. Two-way pairs
// are fully equivalent; one-way pairs mean the selected P/N may be replaced BY
// the listed alternate (directional). Preferred alternates are starred.
function InterchangeablePanel({ pn }: { pn: string }) {
  const { data, source } = useLakebaseData<InterchangeableRow>(
    pn ? `/api/interchangeable/${encodeURIComponent(pn)}` : null,
  );
  if (source === "loading") return <Skeleton className="h-12 w-full" />;
  if (!data.length) return null;
  return (
    <div className="border-t pt-3">
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Interchangeable P/Ns ({data.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.map((alt) => (
          <span
            key={`${alt.pn}-${alt.interchangeClass}`}
            className="inline-flex items-center gap-1 rounded-md border bg-muted/60 px-2 py-1 font-mono text-xs"
            title={
              (alt.interchangeClass === "one_way"
                ? "One-way: this part may be replaced by the alternate"
                : "Two-way: fully interchangeable") +
              (alt.manufacturer ? ` — ${alt.manufacturer}` : "") +
              (alt.type ? ` (type ${alt.type})` : "")
            }
          >
            {alt.prefer && (
              <Star className="h-3 w-3 text-[var(--warning)] fill-[var(--warning)]" />
            )}
            {alt.pn}
            <span
              className={`ml-0.5 rounded px-1 text-[10px] font-sans font-medium ${
                alt.interchangeClass === "one_way"
                  ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                  : "bg-[var(--success)]/15 text-[var(--success)]"
              }`}
            >
              {alt.interchangeClass === "one_way" ? "1-way" : "2-way"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

const LLP_PAGE_SIZE = 15;

// Four-band + expired colour scale keyed on % of life remaining
// (cyclesRemaining / cycleLimit). Tightens as parts approach their limit so
// at-risk units "pop" in the Time Remaining column and detail panel.
function llpBand(remaining: number | null, limit: number | null) {
  if (remaining == null || limit == null || limit <= 0) {
    return { badge: "bg-muted text-muted-foreground", bar: "bg-muted-foreground", label: "No limit" };
  }
  if (remaining <= 0)
    return { badge: "bg-red-600 text-white", bar: "bg-red-600", label: "Expired" };
  const pct = remaining / limit;
  if (pct < 0.05)
    return { badge: "bg-red-500/15 text-red-600 ring-1 ring-inset ring-red-500/30", bar: "bg-red-500", label: "Critical (<5%)" };
  if (pct < 0.1)
    return { badge: "bg-orange-500/15 text-orange-600 ring-1 ring-inset ring-orange-500/30", bar: "bg-orange-500", label: "Urgent (<10%)" };
  if (pct < 0.2)
    return { badge: "bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30", bar: "bg-amber-500", label: "Watch (<20%)" };
  return { badge: "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30", bar: "bg-emerald-500", label: "OK (≥20%)" };
}

const LLP_LEGEND: { label: string; dot: string }[] = [
  { label: "Expired", dot: "bg-red-600" },
  { label: "<5%", dot: "bg-red-500" },
  { label: "<10%", dot: "bg-orange-500" },
  { label: "<20%", dot: "bg-amber-500" },
  { label: "≥20%", dot: "bg-emerald-500" },
];

// Life-Limited Parts status widget. Pulls every serialized instance of the
// engineering LLP catalog from /api/llp (worst-first by cycles remaining),
// then does all search / sort / paging in memory over the cached dataset so
// typing and paging never refetch. Preserves the click→right-detail pattern.
function LLPStatusTable({ initialSearch }: { initialSearch: string }) {
  const { data, source } = useLakebaseData<Part>("/api/llp");
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const loading = source === "loading";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.filter(
          (p) =>
            p.partNumber.toLowerCase().includes(q) ||
            p.serialNumber.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
      : data;
    return [...rows].sort(
      (a, b) => (a.cyclesRemaining ?? Infinity) - (b.cyclesRemaining ?? Infinity),
    );
  }, [data, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / LLP_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * LLP_PAGE_SIZE,
    safePage * LLP_PAGE_SIZE + LLP_PAGE_SIZE,
  );
  const firstRow = filtered.length === 0 ? 0 : safePage * LLP_PAGE_SIZE + 1;
  const lastRow = safePage * LLP_PAGE_SIZE + pageRows.length;

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    setSelectedPart(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[var(--warning)]" />
              Life-Limited Parts (LLP) Status
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Plane className="h-3.5 w-3.5" />
              To view LLP status by engine, navigate to the Engines tab
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MousePointerClick className="h-3.5 w-3.5" />
              Select a unit for more details
            </p>
          </div>
          <ConnectionStatus source={source} context="LLP" />
        </div>

        {/* Colour legend for the Time Remaining bands */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium">Cycles remaining:</span>
          {LLP_LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${l.dot}`} />
              {l.label}
            </span>
          ))}
        </div>

        {/* Enclosed search — scoped to this LLP tool only */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search LLPs by P/N, S/N, or description..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
            data-testid="parts-search-input"
            aria-label="Search life-limited parts"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Table + pager */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="parts-table">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">P/N</th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">S/N</th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Description</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground" title="Cycles Since New">CSN</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Life Limit</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Time Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No life-limited parts match your search.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((p) => {
                          const band = llpBand(p.cyclesRemaining, p.cycleLimit);
                          return (
                            <tr
                              key={p.serialNumber}
                              className={`border-b last:border-0 cursor-pointer transition-colors ${selectedPart?.serialNumber === p.serialNumber ? "bg-accent/10" : "hover:bg-muted/50"}`}
                              onClick={() => setSelectedPart(p)}
                              role="link"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setSelectedPart(p);
                              }}
                            >
                              <td className="py-2 px-3 font-mono text-xs">{p.partNumber}</td>
                              <td className="py-2 px-3 font-mono text-xs">{p.serialNumber}</td>
                              <td className="py-2 px-3">{p.description}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{p.csn.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{p.cycleLimit?.toLocaleString() ?? "—"}</td>
                              <td className="py-2 px-3 text-right">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${band.badge}`}>
                                  {p.cyclesRemaining?.toLocaleString() ?? "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pager — keeps the widget to one screenful instead of 2,000 rows */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {filtered.length === 0
                    ? "No parts"
                    : `Showing ${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${filtered.length.toLocaleString()}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <span>
                    Page {safePage + 1} of {pageCount}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                    disabled={safePage >= pageCount - 1}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detail panel — preserved click→right-detail behaviour */}
            <div>
              {selectedPart ? (
                <Card data-testid="part-detail">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {selectedPart.description}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground text-xs">P/N</p>
                        <p className="font-mono text-xs font-medium">{selectedPart.partNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">S/N</p>
                        <p className="font-mono text-xs font-medium">{selectedPart.serialNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">CSN</p>
                        <p className="font-semibold">{selectedPart.csn.toLocaleString()} cyc</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Life Limit</p>
                        <p className="font-semibold">
                          {selectedPart.cycleLimit?.toLocaleString() ?? "—"} cyc
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Installation</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-muted-foreground text-xs">Engine installed on</p>
                          <p className="font-mono text-xs font-medium">
                            {selectedPart.engineSN || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Tail installed on</p>
                          <p className="font-medium">{selectedPart.tail || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Engine position on tail</p>
                          <p className="font-medium">{selectedPart.position || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">LLP Status</p>
                      {(() => {
                        const band = llpBand(selectedPart.cyclesRemaining, selectedPart.cycleLimit);
                        const limit = selectedPart.cycleLimit ?? 0;
                        const remaining = selectedPart.cyclesRemaining ?? 0;
                        const consumedPct =
                          limit > 0
                            ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100))
                            : 0;
                        return (
                          <div className="bg-muted p-3 rounded space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Time Remaining</span>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${band.badge}`}>
                                {selectedPart.cyclesRemaining?.toLocaleString() ?? "—"} cyc · {band.label}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-background overflow-hidden">
                              <div
                                className={`h-full rounded-full ${band.bar}`}
                                style={{ width: `${consumedPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground text-right">
                              {consumedPct.toFixed(0)}% of life consumed
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {selectedPart.partNumber && (
                      <InterchangeablePanel pn={selectedPart.partNumber} />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Select a part to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PartsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  // Fuel Injector is overhauled at shop visit and isn't reliably posted back
  // to the ERP, so its soft-time data is known to be unreliable. Default to
  // hidden; the toggle in the Soft Time Recommendations header controls both
  // this widget and the Overhaul Budget Forecast widget below it.
  const [showFuelInjector, setShowFuelInjector] = useState(false);
  // Interchangeable-parts rule: when on (default), the soft-time and overhaul-budget
  // widgets include every physically-equivalent alternate P/N so no unit is missed.
  const [inclInterchange, setInclInterchange] = useState(true);

  return (
    <div className="space-y-6" data-testid="parts-page">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="parts-heading">
          Parts Search
        </h2>
        <p className="text-muted-foreground mt-1">
          Search by Part Number, Serial Number, or Engine S/N
        </p>
      </div>

      {/* Soft Time Recommendations */}
      <SoftTimesTable
        showFuelInjector={showFuelInjector}
        onToggleFuelInjector={setShowFuelInjector}
        inclInterchange={inclInterchange}
        onToggleInterchange={setInclInterchange}
      />

      {/* Overhaul Budget Forecast */}
      <OverhaulForecast showFuelInjector={showFuelInjector} inclInterchange={inclInterchange} />

      {/* Life-Limited Parts (LLP) Status — replaces the former generic parts table */}
      <LLPStatusTable initialSearch={initialSearch} />
    </div>
  );
}