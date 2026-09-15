import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  BarChart,
  LineChart,
} from "@databricks/appkit-ui/react";
import {
  Clock,
  Plane,
  AlertTriangle,
  BarChart3,
  Wrench,
} from "lucide-react";
import {
  WEEKLY_DEFECT_TREND,
  IMPACT_BY_PN,
  LINKAGE_STATS,
} from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";
import { KpiCard } from "../components/qx-ui";


export default function ReliabilityPage() {
  const { data: kpiRows, source } = useLakebaseData<{
    activeDefects: number;
    cancelCount: number;
    totalDelayMinutes: number;
    totalDefects: number;
    llpAlerts: number;
  }>("/api/kpis");
  const { data: trend } = useLakebaseData<{ week: string; count: number }>(
    "/api/defects/weekly-trend"
  );

  const loading = source === "loading";
  const kpi = kpiRows[0];
  const trendData = trend.length > 0 ? trend : WEEKLY_DEFECT_TREND;

  const totalDefects = kpi?.totalDefects ?? 0;
  const totalDelayMin = kpi?.totalDelayMinutes ?? 0;
  const cancelCount = kpi?.cancelCount ?? 0;
  const llpAlertCount = kpi?.llpAlerts ?? 0;

  return (
    <div className="space-y-6" data-testid="reliability-page">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="reliability-heading">
            Reliability Dashboard
          </h2>
          <ConnectionStatus source={source} context="reliability" />
        </div>
        <p className="text-muted-foreground mt-1">
          Monthly reliability review — executive summary
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Defects"
          value={totalDefects}
          unit="reports"
          icon={AlertTriangle}
          variant="warning"
          dense
        />
        <KpiCard title="Total Delay Minutes" value={totalDelayMin} unit="min" icon={Clock} variant="destructive" dense />
        <KpiCard title="Cancellations" value={cancelCount} unit="flights" icon={Plane} variant="destructive" dense />
        <KpiCard title="LLP Alerts" value={llpAlertCount} unit="parts" icon={AlertTriangle} variant="warning" dense />
      </div>

      {/* Top 10: cancellation impact by part */}
      <div>
        {/* Top P/N by cancellations */}
        <Card data-testid="top-pn-cancels">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Top P/Ns by Cancellation-Attributable Removals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={[...IMPACT_BY_PN]
                .sort((a, b) => b.cancels - a.cancels)
                .slice(0, 10)
                .map((d) => ({
                  part: `${d.partNumber.slice(0, 10)}...`,
                  cancels: d.cancels,
                }))}
              xKey="part"
              yKey="cancels"
              height={280}
              colors={["var(--destructive)"]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trend + Impact detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly trend */}
        <Card data-testid="reliability-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Fleet-Wide Weekly Defect Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={trendData}
              xKey="week"
              yKey="count"
              height={280}
              colors={["var(--chart-1)"]}
            />
          </CardContent>
        </Card>

        {/* Linkage quality */}
        <Card data-testid="reliability-linkage">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Data Quality — Defect↔Part Linkage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{LINKAGE_STATS.highPct}%</span>
              <span className="text-sm text-muted-foreground">
                HIGH confidence
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Target: ≥ 60%</p>
            <div className="h-4 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-[var(--success)]"
                style={{ width: `${LINKAGE_STATS.highPct}%` }}
              />
              <div
                className="h-full bg-[var(--warning)]"
                style={{ width: `${LINKAGE_STATS.mediumPct}%` }}
              />
              <div
                className="h-full bg-destructive"
                style={{ width: `${LINKAGE_STATS.lowPct}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />{" "}
                HIGH ({LINKAGE_STATS.high})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />{" "}
                MEDIUM ({LINKAGE_STATS.medium})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive" /> LOW (
                {LINKAGE_STATS.low})
              </span>
            </div>

            {/* Impact by P/N table */}
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Top P/Ns by Delay Minutes
              </p>
              <div className="space-y-1">
                {IMPACT_BY_PN.slice(0, 5).map((p) => (
                  <div
                    key={p.partNumber}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="font-mono">{p.partNumber}</span>
                    <span className="font-semibold">{p.delayMinutes} min</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
