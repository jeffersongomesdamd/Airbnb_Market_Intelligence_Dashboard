import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, Gauge, Star } from "lucide-react";
import { useAirbnb } from "@/lib/airbnb/context";

const fmtN = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function MetricCards() {
  const { filtered } = useAirbnb();
  const stats = useMemo(() => {
    const n = filtered.length || 1;
    const sum = filtered.reduce(
      (a, r) => {
        a.cost += r.custo_real;
        a.eff += r.fator_eficiencia;
        a.rating += r.review_scores_rating;
        return a;
      },
      { cost: 0, eff: 0, rating: 0 },
    );
    return {
      total: filtered.length,
      avgCost: sum.cost / n,
      avgEff: sum.eff / n,
      avgRating: sum.rating / n,
    };
  }, [filtered]);

  const items = [
    { label: "Total Listings", value: fmtN(stats.total), icon: Building2, accent: "from-chart-1/20" },
    { label: "Avg Custo Real", value: fmtUSD(stats.avgCost), icon: DollarSign, accent: "from-chart-2/20" },
    { label: "Avg Fator Eficiência", value: stats.avgEff.toFixed(4), icon: Gauge, accent: "from-chart-3/20" },
    { label: "Avg Review Score", value: stats.avgRating.toFixed(2), icon: Star, accent: "from-chart-4/20" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="relative overflow-hidden">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${it.accent} to-transparent opacity-60`} />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {it.label}
            </CardTitle>
            <it.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-semibold tabular-nums tracking-tight">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
