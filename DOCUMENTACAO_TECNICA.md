# Documentação Técnica — Real Estate Market Intelligence Dashboard

> Painel interativo de inteligência de mercado imobiliário construído sobre o
> dataset *Airbnb Open Data*. Este documento descreve o estado atual do
> projeto: arquitetura, fórmulas de negócio, sistema visual e decisões de
> performance. Lê-lo deve ser suficiente para qualquer desenvolvedor (ou
> agente de IA em nova sessão) operar e estender o código com confiança.

---

## 1. Stack & runtime

| Camada       | Tecnologia                                                     |
| ------------ | -------------------------------------------------------------- |
| Framework    | **TanStack Start v1** (React 19 + Vite 7, SSR-ready)           |
| Roteamento   | TanStack Router file-based (`src/routes/`, `__root.tsx`)       |
| Estado server| TanStack Query (provider em `__root.tsx`)                      |
| UI           | **Tailwind CSS v4** (via `src/styles.css`) + **shadcn/ui**     |
| Gráficos     | **Recharts** (`AreaChart`, `ComposedChart`)                    |
| Ícones       | `lucide-react`                                                 |
| Tipos        | TypeScript estrito                                             |

Não há backend ativo: o dataset é embarcado como constante TypeScript
(`src/lib/airbnb/data.ts`), eliminando 404 e dependências de fetch.

---

## 2. Estrutura de pastas relevante

```
src/
├── routes/
│   ├── __root.tsx              # shell HTML, fontes Inter, dark mode, QueryClient
│   └── index.tsx               # página única do dashboard (tabs Overview/Bairros/Hosts)
├── components/
│   ├── dashboard/
│   │   ├── DashboardSidebar.tsx       # filtros (room type, group, slider de custo)
│   │   ├── MetricCards.tsx            # 4 KPIs agregados com glow
│   │   ├── AIInsight.tsx              # "Resumo da IA" determinístico
│   │   ├── PriceDistributionChart.tsx # AreaChart com gradiente
│   │   ├── NeighborhoodChart.tsx      # ComposedChart (Bar + Line, dual axis)
│   │   ├── HostTable.tsx              # tabela paginada, ordenável, com debounce
│   │   ├── DashboardSkeleton.tsx      # skeletons de loading
│   │   └── DataError.tsx              # boundary visual de erro
│   └── ui/                            # primitives shadcn
├── lib/airbnb/
│   ├── data.ts                 # AIRBNB_DATA: AirbnbRow[] (~2.500 linhas embarcadas)
│   ├── parse.ts                # loadAirbnbCSV() → retorna a constante
│   └── context.tsx             # AirbnbDataProvider + useAirbnb (filtros + bounds)
├── hooks/
│   └── use-debounce.ts         # debounce genérico para busca
├── types/airbnb.ts             # AirbnbRow, Filters
└── styles.css                  # tokens dark navy + util `.glass`
```

---

## 3. Fluxo de dados

```text
data.ts (AIRBNB_DATA const)
   │
   ▼
parse.ts ── loadAirbnbCSV() ──► AirbnbDataProvider (context)
                                    │
                                    │ rows, filtered, bounds, filters, setFilters
                                    ▼
                          useAirbnb() (consumido por TODOS os componentes)
                                    │
        ┌──────────────┬────────────┼────────────┬───────────────┐
        ▼              ▼            ▼            ▼               ▼
   Sidebar       MetricCards   AIInsight    Charts          HostTable
   (escreve)     (lê filtered) (lê filtered)(lê filtered)   (lê filtered)
```

- **Fonte única de verdade**: `AirbnbDataProvider` mantém `rows` (imutável após
  carga) e deriva `filtered` via `useMemo` sempre que `filters` mudam.
- **`bounds`** (min/max de custo, room types únicos, groups únicos) é derivado
  uma vez e usado para popular o Sidebar dinamicamente.
- **Sem fetch, sem rede**: `loadAirbnbCSV()` apenas retorna a constante embutida.
  Isso elimina ciclos de loading reais; o skeleton aparece somente no primeiro
  microtask antes do `useEffect` resolver.

