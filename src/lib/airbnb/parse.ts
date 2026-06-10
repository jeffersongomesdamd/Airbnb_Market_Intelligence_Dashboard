import Papa from "papaparse";
import type { AirbnbRow } from "@/types/airbnb";

const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const s = String(v).replace(/[$,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = "Unknown"): string => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "nan" ? fallback : s;
};

const bool = (v: unknown): boolean => {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes";
};

export async function loadAirbnbCSV(url = "/data/cleaned_airbnb_data.csv"): Promise<AirbnbRow[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV not found at ${url} (status ${res.status})`);
  const text = await res.text();

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      worker: false,
      complete: (result) => {
        try {
          const rows: AirbnbRow[] = result.data.map((r) => {
            const price = num(r.price);
            const fee = num(r.service_fee);
            const minN = num(r.minimum_nights, 1);
            const custo_real = num(r.custo_real, (price + fee) * Math.max(minN, 1));
            const taxa_atratividade = num(
              r.taxa_atratividade,
              num(r.review_scores_rating) * num(r.reviews_per_month),
            );
            const fator_eficiencia = num(
              r.fator_eficiencia,
              custo_real > 0 ? taxa_atratividade / custo_real : 0,
            );
            return {
              id: str(r.id, ""),
              name: str(r.name, "Untitled"),
              host_id: str(r.host_id, ""),
              host_name: r.host_name ? str(r.host_name) : null,
              neighbourhood_group: str(r.neighbourhood_group),
              neighbourhood: str(r.neighbourhood),
              lat: num(r.lat),
              long: num(r.long),
              room_type: str(r.room_type),
              price,
              service_fee: fee,
              minimum_nights: minN,
              number_of_reviews: num(r.number_of_reviews),
              last_review: r.last_review ? str(r.last_review, "") || null : null,
              reviews_per_month: num(r.reviews_per_month),
              calculated_host_listings_count: num(r.calculated_host_listings_count),
              availability_365: num(r.availability_365),
              review_scores_rating: num(r.review_scores_rating),
              instant_bookable: bool(r.instant_bookable),
              custo_real,
              taxa_atratividade,
              fator_eficiencia,
            };
          });
          resolve(rows.filter((r) => r.id !== ""));
        } catch (e) {
          reject(e);
        }
      },
      error: (err: Error) => reject(err),
    });
  });
}
