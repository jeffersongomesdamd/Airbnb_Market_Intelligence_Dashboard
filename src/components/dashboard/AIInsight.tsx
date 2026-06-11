import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAirbnb } from "@/lib/airbnb/context";

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function AIInsight() {
  const { filtered } = useAirbnb();

  const insight = useMemo(() => {
    if (filtered.length === 0) return "Sem dados suficientes para gerar insights.";

    const byGroup = new Map<string, { cost: number; attr: number; n: number }>();
    for (const r of filtered) {
      const g = r.neighbourhood_group;
      const a = byGroup.get(g) ?? { cost: 0, attr: 0, n: 0 };
      a.cost += r.custo_real;
      a.attr += r.taxa_atratividade;
      a.n += 1;
      byGroup.set(g, a);
    }
    const groups = Array.from(byGroup.entries()).map(([g, v]) => ({
      group: g,
      avgCost: v.cost / v.n,
      avgAttr: v.attr / v.n,
      listings: v.n,
    }));
    if (groups.length === 0) return "Sem dados suficientes.";

    const topCost = [...groups].sort((a, b) => b.avgCost - a.avgCost)[0];
    const topAttr = [...groups].sort((a, b) => b.avgAttr - a.avgAttr)[0];
    const biggest = [...groups].sort((a, b) => b.listings - a.listings)[0];

    if (topCost.group === topAttr.group) {
      return `${topCost.group} concentra o maior custo real médio (${fmtUSD(
        topCost.avgCost,
      )}) e também lidera em atratividade (${topAttr.avgAttr.toFixed(2)}). ${biggest.group} é a região com maior volume, com ${biggest.listings.toLocaleString()} listings ativos.`;
    }
    return `${topCost.group} apresenta o maior custo real (${fmtUSD(
      topCost.avgCost,
    )}), porém ${topAttr.group} possui taxa de atratividade superior (${topAttr.avgAttr.toFixed(
      2,
    )}). ${biggest.group} domina em volume com ${biggest.listings.toLocaleString()} listings.`;
  }, [filtered]);

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-transparent to-pink-500/20" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 opacity-30 blur-3xl" />
      <CardContent className="relative flex gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/40">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text text-xs font-semibold uppercase tracking-[0.18em] text-transparent">
            Resumo da IA
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{insight}</p>
        </div>
      </CardContent>
    </Card>
  );
}
