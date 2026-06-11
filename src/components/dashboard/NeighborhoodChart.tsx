import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAirbnb } from "@/lib/airbnb/context";

export function NeighborhoodChart() {
  const { filtered } = useAirbnb();

  const data = useMemo(() => {
    const map = new Map<string, { sumCost: number; sumAttr: number; n: number }>();
    for (const r of filtered) {
      const g = r.neighbourhood_group;
      const a = map.get(g) ?? { sumCost: 0, sumAttr: 0, n: 0 };
      a.sumCost += r.custo_real;
      a.sumAttr += r.taxa_atratividade;
      a.n += 1;
      map.set(g, a);
    }
    return Array.from(map.entries())
      .map(([group, v]) => ({
        group,
        avgCost: v.sumCost / v.n,
        avgAttr: v.sumAttr / v.n,
        listings: v.n,
      }))
      .sort((a, b) => b.avgCost - a.avgCost);
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custo Real vs Taxa de Atratividade</CardTitle>
        <CardDescription>Comparação por neighborhood group</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="group"
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(20, 16, 40, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                fontSize: 12,
                color: "white",
              }}
              formatter={(value: number, name: string) => {
                if (name === "Avg Custo Real")
                  return [
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(value),
                    name,
                  ];
                if (name === "Avg Atratividade") return [value.toFixed(2), name];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }} />
            <Bar yAxisId="left" dataKey="avgCost" name="Avg Custo Real" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="avgAttr" name="Avg Atratividade" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: "#22d3ee" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
