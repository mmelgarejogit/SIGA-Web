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

// Lista canónica de todas las acciones del sistema (usada para mostrar labels en tabla)
// DEBE mantenerse sincronizada con DbSeeder.cs y Program.cs del backend.
export const SYSTEM_PERMISSIONS = [
  { id: "ver_pacientes", label: "Ver pacientes" },
  { id: "crear_paciente", label: "Crear paciente" },
  { id: "editar_paciente", label: "Editar paciente" },
  { id: "desactivar_paciente", label: "Desactivar paciente" },

  { id: "ver_profesionales", label: "Ver profesionales" },
  { id: "crear_profesional", label: "Crear profesional" },
  { id: "editar_profesional", label: "Editar profesional" },

  { id: "ver_especialidades", label: "Ver especialidades" },
  { id: "gestionar_especialidades", label: "Gestionar especialidades" },

  { id: "ver_agenda", label: "Ver agenda" },
  { id: "gestionar_agenda", label: "Gestionar agenda" },
  { id: "ver_recepcion", label: "Ver recepción" },
  { id: "ver_mis_turnos", label: "Ver mis turnos" },

  { id: "ver_calendario", label: "Ver calendario" },

  { id: "ver_historia_clinica", label: "Ver historia clínica" },

  { id: "ver_consultas", label: "Ver consultas" },
  { id: "registrar_consulta", label: "Registrar consulta" },
  { id: "editar_consulta", label: "Editar consulta" },
  { id: "eliminar_consulta", label: "Eliminar consulta" },

  { id: "ver_recetas", label: "Ver recetas" },

  { id: "ver_inventario", label: "Ver inventario" },
  { id: "gestionar_inventario", label: "Gestionar inventario" },
  { id: "gestionar_pedidos", label: "Gestionar pedidos" },

  { id: "ver_egresos", label: "Ver egresos" },
  { id: "gestionar_egresos", label: "Gestionar egresos" },
  { id: "aprobar_egresos", label: "Aprobar/rechazar egresos" },
  { id: "pagar_egresos", label: "Registrar pago de egresos" },

  { id: "ver_ventas", label: "Ver ventas" },
  { id: "registrar_venta", label: "Registrar venta" },

  { id: "ver_reportes", label: "Ver reportes" },

  { id: "ver_dashboard", label: "Ver dashboard" },
  { id: "ver_notificaciones", label: "Ver notificaciones" },

  { id: "gestionar_configuracion", label: "Gestionar configuración" },

  { id: "ver_usuarios", label: "Ver usuarios" },
  { id: "editar_usuario", label: "Editar usuario" },

  { id: "ver_roles", label: "Ver roles" },
  { id: "crear_rol", label: "Crear rol" },
  { id: "editar_rol", label: "Editar rol" },
  { id: "eliminar_rol", label: "Eliminar rol" },
] as const

// Columnas de la matriz de permisos
export const MATRIX_COLUMNS = [
  { id: "ver",       label: "Ver" },
  { id: "crear",     label: "Crear" },
  { id: "editar",    label: "Editar" },
  { id: "gestionar", label: "Gestionar" },
  { id: "desactivar", label: "Desactivar" },
] as const

export interface MatrixRow {
  module: string
  icon: string
  description: string
  // mapa colId → permissionId (si la celda aplica al módulo)
  permissions: Partial<Record<string, string>>
}

// Módulos del sistema con sus permisos mapeados a columnas
// DEBE mantenerse sincronizado con los controllers del backend.
export const PERMISSION_MATRIX: MatrixRow[] = [
  {
    module: "Pacientes",
    icon: "groups",
    description: "Historial clínico y datos personales",
    permissions: {
      ver: "ver_pacientes",
      crear: "crear_paciente",
      editar: "editar_paciente",
      desactivar: "desactivar_paciente",
    },
  },
  {
    module: "Profesionales",
    icon: "stethoscope",
    description: "Gestión del equipo profesional",
    permissions: {
      ver: "ver_profesionales",
      crear: "crear_profesional",
      editar: "editar_profesional",
    },
  },
  {
    module: "Especialidades",
    icon: "medical_services",
    description: "Especialidades del staff",
    permissions: { ver: "ver_especialidades", gestionar: "gestionar_especialidades" },
  },
  {
    module: "Agenda",
    icon: "calendar_month",
    description: "Gestión de citas y turnos",
    permissions: { ver: "ver_agenda", gestionar: "gestionar_agenda" },
  },
  {
    module: "Recepción",
    icon: "meeting_room",
    description: "Sala de espera y recepción de pacientes",
    permissions: { ver: "ver_recepcion" },
  },
  {
    module: "Mis Turnos",
    icon: "event_available",
    description: "Autogestión de turnos por pacientes",
    permissions: { ver: "ver_mis_turnos" },
  },
  {
    module: "Calendario",
    icon: "event",
    description: "Vista de calendario de turnos",
    permissions: { ver: "ver_calendario" },
  },
  {
    module: "Clínica",
    icon: "clinical_notes",
    description: "Consultas y recetas ópticas",
    permissions: {
      ver: "ver_consultas",
      crear: "registrar_consulta",
      editar: "editar_consulta",
      desactivar: "eliminar_consulta",
    },
  },
  {
    module: "Historia Clínica",
    icon: "folder_shared",
    description: "Acceso al historial clínico global",
    permissions: { ver: "ver_historia_clinica" },
  },
  {
    module: "Recetas",
    icon: "medication",
    description: "Prescripciones y recetas médicas",
    permissions: { ver: "ver_recetas" },
  },
  {
    module: "Inventario",
    icon: "inventory_2",
    description: "Control de stock, productos y órdenes de compra",
    permissions: {
      ver: "ver_inventario",
      crear: "gestionar_pedidos",
      gestionar: "gestionar_inventario",
    },
  },
  {
    module: "Egresos",
    icon: "account_balance_wallet",
    description: "Facturas, honorarios y gastos generales",
    permissions: { ver: "ver_egresos", gestionar: "gestionar_egresos" },
  },
  {
    module: "Ventas",
    icon: "payments",
    description: "Facturación y órdenes de trabajo",
    permissions: { ver: "ver_ventas", crear: "registrar_venta" },
  },
  {
    module: "Reportes",
    icon: "analytics",
    description: "Informes financieros y operativos",
    permissions: { ver: "ver_reportes" },
  },
  {
    module: "Dashboard",
    icon: "dashboard",
    description: "Panel de control principal",
    permissions: { ver: "ver_dashboard" },
  },
  {
    module: "Notificaciones",
    icon: "notifications",
    description: "Centro de notificaciones del sistema",
    permissions: { ver: "ver_notificaciones" },
  },
  {
    module: "Usuarios",
    icon: "manage_accounts",
    description: "Gestión de cuentas y accesos",
    permissions: { ver: "ver_usuarios", editar: "editar_usuario" },
  },
  {
    module: "Roles",
    icon: "shield_person",
    description: "Configuración de permisos del sistema",
    permissions: {
      ver: "ver_roles",
      crear: "crear_rol",
      editar: "editar_rol",
      desactivar: "eliminar_rol",
    },
  },
  {
    module: "Configuración",
    icon: "settings",
    description: "Estados, especialidades y datos del negocio",
    permissions: { gestionar: "gestionar_configuracion" },
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
