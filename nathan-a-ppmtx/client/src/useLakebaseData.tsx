import { useState, useEffect } from "react";
import { Database, DatabaseZap } from "lucide-react";

export type DataSource = "live" | "mock" | "loading";

// Fetches `{ data, source }` envelopes from the backend analytics endpoints.
// Pass `null` as the endpoint to skip the fetch (e.g. until a param resolves).
export function useLakebaseData<T>(endpoint: string | null) {
  const [data, setData] = useState<T[]>([]);
  const [source, setSource] = useState<DataSource>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    setSource("loading");
    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setData(Array.isArray(json.data) ? json.data : json.data ? [json.data] : []);
        setSource(json.source === "live" ? "live" : "mock");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
        setSource("mock");
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, source, error };
}

// Small pill shown at the top of each page indicating whether the data came
// from live Lakebase or the mock fallback.
export function ConnectionStatus({
  source,
  context,
}: {
  source: DataSource;
  context?: string;
}) {
  if (source === "loading") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
        data-testid="connection-status"
      >
        <Database className="h-3 w-3 animate-pulse" />
        Loading{context ? ` ${context}` : ""}…
      </span>
    );
  }
  if (source === "live") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] font-medium"
        data-testid="connection-status"
      >
        <DatabaseZap className="h-3 w-3" />
        Live Data{context ? ` — ${context}` : ""}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-[var(--warning)]/15 text-[var(--warning)] font-medium"
      data-testid="connection-status"
    >
      <Database className="h-3 w-3" />
      Mock Data{context ? ` — ${context}` : ""}
    </span>
  );
}
