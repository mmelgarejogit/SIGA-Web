import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Se usa localStorage para que la sesión persista entre pestañas y recargas de página.
// Para un sistema de gestión clínica de escritorio esto es el comportamiento esperado.
// Si se requiere mayor seguridad, migrar a sessionStorage + refresh token.
const TOKEN_KEY = 'siga_token'
const USER_KEY = 'siga_user'

export interface AuthUser {
  email: string
  roles: string[]
  permissions: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  const user = ref<AuthUser | null>((() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') }
    catch { return null }
  })())

  const isAuthenticated = computed(() => !!token.value)

  function hasPermission(permission: string): boolean {
    return user.value?.permissions?.includes(permission) ?? false
  }

  function setSession(jwtToken: string, authUser: AuthUser) {
    token.value = jwtToken
    user.value = authUser
    localStorage.setItem(TOKEN_KEY, jwtToken)
    localStorage.setItem(USER_KEY, JSON.stringify(authUser))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, hasPermission, setSession, clearSession }
})
