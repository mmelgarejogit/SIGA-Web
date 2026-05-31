import { http } from "@/api/http"

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

// Lista canónica de todos los permisos del sistema (para mostrar labels).
// DEBE mantenerse sincronizada con DbSeeder.cs y Program.cs del backend.
export const SYSTEM_PERMISSIONS = [
  { id: "ver_pacientes",          label: "Ver pacientes" },
  { id: "crear_paciente",         label: "Crear paciente" },
  { id: "editar_paciente",        label: "Editar paciente" },
  { id: "desactivar_paciente",    label: "Desactivar paciente" },
  { id: "ver_profesionales",      label: "Ver profesionales" },
  { id: "crear_profesional",      label: "Crear profesional" },
  { id: "editar_profesional",     label: "Editar profesional" },
  { id: "ver_especialidades",     label: "Ver especialidades" },
  { id: "gestionar_especialidades", label: "Gestionar especialidades" },
  { id: "ver_agenda",             label: "Ver agenda" },
  { id: "gestionar_agenda",       label: "Gestionar agenda" },
  { id: "ver_recepcion",          label: "Ver recepción" },
  { id: "ver_mis_turnos",         label: "Ver mis turnos" },
  { id: "ver_calendario",         label: "Ver calendario" },
  { id: "ver_historia_clinica",   label: "Ver historia clínica" },
  { id: "ver_consultas",          label: "Ver consultas" },
  { id: "registrar_consulta",     label: "Registrar consulta" },
  { id: "editar_consulta",        label: "Editar consulta" },
  { id: "eliminar_consulta",      label: "Eliminar consulta" },
  { id: "ver_recetas",            label: "Ver recetas" },
  { id: "ver_inventario",         label: "Ver inventario" },
  { id: "gestionar_inventario",   label: "Gestionar inventario" },
  { id: "gestionar_pedidos",      label: "Gestionar pedidos" },
  { id: "aprobar_pedidos",        label: "Aprobar órdenes de compra" },
  { id: "ver_egresos",            label: "Ver egresos" },
  { id: "gestionar_egresos",      label: "Solicitar egresos" },
  { id: "aprobar_egresos",        label: "Aprobar/rechazar egresos" },
  { id: "pagar_egresos",          label: "Registrar pago de egresos" },
  { id: "ver_ventas",             label: "Ver ventas" },
  { id: "registrar_venta",        label: "Registrar venta" },
  { id: "ver_reportes",           label: "Ver reportes" },
  { id: "ver_dashboard",          label: "Ver dashboard" },
  { id: "ver_notificaciones",     label: "Ver notificaciones" },
  { id: "gestionar_configuracion",label: "Gestionar configuración" },
  { id: "ver_empleados",          label: "Ver empleados" },
  { id: "gestionar_empleados",    label: "Gestionar empleados" },
  { id: "ver_usuarios",           label: "Ver usuarios" },
  { id: "editar_usuario",         label: "Editar usuario" },
  { id: "ver_roles",              label: "Ver roles" },
  { id: "crear_rol",              label: "Crear rol" },
  { id: "editar_rol",             label: "Editar rol" },
  { id: "eliminar_rol",           label: "Eliminar rol" },
] as const

