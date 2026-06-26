/**
 * Estilos del design system centralizados (reemplaza las copias por-vista de
 * inputStyle / statusStyle / avatarStyle). Todo basado en tokens → flipea en dark.
 *
 * Uso:
 *   import { inputStyle, statusStyle, avatarStyle, initials } from "@/composables/useFieldStyles"
 *   // o bien
 *   const { inputStyle } = useFieldStyles()
 */

/** Estilo inline para inputs/select/textarea/date. Radio + borde + fondo por token. */
export function inputStyle(hasError = false): string {
  const base = "border-radius: var(--radius-md); color: var(--color-on-surface); "
  return hasError
    ? base +
        "border: 1.5px solid var(--color-error); " +
        "background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base +
        "border: 1px solid var(--color-outline-variant); " +
        "background-color: var(--color-surface);"
}

/** Estilo de campo de solo lectura (no editable). */
export function readonlyFieldStyle(): string {
  return (
    "border-radius: var(--radius-md); border: 1px solid var(--color-outline-variant); " +
    "color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low);"
  )
}

export interface StatusStyle {
  bg: string
  dot: string
  text: string
}

/** Colores del badge de estado activo/inactivo (pill o rectangular). */
export function statusStyle(isActive: boolean): StatusStyle {
  return isActive
    ? {
        bg: "var(--color-success-container)",
        dot: "var(--color-success)",
        text: "var(--color-on-success-container)",
      }
    : {
        bg: "var(--color-surface-container-highest)",
        dot: "var(--color-outline)",
        text: "var(--color-on-surface-variant)",
      }
}

const AVATAR_TOKENS = [
  "--color-primary",
  "--color-secondary",
  "--color-tertiary",
  "--color-outline",
] as const

export interface AvatarStyle {
  bg: string
  color: string
}

/** Color de avatar derivado del id (tinte que adapta a claro/oscuro vía color-mix). */
export function avatarStyle(id = 0): AvatarStyle {
  const token = AVATAR_TOKENS[id % AVATAR_TOKENS.length]!
  return {
    bg: `color-mix(in srgb, var(${token}) 12%, var(--color-surface-container-lowest))`,
    color: `var(${token})`,
  }
}

/** Iniciales en mayúscula a partir de nombre y apellido. */
export function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"
}

export function useFieldStyles() {
  return { inputStyle, readonlyFieldStyle, statusStyle, avatarStyle, initials }
}