---

## 4. Modelo de dados (`src/types/airbnb.ts`)

```ts
interface AirbnbRow {
  id, name, host_id, host_name,
  neighbourhood_group, neighbourhood,
  lat, long, room_type,
  price, service_fee,
  minimum_nights, number_of_reviews,
  last_review, reviews_per_month,
  calculated_host_listings_count,
  availability_365, review_scores_rating,
  instant_bookable,

  // Campos engineered (já calculados em data.ts)
  custo_real: number;
  taxa_atratividade: number;
  fator_eficiencia: number;
}
```

```ts
interface Filters {
  roomTypes: string[];              // se vazio → sem filtro
  neighbourhoodGroups: string[];    // se vazio → sem filtro
  priceRange: [number, number];     // aplicado sobre custo_real
}
```

---

## 5. Fórmulas de negócio

As métricas engineered são **pré-calculadas** durante a geração de
`src/lib/airbnb/data.ts` (pipeline Python offline). `parse.ts` apenas as
expõe; **nenhum cálculo pesado roda em runtime**. As definições canônicas são:

| Campo               | Fórmula                                                              | Significado |
| ------------------- | -------------------------------------------------------------------- | ----------- |
| `custo_real`        | `(price + service_fee) * minimum_nights`                             | Desembolso real mínimo de uma estadia (preço diário + taxa de serviço, multiplicado pela noite mínima exigida). |
| `taxa_atratividade` | `reviews_per_month * (review_scores_rating / 5)`                     | Combina volume de reviews recentes com a qualidade percebida (0–5 normalizado). Quanto maior, mais atrativa a listagem. |
| `fator_eficiencia`  | `taxa_atratividade / max(custo_real, 1)`                             | "Atratividade por dólar investido". Métrica-chave do `HostTable` (ordenação default desc) e do dashboard como um todo. |

Tratamento de bordas aplicado no pipeline:
- Strings monetárias com `$` e `,` são normalizadas para `number`.
- `availability_365` é clampado em `[0, 365]`.
- Typos comuns em `neighbourhood_group` são corrigidos (ex.: *brookln* → *Brooklyn*).
- Linhas sem `price` ou `minimum_nights` válidos são descartadas.
- Amostragem final: **2.500 linhas** (suficiente para gráficos sem travar o bundle).

Agregações em runtime (calculadas no cliente, com `useMemo`):

```ts
// MetricCards
avgCost  = Σ custo_real        / n
avgEff   = Σ fator_eficiencia  / n
avgRating= Σ review_scores_rating / n

// NeighborhoodChart (por neighbourhood_group)
avgCost  = Σ custo_real        / n_grupo
avgAttr  = Σ taxa_atratividade / n_grupo
listings = n_grupo

// HostTable (por host_id)
avgCost           = Σ custo_real        / listings_host
avgAttr           = Σ taxa_atratividade / listings_host
fator_eficiencia  = Σ fator_eficiencia  / listings_host  (média da métrica linha-a-linha)
```

---

## 6. Filtros (Sidebar)

- **Room Type**: checkboxes; toggle simples sobre `filters.roomTypes`.
- **Neighborhood Group**: checkboxes idem.
- **Custo Real**: `Slider` de duas pontas vinculado a `filters.priceRange`.
  `step = max(1, round((max - min) / 200))` para sensibilidade constante
  independente da amplitude.
- O Sidebar é **dinâmico**: opções vêm de `bounds`, derivado de `rows`.

A função `filtered` aplica os três filtros combinados (`AND`). Listas vazias
significam "sem restrição" naquela dimensão.

---

## 7. Visualizações

### 7.1 `PriceDistributionChart` (AreaChart)
- Histograma de **32 bins** sobre `custo_real`.
- `linearGradient #gradPrice` (vertical): magenta (`#d946ef` α 0.6) → violeta
  (`#8b5cf6` α 0.2) → transparente. Dá o efeito *premium* abaixo da curva.
