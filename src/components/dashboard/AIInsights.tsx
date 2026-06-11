import { useMemo } from "react";
import { Sparkles, TrendingUp, TrendingDown, Gauge, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAirbnb } from "@/lib/airbnb/context";
import type { AirbnbRow } from "@/types/airbnb";

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);

interface GroupAgg {
  group: string;
  listings: number;
  avgCost: number;
  avgAttr: number;
  avgEff: number;
}

interface Insight {
  id: string;
  icon: typeof Sparkles;
  tone: "violet" | "pink" | "cyan" | "amber";
  title: string;
  body: string;
}

function aggregateByGroup(rows: AirbnbRow[]): GroupAgg[] {
  const map = new Map<string, { cost: number; attr: number; eff: number; n: number }>();
  for (const r of rows) {
    const a = map.get(r.neighbourhood_group) ?? { cost: 0, attr: 0, eff: 0, n: 0 };
    a.cost += r.custo_real;
    a.attr += r.taxa_atratividade;
    a.eff += r.fator_eficiencia;
    a.n += 1;
    map.set(r.neighbourhood_group, a);
  }
  return Array.from(map.entries()).map(([group, v]) => ({
    group,
    listings: v.n,
    avgCost: v.cost / v.n,
    avgAttr: v.attr / v.n,
    avgEff: v.eff / v.n,
  }));
}

function aggregateByRoomType(rows: AirbnbRow[]): { type: string; share: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.room_type, (map.get(r.room_type) ?? 0) + 1);
  const total = rows.length || 1;
  return Array.from(map.entries())
    .map(([type, n]) => ({ type, share: n / total }))
    .sort((a, b) => b.share - a.share);
}

function buildInsights(rows: AirbnbRow[]): Insight[] {
  if (rows.length === 0) return [];
  const groups = aggregateByGroup(rows);
  if (groups.length === 0) return [];

  const topCost = [...groups].sort((a, b) => b.avgCost - a.avgCost)[0];
  const lowCost = [...groups].sort((a, b) => a.avgCost - b.avgCost)[0];
  const topAttr = [...groups].sort((a, b) => b.avgAttr - a.avgAttr)[0];
  const topEff = [...groups].sort((a, b) => b.avgEff - a.avgEff)[0];
  const biggest = [...groups].sort((a, b) => b.listings - a.listings)[0];
  const roomShare = aggregateByRoomType(rows)[0];

  const headline: Insight =
    topCost.group === topAttr.group
      ? {
          id: "headline",
          icon: Sparkles,
          tone: "violet",
          title: "Mercado dominado por um polo",
          body: `${topCost.group} concentra o maior custo real médio (${fmtUSD(
            topCost.avgCost,
          )}) e também lidera em atratividade (${fmtNum(topAttr.avgAttr)}).`,
        }
      : {
          id: "headline",
          icon: Sparkles,
          tone: "violet",
          title: "Custo e atratividade descolados",
          body: `${topCost.group} apresenta o maior custo real (${fmtUSD(
            topCost.avgCost,
          )}), porém ${topAttr.group} possui taxa de atratividade superior (${fmtNum(
            topAttr.avgAttr,
          )}).`,
        };

  const insights: Insight[] = [headline];

  insights.push({
    id: "efficiency",
    icon: Gauge,
    tone: "cyan",
    title: "Melhor relação atratividade/custo",
    body: `${topEff.group} lidera em fator de eficiência (${fmtNum(
      topEff.avgEff,
      4,
    )}), oferecendo o melhor retorno percebido por dólar investido.`,
  });

  if (lowCost.group !== topCost.group) {
    const spread = topCost.avgCost - lowCost.avgCost;
    insights.push({
      id: "spread",
      icon: TrendingDown,
      tone: "amber",
      title: "Maior oportunidade de entrada",
      body: `${lowCost.group} tem o menor custo médio (${fmtUSD(
        lowCost.avgCost,
      )}), um spread de ${fmtUSD(spread)} abaixo de ${topCost.group}.`,
    });
  }

  insights.push({
    id: "volume",
    icon: Building2,
    tone: "pink",
    title: "Concentração de oferta",
    body: `${biggest.group} domina em volume com ${biggest.listings.toLocaleString(
      "pt-BR",
    )} listings ativos${
      roomShare
        ? `, e ${roomShare.type} representa ${fmtNum(roomShare.share * 100, 1)}% da amostra`
        : ""
    }.`,
  });

  return insights;
}

const toneStyles: Record<Insight["tone"], { ring: string; icon: string; chip: string }> = {
  violet: {
    ring: "from-violet-500/25 to-fuchsia-500/15",
    icon: "from-violet-500 to-fuchsia-500 shadow-violet-500/40",
    chip: "from-violet-300 to-fuchsia-300",
  },
  pink: {
    ring: "from-pink-500/25 to-rose-500/15",
    icon: "from-pink-500 to-rose-500 shadow-pink-500/40",
    chip: "from-pink-300 to-rose-300",
  },
  cyan: {
    ring: "from-cyan-500/25 to-sky-500/15",
    icon: "from-cyan-500 to-sky-500 shadow-cyan-500/40",
    chip: "from-cyan-300 to-sky-300",
  },
  amber: {
    ring: "from-amber-400/25 to-orange-500/15",
    icon: "from-amber-400 to-orange-500 shadow-amber-500/40",
    chip: "from-amber-200 to-orange-300",
  },
};

export function AIInsights() {
  const { filtered } = useAirbnb();
  const insights = useMemo(() => buildInsights(filtered), [filtered]);

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Sem dados suficientes para gerar insights com os filtros atuais.
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="Resumo da IA" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/40">
          <Sparkles className="h-4 w-4" />
        </div>
        <h2 className="bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text text-xs font-semibold uppercase tracking-[0.18em] text-transparent">
          Resumo da IA · {insights.length} insights
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((it) => {
          const Icon = it.icon;
          const tone = toneStyles[it.tone];
          return (
            <Card key={it.id} className="relative overflow-hidden">
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.ring}`}
              />
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${tone.icon} opacity-25 blur-3xl`}
              />
              <CardContent className="relative flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone.icon} text-white shadow-lg`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`bg-gradient-to-r ${tone.chip} bg-clip-text text-[10px] font-semibold uppercase tracking-[0.18em] text-transparent`}
                  >
                    Insight
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold leading-tight text-foreground">
                    {it.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/80">{it.body}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// Backwards-compat: legacy single-card import.
export { AIInsights as AIInsight };
// Silence unused-symbol warning for TrendingUp (reserved for future deltas).
void TrendingUp;
