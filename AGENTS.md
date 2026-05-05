# AGENTS.md — SIGA Web Frontend

## Stack

Vue 3 (Composition API + `<script setup>`), TypeScript, Vite, Vue Router 5, Pinia, Axios, Tailwind CSS v4.

## Comandos

```sh
npm run dev      # desarrollo con hot-reload
npm run build    # type-check + build (siempre ejecutar antes de commit)
npm run format   # prettier sobre src/
```

## Build correcto antes de commit

`npm run build` ejecuta `type-check` (`vue-tsc --build`) + `vite build` en paralelo. Siempre correrlo antes de commit para detectar errores de tipos.

## Tema visual

CSS variables en `src/assets/main.css`:

```css
--color-primary:      #00288E   /* azul oscuro */
--color-secondary:    #006780   /* cyan oscuro */
--color-background:    #F7F9FE   /* fondo general */
--color-surface-dim:  #D8DADF
--color-error:         #BA1A1A
--radius-default:      1rem
--font-headline:       "Plus Jakarta Sans"
--font-body:           "Manrope"
```

Usar Tailwind utilities (`bg-primary`, `text-on-surface`) siempre que existan. Cuando Tailwind no alcance, usar `var(--color-*)` en `style` binding. **Prohibido hardcodear hex codes** (`#181c20`, `#444653`, etc.) fuera de `main.css`.

> **Regla:** `main.css` aplica las fuentes globalmente vía `body` y `h1–h6`. **No declarar `font-family` inline en vistas ni componentes.**

## Iconos

**Material Symbols Outlined exclusivamente**. Para filled:

```html
<span class="material-symbols-outlined"
  style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;">
  icon_name
</span>
```

## No instalar librerías de componentes UI

Todo se construye con Tailwind. **No usar Vuetify, Quasar, PrimeVue, etc.**

## Componentes compartidos (Design System)

Toda nueva vista CRUD debe usar los componentes del Design System:

| Componente | Uso |
|---|---|
| `BaseButton` | Botones con variantes (`primary`, `secondary`, `danger`, `ghost`) y tamaños (`sm`, `default`, `lg`) |
| `BaseModal` | Shell de modal con overlay, header con borde, body scrollable, footer. Tamaños: `sm`, `md`, `lg`, `xl` |
| `BaseTable` | Tabla con header themed, filas hover, estado vacío, skeleton loading. Usar slots scoped para celdas personalizadas |
| `FilterTabs` | Grupo de pills para filtros. Activo: `bg-primary text-on-primary`. Inactivo: `bg-surface-container-high text-on-surface-variant` |
| `SearchInput` | Input de búsqueda `rounded-xl`, `bg-surface-container-lowest`, borde `outline-variant`, con icono y botón limpiar |

> Ver especificación completa (tipografía, layout, botones, tablas, modales, formularios) en `CLAUDE.md` → *Design System*.

## Proxy API

Vite proxy en `vite.config.ts` redirige `/api/*` al backend (`VITE_API_URL` en `.env.local`). No usar URLs hardcoded ni la URL del proxy en servicios.

## Patrón de servicios

```
src/services/<entidad>Service.ts  →  src/api/http.ts (axios con interceptors)  →  backend
```

**Siempre usar el composable `useHttp`** en servicios, no axios directamente:

```ts
const { get, post, put, delete: del } = useHttp()
```

## Store de autenticación (Pinia)

`src/stores/auth.ts` — token JWT y datos de usuario.

- `auth.setSession(jwtToken, { email, roles, permissions, firstName, lastName, professionalId })` — tras login exitoso.
- `auth.hasPermission(p)` — verifica contra `user.value.permissions`.
- `auth.user.professionalId` — para filtrar Clínicas por profesional activo.
- No acceder a `localStorage` directamente; usar el store.

## Menú de navegación

`src/config/menuConfig.ts` es la **fuente de verdad** del sidebar. No hardcodear ítems en `AppSidebar.vue`. Estructura:

```ts
{
  id: 'pacientes',
  label: 'Pacientes',
  icon: 'groups',
  permission: 'ver_pacientes',    // permiso del grupo
  children: [
    { label: 'Lista de Pacientes', icon: 'list', route: '/pacientes', permission: 'ver_pacientes' },
    { label: 'Registrar Paciente', icon: 'person_add', route: '/pacientes/nuevo', permission: 'crear_paciente' },
  ]
}
```

- Ítem simple: sin `children` y con `route`.
- Grupo expandible: con `children`.
- RBAC por sub-ítem: cada `MenuChild` tiene su propio `permission`. El grupo se muestra si al menos un hijo es visible para el usuario.

## Modales

Usar `<Teleport to="body">` — siempre, sin excepción. Usar `Transition name="fade"` para animaciones.

## Soft delete

Nunca eliminar registros del frontend. Llamar `DELETE` endpoint que marca `isActive = false`.

## Vistas existentes

Patrón de referencia: `src/views/PacientesView.vue` (tabla + modales + FAB). Toda nueva vista CRUD sigue ese patrón.

| Vista | Ruta | Notas |
|-------|------|-------|
| `DashboardView` | `/` | KPIs reales, TodayAppointments, InsightsPanel |
| `PacientesView` | `/pacientes` | CRUD completo con paginación y búsqueda |
| `PacienteDetailView` | `/pacientes/:id` | Info + tabs (Citas, Historial Clínico) |
| `PacienteNuevoView` | `/pacientes/nuevo` | Formulario de registro independiente |
| `AgendaView` | `/agenda`, `/agenda/nueva` | Gestión de turnos con filtros |
| `ConsultaListView` | `/clinica/consultas` | Listado operativo de consultas |
| `ConsultaFormView` | `/clinica/consultas/nueva` | Crear nueva consulta |
| `HistorialClinicoView` | `/clinica/historial` | Historial clínico por paciente |
| `ProfesionalesView` | `/profesionales` | CRUD con configuración de horarios |
| `UsuariosView` | `/usuarios` | Gestión de usuarios y matriz de permisos |
| `ComingSoonView` | módulos pendientes | Placeholder para módulos no implementados |

## Rutas

Todas las rutas autenticadas declaran `meta: { requiresAuth: true, permission: '...' }`. El router guard valida autenticación y permisos.

## Convenciones

- **`<script setup lang="ts">`** en todos los componentes. No Options API.
- No llamar `axios` directamente — usar `useHttp` o los servicios.
- No hardcodear colores fuera del tema CSS.
- No poner lógica de negocio en templates.
- `createdAt`/`updatedAt` se manejan automáticamente en el backend.