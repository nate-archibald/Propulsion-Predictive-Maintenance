import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  BarChart,
} from "@databricks/appkit-ui/react";
import { Search, Package, AlertTriangle } from "lucide-react";
import { MOCK_SPARES } from "../mock-data";

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-destructive text-destructive-foreground",
    MEDIUM: "bg-[var(--warning)] text-[var(--warning-foreground)]",
    LOW: "bg-[var(--success)] text-[var(--success-foreground)]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[risk] ?? "bg-muted text-muted-foreground"}`}
    >
      {risk}
    </span>
  );
}

export default function SparesPage() {
  const [search, setSearch] = useState("");
  const loading = false;

  const filtered = MOCK_SPARES.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.partNumber.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.station.toLowerCase().includes(q)
    );
  });

  // Station risk summary
  const stationRisk = Object.entries(
    MOCK_SPARES.reduce(
      (acc, s) => {
        if (!acc[s.station]) {
          acc[s.station] = { station: s.station, high: 0, medium: 0, low: 0 };
        }
        acc[s.station][s.stockOutRisk.toLowerCase() as "high" | "medium" | "low"]++;
        return acc;
      },
      {} as Record<
        string,
        { station: string; high: number; medium: number; low: number; [key: string]: unknown }
      >
    )
  )
    .map(([, v]) => v)
    .sort((a, b) => b.high - a.high);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="spares-page">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="spares-heading">
          Spares & Inventory
        </h2>
        <p className="text-muted-foreground mt-1">
          Station-level spare positioning and stock-out risk
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="1301M91G05, Fuel Control Unit, PDX..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="spares-search-input"
          aria-label="Search spares"
        />
      </div>

      {/* Station risk overview */}
      <Card data-testid="station-risk-chart">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Stock-Out Risk by Station
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={stationRisk.map((s) => ({
              station: s.station,
              highRisk: s.high,
            }))}
            xKey="station"
            yKey="highRisk"
            height={220}
            colors={["var(--destructive)"]}
          />
        </CardContent>
      </Card>

      {/* Inventory table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No spares match your search.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Detail ({filtered.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="spares-table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      P/N
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Station
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Condition
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Qty
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Removals/90d
                    </th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr
                      key={`${s.partNumber}-${s.station}-${i}`}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 px-3 font-mono text-xs">
                        {s.partNumber}
                      </td>
                      <td className="py-2 px-3">{s.description}</td>
                      <td className="py-2 px-3 font-medium">{s.station}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {s.condition}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold">{s.quantity}</td>
                      <td className="py-2 px-3">{s.removalRate90d}</td>
                      <td className="py-2 px-3">
                        <RiskBadge risk={s.stockOutRisk} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
