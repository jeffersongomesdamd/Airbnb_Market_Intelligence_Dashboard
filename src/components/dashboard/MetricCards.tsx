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
    const n = filtered.length;
    if (n === 0) {
      return { total: 0, avgCost: 0, avgEff: 0, avgRating: 0 };
    }
    const sum = filtered.reduce(
      (a, r) => {
        a.cost += Number.isFinite(r.custo_real) ? r.custo_real : 0;
        a.eff += Number.isFinite(r.fator_eficiencia) ? r.fator_eficiencia : 0;
        a.rating += Number.isFinite(r.review_scores_rating) ? r.review_scores_rating : 0;
        return a;
      },
      { cost: 0, eff: 0, rating: 0 },
    );
    const safe = (v: number) => (Number.isFinite(v) ? v : 0);
    return {
      total: n,
      avgCost: safe(sum.cost / n),
      avgEff: safe(sum.eff / n),
      avgRating: safe(sum.rating / n),
    };
  }, [filtered]);

  const items = [
    { label: "Total Listings", value: fmtN(stats.total), icon: Building2, grad: "from-violet-500/30 via-fuchsia-500/10" },
    { label: "Avg Custo Real", value: fmtUSD(stats.avgCost), icon: DollarSign, grad: "from-fuchsia-500/30 via-pink-500/10" },
    { label: "Avg Fator Eficiência", value: stats.avgEff.toFixed(4), icon: Gauge, grad: "from-cyan-400/30 via-violet-500/10" },
    { label: "Avg Review Score", value: stats.avgRating.toFixed(2), icon: Star, grad: "from-amber-300/30 via-pink-500/10" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="relative overflow-hidden">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${it.grad} to-transparent`} />
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 opacity-20 blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {it.label}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30">
              <it.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-3xl font-semibold tabular-nums tracking-tight text-transparent">
              {it.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
