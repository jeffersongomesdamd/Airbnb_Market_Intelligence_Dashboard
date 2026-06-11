# Estate Intel — Airbnb Market Intelligence

Painel analítico de inteligência de mercado imobiliário baseado no dataset Airbnb Open Data. Construído com TanStack Start v1, React 19, Vite 7, Tailwind CSS v4, shadcn/ui e Recharts.

## Documentação

- [Documentação Técnica](./DOCUMENTACAO_TECNICA.md) — arquitetura, pipeline de dados, fórmulas de negócio, estratégia de design e decisões de performance.
- [Auditoria Sênior](./AUDITORIA_SENIOR.md) — relatório completo de riscos, contratos de dados e observabilidade.

## 🛡️ Auditado por: Engenharia de Dados Senior (AI Audit)

Este projeto passou por uma auditoria técnica sênior independente, cobrindo arquitetura, escalabilidade, contratos de dados (Python ↔ TypeScript) e observabilidade em produção. O relatório completo — incluindo matriz de risco, deep-dives críticos e roadmap de remediação em três fases — está disponível em:

**👉 [AUDITORIA_SENIOR.md](./AUDITORIA_SENIOR.md)**

Principais pontos analisados:

- **Escalabilidade de memória** — limites do heap V8 com `AIRBNB_DATA` como constante e roadmap para Web Worker + CDN e DuckDB-Wasm.
- **Contratos de schema** — proposta de enforcement com Pandera (Python) + Zod (TypeScript) e CI gate contra drift silencioso.
- **Observabilidade** — Sentry, `ChartErrorBoundary` para Recharts e telemetria de pipeline.
- **Separação de responsabilidades** — manifesto `pipeline_meta.json` desacoplando regras de negócio do frontend.

> Maturidade técnica é saber o que você não sabe — e buscar validação externa antes que o problema chegue em produção.

## Stack

- **Framework**: TanStack Start v1 (React 19 + Vite 7)
- **Estilo**: Tailwind CSS v4 + shadcn/ui (Glassmorphism, gradientes violet→pink, paleta navy)
- **Visualização**: Recharts
- **Tipagem**: TypeScript strict
- **Estado**: React Context (`AirbnbDataProvider`) + `useMemo` para agregações

## Desenvolvimento

```bash
bun install
bun dev
```
