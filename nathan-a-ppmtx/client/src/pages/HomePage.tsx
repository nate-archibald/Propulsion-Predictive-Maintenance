import { useState } from "react";
import { useNavigate } from "react-router";
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
  AlertTriangle,
  TrendingUp,
  Wrench,
  Plane,
  Clock,
  Activity,
  ArrowDownUp,
} from "lucide-react";
import {
  DEFECTS_BY_ATA_PERIOD,
  WEEKLY_DEFECT_TREND_PERIOD,
  MOCK_PARTS,
  LINKAGE_STATS,
} from "../mock-data";

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

type TimePeriod = "week" | "month" | "year";

const PERIOD_LABELS: Record<TimePeriod, string> = {
  week: "1W",
  month: "1M",
  year: "1Y",
};

function PeriodToggle({ value, onChange }: { value: TimePeriod; onChange: (p: TimePeriod) => void }) {
  return (
    <div className="flex gap-1">
      {(["week", "month", "year"] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            value === p
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

const REMOVAL_BY_PERIOD = {
  week: { value: 3, label: "Last 7 days" },
  month: { value: 10, label: "Last 30 days" },
  year: { value: 47, label: "Last 12 months" },
} as const;

const DELAY_BY_PERIOD = {
  week: { value: 78, label: "Last 7 days" },
  month: { value: 393, label: "Last 30 days" },
  year: { value: 2840, label: "Last 12 months" },
} as const;

const CANCELS_BY_PERIOD = {
  week: { value: 1, label: "Last 7 days" },
  month: { value: 3, label: "Last 30 days" },
  year: { value: 16, label: "Last 12 months" },
} as const;

export default function HomePage() {
  const loading = false;
  const navigate = useNavigate();
  const [removalPeriod, setRemovalPeriod] = useState<TimePeriod>("month");
  const [delayPeriod, setDelayPeriod] = useState<TimePeriod>("month");
  const [cancelPeriod, setCancelPeriod] = useState<TimePeriod>("month");
  const [ataPeriod, setAtaPeriod] = useState<TimePeriod>("month");
  const [trendPeriod, setTrendPeriod] = useState<TimePeriod>("month");

  const llpAlerts = MOCK_PARTS.filter(
    (p) => p.isLLP && p.cyclesRemaining !== null && p.cyclesRemaining < 1000
  );

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="home-page">
      {/* Header */}
      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          data-testid="hero-heading"
        >
          Engine Component Snapshot
        </h2>
        <p className="text-muted-foreground mt-1">
          Propulsion reliability overview — CF34-8E / E175 fleet
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[var(--warning)] border-l-4" data-testid="metric-total-removals">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Part Removals
                </p>
                <p className="text-2xl font-bold mt-1">{REMOVAL_BY_PERIOD[removalPeriod].value}</p>
                <p className="text-xs text-muted-foreground mt-1">{REMOVAL_BY_PERIOD[removalPeriod].label}</p>
              </div>
              <div className="rounded-md p-2 bg-muted">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              <PeriodToggle value={removalPeriod} onChange={setRemovalPeriod} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive border-l-4" data-testid="metric-delay-minutes">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Delay Min
                </p>
                <p className="text-2xl font-bold mt-1">{DELAY_BY_PERIOD[delayPeriod].value}</p>
                <p className="text-xs text-muted-foreground mt-1">{DELAY_BY_PERIOD[delayPeriod].label}</p>
              </div>
              <div className="rounded-md p-2 bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              <PeriodToggle value={delayPeriod} onChange={setDelayPeriod} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive border-l-4" data-testid="metric-cancellations">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cancellations
                </p>
                <p className="text-2xl font-bold mt-1">{CANCELS_BY_PERIOD[cancelPeriod].value}</p>
                <p className="text-xs text-muted-foreground mt-1">{CANCELS_BY_PERIOD[cancelPeriod].label}</p>
              </div>
              <div className="rounded-md p-2 bg-muted">
                <Plane className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              <PeriodToggle value={cancelPeriod} onChange={setCancelPeriod} />
            </div>
          </CardContent>
        </Card>
        <MetricCard
          title="LLP Alerts"
          value={llpAlerts.length}
          subtitle="< 1,000 cycles to limit"
          icon={Activity}
          variant={llpAlerts.length > 0 ? "destructive" : "success"}
          testId="metric-llp-alerts"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATA Hotspot Chart */}
        <Card data-testid="ata-hotspot-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Defects by ATA Section
              </CardTitle>
              <PeriodToggle value={ataPeriod} onChange={setAtaPeriod} />
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={DEFECTS_BY_ATA_PERIOD[ataPeriod].map((d) => ({
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {trendPeriod === "week" ? "Daily" : trendPeriod === "year" ? "Monthly" : "Weekly"} Defect Trend
              </CardTitle>
              <PeriodToggle value={trendPeriod} onChange={setTrendPeriod} />
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              data={WEEKLY_DEFECT_TREND_PERIOD[trendPeriod]}
              xKey="week"
              yKey="count"
              height={280}
              smooth={false}
              colors={["var(--chart-2)"]}
            />
          </CardContent>
        </Card>
      </div>

      {/* LLP Alerts + Data Quality Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* LLP Red-Line Alerts */}
        <Card data-testid="llp-alerts-table">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              LLP Red-Line Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {llpAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No LLPs within 1,000 cycles of limit.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3 font-medium text-muted-foreground">
                        Part
                      </th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">
                        S/N
                      </th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">
                        Tail
                      </th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">
                        Remaining
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {llpAlerts.map((p) => (
                      <tr
                        key={p.serialNumber}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          navigate(
                            `/parts?search=${encodeURIComponent(
                              p.serialNumber
                            )}`
                          )
                        }
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(
                              `/parts?search=${encodeURIComponent(
                                p.serialNumber
                              )}`
                            );
                          }
                        }}
                      >
                        <td className="py-2 pr-3">{p.description}</td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {p.serialNumber}
                        </td>
                        <td className="py-2 pr-3">{p.tail}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              (p.cyclesRemaining ?? 0) <= 500
                                ? "text-destructive"
                                : "text-[var(--warning)]"
                            }`}
                          >
                            {p.cyclesRemaining?.toLocaleString()} cyc
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Quality */}
        <Card data-testid="data-quality-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Defect↔Part Linkage Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {LINKAGE_STATS.highPct}%
              </span>
              <span className="text-sm text-muted-foreground">
                HIGH confidence (target ≥ 60%)
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "HIGH",
                  pct: LINKAGE_STATS.highPct,
                  color: "bg-[var(--success)]",
                },
                {
                  label: "MEDIUM",
                  pct: LINKAGE_STATS.mediumPct,
                  color: "bg-[var(--warning)]",
                },
                {
                  label: "LOW",
                  pct: LINKAGE_STATS.lowPct,
                  color: "bg-destructive",
                },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {LINKAGE_STATS.total} defects analyzed — trailing 12 months
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
