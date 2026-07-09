/**
 * Helpers de formato de moneda (Guaraníes, PYG). Centraliza el formateo que antes
 * estaba copiado por vista (formatPrice/formatMonto). Guaraníes = enteros, sin centavos;
 * separador de miles "." según locale es-PY.
 */

const milesFmt = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })
const gsFmt = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
})

/** Máscara de miles sin símbolo: 1500000 → "1.500.000". Para inputs de monto. */
export function formatMiles(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "" : milesFmt.format(n)
}

/** Monto con símbolo para mostrar: 1500000 → "Gs. 1.500.000" (— si es null). */
export function formatGs(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "—" : gsFmt.format(n)
}

/** Extrae el entero de un string con máscara: "1.500.000" → 1500000; "" → null. */
export function parseMonto(s: string): number | null {
  const digits = s.replace(/\D/g, "")
  return digits === "" ? null : Number(digits)
}
