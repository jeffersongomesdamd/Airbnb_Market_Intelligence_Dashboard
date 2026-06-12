import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Garante que qualquer valor numérico seja um número real,
 * retornando 0 (ou o fallback informado) se for NaN, null, undefined,
 * string inválida ou qualquer coisa que não convirja para um número finito.
 *
 * Use sempre na fronteira de dados (parsing de CSV/JSON, props vindas de
 * APIs externas, cálculos derivados) para evitar `NaN` na UI.
 */
export const toSafeNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === "") return fallback;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : fallback;
};
