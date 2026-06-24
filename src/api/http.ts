import axios from "axios"
import { useAuthStore } from "@/stores/auth"
import router from "@/router"

// baseURL vacío → las requests van al mismo origen (ej. localhost:5173 en dev).
// El proxy de Vite (vite.config.ts) intercepta /api/* y las reenvía al backend,
// evitando problemas de CORS. VITE_API_URL solo se usa en vite.config.ts.
// En producción usar un reverse proxy (nginx, etc.) con la misma estrategia.
export const http = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
})

// Interceptor de request: inyecta el Bearer token en cada petición
http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// Interceptor de response: normaliza los errores del backend
// ToHttpResponse devuelve result.Error directamente en el body (string o objeto)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      // Sesión expirada o token inválido: limpiar y redirigir al login
      if (error.response.status === 401) {
        const auth = useAuthStore()
        auth.clearSession()
        router.push({ name: "login" })
      }

      const data = error.response.data
      const message =
        typeof data === "string"
          ? data
          : (data?.message ?? data?.error ?? `Error ${error.response.status}`)
      const normalized = new Error(message) as Error & { status: number }
      normalized.status = error.response.status
      return Promise.reject(normalized)
    }
    // Error de red / backend caído
    return Promise.reject(new Error("No se pudo conectar con el servidor."))
  },
)
