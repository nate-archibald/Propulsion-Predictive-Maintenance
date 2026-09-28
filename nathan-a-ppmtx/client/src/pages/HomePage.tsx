import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@databricks/appkit-ui/react";
import ReactECharts from "echarts-for-react";
import {
  TrendingUp,
  Plane,
  Clock,
  Activity,
  Waves,
  ClipboardList,
  CalendarRange,
  Zap,
  Settings,
  X,
  Info,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import {
  DEFECTS_BY_ATA,
  WEEKLY_DEFECT_TREND,
  type FleetLeadersData,
} from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";
import { KpiCard, Toggle, CancelReasonBadge } from "../components/qx-ui";


function LeaderCard({
  label,
  icon: Icon,
  leader,
}: {
  label: string;
  icon: React.ElementType;
  leader?: { sn: string; tail: string; hours: number; cycles: number };
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {leader ? (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold">{leader.sn}</span>
            <span className="text-sm text-muted-foreground">{leader.tail}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Hours</div>
              <div className="text-xl font-bold">
                {leader.hours.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">hrs</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cycles</div>
              <div className="text-xl font-bold">
                {leader.cycles.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">cyc</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No data</p>
      )}
    </div>
  );
}

// Resolves theme CSS custom properties (e.g. --chart-1) to their computed
// values so they can be handed directly to ECharts, re-reading on theme change.
function useChartVarColors(vars: string[]): string[] {
  const [colors, setColors] = useState<string[]>([]);
  const key = vars.join(",");
  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      setColors(vars.map((v) => styles.getPropertyValue(v).trim()));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-mode"],
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return colors;
}

// Quick timeframe presets for the Home page date filter.
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
// Formats a YYYY-MM-DD string as "Mon D, YYYY" for display in KPI dropdown
// subheadings, without timezone drift (parsed as local calendar date, not UTC).
function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
// Compact "M/D" axis-label format (e.g. "7/19"), no leading zeros/year.
function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}
const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function HomePage() {
  const navigate = useNavigate();
  // Timeframe filter — scopes the Total Delay Min / Cancellations / Vibration
  // PIREPs KPIs and the Defects-by-ATA chart. Defaults to the last 7 days on
  // load (empty = all-time, still selectable by clearing the filter).
  const [fromDate, setFromDate] = useState(() => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return toISODate(from);
  });
  const [toDate, setToDate] = useState(() => toISODate(new Date()));
  const applyDatePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(toISODate(from));
    setToDate(toISODate(to));
  };
  const [sparesType, setSparesType] = useState<"ENGINE" | "APU">("ENGINE");
  const [selectedAta, setSelectedAta] = useState<string>("");
  const chartVarColors = useChartVarColors(["--chart-1", "--chart-3", "--chart-2"]);
  const ataBaseColor = chartVarColors[0] || "oklch(0.65 0.14 175)";
  const ataHighlightColor = chartVarColors[1] || "oklch(0.65 0.22 25)";
  const weeklyTrendLineColor = chartVarColors[2] || "oklch(0.6 0.15 250)";
  
  // Critical spares — fetched from live API
  const criticalSpares = useLakebaseData<Array<{
    name: string;
    partNumbers: Array<{ pn: string; quantity: number }>;
  }>>("/api/critical-spares");
  
  const dateQs = (() => {
    const p = new URLSearchParams();
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    const s = p.toString();
    return s ? `?${s}` : "";
  })();
  const hasRange = Boolean(fromDate || toDate);
  // Human-readable range for the delay/cancellation dropdown subheadings,
  // e.g. "Sep 15 – Sep 22, 2026" or "Since Jan 1, 2026" / "Through Sep 22, 2026"
  // if only one bound is set.
  const rangeLabel = (() => {
    if (fromDate && toDate) return `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;
    if (fromDate) return `Since ${formatDisplayDate(fromDate)}`;
    if (toDate) return `Through ${formatDisplayDate(toDate)}`;
    return "All-time";
  })();

  const { data: kpiRows, source: kpiSource } = useLakebaseData<{
    activeDefects: number;
    cancelCount: number;
    totalDelayMinutes: number;
    totalDefects: number;
    llpAlerts: number;
    vibrationPireps: number;
    openEcmp: number;
  }>(`/api/kpis${dateQs}`);
  const { data: byAta, source: ataSource } = useLakebaseData<{
    ata: string;
    description: string;
    count: number;
    delayMinutes: number;
    cancels: number;
  }>(`/api/defects/by-ata${dateQs}`);
  const { data: trend } = useLakebaseData<{
    week: string;
    weekLabel?: string;
    count: number;
    delayMinutes?: number;
  }>("/api/defects/weekly-trend");
  const { data: sparesData, source: sparesSource } = useLakebaseData<{
    total: number;
    esns: string[];
    type: string;
  }>(`/api/serviceable-spares?type=${sparesType}`);
  const { data: fleetLeadersResp, source: fleetLeadersSource } = useLakebaseData<FleetLeadersData>(
    "/api/fleet-leaders"
  );

  const { data: byAtaDetail } = useLakebaseData<{
    ata: string;
    top3: { desc: string; count: number }[];
    recentDesc: string;
    recentDate: string;
    defects: { desc: string; date: string }[];
  }>(`/api/defects/by-ata/detail${dateQs}`);

  const { data: ecmpDetails } = useLakebaseData<{
    eo: string;
    description: string;
    ac: string;
  }>("/api/ecmp/open");

  const { data: delayDetails } = useLakebaseData<{
    date: string;
    ac: string;
    station: string;
    writeUp: string;
    delayMinutes: number;
  }>(`/api/delays/detail${dateQs}`);

  const { data: cancelDetails } = useLakebaseData<{
    date: string;
    ac: string;
    station: string;
    writeUp: string;
    reason: string;
  }>(`/api/cancellations/detail${dateQs}`);

  const kpi = kpiRows[0];
  // Only show the full-page skeleton on the very first load; once we have data,
  // keep the page mounted (and the date inputs focused) during refetches.
  const loading = kpiSource === "loading" && !kpi;
  const ataData = byAta.length > 0 ? byAta : DEFECTS_BY_ATA;
  const trendData = trend.length > 0 ? trend : WEEKLY_DEFECT_TREND;

  const totalDelayMinutes = kpi?.totalDelayMinutes ?? 0;
  const cancelCount = kpi?.cancelCount ?? 0;
  const vibrationPireps = kpi?.vibrationPireps ?? 0;
  const openEcmp = kpi?.openEcmp ?? 0;

  // Build a lookup map for the rich ATA tooltip
  const ataDetailMap = new Map(byAtaDetail.map((d) => [d.ata, d]));

  // Whether the selected timeframe spans 7 days or fewer. When it does, the ATA
  // tooltip lists every defect; otherwise it caps the list at the last 3 so the
  // popup stays a manageable size.
  const ataRangeDays = (() => {
    if (!fromDate || !toDate) return Infinity;
    const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
    return Number.isFinite(ms) ? ms / 86_400_000 : Infinity;
  })();
  const showAllAtaDefects = ataRangeDays <= 7;

  // Minimal HTML escape so full defect descriptions render safely in the tooltip.
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ECharts tooltip formatter — shows the ATA total plus a list of individual
  // defects for the timeframe (all defects when the range is ≤ 7 days, else the
  // last 3 most-recent defects).
  const ataTooltipOptions: Record<string, unknown> = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
      extraCssText: "white-space:normal;max-width:460px;",
      formatter: (params: unknown[]) => {
        const p = (params as Array<{ name: string; value: number; seriesName: string }>)[0];
        if (!p) return "";
        const detail = ataDetailMap.get(p.name);
        const ataRow = ataData.find((d) => d.ata === p.name);
        const desc = ataRow?.description ?? "";

        let html = `<div style="width:420px;font-size:12px;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;">`;
        html += `<div style="font-weight:700;margin-bottom:4px">${p.name}${desc ? ` — ${desc}` : ""}</div>`;
        html += `<div style="margin-bottom:8px;color:#888">Total defects: <strong>${p.value}</strong></div>`;

        const allDefects = detail?.defects ?? [];
        const shown = showAllAtaDefects ? allDefects : allDefects.slice(0, 3);
        const listLabel = showAllAtaDefects ? "Defects" : "Last 3 defects";

        html += `<div style="font-weight:600;margin-bottom:4px">${listLabel}</div>`;
        if (shown.length) {
          shown.forEach((dfct) => {
            const dateStr = dfct.date ? `<span style="color:#888">${escapeHtml(dfct.date)}</span> — ` : "";
            html += `<div style="margin-bottom:4px">${dateStr}${escapeHtml(dfct.desc)}</div>`;
          });
        } else {
          html += `<div style="color:#888">No defects in this timeframe</div>`;
        }

        html += `</div>`;
        return html;
      },
    },
  };

  // ATA bar chart rendered via ECharts directly so bars are clickable to
  // drill into a single ATA section. Reuses the rich tooltip above.
  const ataRows = ataData.slice(0, 12);
  const ataEChartsOption: Record<string, unknown> = {
    tooltip: ataTooltipOptions.tooltip,
    grid: { left: 44, right: 16, top: 16, bottom: 52 },
    xAxis: {
      type: "category",
      data: ataRows.map((d) => d.ata),
      axisLabel: { interval: 0, rotate: ataRows.length > 8 ? 35 : 0, fontSize: 11 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 36,
        cursor: "pointer",
        data: ataRows.map((d) => ({
          value: d.count,
          itemStyle: {
            color: selectedAta === d.ata ? ataHighlightColor : ataBaseColor,
          },
        })),
      },
    ],
  };
  const onAtaChartEvents = {
    click: (params: { name?: string }) => {
      const name = params?.name;
      if (!name) return;
      setSelectedAta((cur) => (cur === name ? "" : name));
    },
  };
  // Weekly Defect Trend: defect count (line) overlaid on weekly delay minutes
  // (bar, drawn behind the line via z-order) on a shared category x-axis, each
  // on its own y-axis scale since counts and minutes aren't comparable
  // magnitudes. Bars use a light, semi-transparent red so they read as
  // "impact in the background" without competing with the count line.
  const weeklyTrendOption: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Delay Minutes", "Defect Count"],
      top: 0,
      left: "center",
      textStyle: { fontSize: 11 },
    },
    grid: { left: 44, right: 48, top: 64, bottom: 30 },
    xAxis: {
      type: "category",
      data: trendData.map((d) => formatShortDate(String(d.weekLabel ?? d.week))),
      axisLabel: { fontSize: 11 },
    },
    yAxis: [
      { type: "value", name: "Defects", nameTextStyle: { fontSize: 11 } },
      {
        type: "value",
        name: "Delay (min)",
        nameTextStyle: { fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Delay Minutes",
        type: "bar",
        yAxisIndex: 1,
        data: trendData.map((d) => d.delayMinutes ?? 0),
        barMaxWidth: 28,
        itemStyle: { color: "rgba(239, 68, 68, 0.35)" },
        z: 1,
      },
      {
        name: "Defect Count",
        type: "line",
        yAxisIndex: 0,
        smooth: false,
        data: trendData.map((d) => d.count),
        lineStyle: { color: weeklyTrendLineColor, width: 2 },
        itemStyle: { color: weeklyTrendLineColor },
        showSymbol: true,
        z: 2,
      },
    ],
  };
  const selectedAtaRow = selectedAta
    ? ataData.find((d) => d.ata === selectedAta)
    : undefined;
  const selectedAtaDetail = selectedAta ? ataDetailMap.get(selectedAta) : undefined;

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="home-page">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-2xl font-bold tracking-tight"
            data-testid="hero-heading"
          >
            Propulsion Overview
          </h2>
          <ConnectionStatus source={kpiSource} context="overview" />
        </div>
        <p className="text-muted-foreground mt-1">
          Propulsion reliability overview — CF34-8E / E175
        </p>
      </div>

      {/* Timeframe filter — scopes the marked KPIs + the Defects by ATA chart */}
      <Card data-testid="timeframe-filter">
        <CardContent className="py-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              Timeframe
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Quick date range presets">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyDatePreset(preset.days)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-muted"
                  data-testid={`date-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className={`h-8 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-muted ${!hasRange ? "bg-muted font-medium" : ""}`}
                data-testid="date-preset-all-time"
              >
                All-time
              </button>
            </div>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-sm"
              aria-label="From date"
              data-testid="date-from"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-sm"
              aria-label="To date"
              data-testid="date-to"
            />
            {hasRange && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-muted"
                data-testid="date-clear"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {hasRange ? "Custom range applied" : "All-time"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-foreground"
                  aria-label="Which metrics does this filter affect?"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Only metrics marked with <CalendarRange className="h-3 w-3 inline mx-0.5" />
                are scoped to this range (Vibration PIREPs, Total Delay Min, Cancellations,
                Defects by ATA). Everything else shows all-time data.
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Vibration PIREPs"
          value={vibrationPireps.toLocaleString()}
          subtitle={
            hasRange
              ? "Pilot reports mentioning vibration (in range)"
              : "Pilot reports mentioning vibration"
          }
          icon={Waves}
          variant="warning"
          testId="metric-vibration-pireps"
          scoped
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative text-left w-full cursor-pointer group"
              data-testid="metric-delay-minutes-trigger"
              aria-label="Show delay event details"
            >
              <KpiCard
                title="Total Delay Min"
                value={totalDelayMinutes.toLocaleString()}
                subtitle={
                  hasRange ? "Propulsion-attributable minutes (in range)" : "Propulsion-attributable minutes"
                }
                icon={Clock}
                variant="destructive"
                testId="metric-delay-minutes"
                scoped
              />
              <ChevronDown className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[560px] p-0"
            align="start"
            side="bottom"
            avoidCollisions={false}
          >
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Delay Events</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rangeLabel} · propulsion-attributable
              </p>
            </div>
            {delayDetails.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No propulsion-attributable delays {hasRange ? "in this range." : "found."}
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table className="table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[90px]">Date</TableHead>
                      <TableHead className="w-[75px]">A/C</TableHead>
                      <TableHead className="w-[65px]">Station</TableHead>
                      <TableHead>Write-up</TableHead>
                      <TableHead className="w-[70px] text-right">Delay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delayDetails.map((row, i) => (
                      <TableRow key={`${row.date}-${row.ac}-${i}`}>
                        <TableCell className="text-xs whitespace-nowrap align-top">{row.date}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.ac}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.station || "—"}</TableCell>
                        <TableCell
                          className="text-xs whitespace-normal break-words align-top"
                          title={row.writeUp}
                        >
                          {row.writeUp || "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap align-top text-right font-technical">
                          {row.delayMinutes.toLocaleString()} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {delayDetails.length >= 100 && (
                  <p className="px-4 py-2 text-[11px] text-muted-foreground border-t">
                    Showing the 100 most recent events in range.
                  </p>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative text-left w-full cursor-pointer group"
              data-testid="metric-cancellations-trigger"
              aria-label="Show cancellation event details"
            >
              <KpiCard
                title="Cancellations"
                value={cancelCount.toLocaleString()}
                subtitle={
                  hasRange ? "Propulsion-attributable flights (in range)" : "Propulsion-attributable flights"
                }
                icon={Plane}
                variant="destructive"
                testId="metric-cancellations"
                scoped
              />
              <ChevronDown className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[560px] p-0"
            align="start"
            side="bottom"
            avoidCollisions={false}
          >
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Cancellation Events</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rangeLabel} · propulsion-attributable
              </p>
            </div>
            {cancelDetails.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No propulsion-attributable cancellations {hasRange ? "in this range." : "found."}
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table className="table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[90px]">Date</TableHead>
                      <TableHead className="w-[75px]">A/C</TableHead>
                      <TableHead className="w-[65px]">Station</TableHead>
                      <TableHead>Write-up</TableHead>
                      <TableHead className="w-[90px]">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelDetails.map((row, i) => (
                      <TableRow key={`${row.date}-${row.ac}-${i}`}>
                        <TableCell className="text-xs whitespace-nowrap align-top">{row.date}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.ac}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.station || "—"}</TableCell>
                        <TableCell
                          className="text-xs whitespace-normal break-words align-top"
                          title={row.writeUp}
                        >
                          {row.writeUp || "—"}
                        </TableCell>
                        <TableCell className="align-top">
                          <CancelReasonBadge reason={row.reason} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {cancelDetails.length >= 100 && (
                  <p className="px-4 py-2 text-[11px] text-muted-foreground border-t">
                    Showing the 100 most recent events in range.
                  </p>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative text-left w-full cursor-pointer group"
              data-testid="metric-ecmp-trigger"
              aria-label="Show open ECMP details"
            >
              <KpiCard
                title="Open ECMPs"
                value={openEcmp.toLocaleString()}
                subtitle="Open engineering task cards"
                icon={ClipboardList}
                variant={openEcmp > 0 ? "warning" : "success"}
                testId="metric-ecmp"
              />
              <ChevronDown className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[520px] p-0"
            align="end"
            side="bottom"
            avoidCollisions={false}
          >
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Open ECMPs</p>
            </div>
            {ecmpDetails.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No open ECMPs found.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table className="table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[95px]">EO</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]">AC</TableHead>
                    </TableRow>

                  </TableHeader>
                  <TableBody>
                    {ecmpDetails.map((row) => (
                      <TableRow key={row.eo}>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.eo}</TableCell>
                        <TableCell className="text-xs whitespace-normal break-words align-top">{row.description}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">{row.ac}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Fleet Leaders Widget */}
      <Card data-testid="fleet-leaders-widget">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Fleet Leaders
            </CardTitle>
            <ConnectionStatus source={fleetLeadersSource} context="fleet" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Highest time in service</p>
        </CardHeader>
        <CardContent>
          {fleetLeadersSource === "loading" ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LeaderCard
                label="Highest-Time Engine"
                icon={Settings}
                leader={fleetLeadersResp[0]?.engine}
              />
              <LeaderCard
                label="Highest-Time APU"
                icon={Plane}
                leader={fleetLeadersResp[0]?.apu}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATA Hotspot Chart */}
        <Card data-testid="ata-hotspot-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Defects by ATA Section
                <CalendarRange
                  className="h-3 w-3 text-muted-foreground/60"
                  aria-label="Affected by timeframe filter"
                />
                <ConnectionStatus source={ataSource} />
              </CardTitle>
              {selectedAta && (
                <button
                  type="button"
                  onClick={() => setSelectedAta("")}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  data-testid="ata-clear"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click a bar to drill into an ATA section
            </p>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={ataEChartsOption}
              onEvents={onAtaChartEvents}
              style={{ height: 280 }}
              notMerge
            />
            {selectedAtaRow && (
              <div
                className="mt-3 rounded-md border bg-muted/40 p-3"
                data-testid="ata-detail-panel"
              >
                <div className="text-sm font-semibold">
                  ATA {selectedAtaRow.ata}
                  {selectedAtaRow.description ? ` — ${selectedAtaRow.description}` : ""}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Defects</div>
                    <div className="text-base font-bold">
                      {(selectedAtaRow.count ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Delay min</div>
                    <div className="text-base font-bold">
                      {(selectedAtaRow.delayMinutes ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Cancellations</div>
                    <div className="text-base font-bold">
                      {(selectedAtaRow.cancels ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                {selectedAtaDetail?.top3?.length ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Top defect types
                    </div>
                    <ul className="space-y-0.5">
                      {selectedAtaDetail.top3.map((t, i) => (
                        <li key={i} className="text-xs flex justify-between gap-3">
                          <span className="truncate">
                            {i + 1}. {t.desc}
                          </span>
                          <span className="text-muted-foreground shrink-0">{t.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <button
                  type="button"
                  data-testid="ata-view-all-defects"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  onClick={() =>
                    navigate(`/defects?search=${encodeURIComponent(selectedAtaRow.ata)}`)
                  }
                >
                  View all defects for ATA {selectedAtaRow.ata}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Defect Trend */}
        <Card data-testid="weekly-trend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Weekly Defect Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Defect count vs. propulsion-attributable delay minutes, by week
            </p>
          </CardHeader>
          <CardContent>
            <ReactECharts option={weeklyTrendOption} style={{ height: 280 }} notMerge />
          </CardContent>
        </Card>
      </div>

      {/* Serviceable Spares + Spare Quick View */}
      <div className="grid md:grid-cols-2 gap-4">
      <Card data-testid="serviceable-spares-widget">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Serviceable Spares ({sparesType === "ENGINE" ? "Engines" : "APUs"})
            </CardTitle>
            <ConnectionStatus source={sparesSource} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toggle Engines / APUs */}
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <Toggle
              checked={sparesType === "APU"}
              onChange={(checked) => setSparesType(checked ? "APU" : "ENGINE")}
              leftLabel="Engines"
              rightLabel="APUs"
              aria-label="Serviceable spares: Engines or APUs"
            />
            {/* Total Count (inline with toggle to save vertical space) */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-technical">
                {sparesData?.[0]?.total ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {sparesType === "ENGINE" ? "engines" : "APUs"} available
              </span>
            </div>
          </div>

          {/* ESN / SN List */}
          {sparesData?.[0]?.esns && sparesData[0].esns.length > 0 ? (
            <div className="border rounded-md bg-muted/50 p-2.5 max-h-36 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                {sparesType === "ENGINE" ? "Engine ESNs" : "APU SNs"}
              </p>
              <div className="space-y-1">
                {sparesData[0].esns.map((esn) => (
                  <div
                    key={esn}
                    className="text-sm font-mono p-1 hover:bg-background rounded"
                  >
                    {esn}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border rounded-md bg-muted/50 p-2.5 text-sm text-muted-foreground text-center">
              No serviceable spares currently available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spare Quick View */}
      <Card data-testid="spare-quick-view-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Spare Quick View
            {criticalSpares && <ConnectionStatus source={criticalSpares.source ?? "mock"} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalSpares?.source === "loading" ? (
            <div className="flex items-center justify-center h-24">
              <Skeleton className="w-full h-full" />
            </div>
          ) : criticalSpares?.data && criticalSpares.data.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {criticalSpares.data.map((part: any, idx: number) => {
                const totalQty = part.partNumbers.reduce((sum: number, pn: any) => sum + pn.quantity, 0);
                const hasMultiplePns = part.partNumbers.length > 1;
                
                return (
                  <div key={idx} className="border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{part.name}</p>
                        <div className={`mt-1 space-y-1 ${hasMultiplePns ? "bg-muted/50 p-1.5 rounded" : ""}`}>
                          {part.partNumbers.map((pn: any, pnIdx: number) => (
                            <div key={pnIdx} className="text-xs text-muted-foreground font-mono">
                              <span className="text-foreground font-semibold">{pn.pn}</span>
                              {hasMultiplePns && (
                                <span className="ml-2">
                                  ({pn.quantity} {pn.quantity === 1 ? "unit" : "units"})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xl font-bold font-technical ${
                          totalQty === 0 ? "text-destructive" : 
                          totalQty === 1 ? "text-[var(--warning)]" : 
                          "text-[var(--success)]"
                        }`}>
                          {totalQty}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalQty === 1 ? "unit" : "units"}
                        </p>
                      </div>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground text-center px-4">
              No critical spares currently flagged.
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

