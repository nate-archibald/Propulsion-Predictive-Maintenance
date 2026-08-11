import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  BarChart,
  LineChart,
  Button,
} from "@databricks/appkit-ui/react";
import {
  TrendingUp,
  Plane,
  Clock,
  Activity,
  Waves,
  ClipboardList,
  CalendarRange,
  Zap,
} from "lucide-react";
import {
  DEFECTS_BY_ATA,
  WEEKLY_DEFECT_TREND,
  type FleetLeadersData,
} from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  testId,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "destructive" | "success";
  testId: string;
}) {
  const variantStyles = {
    default: "border-border",
    warning: "border-[var(--warning)]",
    destructive: "border-destructive",
    success: "border-[var(--success)]",
  };

  return (
    <Card className={`${variantStyles[variant]} border-l-4`} data-testid={testId}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="rounded-md p-2 bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  // Timeframe filter — scopes the Total Delay Min / Cancellations / Vibration
  // PIREPs KPIs and the Defects-by-ATA chart. Empty = all-time (current default).
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sparesType, setSparesType] = useState<"ENGINE" | "APU">("ENGINE");
  
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
  const { data: trend } = useLakebaseData<{ week: string; count: number }>(
    "/api/defects/weekly-trend"
  );
  const { data: sparesData, source: sparesSource } = useLakebaseData<{
    total: number;
    esns: string[];
    type: string;
  }>(`/api/serviceable-spares?type=${sparesType}`);
  const { data: fleetLeadersResp, source: fleetLeadersSource } = useLakebaseData<FleetLeadersData>(
    "/api/fleet-leaders"
  );

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
            Engine Component Snapshot
          </h2>
          <ConnectionStatus source={kpiSource} context="overview" />
        </div>
        <p className="text-muted-foreground mt-1">
          Propulsion reliability overview — CF34-8E / E175 fleet
        </p>
      </div>

      {/* Timeframe filter — scopes the marked KPIs + the Defects by ATA chart */}
      <Card data-testid="timeframe-filter">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              Timeframe
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-from"
                className="text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="date-from"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-to"
                className="text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="date-to"
              />
            </div>
            {hasRange && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
                data-testid="date-clear"
              >
                Clear
              </button>
            )}
            <p className="text-xs text-muted-foreground ml-auto max-w-xs">
              {hasRange
                ? "Showing Total Delay Min, Cancellations, Vibration PIREPs & Defects by ATA for the selected range."
                : "All-time. Pick a range to scope Total Delay Min, Cancellations, Vibration PIREPs & the Defects by ATA chart."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vibration PIREPs"
          value={vibrationPireps}
          subtitle={
            hasRange
              ? "Pilot reports mentioning vibration (in range)"
              : "Pilot reports mentioning vibration"
          }
          icon={Waves}
          variant="warning"
          testId="metric-vibration-pireps"
        />
        <MetricCard
          title="Total Delay Min"
          value={totalDelayMinutes}
          subtitle={
            hasRange ? "Propulsion-attributable (in range)" : "Propulsion-attributable"
          }
          icon={Clock}
          variant="destructive"
          testId="metric-delay-minutes"
        />
        <MetricCard
          title="Cancellations"
          value={cancelCount}
          subtitle={
            hasRange ? "Propulsion-attributable (in range)" : "Propulsion-attributable"
          }
          icon={Plane}
          variant="destructive"
          testId="metric-cancellations"
        />
        <MetricCard
          title="ECMP"
          value={openEcmp}
          subtitle="Open engineering task cards"
          icon={ClipboardList}
          variant={openEcmp > 0 ? "warning" : "success"}
          testId="metric-ecmp"
        />
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
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Engine Leader */}
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Engine</p>
                {fleetLeadersResp[0]?.engine ? (
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-xs text-muted-foreground">S/N</p>
                      <p className="text-sm font-semibold font-mono">{fleetLeadersResp[0].engine.sn}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tail</p>
                        <p className="text-sm font-medium">{fleetLeadersResp[0].engine.tail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hours</p>
                        <p className="text-sm font-medium">{fleetLeadersResp[0].engine.hours.toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cycles</p>
                      <p className="text-sm font-medium">{fleetLeadersResp[0].engine.cycles.toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No engine data</p>
                )}
              </div>

              {/* APU Leader */}
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">APU</p>
                {fleetLeadersResp[0]?.apu ? (
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-xs text-muted-foreground">S/N</p>
                      <p className="text-sm font-semibold font-mono">{fleetLeadersResp[0].apu.sn}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tail</p>
                        <p className="text-sm font-medium">{fleetLeadersResp[0].apu.tail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hours</p>
                        <p className="text-sm font-medium">{fleetLeadersResp[0].apu.hours.toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cycles</p>
                      <p className="text-sm font-medium">{fleetLeadersResp[0].apu.cycles.toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No APU data</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATA Hotspot Chart */}
        <Card data-testid="ata-hotspot-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Defects by ATA Section
              <ConnectionStatus source={ataSource} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={ataData.slice(0, 12).map((d) => ({
                ...d,
                label: d.ata,
              }))}
              xKey="label"
              yKey="count"
              height={280}
              colors={["var(--chart-1)"]}
            />
          </CardContent>
        </Card>

        {/* Weekly Defect Trend */}
        <Card data-testid="weekly-trend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Weekly Defect Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={trendData}
              xKey="week"
              yKey="count"
              height={280}
              colors={["var(--chart-2)"]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Serviceable Spares */}
      <Card data-testid="serviceable-spares-widget">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Serviceable Spares ({sparesType === "ENGINE" ? "Engines" : "APUs"})
            </CardTitle>
            <ConnectionStatus source={sparesSource} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Engines / APUs */}
          <div className="flex gap-2 border-b pb-4">
            <Button
              variant={sparesType === "ENGINE" ? "default" : "outline"}
              size="sm"
              onClick={() => setSparesType("ENGINE")}
              className="text-xs"
              data-testid="spares-toggle-engines"
            >
              Engines
            </Button>
            <Button
              variant={sparesType === "APU" ? "default" : "outline"}
              size="sm"
              onClick={() => setSparesType("APU")}
              className="text-xs"
              data-testid="spares-toggle-apus"
            >
              APUs
            </Button>
          </div>

          {/* Total Count */}
          <div className="flex items-center gap-3 py-2">
            <div className="text-3xl font-bold">
              {sparesData?.[0]?.total ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {sparesType === "ENGINE" ? "Engines" : "APUs"} available for service
            </p>
          </div>

          {/* ESN / SN List */}
          {sparesData?.[0]?.esns && sparesData[0].esns.length > 0 ? (
            <div className="border rounded-md bg-muted/50 p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
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
            <div className="border rounded-md bg-muted/50 p-3 text-sm text-muted-foreground text-center">
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
        <CardContent className="min-h-48">
          {criticalSpares?.data && criticalSpares.data.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {criticalSpares.data.map((part: any, idx: number) => {
                const totalQty = part.partNumbers.reduce((sum: number, pn: any) => sum + pn.quantity, 0);
                const hasMultiplePns = part.partNumbers.length > 1;
                
                return (
                  <div key={idx} className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{part.name}</p>
                        <div className={`mt-2 space-y-1 ${hasMultiplePns ? "bg-muted/50 p-2 rounded" : ""}`}>
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
                        <div className={`text-xl font-bold ${
                          totalQty === 0 ? "text-destructive" : 
                          totalQty === 1 ? "text-yellow-600 dark:text-yellow-500" : 
                          "text-green-600 dark:text-green-500"
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
            <div className="flex items-center justify-center h-32">
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
