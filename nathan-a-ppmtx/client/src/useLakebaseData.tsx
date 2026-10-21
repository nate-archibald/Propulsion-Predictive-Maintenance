import { useState, useEffect } from "react";
import { Database, DatabaseZap } from "lucide-react";

export type DataSource = "live" | "mock" | "loading";

// ── Module-level stale-while-revalidate cache ────────────────────────
// Persists across component unmount/remount (React Router navigation).
// Entries older than CACHE_TTL_MS are considered stale and trigger a
// background refetch, but stale data is still served instantly so the
// user never sees a loading skeleton on re-navigation.
interface CacheEntry {
  data: any[];
  source: DataSource;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 120_000; // 2 minutes

/** Manually invalidate one or all cached endpoints. */
export function invalidateCache(endpoint?: string) {
  if (endpoint) cache.delete(endpoint);
  else cache.clear();
}

// Fetches `{ data, source }` envelopes from the backend analytics endpoints.
// Pass `null` as the endpoint to skip the fetch (e.g. until a param resolves).
export function useLakebaseData<T>(endpoint: string | null) {
  // Seed state from cache so the first render already has data (no flash).
  const cached = endpoint ? cache.get(endpoint) : undefined;
  const [data, setData] = useState<T[]>((cached?.data as T[]) ?? []);
  const [source, setSource] = useState<DataSource>(cached ? cached.source : "loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;

    // If cache is fresh, skip the fetch entirely.
    const entry = cache.get(endpoint);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      setData(entry.data as T[]);
      setSource(entry.source);
      return;
    }

    // Stale or missing — fetch in the background. If stale data exists
    // we keep showing it (no "loading" flash); otherwise show skeleton.
    if (!entry) setSource("loading");

    let cancelled = false;
    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const newData: T[] = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
        const newSource: DataSource = json.source === "live" ? "live" : "mock";
        cache.set(endpoint, { data: newData, source: newSource, timestamp: Date.now() });
        setData(newData);
        setSource(newSource);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
        if (!entry) setSource("mock");
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
