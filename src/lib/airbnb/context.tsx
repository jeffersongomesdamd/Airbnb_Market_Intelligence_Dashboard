import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AirbnbRow, Filters } from "@/types/airbnb";
import { loadAirbnbCSV } from "./parse";

interface DataState {
  rows: AirbnbRow[];
  filtered: AirbnbRow[];
  loading: boolean;
  error: string | null;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  bounds: {
    priceMin: number;
    priceMax: number;
    roomTypes: string[];
    groups: string[];
  };
}

const Ctx = createContext<DataState | null>(null);

export function AirbnbDataProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<AirbnbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>({
    roomTypes: [],
    neighbourhoodGroups: [],
    priceRange: [0, 100000],
  });

  useEffect(() => {
    let cancelled = false;
    loadAirbnbCSV()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        const costs = data.map((r) => r.custo_real).filter((n) => Number.isFinite(n));
        const min = costs.length ? Math.floor(Math.min(...costs)) : 0;
        const max = costs.length ? Math.ceil(Math.max(...costs)) : 100000;
        setFiltersState((f) => ({ ...f, priceRange: [min, max] }));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bounds = useMemo(() => {
    const costs = rows.map((r) => r.custo_real).filter((n) => Number.isFinite(n));
    const priceMin = costs.length ? Math.floor(Math.min(...costs)) : 0;
    const priceMax = costs.length ? Math.ceil(Math.max(...costs)) : 100000;
    const roomTypes = Array.from(new Set(rows.map((r) => r.room_type))).sort();
    const groups = Array.from(new Set(rows.map((r) => r.neighbourhood_group))).sort();
    return { priceMin, priceMax, roomTypes, groups };
  }, [rows]);

  const filtered = useMemo(() => {
    const { roomTypes, neighbourhoodGroups, priceRange } = filters;
    const [min, max] = priceRange;
    return rows.filter(
      (r) =>
        (roomTypes.length === 0 || roomTypes.includes(r.room_type)) &&
        (neighbourhoodGroups.length === 0 || neighbourhoodGroups.includes(r.neighbourhood_group)) &&
        r.custo_real >= min &&
        r.custo_real <= max,
    );
  }, [rows, filters]);

  const setFilters = (f: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...f }));

  const value: DataState = { rows, filtered, loading, error, filters, setFilters, bounds };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAirbnb() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAirbnb must be used inside AirbnbDataProvider");
  return ctx;
}
