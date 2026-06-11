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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="group" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="avgCost" name="Avg Custo Real" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="avgAttr" name="Avg Atratividade" stroke="var(--chart-4)" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
