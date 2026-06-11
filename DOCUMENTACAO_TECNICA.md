# DOCUMENTAÇÃO TÉCNICA: Estate Intel (Airbnb Market Intelligence)

## 1. Visão Geral

Painel analítico desenvolvido para inteligência de mercado imobiliário utilizando o dataset **Airbnb Open Data**. A aplicação entrega KPIs, gráficos e insights automáticos sobre custo, atratividade e eficiência de listings, com foco em decisão rápida por parte de analistas e investidores.

Stack principal: **TanStack Start v1 + React 19 + Vite 7**, **Tailwind CSS v4 + shadcn/ui**, **Recharts**, **TypeScript estrito**. Não há backend dedicado — o dataset é embarcado como constante TypeScript (`AIRBNB_DATA`) em `src/lib/airbnb/data.ts`, eliminando dependência de rede e erros 404.

## 2. Pipeline de Engenharia de Dados

- **Ingestão**: `kagglehub` para download dinâmico do dataset original (Airbnb Open Data).
- **Limpeza**: Script Python (`pandas` / `numpy`) responsável por:
  - Desduplicação por `id`.
  - Normalização de colunas para `snake_case`.
  - Imputação contextual (mediana por `neighbourhood_group` × `room_type`) para campos numéricos.
  - Coerção de tipos e remoção de outliers extremos (winsorização nos percentis 1 e 99 do preço).
- **Materialização**: Exportação do dataframe limpo como constante TS para consumo direto pelo frontend.
- **Schema**: Tipagem estrita via interface `AirbnbRow` (`src/types/airbnb.ts`), incluindo campos crus e engenharias derivadas.

## 3. Regras de Negócio e Métricas

Pré-calculadas no pipeline Python e disponíveis em cada `AirbnbRow`:

- **Custo Real** (`custo_real`): `price + service_fee` (custo efetivo por noite após taxas).
- **Taxa de Atratividade** (`taxa_atratividade`): métrica ponderada combinando **60% rating normalizado** e **40% volume de reviews normalizado**, com saída no intervalo `[0, 1]`.
- **Fator de Eficiência** (`fator_eficiencia`): `availability_365 / minimum_nights`, com guarda contra divisão por zero (`max(minimum_nights, 1)`).

Essas três métricas são a base para todos os gráficos, KPIs e insights da aplicação.

## 4. Decisões de Arquitetura (O "Pulo do Gato")

### Design — Modern SaaS Dashboard

- **Glassmorphism**: utilitário `@utility glass` em `src/styles.css` aplica `backdrop-filter: blur(14px)` + gradiente translúcido + borda sutil em todos os cards (`src/components/ui/card.tsx`).
- **Paleta**: tema escuro navy via tokens `oklch` (`--background`, `--card`, `--primary`, etc.) garantindo contraste alto para visualização de dados.
- **Gradientes**: violeta → pink (`#8b5cf6 → #ec4899`) aplicados em linhas, áreas, ícones e títulos, definidos via `<linearGradient>` nos charts Recharts.
- **Tipografia**: fonte **Inter** carregada via Google Fonts no `__root.tsx`.
- **Background ambiente**: três gradientes radiais sobrepostos no `body` para profundidade.

### Performance

- **`useMemo`** em todas as agregações pesadas (`filtered`, `bounds`, `insights`, dados de chart) evitando recomputação em re-renders.
- **`useDebounce` (250 ms)** na busca de anfitriões (`HostTable`), reduzindo trabalho de filtragem por keystroke.
- **`Map` nativo** em vez de `reduce` aninhado para agregações por grupo/tipo (O(n) determinístico).
- **Skeleton inicial** (`DashboardSkeleton`) durante boot para LCP percebido melhor.
- **Tailwind v4 nativo** (sem `tailwind.config.js` legado) e tokens semânticos para tree-shaking eficiente.

### Estado e Contexto

- **`AirbnbDataProvider`** (`src/lib/airbnb/context.tsx`) centraliza `rows`, `filtered`, `filters`, `bounds`, `loading` e `error`.
- Hook `useAirbnb()` é a única porta de entrada de dados nos componentes — garante persistência de filtros entre abas e fonte única de verdade.
- `filters` derivam `filtered` via `useMemo([rows, filters])`; mudanças de filtro propagam automaticamente para KPIs, charts, tabela e insights.

## 5. Módulo de Insights

`AIInsights` (`src/components/dashboard/AIInsights.tsx`) implementa a camada de **inteligência de negócio** de forma 100% programática (sem chamada a LLM):

- Agrega `filtered` por `neighbourhood_group` e `room_type` (`aggregateByGroup`, `aggregateByRoomType`).
- `buildInsights` aplica regras determinísticas para gerar até 4 cards:
  1. **Headline** — compara líder em custo vs. líder em atratividade.
  2. **Eficiência** — grupo com maior `fator_eficiencia`.
  3. **Spread** — oportunidade de entrada (menor custo médio).
  4. **Volume** — concentração de oferta + share do tipo de quarto dominante.
- Mapa `toneStyles` define paletas (violet / pink / cyan / amber) reutilizáveis para gradientes, ícones e chips.
- Reativo aos filtros via `useMemo([filtered])`.

## 6. Extensibilidade

- **Novas métricas**: adicionar campo em `AirbnbRow` + cálculo no pipeline Python + agregação em `AIInsights` / charts.
- **Novos filtros**: estender `Filters` em `src/types/airbnb.ts` e a lógica de `filtered` em `context.tsx`.
- **Novos charts**: seguir o padrão de `PriceDistributionChart` / `NeighborhoodChart` (gradient via `<defs>`, tooltip customizado, eixos suaves).
- **Swap para LLM real**: substituir `buildInsights` por chamada a server function que consome o Lovable AI Gateway, mantendo a mesma interface `Insight[]`.