// Grupos de permisos por módulo — usados en RolFormView (cards de permisos).
export interface PermissionGroup {
  module: string
  icon: string
  description: string
  permissions: Array<{ id: string; label: string }>
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: "Pacientes",
    icon: "groups",
    description: "Historial clínico y datos personales",
    permissions: [
      { id: "ver_pacientes",       label: "Ver pacientes" },
      { id: "crear_paciente",      label: "Crear paciente" },
      { id: "editar_paciente",     label: "Editar paciente" },
      { id: "desactivar_paciente", label: "Desactivar paciente" },
    ],
  },
  {
    module: "Profesionales",
    icon: "stethoscope",
    description: "Gestión del equipo profesional",
    permissions: [
      { id: "ver_profesionales",  label: "Ver profesionales" },
      { id: "crear_profesional",  label: "Crear profesional" },
      { id: "editar_profesional", label: "Editar profesional" },
    ],
  },
  {
    module: "Agenda",
    icon: "calendar_month",
    description: "Citas, turnos y recepción",
    permissions: [
      { id: "ver_agenda",       label: "Ver agenda" },
      { id: "gestionar_agenda", label: "Gestionar agenda" },
      { id: "ver_recepcion",    label: "Ver recepción" },
      { id: "ver_mis_turnos",   label: "Ver mis turnos" },
      { id: "ver_calendario",   label: "Ver calendario" },
    ],
  },
  {
    module: "Clínica",
    icon: "clinical_notes",
    description: "Consultas, recetas e historia clínica",
    permissions: [
      { id: "ver_historia_clinica", label: "Ver historia clínica" },
      { id: "ver_consultas",        label: "Ver consultas" },
      { id: "registrar_consulta",   label: "Registrar consulta" },
      { id: "editar_consulta",      label: "Editar consulta" },
      { id: "eliminar_consulta",    label: "Eliminar consulta" },
      { id: "ver_recetas",          label: "Ver recetas" },
    ],
  },
  {
    module: "Inventario",
    icon: "inventory_2",
    description: "Stock, productos y órdenes de compra",
    permissions: [
      { id: "ver_inventario",       label: "Ver inventario" },
      { id: "gestionar_inventario", label: "Gestionar inventario" },
      { id: "gestionar_pedidos",    label: "Gestionar pedidos" },
      { id: "aprobar_pedidos",      label: "Aprobar órdenes de compra" },
    ],
  },
  {
    module: "Egresos",
    icon: "account_balance_wallet",
    description: "Facturas, honorarios y gastos generales",
    permissions: [
      { id: "ver_egresos",      label: "Ver egresos" },
      { id: "gestionar_egresos", label: "Solicitar egresos" },
      { id: "aprobar_egresos",  label: "Aprobar/rechazar egresos" },
      { id: "pagar_egresos",    label: "Registrar pago de egresos" },
    ],
  },
  {
    module: "Ventas y Caja",
    icon: "payments",
    description: "Facturación y movimientos de caja",
    permissions: [
      { id: "ver_ventas",      label: "Ver ventas" },
      { id: "registrar_venta", label: "Registrar venta" },
    ],
  },
  {
    module: "Empleados",
    icon: "badge",
    description: "Personal administrativo y cargos",
    permissions: [
      { id: "ver_empleados",       label: "Ver empleados" },
      { id: "gestionar_empleados", label: "Gestionar empleados" },
    ],
  },
  {
    module: "Especialidades",
    icon: "medical_services",
    description: "Especialidades del staff médico",
    permissions: [
      { id: "ver_especialidades",      label: "Ver especialidades" },
      { id: "gestionar_especialidades", label: "Gestionar especialidades" },
    ],
  },
  {
    module: "Reportes",
    icon: "analytics",
    description: "Informes financieros y operativos",
    permissions: [
      { id: "ver_reportes", label: "Ver reportes" },
    ],
  },
  {
    module: "Sistema",
    icon: "manage_accounts",
    description: "Usuarios, roles, configuración y notificaciones",
    permissions: [
      { id: "ver_dashboard",           label: "Ver dashboard" },
      { id: "ver_notificaciones",      label: "Ver notificaciones" },
      { id: "gestionar_configuracion", label: "Gestionar configuración" },
      { id: "ver_usuarios",            label: "Ver usuarios" },
      { id: "editar_usuario",          label: "Editar usuario" },
      { id: "ver_roles",               label: "Ver roles" },
      { id: "crear_rol",               label: "Crear rol" },
      { id: "editar_rol",              label: "Editar rol" },
      { id: "eliminar_rol",            label: "Eliminar rol" },
    ],
  },
]

export async function getRoles(): Promise<Role[]> {
  const { data } = await http.get<Role[]>("/api/roles")
  return data
}

export async function createRole(request: RoleRequest): Promise<Role> {
  const { data } = await http.post<Role>("/api/roles", request)
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