- `linearGradient #strokePrice` (horizontal): violeta → rosa, aplicado no
  `stroke` para dar transição cromática à linha.
- Tooltip com `backdrop-filter: blur(10px)` sobre fundo navy translúcido.
- Padding lateral reduzido (`px-2 pb-2`) para ocupar o card.

### 7.2 `NeighborhoodChart` (ComposedChart, dual axis)
- **Barras** (eixo esquerdo): `avgCost` por grupo, com `linearGradient #barGrad`
  (rosa → violeta vertical) e cantos arredondados.
- **Linha** (eixo direito): `avgAttr`, cor `#22d3ee` (ciano), `strokeWidth=3`.
- Eixos com `axisLine` quase invisível (`rgba(255,255,255,0.08)`) e
  `tickLine={false}` para o efeito "linhas finas e suaves".
- Formatação USD via `Intl.NumberFormat` no `tooltip.formatter`.

### 7.3 `MetricCards`
- 4 KPIs: Total Listings, Avg Custo Real, Avg Fator Eficiência, Avg Review Score.
- Cada card: gradiente radial sutil + "blob" desfocado (`blur-2xl`) no canto
  superior direito + ícone em pílula `bg-gradient-to-br from-violet-500 to-pink-500`
  com `shadow-fuchsia-500/30`.
- Valor numérico renderizado com `bg-clip-text` sobre gradiente branco → cinza
  para efeito tipográfico.

### 7.4 `AIInsight`
Resumo determinístico (não chama LLM). Identifica:
- grupo com maior `avgCost`,
- grupo com maior `avgAttr`,
- grupo com maior volume de listings,

e produz uma frase contextual em pt-BR. Atualiza junto com `filtered`.

### 7.5 `HostTable`
- Agregação por `host_id` via `Map` (`O(n)`).
- Busca por nome/id com **debounce de 250 ms** (`useDebounce`).
- Ordenação client-side em 4 colunas, paginação de 10 por página.
- Formatação USD via `Intl.NumberFormat`.

---

## 8. Sistema visual ("Modern SaaS Dashboard")

### 8.1 Tema base
- Dark mode **forçado** via `<html className="dark">` no `RootShell`.
- Tipografia: **Inter** (Google Fonts) carregada nos `links` do `__root.tsx`;
  registrada como `--font-sans` em `@theme inline`.

### 8.2 Tokens (`src/styles.css`)
Paleta navy profunda + accents violeta/rosa em `oklch`:

```css
--background: oklch(0.16 0.035 270);          /* deep navy */
--primary:    oklch(0.72 0.22 320);           /* hot pink-magenta */
--card:       oklch(0.97 0.01 270 / 0.06);    /* translúcido p/ glass */
--chart-1:    oklch(0.65 0.25 295);           /* violet */
--chart-2:    oklch(0.72 0.24 340);           /* pink   */
--chart-3:    oklch(0.78 0.16 200);           /* cyan   */
--gradient-primary: linear-gradient(135deg, oklch(0.62 0.25 295), oklch(0.72 0.24 340));
--shadow-glow:      0 20px 60px -20px oklch(0.62 0.25 295 / 0.45);
```

### 8.3 Glassmorphism
Definido como utilitário Tailwind v4:

```css
@utility glass {
  background: linear-gradient(135deg,
    color-mix(in oklab, white 8%, transparent),
    color-mix(in oklab, white 3%, transparent));
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid color-mix(in oklab, white 14%, transparent);
}
```

Aplicado automaticamente a **todos os `Card`** via `src/components/ui/card.tsx`
(`"glass rounded-2xl ... shadow-xl shadow-black/20"`). O header sticky do
dashboard também usa `bg-background/40 backdrop-blur-xl`.

### 8.4 Background ambiente
`body` recebe **três radial-gradients sobrepostos** (violet/magenta/azul) sobre
o navy, com `background-attachment: fixed` — gera a sensação de "aurora" sem
custar repaint durante scroll.

