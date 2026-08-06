import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@databricks/appkit-ui/react";
import { Search, ArrowUpDown } from "lucide-react";
import type { Defect } from "../mock-data";
import { useLakebaseData, ConnectionStatus } from "../useLakebaseData";

function ConfidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-[var(--success)] text-[var(--success-foreground)]",
    MEDIUM: "bg-[var(--warning)] text-[var(--warning-foreground)]",
    LOW: "bg-destructive text-destructive-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[level] ?? "bg-muted text-muted-foreground"}`}
    >
      {level}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const styles: Record<string, string> = {
    CANCEL: "bg-destructive text-destructive-foreground",
    DELAY: "bg-[var(--warning)] text-[var(--warning-foreground)]",
    NONE: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[impact] ?? "bg-muted text-muted-foreground"}`}
    >
      {impact}
    </span>
  );
}

export default function DefectsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [sortField, setSortField] = useState<keyof Defect>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const { data: defects, source } = useLakebaseData<Defect>("/api/defects");
  const loading = source === "loading";

  const filtered = defects.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.tail.toLowerCase().includes(q) ||
      d.ata.toLowerCase().includes(q) ||
      d.ataDesc.toLowerCase().includes(q) ||
      d.station.toLowerCase().includes(q) ||
      d.narrative.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    const aVal = String(a[sortField]);
    const bVal = String(b[sortField]);
    return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const handleSort = (field: keyof Defect) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="defects-page">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="defects-heading">
            Defects Search
          </h2>
          <ConnectionStatus source={source} context="defects" />
        </div>
        <p className="text-muted-foreground mt-1">
          Search by defect ID, tail number, ATA code, or station
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="DEF-2026-0412, N628QX, 73-21, PDX..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="defects-search-input"
          aria-label="Search defects"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No defects match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="defects-table">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {(
                          [
                            ["id", "Defect ID"],
                            ["tail", "Tail"],
                            ["ata", "ATA"],
                            ["station", "Stn"],
                            ["date", "Date"],
                            ["impact", "Impact"],
                            ["confidence", "Link"],
                          ] as Array<[keyof Defect, string]>
                        ).map(([field, label]) => (
                          <th
                            key={field}
                            className="py-2.5 px-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                            onClick={() => handleSort(field)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              <ArrowUpDown className="h-3 w-3" />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d) => (
                        <tr
                          key={d.id}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${selectedDefect?.id === d.id ? "bg-accent/10" : "hover:bg-muted/50"}`}
                          onClick={() => setSelectedDefect(d)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setSelectedDefect(d);
                          }}
                        >
                          <td className="py-2 px-3 font-mono text-xs">
                            {d.id}
                          </td>
                          <td className="py-2 px-3">{d.tail}</td>
                          <td className="py-2 px-3 font-mono">{d.ata}</td>
                          <td className="py-2 px-3">{d.station}</td>
                          <td className="py-2 px-3">{d.date}</td>
                          <td className="py-2 px-3">
                            <ImpactBadge impact={d.impact} />
                            {d.delayMinutes > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                {d.delayMinutes}m
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <ConfidenceBadge level={d.confidence} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail panel */}
          <div>
            {selectedDefect ? (
              <Card data-testid="defect-detail">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono">
                    {selectedDefect.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">Tail</p>
                      <p className="font-medium">{selectedDefect.tail}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Station</p>
                      <p className="font-medium">{selectedDefect.station}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">ATA</p>
                      <p className="font-medium">
                        {selectedDefect.ata} — {selectedDefect.ataDesc}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{selectedDefect.date}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Narrative
                    </p>
                    <p className="bg-muted p-2 rounded text-xs leading-relaxed">
                      {selectedDefect.narrative}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Resolution
                    </p>
                    <p className="bg-muted p-2 rounded text-xs leading-relaxed">
                      {selectedDefect.resolution}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">Impact</p>
                      <ImpactBadge impact={selectedDefect.impact} />
                      {selectedDefect.delayMinutes > 0 && (
                        <span className="ml-1 text-xs">
                          {selectedDefect.delayMinutes} min
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Deferral</p>
                      <p className="font-medium">
                        {selectedDefect.deferral ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  {selectedDefect.linkedPartSN && (
                    <div className="border-t pt-3">
                      <p className="text-muted-foreground text-xs mb-1">
                        Linked Part
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          P/N {selectedDefect.linkedPartPN}
                        </span>
                        <span className="font-mono text-xs">
                          S/N {selectedDefect.linkedPartSN}
                        </span>
                        <ConfidenceBadge level={selectedDefect.confidence} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Select a defect to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
