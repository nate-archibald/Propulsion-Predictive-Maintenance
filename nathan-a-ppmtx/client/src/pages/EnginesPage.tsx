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
import { Search, Settings, AlertTriangle } from "lucide-react";
import { MOCK_ENGINES } from "../mock-data";
import type { EngineConfig } from "../mock-data";

export default function EnginesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [selectedEngine, setSelectedEngine] = useState<EngineConfig | null>(
    null
  );
  const loading = false;

  const filtered = MOCK_ENGINES.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.engineSN.toLowerCase().includes(q) ||
      e.tail.toLowerCase().includes(q) ||
      e.engineType.toLowerCase().includes(q)
    );
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="engines-page">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="engines-heading">
          Engine Genealogy
        </h2>
        <p className="text-muted-foreground mt-1">
          Full configuration and history by Engine S/N
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ESN-31042, N628QX..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="engines-search-input"
          aria-label="Search engines"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No engines match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Engine cards */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((eng) => {
              const llpCount = eng.parts.filter(
                (p) =>
                  p.isLLP &&
                  p.cyclesRemaining !== null &&
                  p.cyclesRemaining < 1000
              ).length;
              return (
                <Card
                  key={eng.engineSN}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedEngine?.engineSN === eng.engineSN ? "ring-2 ring-accent" : ""}`}
                  onClick={() => setSelectedEngine(eng)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedEngine(eng);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-mono">{eng.engineSN}</span>
                      </span>
                      {llpCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          {llpCount} LLP
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Tail</p>
                        <p className="font-medium">{eng.tail}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Position</p>
                        <p className="font-medium">
                          ENG-{eng.position === "L" ? "1" : "2"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Hours</p>
                        <p className="font-medium">
                          {eng.totalHours.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cycles</p>
                        <p className="font-medium">
                          {eng.totalCycles.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Last shop visit: {eng.lastShopVisit}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected engine detail */}
          {selectedEngine && (
            <Card data-testid="engine-detail">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {selectedEngine.engineSN} — {selectedEngine.engineType}{" "}
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Part
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          P/N
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          S/N
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Position
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          TSI
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          CSI
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          Installed
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          LLP Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEngine.parts.map((p) => (
                        <tr
                          key={p.serialNumber}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate(
                              `/parts?search=${encodeURIComponent(p.serialNumber)}`
                            )
                          }
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              navigate(
                                `/parts?search=${encodeURIComponent(p.serialNumber)}`
                              );
                          }}
                        >
                          <td className="py-2 px-3">{p.description}</td>
                          <td className="py-2 px-3 font-mono text-xs">
                            {p.partNumber}
                          </td>
                          <td className="py-2 px-3 font-mono text-xs">
                            {p.serialNumber}
                          </td>
                          <td className="py-2 px-3">{p.position}</td>
                          <td className="py-2 px-3">
                            {p.tso.toLocaleString()} hrs
                          </td>
                          <td className="py-2 px-3">
                            {p.csi.toLocaleString()} cyc
                          </td>
                          <td className="py-2 px-3">{p.installDate}</td>
                          <td className="py-2 px-3">
                            {p.isLLP ? (
                              <span
                                className={`text-xs font-semibold ${(p.cyclesRemaining ?? Infinity) < 1000 ? "text-destructive" : "text-[var(--success)]"}`}
                              >
                                {p.cyclesRemaining?.toLocaleString()} /{" "}
                                {p.cycleLimit?.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {selectedEngine.parts.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-4 text-center text-muted-foreground"
                          >
                            No parts tracked for this engine
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
