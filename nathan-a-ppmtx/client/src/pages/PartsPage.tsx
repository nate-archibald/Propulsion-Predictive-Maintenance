import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@databricks/appkit-ui/react";
import { Search, Package, ArrowRight, Clock, CalendarClock, AlertTriangle } from "lucide-react";
import type { Part } from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";
import { ConditionBadge } from "../components/qx-ui";

interface SoftTimeRow {
  displayName: string;
  partNumbers: string;
  softLimit: number;
  unitCount: number;
  maxTso: number;
  avgTso: number;
  minTso: number;
}

function SoftTimesTable() {
  const { data, source } = useLakebaseData<SoftTimeRow>("/api/soft-times");
  const loading = source === "loading";

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Component Soft Time Recommendations
        </CardTitle>
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
              {data.map((row) => {
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
function OverhaulForecast() {
  const [hrsPerDay, setHrsPerDay] = useState(7.5);
  const [months, setMonths] = useState(12);

  const endpoint = `/api/overhaul-forecast?hrsPerDay=${hrsPerDay}&months=${months}`;
  const { data, source } = useLakebaseData<ForecastGroup>(endpoint);
  const loading = source === "loading";

  const windowLabel = WINDOW_OPTIONS.find((w) => w.months === months)?.label ?? `${months} months`;
  const totalDue = data.reduce((s, g) => s + (g.dueInWindow ?? 0), 0);
  const totalOverdue = data.reduce((s, g) => s + (g.alreadyDue ?? 0), 0);

  // Flatten all flagged units for the detail table, tagged with their component.
  const allUnits = data.flatMap((g) =>
    (g.units ?? []).map((u) => ({ ...u, component: g.displayName })),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Overhaul Budget Forecast
          </CardTitle>
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

export default function PartsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const { data: parts, source } = useLakebaseData<Part>("/api/parts");
  const loading = source === "loading";

  const filtered = parts.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.partNumber.toLowerCase().includes(q) ||
      p.serialNumber.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.engineSN.toLowerCase().includes(q) ||
      p.tail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" data-testid="parts-page">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="parts-heading">
            Parts Search
          </h2>
          <ConnectionStatus source={source} context="parts" />
        </div>
        <p className="text-muted-foreground mt-1">
          Search by Part Number, Serial Number, or Engine S/N
        </p>
      </div>

      {/* Soft Time Recommendations */}
      <SoftTimesTable />

      {/* Overhaul Budget Forecast */}
      <OverhaulForecast />

      {/* Search — scopes only the parts table below */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="1301M91G05, FCU-4421, ESN-31042..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="parts-search-input"
          aria-label="Search parts"
        />
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No parts match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="parts-table">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          P/N
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          S/N
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Description
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Tail
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Condition
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground" title="Cycles Since New">
                          CSN
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground" title="Life-Limited Part status">
                          LLP
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr
                          key={p.serialNumber}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${selectedPart?.serialNumber === p.serialNumber ? "bg-accent/10" : "hover:bg-muted/50"}`}
                          onClick={() => setSelectedPart(p)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setSelectedPart(p);
                          }}
                        >
                          <td className="py-2 px-3 font-mono text-xs">
                            {p.partNumber}
                          </td>
                          <td className="py-2 px-3 font-mono text-xs">
                            {p.serialNumber}
                          </td>
                          <td className="py-2 px-3">{p.description}</td>
                          <td className="py-2 px-3">{p.tail}</td>
                          <td className="py-2 px-3">
                            <ConditionBadge condition={p.condition} />
                          </td>
                          <td className="py-2 px-3">
                            {p.csn.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            {p.isLLP ? (
                              <span
                                className={`text-xs font-semibold ${(p.cyclesRemaining ?? Infinity) < 1000 ? "text-destructive" : "text-[var(--success)]"}`}
                              >
                                {p.cyclesRemaining?.toLocaleString()} rem
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
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
                      <p className="font-mono text-xs font-medium">
                        {selectedPart.partNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">S/N</p>
                      <p className="font-mono text-xs font-medium">
                        {selectedPart.serialNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Engine</p>
                      <p
                        className="font-mono text-xs font-medium cursor-pointer text-accent hover:underline"
                        onClick={() =>
                          navigate(
                            `/engines?search=${encodeURIComponent(selectedPart.engineSN)}`
                          )
                        }
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            navigate(
                              `/engines?search=${encodeURIComponent(selectedPart.engineSN)}`
                            );
                        }}
                      >
                        {selectedPart.engineSN}{" "}
                        <ArrowRight className="inline h-3 w-3" />
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Position</p>
                      <p className="font-medium">{selectedPart.position}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Tail</p>
                      <p className="font-medium">{selectedPart.tail}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Condition
                      </p>
                      <ConditionBadge condition={selectedPart.condition} />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="font-medium">{selectedPart.location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">ATA</p>
                      <p className="font-medium">{selectedPart.ata}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Life Metrics
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">TSN</p>
                        <p className="font-semibold">
                          {selectedPart.tsn.toLocaleString()} hrs
                        </p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">CSN</p>
                        <p className="font-semibold">
                          {selectedPart.csn.toLocaleString()} cyc
                        </p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">TSO</p>
                        <p className="font-semibold">
                          {selectedPart.tso.toLocaleString()} hrs
                        </p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">CSI</p>
                        <p className="font-semibold">
                          {selectedPart.csi.toLocaleString()} cyc
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedPart.isLLP && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        LLP Status
                      </p>
                      <div className="bg-muted p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-xs">Cycle Limit</span>
                          <span className="text-xs font-semibold">
                            {selectedPart.cycleLimit?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs">Remaining</span>
                          <span
                            className={`text-xs font-semibold ${(selectedPart.cyclesRemaining ?? Infinity) < 1000 ? "text-destructive" : "text-[var(--success)]"}`}
                          >
                            {selectedPart.cyclesRemaining?.toLocaleString()} cyc
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(selectedPart.cyclesRemaining ?? Infinity) < 1000 ? "bg-destructive" : "bg-[var(--success)]"}`}
                            style={{
                              width: `${Math.min(100, ((selectedPart.cycleLimit ?? 1) - (selectedPart.cyclesRemaining ?? 0)) / (selectedPart.cycleLimit ?? 1) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Installed {selectedPart.installDate}
                    </p>
                  </div>
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
    </div>
  );
}
