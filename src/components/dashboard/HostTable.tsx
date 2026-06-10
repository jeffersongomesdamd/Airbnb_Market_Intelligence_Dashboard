import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
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
      const key = r.host_id || "unknown";
      const a = map.get(key) ?? { name: r.host_name ?? "Unknown", n: 0, cost: 0, attr: 0, eff: 0 };
      a.n += 1;
      a.cost += r.custo_real;
      a.attr += r.taxa_atratividade;
      a.eff += r.fator_eficiencia;
      if (!a.name || a.name === "Unknown") a.name = r.host_name ?? a.name;
      map.set(key, a);
    }
    return Array.from(map.entries()).map(([host_id, v]) => ({
      host_id,
      host_name: v.name,
      listings: v.n,
      avgCost: v.cost / v.n,
      avgAttr: v.attr / v.n,
      fator_eficiencia: v.eff / v.n,
    }));
  }, [filtered]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? hosts.filter(
          (h) => h.host_id.toLowerCase().includes(q) || h.host_name.toLowerCase().includes(q),
        )
      : hosts;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => (a[sortKey] - b[sortKey]) * sign);
  }, [hosts, query, sortKey, sortDir]);

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
                    <TableCell className="tabular-nums">${h.avgCost.toFixed(0)}</TableCell>
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
