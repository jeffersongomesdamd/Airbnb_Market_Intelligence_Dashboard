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

const fmtUSD0 = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function PriceDistributionChart() {
  const { filtered } = useAirbnb();

  const data = useMemo(() => {
    if (filtered.length === 0) return [];
    const costs = filtered.map((r) => r.custo_real).filter((n) => n > 0);
    if (costs.length === 0) return [];
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const bins = 32;
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
      <CardContent className="h-[360px] px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                <stop offset="60%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              tickMargin={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={36}
              tickMargin={4}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-2)", strokeOpacity: 0.3 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [v.toLocaleString(), "Listings"]}
              labelFormatter={(v) => `~${fmtUSD0(Number(v))}`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              fill="url(#gradPrice)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
