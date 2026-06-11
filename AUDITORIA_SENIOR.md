# AUDITORIA SENIOR — Estate Intel (Airbnb Market Intelligence)

> Relatório de auditoria técnica sênior cobrindo riscos de arquitetura, contratos de dados e observabilidade. Snapshot do estado atual do projeto + roadmap de remediação em três fases.

---

## Risk Matrix

| Vulnerability | Impact | Likelihood |
|---|---|---|
| **In-browser V8 heap exhaustion** — Full `AIRBNB_DATA` const loaded synchronously into memory at parse time | HIGH | HIGH |
| **Schema drift (Python → TypeScript)** — No automated contract validation between ETL output and `AirbnbRow` | HIGH | MED |
| **Silent metric corruption** — Python winsorization thresholds or weight coefficients change without frontend notification | HIGH | MED |
| **Zero observability in production** — No error boundaries, no Recharts crash capture, no CSV parse failure telemetry | MED | HIGH |
| **`useMemo` over full dataset** — Re-derived `filtered` on every filter change with O(n) pass over entire corpus | MED | MED |
| **No pagination or virtualization** — `HostTable` renders unbounded rows into DOM; layout thrash inevitable at scale | MED | MED |
| **Kaggle API as single ingestion source** — Dataset schema or availability changes break the entire pipeline silently | MED | LOW |
| **Deterministic insights as business logic** — `buildInsights` hardcodes rules; no A/B testing or experimentation surface | LOW | HIGH |

---

## Critical Deep-Dives

### 🔴 CRITICAL — Memory ceiling: the V8 heap will not survive dataset growth

**The concrete threshold:** A TypeScript constant embedding a 100 MB serialized dataset ships the entire payload as part of the JS bundle. V8's practical heap limit in a browser tab is 1–2 GB, but long before that, a 50k-row JSON constant at ~2 KB/row results in a ~100 MB bundle allocation at module load time — *before* `useMemo` even runs. At 300k rows (a realistic Airbnb Open Data scale), you're looking at 600 MB pre-filter, with `useMemo` materializing a second filtered copy in the same heap. The browser tab will OOM-crash silently with no user-visible error.

- **Immediate fix (<50k rows):** Keep current architecture but add a bundle size budget gate in Vite (`build.chunkSizeWarningLimit`) at 5 MB. Fail CI if exceeded.
- **Medium scale (50k–500k rows):** Serve the cleaned CSV/Parquet from a static CDN (Cloudflare R2 / S3). Parse progressively in a Web Worker using `papaparse` streaming mode. Post filtered chunks to the main thread — never hold the full corpus on the main thread.
- **At scale (>500k rows):** Adopt **DuckDB-Wasm** (`@duckdb/duckdb-wasm`). Load the Parquet file lazily, execute SQL aggregations inside WASM — the V8 heap never sees more than the query result. This is the correct architectural end-state.

### 🔴 CRITICAL — Silent metric corruption via undocumented pipeline changes

The `taxa_atratividade` formula weights (60/40) and the winsorization percentile bounds (p1, p99) are magic numbers embedded in Python with no version stamp propagated to the frontend. If a data scientist adjusts the weights to 70/30 for a new business requirement, the KPI cards update silently — the frontend has no way to know the semantic meaning of the column changed. **This is a Data Drift violation.**

- Add a pipeline manifest file (`pipeline_meta.json`) emitted alongside the data:
  ```json
  {
    "schema_version": "1.3.0",
    "attractiveness_weights": [0.6, 0.4],
    "winsorize_bounds": [0.01, 0.99],
    "generated_at": "..."
  }
  ```
- The frontend reads this manifest at startup and renders a version chip in the dashboard header. Any change in `schema_version` triggers a console warning and — in prod — a Sentry breadcrumb.

### 🟠 OBSERVABILITY — Missing telemetry at every critical boundary

**Frontend gaps:**
- Recharts throws during render (malformed data, `NaN` in axis domains) — no `ErrorBoundary` wrapping chart components. Users see a blank panel with no explanation.
- The `AirbnbDataProvider` has an `error` state but no structured logging path — errors are surfaced to UI but never captured for analysis.
- There is no Core Web Vitals instrumentation. A 600 MB JS parse will produce an LCP of 8+ seconds — this will never be attributed to the bundle size without RUM data.