### 8.5 Gradientes nos gráficos
Definidos via `<defs><linearGradient>` dentro de cada chart Recharts:
- `#gradPrice` / `#strokePrice` → área e linha do histograma.
- `#barGrad` → barras do `NeighborhoodChart`.
- Linha de atratividade em ciano puro para contraste com o eixo violeta/rosa.

---

## 9. Performance

| Decisão                                                                 | Motivo |
| ----------------------------------------------------------------------- | ------ |
| Dataset embarcado como constante (`data.ts`)                            | Zero rede, zero parse de CSV em runtime, zero risco de 404. |
| Pré-cálculo das fórmulas no pipeline offline                            | Render evita varreduras `O(n)` adicionais. |
| Amostragem para **2.500 linhas**                                        | Mantém gráficos fluidos e bundle JS gerenciável. |
| Todas as agregações em `useMemo([filtered])`                            | Recalculadas só quando filtros mudam. |
| `Map` em vez de `reduce` aninhado nas agregações por grupo/host         | `O(n)` em vez de `O(n·k)`. |
| **Debounce 250 ms** na busca de hosts                                   | Evita re-render por keystroke. |
| `ResponsiveContainer` único por chart                                   | Recharts cuida do resize sem listeners manuais. |
| Sem state global externo (Redux/Zustand)                                | `Context` simples basta; provider único evita re-render em cascata. |
| `useEffect` de carga com flag `cancelled`                               | Previne `setState` após unmount. |
| Skeletons (`DashboardSkeleton`) durante o microtask de boot             | Evita flash de layout vazio. |
| Tailwind v4 + tokens semânticos                                         | CSS otimizado em build, sem JIT runtime. |

---

## 10. Tratamento de erros

- **`AirbnbDataProvider`** captura falhas de `loadAirbnbCSV()` em `error`.
- **`DashboardBody`** (em `routes/index.tsx`) renderiza `DataError` quando
  `error` é truthy ou quando `rows.length === 0`.
- **`DataError`** usa o `Alert` variant `destructive` do shadcn — não quebra a UI.
- **Boundary global**: `ErrorComponent` em `__root.tsx` cobre exceções de render
  com botão *Try again* (`router.invalidate()` + `reset()`).

---

## 10b. Módulo de Insights (`AIInsights`)

A camada de "Inteligência de Negócio" é **100% determinística e client-side** —
nenhuma chamada a LLM, nenhum custo de inferência, nenhuma dependência de rede.
Toda a lógica vive em `src/components/dashboard/AIInsights.tsx` e consome
exclusivamente `filtered` exposto pelo `useAirbnb()`. Isso garante que os
insights reagem em tempo real aos filtros do Sidebar (room type, group, slider
de custo) sem precisar refazer requisições.

### 10b.1 Pipeline de análise

```text
filtered (AirbnbRow[])
    │
    ├── aggregateByGroup(rows)      → GroupAgg[] { group, listings, avgCost, avgAttr, avgEff }
    ├── aggregateByRoomType(rows)   → { type, share }[] ordenado desc
    │
    ▼
buildInsights(rows) → Insight[]     // headline + eficiência + spread + volume
    │
    ▼
useMemo([filtered])                 // recalcula só quando o filtro muda
    │
    ▼
Renderização: grid responsivo de Cards (glass + gradiente por tom)
```

### 10b.2 Regras de geração (`buildInsights`)

| Card           | Regra                                                                                  | Tom (cor) |
| -------------- | -------------------------------------------------------------------------------------- | --------- |
| **Headline**   | Compara o grupo de maior `avgCost` com o de maior `avgAttr`. Se coincidirem → narra "mercado dominado por um polo"; caso contrário → narra o descolamento entre preço e atratividade. | violet    |
| **Eficiência** | Destaca o grupo com maior `avgEff` (fator de eficiência = atratividade/custo).         | cyan      |
| **Spread**     | Só aparece quando `lowCost.group ≠ topCost.group`. Mostra o grupo mais barato e o spread (`topCost - lowCost`) como oportunidade de entrada. | amber     |
| **Volume**     | Maior `listings` + share dominante de `room_type` em pt-BR.                            | pink      |

