import { useHttp } from "@/composables/useHttp"

const { get, post, put, delete: del } = useHttp()

export interface CargoEmpleado {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

export interface Empleado {
  id: number
  userId: number
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  ci: string
  cargoId: number
  cargoNombre: string
  fechaIngreso: string
  fechaEgreso?: string
  salarioBase?: number
  isActive: boolean
  createdAt: string
}

export interface CrearEmpleadoRequest {
  firstName: string
  lastName: string
  ci: string
  email: string
  password: string
  phoneNumber?: string
  cargoId: number
  fechaIngreso: string
  salarioBase?: number
}

export interface ActualizarEmpleadoRequest {
  firstName: string
  lastName: string
  phoneNumber?: string
  cargoId: number
  fechaIngreso: string
  fechaEgreso?: string
  salarioBase?: number
}

export const getEmpleados = (soloActivos?: boolean) => {
  const q = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : ""
  return get<Empleado[]>(`/api/empleados${q}`)
}

export const getEmpleadoById = (id: number) => get<Empleado>(`/api/empleados/${id}`)

export const crearEmpleado = (data: CrearEmpleadoRequest) =>
  post<Empleado>("/api/empleados", data)

export const actualizarEmpleado = (id: number, data: ActualizarEmpleadoRequest) =>
  put<Empleado>(`/api/empleados/${id}`, data)

export const desactivarEmpleado = (id: number) => del(`/api/empleados/${id}`)

export const getCargos = () => get<CargoEmpleado[]>("/api/empleados/cargos")

export const crearCargo = (data: { nombre: string; descripcion?: string }) =>
  post<CargoEmpleado>("/api/empleados/cargos", data)

export const actualizarCargo = (
  id: number,
  data: { nombre: string; descripcion?: string; activo: boolean },
) => put<CargoEmpleado>(`/api/empleados/cargos/${id}`, data)
