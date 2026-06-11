import { z } from "zod";
import type { AirbnbRow } from "@/types/airbnb";
import { AIRBNB_DATA } from "./data";

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Converte qualquer valor numérico (incluindo null/undefined/string) em número
// finito. Se a conversão falhar, retorna `fallback`. Nunca propaga NaN.
const toFiniteNumber = (fallback = 0) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return fallback;
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? n : fallback;
  }, z.number().finite());

// Converte qualquer valor em string segura (id numérico → "123").
const toSafeString = (fallback = "") =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return fallback;
    return String(val);
  }, z.string());

// ─── Schema Zod alinhado ao formato real do dataset ───────────────────────────
export const AirbnbRowSchema = z.object({
  id: toSafeString("0"),
  name: toSafeString("(sem nome)"),
  host_id: toSafeString("0"),
  host_name: z.preprocess(
    (v) => (v === null || v === undefined ? null : String(v)),
    z.string().nullable(),
  ),
  neighbourhood_group: toSafeString("Unknown"),
  neighbourhood: toSafeString("Unknown"),
  lat: toFiniteNumber(0),
  long: toFiniteNumber(0),
  room_type: toSafeString("Unknown"),
  price: toFiniteNumber(0),
  service_fee: toFiniteNumber(0),
  minimum_nights: toFiniteNumber(1),
  number_of_reviews: toFiniteNumber(0),
  last_review: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : String(v)),
    z.string().nullable(),
  ),
  reviews_per_month: toFiniteNumber(0),
  calculated_host_listings_count: toFiniteNumber(1),
  availability_365: toFiniteNumber(0),
  review_scores_rating: toFiniteNumber(0),
  instant_bookable: z.preprocess((v) => Boolean(v), z.boolean()),
  // Métricas derivadas (já calculadas no ETL Python)
  custo_real: toFiniteNumber(0),
  taxa_atratividade: toFiniteNumber(0),
  fator_eficiencia: toFiniteNumber(0),
});

export type ParsedAirbnbRow = z.infer<typeof AirbnbRowSchema>;

// ─── Resultado tipado do parse ─────────────────────────────────────────────────
interface ParseResult {
  rows: AirbnbRow[];
  skipped: number;
  errors: string[];
}

// ─── Parse isolado por linha ──────────────────────────────────────────────────
function parseRow(raw: unknown, index: number): AirbnbRow {
  const result = AirbnbRowSchema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(
      `[parse] Linha ${index}: campo "${firstIssue.path.join(".")}" — ${firstIssue.message}`,
    );
  }
  return result.data as AirbnbRow;
}

// ─── Chunked processing — não bloqueia o thread principal ─────────────────────
async function parseInChunks(raw: unknown[], chunkSize = 500): Promise<ParseResult> {
  const rows: AirbnbRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 0; i < raw.length; i += chunkSize) {
    const chunk = raw.slice(i, i + chunkSize);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    for (let j = 0; j < chunk.length; j++) {
      try {
        rows.push(parseRow(chunk[j], i + j));
      } catch (err) {
        skipped++;
        if (errors.length < 10) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  return { rows, skipped, errors };
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function loadAirbnbCSV(): Promise<ParseResult> {
  const MODULE = "[loadAirbnbCSV]";
  try {
    if (!Array.isArray(AIRBNB_DATA)) {
      throw new TypeError(`${MODULE} AIRBNB_DATA não é um array`);
    }
    const result = await parseInChunks(AIRBNB_DATA);
    if (result.skipped > 0) {
      console.warn(
        `${MODULE} ${result.skipped} linha(s) ignorada(s) por erro de validação.`,
        result.errors,
      );
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${MODULE} Falha ao carregar dados: ${message}`);
  }
}