Todas as strings são formatadas via `Intl.NumberFormat` (`fmtUSD`, `fmtNum`),
respeitando a convenção do projeto (nunca concatenar `"$" + n`).

### 10b.3 Estado vazio

Quando `filtered.length === 0` (ou a agregação por grupo fica vazia),
`buildInsights` retorna `[]` e o componente renderiza um único Card placeholder
("Sem dados suficientes para gerar insights com os filtros atuais"), evitando
seções colapsadas no layout.

### 10b.4 Visual

- Cabeçalho de seção com chip gradiente violeta→rosa + contador de insights.
- Grid responsivo: `grid md:grid-cols-2 xl:grid-cols-4`.
- Cada Card recebe um `tone` (violet / pink / cyan / amber) que mapeia para um
  trio `(ring background, icon gradient, chip gradient)` no objeto `toneStyles`.
  Adicionar um novo tom é trocar/estender essa lookup table.
- "Blob" desfocado (`blur-3xl`) no canto superior direito de cada card,
  consistente com o padrão visual dos `MetricCards`.

### 10b.5 Como estender o módulo

1. **Novo insight**: adicione uma nova função `aggregateByX(rows)` se precisar
   de uma agregação que ainda não exista, depois acrescente um `insights.push({...})`
   dentro de `buildInsights` com um `id` único, um `icon` (lucide-react), um
   `tone` válido e `title` + `body` já formatados.
2. **Nova métrica**: prefira derivá-la a partir de campos engineered já
   presentes em `AirbnbRow` (`custo_real`, `taxa_atratividade`,
   `fator_eficiencia`). Se precisar de algo novo, pré-compute no pipeline
   Python e declare em `types/airbnb.ts` — nunca calcule fórmulas pesadas em
   runtime aqui.
3. **Novo tom de cor**: adicione uma entrada em `toneStyles` e amplie o union
   `Insight["tone"]`. O TypeScript garante exaustividade.
4. **Trocar para LLM no futuro**: substitua `buildInsights` por uma chamada a
   um server function (`createServerFn`) que receba uma versão resumida das
   agregações e devolva o array `Insight[]`. O componente não precisa mudar.

### 10b.6 Performance

- Uma única passagem `O(n)` sobre `filtered` por agregação (`Map`-based).
- Tudo memoizado em `useMemo([filtered])` — zero recomputação durante scroll,
  resize ou troca de aba.
- Sem efeitos colaterais, sem `useEffect`, sem fetch — render puro.

---



- **Novo KPI**: adicione um item em `MetricCards.items` (calcule em `useMemo`
  sobre `filtered`).
- **Nova métrica engineered**: adicione no pipeline Python que gera
  `data.ts` e declare em `AirbnbRow`. Não calcule em runtime se a fórmula for
  pesada — pré-compute.
- **Novo filtro**: estenda `Filters` em `types/airbnb.ts`, adicione UI no
  `DashboardSidebar`, e aplique o predicado em `filtered` dentro do
  `AirbnbDataProvider`.
- **Nova aba**: adicione `<TabsTrigger>` + `<TabsContent>` em `routes/index.tsx`.
- **Novo gráfico**: replique o padrão de `PriceDistributionChart` (defs com
  gradiente, tooltip glass, eixos suaves, container `h-[...px]`).

---

## 12. Convenções a respeitar

- **Não use classes de cor cruas** (`text-white`, `bg-black`). Use tokens
  semânticos (`text-foreground`, `bg-card`, `text-muted-foreground`).
- **Cards sempre via `<Card>`** para herdar o efeito glass.
- **Formate dinheiro com `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`** — nunca concatene `"$" + n`.
- **Toda agregação derivada de `filtered`** deve estar em `useMemo` com
  dependência `[filtered]` (mais campos se aplicável).
- **Não reintroduzir `fetch` do CSV**: a fonte oficial é `AIRBNB_DATA`.
