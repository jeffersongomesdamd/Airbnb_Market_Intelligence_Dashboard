import { z } from "zod";
import type { AirbnbRow } from "@/types/airbnb";
import { AIRBNB_DATA } from "./data";

// ─── Schema Zod ────────────────────────────────────────────────────────────────
// Aceita number | null | undefined e converte para um número seguro.
const toFiniteNumber = (fallback: number) =>
  z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? fallback : Number(val)),
    z.number().finite(`Esperado número finito, recebido valor inválido`),
  );

export const AirbnbRowSchema = z.object({
  id: z.coerce.number().int().nonnegative(),
  name: z.string().catch("(sem nome)"),
  host_id: z.coerce.number().int().nonnegative(),
  host_name: z.string().catch("(desconhecido)"),
  neighbourhood_group: z.string().min(1),
  neighbourhood: z.string().min(1),
  latitude: toFiniteNumber(0),
  longitude: toFiniteNumber(0),
  room_type: z.string().min(1),
  price: toFiniteNumber(0),
  minimum_nights: z.coerce.number().int().nonnegative().catch(1),
  number_of_reviews: z.coerce.number().int().nonnegative().catch(0),
  last_review: z.string().nullable().catch(null),
  reviews_per_month: toFiniteNumber(0).catch(0),
  calculated_host_listings_count: z.coerce.number().int().nonnegative().catch(1),
  availability_365: z.coerce.number().int().min(0).max(365).catch(0),
  // Campo derivado — calculado após parsing, não validado aqui
  custo_real: toFiniteNumber(0),
});

export type ParsedAirbnbRow = z.infer<typeof AirbnbRowSchema>;

// ─── Resultado tipado do parse ─────────────────────────────────────────────────
interface ParseResult {
  rows: AirbnbRow[];
  skipped: number; // linhas rejeitadas
  errors: string[]; // amostra dos erros (máx. 10) para observabilidade
}

// ─── Worker-safe: parse isolado por linha ─────────────────────────────────────
function parseRow(raw: unknown, index: number): AirbnbRow | null {
  const result = AirbnbRowSchema.safeParse(raw);
  if (!result.success) {
    // Retorna null; o chamador acumula o erro com contexto de linha
    const firstIssue = result.error.issues[0];
    throw new Error(`[parse] Linha ${index}: campo "${firstIssue.path.join(".")}" — ${firstIssue.message}`);
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

    // Cede o thread entre chunks (evita jank na UI)
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    for (let j = 0; j < chunk.length; j++) {
      try {
        const row = parseRow(chunk[j], i + j);
        if (row) rows.push(row);
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
      console.warn(`${MODULE} ${result.skipped} linha(s) ignorada(s) por erro de validação.`, result.errors);
    }

    return result;
  } catch (err) {
    // Re-lança com contexto claro para o consumidor (context.tsx)
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${MODULE} Falha ao carregar dados: ${message}`);
  }
}
