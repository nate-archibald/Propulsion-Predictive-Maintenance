import { useState, useEffect, Fragment } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Button,
} from "@databricks/appkit-ui/react";
import { Search, Settings, AlertTriangle } from "lucide-react";
import type { EngineConfig, APUConfig } from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";

export default function EnginesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [selectedTab, setSelectedTab] = useState<"engines" | "apus">("engines");
  const [selectedEngine, setSelectedEngine] = useState<EngineConfig | null>(null);
  const [selectedAPU, setSelectedAPU] = useState<APUConfig | null>(null);

  // Build-up tree state
  interface BuildUpPart {
    sn: string;
    pn: string;
    description: string;
    condition: string;
    position: string | null;
    children: BuildUpPart[];
  }
  
  const [buildUp, setBuildUp] = useState<BuildUpPart[]>([]);
  const [buildUpLoading, setBuildUpLoading] = useState(false);
  const [expandedSns, setExpandedSns] = useState<Set<string>>(new Set());

  // Fetch build-up tree when engine/APU is selected
  useEffect(() => {
    const sn = selectedTab === "engines" ? selectedEngine?.engineSN : selectedAPU?.apuSN;
    if (!sn) {
      setBuildUp([]);
      return;
    }
    setBuildUpLoading(true);
    setExpandedSns(new Set()); // reset expansion when switching
    fetch(`/api/engine-buildup/${encodeURIComponent(sn)}`)
      .then((r) => r.json())
      .then((d) => setBuildUp(d.data || []))
      .catch(() => setBuildUp([]))
      .finally(() => setBuildUpLoading(false));
  }, [selectedEngine, selectedAPU, selectedTab]);

  // Toggle expand/collapse for a part SN
  const toggleExpand = (sn: string) => {
    setExpandedSns((prev) => {
      const next = new Set(prev);
      next.has(sn) ? next.delete(sn) : next.add(sn);
      return next;
    });
  };

  const { data: engines, source: enginesSource } = useLakebaseData<EngineConfig>("/api/engines");
  const { data: apus, source: apusSource } = useLakebaseData<APUConfig>("/api/apus");
  
  const source = selectedTab === "engines" ? enginesSource : apusSource;
  const loading = source === "loading";

  const allData = selectedTab === "engines" ? engines : apus;

  const filtered = allData.filter((item: any) => {
    const q = search.toLowerCase();
    if (selectedTab === "engines") {
      const engine = item as EngineConfig;
      return (
        engine.engineSN.toLowerCase().includes(q) ||
        engine.tail.toLowerCase().includes(q) ||
        engine.engineType.toLowerCase().includes(q)
      );
    } else {
      const apu = item as APUConfig;
      return (
        apu.apuSN.toLowerCase().includes(q) ||
        apu.tail.toLowerCase().includes(q)
      );
    }
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="engines-page">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="engines-heading">
            Engine & APU Genealogy
          </h2>
          <ConnectionStatus source={source} context="fleet" />
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-muted-foreground">
            Full configuration and history by {selectedTab === "engines" ? "Engine" : "APU"} S/N
          </p>
          <div className="flex gap-2">
            <Button
              variant={selectedTab === "engines" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedTab("engines");
                setSelectedAPU(null);
              }}
            >
              Engines
            </Button>
            <Button
              variant={selectedTab === "apus" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedTab("apus");
                setSelectedEngine(null);
              }}
            >
              APUs
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={selectedTab === "engines" ? "ESN-31042, N628QX..." : "APU-619, N619QX..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="engines-search-input"
          aria-label={`Search ${selectedTab}`}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No {selectedTab === "engines" ? "engines" : "APUs"} match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Cards (Engines or APUs) */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedTab === "engines" ? (
              filtered.map((eng: any) => {
                const engine = eng as EngineConfig;
                const llpCount = engine.parts.filter(
                  (p) =>
                    p.isLLP &&
                    p.cyclesRemaining !== null &&
                    p.cyclesRemaining < 1000
                ).length;
                return (
                  <Card
                    key={engine.engineSN}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedEngine?.engineSN === engine.engineSN ? "ring-2 ring-accent" : ""}`}
                    onClick={() => setSelectedEngine(engine)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedEngine(engine);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span className="font-mono">{engine.engineSN}</span>
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
                          <p className="font-medium">{engine.tail}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Position</p>
                          <p className="font-medium">{engine.position}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hours</p>
                          <p className="font-medium">
                            {engine.totalHours.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cycles</p>
                          <p className="font-medium">
                            {engine.totalCycles.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        Last shop visit: {engine.lastShopVisit}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              filtered.map((apu: any) => {
                const apuItem = apu as APUConfig;
                return (
                  <Card
                    key={apuItem.apuSN}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedAPU?.apuSN === apuItem.apuSN ? "ring-2 ring-accent" : ""}`}
                    onClick={() => setSelectedAPU(apuItem)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedAPU(apuItem);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-mono">{apuItem.apuSN}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground">Tail</p>
                          <p className="font-medium">{apuItem.tail}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hours</p>
                          <p className="font-medium">
                            {apuItem.totalHours.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cycles</p>
                          <p className="font-medium">
                            {apuItem.totalCycles.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        Last shop visit: {apuItem.lastShopVisit}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Build-up tree: Installed parts hierarchy */}
          {(selectedEngine || selectedAPU) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {selectedEngine ? selectedEngine.engineSN : selectedAPU!.apuSN} — Installed Parts
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({buildUp.length} components
                    {buildUp.some((p) => p.children.length > 0)
                      ? ", click chevron to expand assemblies"
                      : ""})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {buildUpLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : buildUp.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No build-up data available.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground w-8"></th>
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                            Description
                          </th>
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                            P/N
                          </th>
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                            S/N
                          </th>
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                            Condition
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {buildUp.map((part) => (
                          <Fragment key={part.sn}>
                            {/* Level 1 row */}
                            <tr className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3">
                                {part.children.length > 0 && (
                                  <button
                                    onClick={() => toggleExpand(part.sn)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {expandedSns.has(part.sn) ? "\u25BC" : "\u25B6"}
                                  </button>
                                )}
                              </td>
                              <td className="py-2 px-3 font-medium">{part.description}</td>
                              <td className="py-2 px-3 font-mono text-xs">{part.pn}</td>
                              <td className="py-2 px-3 font-mono text-xs">{part.sn}</td>
                              <td className="py-2 px-3">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                  {part.condition}
                                </span>
                              </td>
                            </tr>
                            {/* Level 2 rows (expanded children) */}
                            {expandedSns.has(part.sn) &&
                              part.children.map((child) => (
                                <tr
                                  key={child.sn}
                                  className="border-b bg-muted/10 hover:bg-muted/20"
                                >
                                  <td className="py-1.5 px-3"></td>
                                  <td className="py-1.5 px-3 pl-8 text-muted-foreground">
                                    {child.description}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">
                                    {child.pn}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">
                                    {child.sn}
                                  </td>
                                  <td className="py-1.5 px-3">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50">
                                      {child.condition}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected engine detail */}
          {selectedEngine && (
            <Card data-testid="engine-detail">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {selectedEngine.engineSN} — Life-Limited Parts (LLP Tracking)
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

          {/* Selected APU detail */}
          {selectedAPU && (
            <Card data-testid="apu-detail">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {selectedAPU.apuSN} — APU Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tail</p>
                      <p className="font-medium">{selectedAPU.tail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="font-medium">{selectedAPU.totalHours.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cycles</p>
                      <p className="font-medium">{selectedAPU.totalCycles.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Shop Visit</p>
                      <p className="font-medium">{selectedAPU.lastShopVisit}</p>
                    </div>
                  </div>
                  {selectedAPU.parts.length > 0 && (
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
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAPU.parts.map((p) => (
                            <tr
                              key={p.serialNumber}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 px-3">{p.description}</td>
                              <td className="py-2 px-3 font-mono text-xs">
                                {p.partNumber}
                              </td>
                              <td className="py-2 px-3 font-mono text-xs">
                                {p.serialNumber}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
