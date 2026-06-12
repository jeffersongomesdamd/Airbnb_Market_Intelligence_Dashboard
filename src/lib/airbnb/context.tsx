import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AirbnbRow, Filters } from "@/types/airbnb";
import { loadAirbnbCSV } from "./parse";

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Bounds {
  priceMin: number;
  priceMax: number;
  roomTypes: string[];
  groups: string[];
}

interface DataState {
  rows: AirbnbRow[];
  filtered: AirbnbRow[];
  loading: boolean;
  error: string | null;
  parseWarnings: string[]; // ← observabilidade: erros não-fatais surfaceados
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  bounds: Bounds;
}

const DEFAULT_PRICE_RANGE: [number, number] = [0, 100_000];

const DEFAULT_FILTERS: Filters = {
  roomTypes: [],
  neighbourhoodGroups: [],
  priceRange: DEFAULT_PRICE_RANGE,
};

// ─── Context ───────────────────────────────────────────────────────────────────
const Ctx = createContext<DataState | null>(null);

// ─── Utilitário: min/max sem spread (seguro para arrays grandes) ───────────────
function safeMinMax(values: number[]): [number, number] {
  if (values.length === 0) return DEFAULT_PRICE_RANGE;
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  return [Math.floor(min), Math.ceil(max)];
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AirbnbDataProvider({ children }: { children: ReactNode }) {
  const MODULE = "[AirbnbDataProvider]";

  const [rows, setRows] = useState<AirbnbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);

  // Estabiliza a referência de setFilters entre renders
  const setFilters = useCallback((f: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...f })), []);

  useEffect(() => {
    const MODULE_EFFECT = `${MODULE}[useEffect]`;
    let cancelled = false;

    (async () => {
      try {
        const { rows: data, errors } = await loadAirbnbCSV();
        if (cancelled) return;

        setRows(data);

        // Surfaceia avisos de parsing sem travar a UI
        if (errors.length > 0) {
          setParseWarnings(errors);
          console.warn(`${MODULE_EFFECT} Avisos de parsing:`, errors);
        }

        // Usa safeMinMax para não explodir a call stack
        const costs = data.map((r) => r.custo_real).filter((n): n is number => Number.isFinite(n));
        const [min, max] = safeMinMax(costs);

        setFiltersState((f) => ({ ...f, priceRange: [min, max] }));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : `${MODULE_EFFECT} Erro desconhecido ao carregar CSV`;
        console.error(`${MODULE_EFFECT}`, err);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // bounds: calcula uma única vez quando rows muda
  // safeMinMax evita RangeError em datasets grandes
  const bounds = useMemo<Bounds>(() => {
    try {
      const costs = rows.map((r) => r.custo_real).filter((n): n is number => Number.isFinite(n));

      const [priceMin, priceMax] = safeMinMax(costs);

      const roomTypes = Array.from(new Set(rows.map((r) => r.room_type)))
        .filter(Boolean)
        .sort();

      const groups = Array.from(new Set(rows.map((r) => r.neighbourhood_group)))
        .filter(Boolean)
        .sort();

      return { priceMin, priceMax, roomTypes, groups };
    } catch (err) {
      console.error(`${MODULE}[bounds]`, err);
      return { priceMin: 0, priceMax: 100_000, roomTypes: [], groups: [] };
    }
  }, [rows]);

  // filtered: guard de tipo garante que custo_real seja número finito
  const filtered = useMemo(() => {
    try {
      const { roomTypes, neighbourhoodGroups, priceRange } = filters;
      const [min, max] = priceRange;

      return rows.filter((r) => {
        if (!Number.isFinite(r.custo_real)) return false;
        return (
          (roomTypes.length === 0 || roomTypes.includes(r.room_type)) &&
          (neighbourhoodGroups.length === 0 || neighbourhoodGroups.includes(r.neighbourhood_group)) &&
          r.custo_real >= min &&
          r.custo_real <= max
        );
      });
    } catch (err) {
      console.error(`${MODULE}[filtered]`, err);
      return [];
    }
  }, [rows, filters]);

  const value: DataState = {
    rows,
    filtered,
    loading,
    error,
    parseWarnings,
    filters,
    setFilters,
    bounds,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAirbnb() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAirbnb must be used inside AirbnbDataProvider");
  return ctx;
}
