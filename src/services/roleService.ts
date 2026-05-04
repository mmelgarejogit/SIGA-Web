import { http } from '@/api/http'

export interface Role {
  id: number
  name: string
  type: string | null
  permissions: string[]
}

export interface RoleRequest {
  name: string
  permissions: string[]
}

// Lista canónica de todas las acciones del sistema (usada para mostrar labels en tabla)
export const SYSTEM_PERMISSIONS = [
  { id: 'ver_pacientes',           label: 'Ver pacientes' },
  { id: 'crear_paciente',          label: 'Crear paciente' },
  { id: 'editar_paciente',         label: 'Editar paciente' },
  { id: 'desactivar_paciente',     label: 'Desactivar paciente' },
  { id: 'ver_calendario',          label: 'Ver calendario' },
  { id: 'crear_turno',             label: 'Crear turno' },
  { id: 'reagendar_turno',         label: 'Reagendar turno' },
  { id: 'cancelar_turno',          label: 'Cancelar turno' },
  { id: 'ver_historia_clinica',    label: 'Ver historia clínica' },
  { id: 'editar_historia_clinica', label: 'Editar historia clínica' },
  { id: 'ver_recetas',             label: 'Ver recetas' },
  { id: 'ver_profesionales',       label: 'Ver profesionales' },
  { id: 'crear_profesional',       label: 'Crear profesional' },
  { id: 'editar_profesional',      label: 'Editar profesional' },
  { id: 'ver_inventario',          label: 'Ver inventario' },
  { id: 'crear_inventario',        label: 'Agregar al inventario' },
  { id: 'editar_inventario',       label: 'Editar inventario' },
  { id: 'desactivar_inventario',   label: 'Desactivar del inventario' },
  { id: 'ver_ventas',              label: 'Ver ventas' },
  { id: 'registrar_venta',         label: 'Registrar venta' },
  { id: 'ver_reportes',            label: 'Ver reportes' },
  { id: 'ver_usuarios',            label: 'Ver usuarios' },
  { id: 'crear_usuario',           label: 'Crear usuario' },
  { id: 'editar_usuario',          label: 'Editar usuario' },
  { id: 'desactivar_usuario',      label: 'Desactivar usuario' },
  { id: 'ver_roles',               label: 'Ver roles' },
  { id: 'crear_rol',               label: 'Crear rol' },
  { id: 'editar_rol',              label: 'Editar rol' },
  { id: 'eliminar_rol',            label: 'Eliminar rol' },
] as const

// Columnas de la matriz de permisos
export const MATRIX_COLUMNS = [
  { id: 'ver',        label: 'Ver' },
  { id: 'crear',      label: 'Crear' },
  { id: 'editar',     label: 'Editar' },
  { id: 'desactivar', label: 'Desactivar' },
] as const

export interface MatrixRow {
  module:      string
  icon:        string
  description: string
  // mapa colId → permissionId (si la celda aplica al módulo)
  permissions: Partial<Record<string, string>>
}

// Módulos del sistema con sus permisos mapeados a columnas
export const PERMISSION_MATRIX: MatrixRow[] = [
  {
    module: 'Pacientes', icon: 'groups', description: 'Historial clínico y datos personales',
    permissions: { ver: 'ver_pacientes', crear: 'crear_paciente', editar: 'editar_paciente', desactivar: 'desactivar_paciente' },
  },
  {
    module: 'Agenda', icon: 'calendar_month', description: 'Gestión de citas y turnos',
    permissions: { ver: 'ver_calendario', crear: 'crear_turno', editar: 'reagendar_turno', desactivar: 'cancelar_turno' },
  },
  {
    module: 'Historia Clínica', icon: 'medical_services', description: 'Evoluciones y registros clínicos',
    permissions: { ver: 'ver_historia_clinica', editar: 'editar_historia_clinica' },
  },
  {
    module: 'Recetas', icon: 'medication', description: 'Prescripciones y recetas médicas',
    permissions: { ver: 'ver_recetas' },
  },
  {
    module: 'Profesionales', icon: 'stethoscope', description: 'Gestión del equipo profesional',
    permissions: { ver: 'ver_profesionales', crear: 'crear_profesional', editar: 'editar_profesional' },
  },
  {
    module: 'Inventario', icon: 'inventory_2', description: 'Control de stock y productos',
    permissions: { ver: 'ver_inventario', crear: 'crear_inventario', editar: 'editar_inventario', desactivar: 'desactivar_inventario' },
  },
  {
    module: 'Ventas', icon: 'payments', description: 'Facturación y órdenes de trabajo',
    permissions: { ver: 'ver_ventas', crear: 'registrar_venta' },
  },
  {
    module: 'Reportes', icon: 'analytics', description: 'Informes financieros y operativos',
    permissions: { ver: 'ver_reportes' },
  },
  {
    module: 'Usuarios', icon: 'manage_accounts', description: 'Gestión de cuentas y accesos',
    permissions: { ver: 'ver_usuarios', crear: 'crear_usuario', editar: 'editar_usuario', desactivar: 'desactivar_usuario' },
  },
  {
    module: 'Roles', icon: 'shield_person', description: 'Configuración de permisos del sistema',
    permissions: { ver: 'ver_roles', crear: 'crear_rol', editar: 'editar_rol', desactivar: 'eliminar_rol' },
  },
]

export async function getRoles(): Promise<Role[]> {
  const { data } = await http.get<Role[]>('/api/roles')
  return data
}

export async function createRole(request: RoleRequest): Promise<Role> {
  const { data } = await http.post<Role>('/api/roles', request)
  return data
}

export async function updateRole(id: number, request: RoleRequest): Promise<Role> {
  const { data } = await http.put<Role>(`/api/roles/${id}`, request)
  return data
}

export async function deleteRole(id: number): Promise<void> {
  await http.delete(`/api/roles/${id}`)
}

export async function getRolesByUser(userId: number): Promise<Role[]> {
  const { data } = await http.get<Role[]>(`/api/users/${userId}/roles`)
  return data
}

export async function assignRoleToUser(userId: number, roleId: number): Promise<void> {
  await http.post(`/api/users/${userId}/roles`, { roleId })
}

export async function removeRoleFromUser(userId: number, roleId: number): Promise<void> {
  await http.delete(`/api/users/${userId}/roles/${roleId}`)
}
