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
  TrendingUp,
  Clock,
  Plane,
  AlertTriangle,
  BarChart3,
  Wrench,
} from "lucide-react";
import {
  DEFECTS_BY_ATA,
  WEEKLY_DEFECT_TREND,
  IMPACT_BY_PN,
  LINKAGE_STATS,
  MOCK_DEFECTS,
  MOCK_PARTS,
} from "../mock-data";

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="rounded-md p-2 bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function ReliabilityPage() {
  const loading = false;

  const totalDelayMin = MOCK_DEFECTS.reduce((s, d) => s + d.delayMinutes, 0);
  const cancelCount = MOCK_DEFECTS.filter((d) => d.impact === "CANCEL").length;
  const llpAlertCount = MOCK_PARTS.filter(
    (p) => p.isLLP && p.cyclesRemaining !== null && p.cyclesRemaining < 1000
  ).length;

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="reliability-page">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="reliability-heading">
          Reliability Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Monthly reliability review — executive summary
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="Total Defects (30d)"
          value={MOCK_DEFECTS.length}
          icon={AlertTriangle}
        />
        <StatBox label="Total Delay Minutes" value={totalDelayMin} icon={Clock} />
        <StatBox label="Cancellations" value={cancelCount} icon={Plane} />
        <StatBox label="LLP Alerts" value={llpAlertCount} icon={AlertTriangle} />
      </div>

      {/* Top 10 charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top ATA by delay minutes */}
        <Card data-testid="top-ata-delay">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top ATA Sections by Delay Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={[...DEFECTS_BY_ATA]
                .sort((a, b) => b.delayMinutes - a.delayMinutes)
                .slice(0, 10)
                .map((d) => ({
                  ata: `${d.ata} ${d.description}`,
                  minutes: d.delayMinutes,
                }))}
              xKey="ata"
              yKey="minutes"
              height={280}
              colors={["var(--chart-3)"]}
            />
          </CardContent>
        </Card>

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
              data={WEEKLY_DEFECT_TREND}
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
    </div>
  );
}
