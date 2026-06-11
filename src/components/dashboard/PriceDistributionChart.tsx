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
                <stop offset="0%" stopColor="#d946ef" stopOpacity={0.6} />
                <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokePrice" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              tickMargin={6}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
              width={36}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "#ec4899", strokeOpacity: 0.4 }}
              contentStyle={{
                background: "rgba(20, 16, 40, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                fontSize: 12,
                color: "white",
              }}
              formatter={(v: number) => [v.toLocaleString(), "Listings"]}
              labelFormatter={(v) => `~${fmtUSD0(Number(v))}`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="url(#strokePrice)"
              fill="url(#gradPrice)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
