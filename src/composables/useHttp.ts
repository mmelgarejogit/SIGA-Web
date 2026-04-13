import { http } from '@/api/http'

/**
 * Wrapper sobre la instancia axios centralizada.
 * El Bearer token se inyecta automáticamente via interceptor en src/api/http.ts.
 *
 * Ejemplo:
 *   const { get } = useHttp()
 *   const pacientes = await get<Paciente[]>('/api/pacientes')
 */
export function useHttp() {
  return {
    get:    <T>(path: string)                => http.get<T>(path).then((r) => r.data),
    post:   <T>(path: string, body: unknown) => http.post<T>(path, body).then((r) => r.data),
    put:    <T>(path: string, body: unknown) => http.put<T>(path, body).then((r) => r.data),
    delete: <T>(path: string)               => http.delete<T>(path).then((r) => r.data),
  }
}
