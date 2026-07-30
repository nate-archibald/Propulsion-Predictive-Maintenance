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
import { Search, Package, ArrowRight } from "lucide-react";
import { MOCK_PARTS } from "../mock-data";
import type { Part } from "../mock-data";

function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    SVC: "bg-[var(--success)] text-[var(--success-foreground)]",
    UNS: "bg-[var(--warning)] text-[var(--warning-foreground)]",
    SCR: "bg-muted text-muted-foreground",
    AOG: "bg-destructive text-destructive-foreground",
    "IN-SHOP": "bg-accent text-accent-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[condition] ?? "bg-muted text-muted-foreground"}`}
    >
      {condition}
    </span>
  );
}

export default function PartsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const loading = false;

  const filtered = MOCK_PARTS.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.partNumber.toLowerCase().includes(q) ||
      p.serialNumber.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.engineSN.toLowerCase().includes(q) ||
      p.tail.toLowerCase().includes(q)
    );
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

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

      {/* Search */}
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

      {filtered.length === 0 ? (
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
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
                          CSN
                        </th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">
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