**Pipeline gaps:**
- No assertion on null rate per column post-imputation. If the Kaggle API returns a corrupted file where 40% of price values are null, the medians used for imputation will themselves be null — silent garbage propagation.
- No duration tracking on the ingestion step. A timeout or network blip produces a partial CSV that silently replaces the previous clean version.

---

## Contract & Interface

### Boundary: Python ETL → TypeScript `AirbnbRow`

The current architecture has a hard implicit contract: the Python script emits column names in `snake_case` and the TypeScript interface mirrors them exactly. There is no enforcement layer — only convention. This is acceptable in a solo prototype; it is a reliability liability in any shared or CI-driven pipeline.

### RISK — Failure modes when the contract is violated

- **Renamed column:** Python renames `taxa_atratividade` → `attractiveness_score`. TypeScript reads `undefined` for every row. `useMemo` produces charts with all-zero bars. No error is thrown.
- **Type coercion:** Python changes `minimum_nights` from `int` to `float` (e.g. `1.0`). TypeScript types are not enforced at runtime — the division in `fator_eficiencia` still computes, but if float serialization produces scientific notation (`1e1`), `JSON.parse` will handle it correctly while a CSV parser might not.
- **New required field added:** Python adds `cancellation_policy` to the schema. TypeScript `AirbnbRow` is not updated. No build error, no runtime warning. The field is simply absent from all filtering and visualization logic.

### REMEDIATION — Two-stage schema enforcement pipeline

**Stage 1 — Python side (generate the schema):**
Use `pandera` to define a `DataFrameSchema` that validates the cleaned dataframe before export. Configure it to raise on any null rate above threshold, unexpected dtype, or out-of-bounds numeric value. After validation passes, emit a JSON Schema artifact via `pydantic`'s `.schema_json()` — this becomes the source of truth.

**Stage 2 — TypeScript side (validate at runtime):**
Use `zod` to define the `AirbnbRowSchema` inferred from the same JSON Schema (or hand-mirrored). At data load time in `AirbnbDataProvider`, call `z.array(AirbnbRowSchema).safeParse(rows)`. On failure, log the specific field + index to Sentry and fall back to the last known good dataset hash.

**Stage 3 — CI gate:**
Add a GitHub Actions step that runs `python validate_schema.py` and fails the workflow if the JSON Schema artifact changes without a corresponding bump in `schema_version`. This prevents silent drift from merging.

### SEPARATION OF CONCERNS — Business metric computation belongs in one layer only

Currently, `custo_real`, `taxa_atratividade`, and `fator_eficiencia` are computed in Python but their semantic interpretation (weights, thresholds for "good" vs "poor") is scattered across `buildInsights` in the frontend. This violates single-responsibility. If the attractiveness weight changes in Python, the insight copy ("Bairro X lidera em atratividade") may become misleading without any frontend change.

- Move all metric thresholds and classification logic to the pipeline manifest.
- Frontend reads thresholds from manifest — never hardcodes them.
- This makes `buildInsights` a pure renderer, not a policy definer.

---

## Executive Summary

A few things worth calling out explicitly:

1. **The most severe vulnerability isn't the missing error boundaries or the absent observability** — it's the architectural coupling between dataset scale and browser memory. The TS constant trick is elegant at prototype scale. At any real production dataset size, the V8 heap will OOM-crash silently before a single user ever sees a chart. The **DuckDB-Wasm path in Phase 3** is the correct long-term resolution, but the **Web Worker + CDN approach in Phase 2** is the pragmatic intermediate step that can be shipped in a week.

2. **The second critical issue is the missing formal contract.** `pandera` + `zod` together give you a formal contract between layers that today exists only as convention. A single Python rename propagating silently to all-zero KPI charts is a trust-destroying production incident — and it costs almost nothing to prevent with schema generation and runtime parsing.

3. **On observability:** the most impactful single change is installing **Sentry with a `ChartErrorBoundary`**. Right now, a Recharts crash from a `NaN` domain value produces a blank panel with no indication of failure. Users assume the data is empty; they don't file bug reports. This class of silent failure is the hardest to find and the cheapest to instrument.
