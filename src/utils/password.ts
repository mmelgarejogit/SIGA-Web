// Reglas de contraseña — deben coincidir con PasswordPolicy en el backend
// (SIGA.Domain.Security.PasswordPolicy): mínimo 8 caracteres, al menos una
// letra y un número. Centralizado para no repetir el chequeo por vista.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_HINT = "Mínimo 8 caracteres, con letras y números"

export function validatePassword(password: string): string | null {
  if (!password) return "La contraseña es obligatoria."
  if (password.length < PASSWORD_MIN_LENGTH) return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  if (!/[a-zA-Z]/.test(password)) return "La contraseña debe tener al menos una letra."
  if (!/[0-9]/.test(password)) return "La contraseña debe tener al menos un número."
  return null
}
