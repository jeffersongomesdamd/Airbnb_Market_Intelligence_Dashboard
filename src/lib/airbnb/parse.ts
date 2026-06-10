import type { AirbnbRow } from "@/types/airbnb";
import { AIRBNB_DATA } from "./data";

export async function loadAirbnbCSV(): Promise<AirbnbRow[]> {
  return AIRBNB_DATA;
}
