import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAirbnb } from "@/lib/airbnb/context";

interface HostAgg {
  host_id: string;
  host_name: string;
  listings: number;
  avgCost: number;
  avgAttr: number;
  fator_eficiencia: number;
}

type SortKey = keyof Pick<HostAgg, "listings" | "avgCost" | "avgAttr" | "fator_eficiencia">;

const PAGE_SIZE = 10;

export function HostTable() {
  const { filtered } = useAirbnb();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fator_eficiencia");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const hosts = useMemo<HostAgg[]>(() => {
    const map = new Map<string, { name: string; n: number; cost: number; attr: number; eff: number }>();
    for (const r of filtered) {
      // Coerção defensiva: host_id pode vir como número de fontes externas
      const key = r.host_id != null ? String(r.host_id) : "unknown";
      const safeName = r.host_name ? String(r.host_name) : "Unknown";
      const a = map.get(key) ?? { name: safeName, n: 0, cost: 0, attr: 0, eff: 0 };
      a.n += 1;
      a.cost += Number.isFinite(r.custo_real) ? r.custo_real : 0;
      a.attr += Number.isFinite(r.taxa_atratividade) ? r.taxa_atratividade : 0;
      a.eff += Number.isFinite(r.fator_eficiencia) ? r.fator_eficiencia : 0;
      if ((!a.name || a.name === "Unknown") && r.host_name) a.name = String(r.host_name);
      map.set(key, a);
    }
    return Array.from(map.entries()).map(([host_id, v]) => ({
      host_id,
      host_name: v.name,
      listings: v.n,
      avgCost: v.n > 0 ? v.cost / v.n : 0,
      avgAttr: v.n > 0 ? v.attr / v.n : 0,
      fator_eficiencia: v.n > 0 ? v.eff / v.n : 0,
    }));
  }, [filtered]);

  const debouncedQuery = useDebounce(query, 250);

  const filteredSorted = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const arr = q
      ? hosts.filter((h) => {
          if (!h) return false;
          const id = String(h.host_id ?? "").toLowerCase();
          const name = String(h.host_name ?? "").toLowerCase();
          return id.includes(q) || name.includes(q);
        })
      : hosts;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => (a[sortKey] - b[sortKey]) * sign);
  }, [hosts, debouncedQuery, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filteredSorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const headerBtn = (label: string, key: SortKey) => {
    const active = sortKey === key;
    const Icon = active ? (sortDir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
    return (
      <button
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (active) setSortDir(sortDir === "desc" ? "asc" : "desc");
          else {
            setSortKey(key);
            setSortDir("desc");
          }
          setPage(0);
        }}
      >
        {label} <Icon className="h-3 w-3" />
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Top Hosts</CardTitle>
          <CardDescription>Performance agregada por anfitrião</CardDescription>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search host ID or name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host</TableHead>
                <TableHead>{headerBtn("Listings", "listings")}</TableHead>
                <TableHead>{headerBtn("Avg Custo", "avgCost")}</TableHead>
                <TableHead>{headerBtn("Avg Atrat.", "avgAttr")}</TableHead>
                <TableHead>{headerBtn("Fator Eficiência", "fator_eficiencia")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No hosts match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((h) => (
                  <TableRow key={h.host_id}>
                    <TableCell>
                      <div className="font-medium">{h.host_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{h.host_id}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{h.listings}</TableCell>
                    <TableCell className="tabular-nums">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(h.avgCost)}
                    </TableCell>
                    <TableCell className="tabular-nums">{h.avgAttr.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums font-semibold text-chart-2">
                      {h.fator_eficiencia.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredSorted.length.toLocaleString()} hosts · Page {current + 1} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
