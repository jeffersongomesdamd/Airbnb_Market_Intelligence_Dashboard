import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAirbnb } from "@/lib/airbnb/context";

export function PriceDistributionChart() {
  const { filtered } = useAirbnb();

  const data = useMemo(() => {
    if (filtered.length === 0) return [];
    const costs = filtered.map((r) => r.custo_real).filter((n) => n > 0);
    if (costs.length === 0) return [];
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const bins = 24;
    const step = (max - min) / bins || 1;
    const buckets = Array.from({ length: bins }, (_, i) => ({
      bin: Math.round(min + step * i),
      count: 0,
    }));
    for (const c of costs) {
      const idx = Math.min(bins - 1, Math.floor((c - min) / step));
      buckets[idx].count += 1;
    }
    return buckets;
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Custo Real</CardTitle>
        <CardDescription>Volume de listings por faixa de custo real (USD)</CardDescription>
      </CardHeader>
      <CardContent className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="bin" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [v.toLocaleString(), "Listings"]}
              labelFormatter={(v) => `~$${Number(v).toLocaleString()}`}
            />
            <Area type="monotone" dataKey="count" stroke="var(--chart-1)" fill="url(#gradPrice)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
