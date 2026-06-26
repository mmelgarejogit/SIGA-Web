# CLAUDE.md — SIGA Web

## Proyecto
SIGA Web es el frontend SPA del sistema de gestión para óptica. Consume la API REST de SIGA backend.

## Stack técnico
- **Vue 3** (Composition API + `<script setup>`)
- **TypeScript**
- **Vite** (build tool, con proxy `/api/*` al backend)
- **Vue Router 5** (SPA routing con guards)
- **Pinia** (state management)
- **Axios** (HTTP client con interceptores)
- **Tailwind CSS v4** (utility-first, con tema personalizado en CSS variables)

---

## Estructura de carpetas

```
src/
├── api/
│   └── http.ts               # Instancia axios + interceptores (auth + errores)
├── assets/
│   └── main.css              # Estilos globales + tema CSS (colores, tipografía)
├── components/
│   ├── AppHeader.vue         # Header fijo superior (64px)
│   ├── AppSidebar.vue        # Sidebar fijo izquierdo (280px)
│   ├── BaseButton.vue        # Botón con variantes y tamaños
│   ├── BaseModal.vue         # Shell de modal con overlay, header, body scrollable, footer
│   ├── BaseTable.vue         # Tabla con header, filas hover, estado vacío, skeleton
│   ├── FilterTabs.vue        # [DEPRECADO] No usar en vistas nuevas — ver patrón de FilterChips
│   ├── FilterChips.vue       # Dropdown multi-select con chips — patrón estándar de filtros
│   ├── KpiCard.vue           # Card reutilizable para métricas
│   └── SearchInput.vue       # Input de búsqueda con icono y botón limpiar
├── composables/
│   └── useHttp.ts            # Wrapper de axios → retorna .data directamente
├── router/
│   └── index.ts              # Rutas + guard de autenticación
├── services/
│   ├── authService.ts        # POST /api/auth/login
│   └── patientService.ts     # CRUD /api/patients
├── stores/
│   └── auth.ts               # Store Pinia: token, user, isAuthenticated
└── views/
    ├── LoginView.vue          # Página de login
    ├── DashboardView.vue      # Dashboard con KPIs y citas
    └── PacientesView.vue      # CRUD completo de pacientes (referencia principal)
```

---

## Tema visual

> **Fuente de verdad visual: [`design-system.md`](./design-system.md) + los tokens en `src/assets/main.css`.**
> Ante cualquier conflicto entre esta sección y `design-system.md`, **gana `design-system.md`**.
> El sistema soporta **dark mode** (clase `.dark` en `<html>` vía `stores/theme.ts`; toggle en `AppHeader`).
> Todo color/sombra/radio sale de un token (`var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)`,
> utilities `bg-primary`/`shadow-md`/`rounded-md`…) y **flipea solo** entre claro y oscuro.
> Helpers de estilo centralizados en `src/composables/useFieldStyles.ts` (`inputStyle`/`statusStyle`/
> `avatarStyle`) — importarlos, no copiarlos.

### Tipografía
```css
--font-headline: "Plus Jakarta Sans"   /* títulos, headings */
--font-body:     "Manrope"             /* body text, UI */
```

> **Regla:** `main.css` aplica las fuentes globales vía `body` y `h1–h6`. **No declarar `font-family` inline en vistas ni componentes.** Usar `var(--font-headline)` solo en casos excepcionales donde Tailwind no alcance.

### Paleta de colores (CSS variables en main.css)
```css
/* Primarios */
--color-primary:           #00288E   /* azul oscuro — botones principales, sidebar activo */
--color-primary-container: #1E40AF   /* azul medio */
--color-on-primary:        #ffffff

/* Secundarios */
--color-secondary:          #006780  /* cyan oscuro — botón "Nueva Cita", FAB secundario */
--color-secondary-container:#76DCFF  /* cyan claro */

/* Fondo y superficies */
--color-background:    #F7F9FE       /* fondo general */
--color-surface-dim:   #D8DADF
--color-surface-variant: #E0E2E7

/* Semánticos (cada uno con -container y -on-container) */
--color-error / --color-success / --color-warning / --color-info

/* Superficies (jerarquía de elevación; la página es la base, las cards se elevan) */
--color-surface                    /* fondo de página + fondo de inputs */
--color-surface-container-lowest   /* cards, tablas, modales */
--color-surface-container-low/high/highest
```

> **Regla:** usar Tailwind utilities (`bg-primary`, `text-on-surface`, etc.) siempre que existan. Cuando Tailwind no alcance, usar `var(--color-*)` en `style` binding. **Prohibido hardcodear hexes** fuera de `main.css`. Todos los valores light/dark están en `main.css` y en la tabla de `design-system.md` §1.

### Border radius (escala corregida — la vieja `--radius-xl: 3rem` ya no existe)
```css
--radius-xs: 6px    /* dots, badges rectangulares */
--radius-sm: 8px    /* chips, filtros */
--radius-md: 12px   /* inputs, campos, dropdowns */
--radius-lg: 16px   /* cards, tablas, KpiCard */
--radius-xl: 20px   /* modales */
--radius-2xl: 24px  --radius-3xl: 28px   --radius-full: 9999px
```
> Ya **no aplica** la antigua regla "rounded-xl prohibido": el bug del radio gigante está corregido.
> Inputs/campos usan `rounded-md` (o `var(--radius-md)` vía `useFieldStyles`).

### Iconos
Se usa **Material Symbols Outlined** en todo el sistema. Ejemplo de uso:
```html
<span class="material-symbols-outlined">person</span>
```

---

## Layout de páginas autenticadas

Todas las vistas autenticadas usan este layout fijo:

```
┌─────────────────────────────────────────────────┐
│ AppHeader (fixed top, h-16, backdrop-blur)       │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ AppSide  │   <slot> contenido de la vista       │
│ bar      │                                      │
│ (fixed   │   padding-left: 280px                │
│ left,    │   padding-top: 64px                  │
│ w-70)    │                                      │
└──────────┴──────────────────────────────────────┘
```

### Wrapper obligatorio

```html
<div class="min-h-screen" style="background-color: var(--color-background)">
  <AppSidebar />
  <AppHeader />
  <main style="margin-left: 280px; padding-top: 64px">
    <div class="p-8">
      <!-- contenido de la vista -->
    </div>
  </main>
</div>
```

> **Reglas:**
> - Usar **inline `style`** en `<main>`, no `class="ml-[280px] pt-16"`.
> - El `<div class="p-8">` interior **no debe tener `max-w-*` ni `mx-auto`**. El contenido es edge-to-edge con `padding: 32px`.
> - **No declarar `font-family` ni `color` en `<main>`** — confiar en `main.css`.
> - `DashboardView` puede usar su propio layout hero; el resto sigue este wrapper estrictamente.

---

## Design System

> **Resumen.** Los detalles visuales completos (tokens light/dark, radios, sombras, motion, foco,
> componentes) viven en [`design-system.md`](./design-system.md). **Ante conflicto, gana `design-system.md`.**

### Tipografía

| Rol | Tag | Clases Tailwind | Style binding (si es necesario) |
|-----|-----|-----------------|--------------------------------|
| Título de página | `<h1>` | `text-4xl font-extrabold tracking-tight mb-2` | — (hereda de `main.css`, no usar inline style) |
| Subtítulo | `<p>` | `font-medium` | `color: var(--color-on-surface-variant)` (sin `text-sm` ni `mt-*`) |
| Título de sección | `<h3>` | `text-xl font-extrabold` | `color: var(--color-primary)` |
| Label de formulario | `<label>` | `text-xs font-bold uppercase tracking-wider` | `color: var(--color-outline)` |
| Body / tabla | — | — | Hereda de `main.css` |
| Dashboard hero | `<h1>` | `text-5xl font-extrabold tracking-tight leading-tight` | `color: var(--color-on-surface)` |

> **Nota:** `text-4xl` es el estándar para todas las vistas de listado. Solo `DashboardView` usa `text-5xl` como excepción.

### Botones (`BaseButton`)

| Variante | Fondo | Texto | Radio | Sombra |
|----------|-------|-------|-------|--------|
| `primary` | `bg-primary` | `text-on-primary` | `rounded-full` | `var(--shadow-primary)` |
| `secondary` | `bg-surface-container-high` | `text-on-surface-variant` | `rounded-full` | — |
| `danger` | `bg-error` | `text-on-error` | `rounded-full` | — |
| `ghost` | transparent | `text-on-surface-variant` | `rounded-full` | — |

| Tamaño | Padding | Altura |
|--------|---------|--------|
| `sm` | `px-5` | `h-10` |
| `default` | `px-6 py-3` | — |
| `lg` | `px-8 py-4` | — |

> **Regla:** todos los botones llevan `font-bold`, `transition-all`, `active:scale-95`. Los botones de acción principal en listados usan tamaño `lg`.

### Barra de filtros — patrón estándar

Toda vista de listado usa **una única fila** de filtros con este layout:

```html
<div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
  <!-- Izquierda: FilterChips + filtros adicionales -->
  <div class="flex items-center gap-3 flex-wrap">
    <FilterChips
      :model-value="filtroActivo"
      :options="opciones"
      placeholder="Etiqueta del filtro"
      @update:model-value="onFiltroChange"
    />
    <!-- Filtro booleano adicional (ej: Bajo stock, Solo activos) -->
    <button
      @click="toggleFiltro"
      class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      :style="filtroActivo
        ? 'background-color: var(--color-warning-container); color: var(--color-on-warning-container); border: 1px solid var(--color-warning-container);'
        : 'background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface);'"
    >
      <span class="material-symbols-outlined" style="font-size: 18px">icono</span>
      Label
    </button>
  </div>

  <!-- Derecha: SearchInput -->
  <SearchInput
    :model-value="search"
    placeholder="Buscar por…"
    class="w-72"
    @update:model-value="onSearch"
  />
</div>
```

**Reglas:**
- Usar siempre `FilterChips` (no `FilterTabs`) — muestra un dropdown con checkbox y chips para los seleccionados.
- `FilterChips` acepta `string[]` (multi-select). Si el backend solo soporta un valor, usar `filtro.value[0]`.
- `SearchInput` siempre a la **derecha** con `class="w-72"`.
- Filtros adicionales booleanos (como "Bajo stock") van a la **izquierda** junto al `FilterChips`, usando el estilo de botón con borde `outline-variant`.
- Una sola fila con `justify-between`. Si hay muchos filtros se wrappean con `flex-wrap`.
- `mb-8` entre la barra de filtros y la tabla.
- **Nunca** usar `FilterTabs` en nuevas vistas — está deprecado.

**Opciones para `FilterChips`:**
```ts
const opciones = [
  { value: "activo",   label: "Activo",   dot: "#16a34a" },
  { value: "inactivo", label: "Inactivo", dot: "var(--color-outline)" },
]
```
El campo `dot` es opcional — usarlo cuando el valor tiene un color semántico (estados, prioridades).

### Input de búsqueda (`SearchInput`)

```html
<input
  class="w-full pl-10 pr-10 py-2.5 rounded-md text-sm outline-none transition-all"
  style="background-color: var(--color-surface-container-lowest);
         border: 1px solid var(--color-outline-variant);
         color: var(--color-on-surface);"
/>
```

> **Regla:** forma `rounded-md` (no `rounded-full`), fondo `surface-container-lowest`, borde sólido `outline-variant`.

### Tablas (`BaseTable`)

- **Wrapper:** `rounded-lg overflow-hidden` + `bg-surface-container-lowest` + `box-shadow: var(--shadow-sm)`
- **Header:** `bg-surface-container-low`, `py-5`, `text-xs font-bold uppercase tracking-widest`, `color: var(--color-outline)`
- **Filas:** `border-bottom: 1px solid var(--color-hairline-soft)`, hover `hover:bg-surface-container-low` (Tailwind class)
- **Celdas:** `px-6 py-4`

> **Regla:** usar **siempre** `hover:bg-surface-container-low` como clase Tailwind. Prohibido `onmouseover="this.style.backgroundColor = '...'"`.

### Botones de acción en tabla

Botones de ícono dentro de filas (editar, eliminar, confirmar, etc.). **No usar `BaseButton`** para estas acciones — usar el patrón directo:

```html
<button
  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
  style="background-color: var(--color-surface-container-high)"
  title="Editar"
>
  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">edit</span>
</button>
```

**Paleta semántica:**

| Tipo de acción | Clase / Style fondo | Clase / Style ícono |
|---------------|---------------------|---------------------|
| Editar | `style="background-color: var(--color-surface-container-high)"` | `style="color: var(--color-on-surface-variant)"` |
| Eliminar / Desactivar | `style="background-color: var(--color-error-container)"` | `style="color: var(--color-error)"` |
| Acción positiva (confirmar, aprobar) | `class="bg-violet-100"` | `class="text-violet-700"` |
| Alerta / Gestionar | `class="bg-amber-50"` | `class="text-amber-800"` |
| Ver / Navegar | `class="bg-blue-100"` | `class="text-blue-700"` |

> **Reglas:**
> - Tamaño fijo `w-9 h-9` — nunca `w-7` ni `w-8`
> - Siempre `title` con descripción legible de la acción
> - Ícono siempre `font-size: 18px`
> - Hover: `hover:scale-105 active:scale-95` — nunca `hover:opacity-80`
> - Fondo semántico siempre visible (nunca transparente)
> - Usar CSS vars con `style=` para colores del design system; Tailwind para colores semánticos externos (amber, violet, blue)

### Modales (`BaseModal`)

```html
<Teleport to="body">
  <Transition name="fade">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- overlay -->
      <div class="absolute inset-0" style="background-color: rgba(24, 28, 32, 0.5)"
           @click.self="close" />
      <!-- panel -->
      <div class="relative w-full rounded-xl overflow-hidden"
           style="background-color: var(--color-surface-container-lowest);
                  box-shadow: var(--shadow-xl);">
        <!-- header -->
        <div class="flex items-center justify-between px-8 pt-8 pb-6"
             style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)">
          <h3 class="text-xl font-extrabold"
              style="font-family: var(--font-headline); color: var(--color-primary)">Título</h3>
          <button class="p-1 rounded-full transition-colors" style="color: var(--color-outline)">
            <span class="material-symbols-outlined" style="font-size: 22px">close</span>
          </button>
        </div>
        <!-- body (scrollable) -->
        <form class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">...</form>
        <!-- footer -->
        <div class="px-8 py-6 flex justify-end gap-3"
             style="border-top: 1px solid rgba(196, 197, 213, 0.2)">...</div>
      </div>
    </div>
  </Transition>
</Teleport>
```

| Tamaño | `max-w` | Uso |
|--------|---------|-----|
| `sm` | `max-w-sm` | **Siempre** para confirmaciones y alertas destructivas |
| `lg` | `max-w-2xl` | **Siempre** para cualquier formulario CRUD (crear, editar, gestionar) |
| `md` / `xl` | — | Reservados — no usar salvo caso excepcional documentado |

> **Reglas:**
> - Siempre `rounded-xl overflow-hidden`.
> - Siempre header con borde inferior `rgba(196, 197, 213, 0.2)`.
> - Título del modal en `color: var(--color-primary)`.
> - Body scrollable con `max-h-[70vh] overflow-y-auto`.
> - Footer con borde superior.
> - No usar `backdrop-blur-sm` en el overlay (inconsistente con el resto del sistema).
> - **Nunca usar `size="md"` o `size="xl"` para formularios nuevos** — elegir entre `sm` (confirmación) o `lg` (formulario).

### Formularios

- **Input estándar:**
  ```html
  <input
    class="px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
    :style="inputStyle(!!errors.campo)"
  />
  ```
- **Helper `inputStyle`:** importar de `@/composables/useFieldStyles` (no copiar). Usa `var(--radius-md)`, borde/fondo por token y fondo de error `color-mix(error 8%, surface)`. El focus ring lo da la regla global de campos en `main.css`.
- **Select:** igual que input pero con `appearance-none` (o usar `SearchableSelect`/`MultiSelect`).
- **Label:** `<label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">`
- **Error text:** `<p class="text-xs font-medium" style="color: var(--color-error)">...</p>`

> **Regla:** todos los campos usan alto fijo `h-12` (48px) + `appearance-none shadow-none` y `var(--radius-md)`. No mezclar `px-4 py-3` ni `px-3 py-2.5` (estilos antiguos).

---

## Routing

```typescript
// router/index.ts
/login     → LoginView    (requiresGuest: true)
/          → DashboardView (requiresAuth: true)
/pacientes → PacientesView (requiresAuth: true)
```

**Guard:**
- Si `requiresAuth` y no autenticado → redirige a `/login`
- Si `requiresGuest` y autenticado → redirige a `/`

**Agregar una nueva ruta autenticada:**
```typescript
{
  path: '/nueva-seccion',
  component: () => import('@/views/NuevaSección.vue'),
  meta: { requiresAuth: true }
}
```

---

## Integración con backend

### URL base
- Definida en `.env.local`: `VITE_API_URL=http://localhost:5038`
- El proxy de Vite redirige `/api/*` al backend. No usar la URL directamente.

### Instancia HTTP (`api/http.ts`)
```typescript
import http from '@/api/http'

// Ejemplo directo
const response = await http.get('/api/pacientes')
```

### Composable useHttp (`composables/useHttp.ts`)
Retorna `data` directamente (sin el wrapper de axios):
```typescript
const { get, post, put, delete: del } = useHttp()

const patients = await get<Patient[]>('/api/patients')
const created  = await post<Patient>('/api/patients', payload)
const updated  = await put<Patient>(`/api/patients/${id}`, payload)
await del(`/api/patients/${id}`)
```

### JWT — adjuntar token
El interceptor de request en `http.ts` inyecta automáticamente el token:
```
Authorization: Bearer {token}
```
No hace falta pasarlo manualmente.

### Manejo de errores
El interceptor de response normaliza errores del backend:
- Extrae `response.data` (string o `{ message }` o `{ error }`)
- Sin conexión → `"No se pudo conectar con el servidor"`

Capturá errores con `try/catch` en los servicios. Mapear status codes a mensajes user-friendly:
```typescript
} catch (err: any) {
  if (err.response?.status === 401) errorMessage.value = 'Credenciales incorrectas'
  else if (err.response?.status === 409) errorMessage.value = 'El registro ya existe'
  else errorMessage.value = err.message ?? 'Error inesperado'
}
```

---

## Autenticación

### Store Pinia (`stores/auth.ts`)
```typescript
const auth = useAuthStore()

auth.token           // string | null — JWT
auth.user            // { email: string, roles: string[] } | null
auth.isAuthenticated // boolean (computed)

auth.setSession(jwtToken, { email, roles })  // login exitoso
auth.clearSession()                           // logout
```

### Persistencia
Token y user se guardan en `localStorage` con claves `siga_token` y `siga_user`. Se rehidratan automáticamente al cargar la app.

### Flujo de login
1. Llamar `POST /api/auth/login` con `{ email, password }`
2. Respuesta: `{ email, jwtToken, roleClaims }`
3. `auth.setSession(jwtToken, { email, roles: roleClaims })`
4. Redirigir a `/`

---

## Patrón de servicio

Cada entidad tiene su servicio en `src/services/`. Ejemplo de estructura:
```typescript
// services/roleService.ts
import { useHttp } from '@/composables/useHttp'

const { get, post, put, delete: del } = useHttp()

export interface Role {
  id: number
  name: string
}

export interface RoleRequest {
  name: string
}

export const getRoles    = ()                     => get<Role[]>('/api/roles')
export const getRoleById = (id: number)           => get<Role>(`/api/roles/${id}`)
export const createRole  = (data: RoleRequest)    => post<Role>('/api/roles', data)
export const updateRole  = (id: number, data: RoleRequest) => put<Role>(`/api/roles/${id}`, data)
export const deleteRole  = (id: number)           => del(`/api/roles/${id}`)

export const getRolesByUser   = (userId: number)              => get<Role[]>(`/api/users/${userId}/roles`)
export const assignRoleToUser = (userId: number, roleId: number) => post(`/api/users/${userId}/roles`, { roleId })
export const removeRoleFromUser = (userId: number, roleId: number) => del(`/api/users/${userId}/roles/${roleId}`)
```

---

## Patrón de vista CRUD (referencia: PacientesView.vue)

Toda vista de listado + CRUD sigue este patrón:

### Estructura del template
```
<main layout>
  ├── Encabezado (`flex items-start justify-between mb-8` — h1 text-4xl mb-2 + botón primary lg con ícono 20px — ver design-system.md §11)
  ├── Filtros (FilterChips + SearchInput — ver "Barra de filtros — patrón estándar")
  ├── Tabla responsive (BaseTable)
  │   └── Filas con: avatar/icono · datos · estado badge · acciones (edit/delete)
  ├── Footer "Mostrando X de Y registros"
  ├── Bento cards insight (métricas rápidas)
  └── FAB button (esquina inferior derecha)

  <!-- Fuera del layout, con Teleport -->
  ├── Modal Crear   (BaseModal size="lg")
  ├── Modal Editar  (BaseModal size="lg")
  └── Modal Eliminar (BaseModal size="sm")
```

### Estado reactivo en `<script setup>`
```typescript
// Datos
const items = ref<T[]>([])
const isLoading = ref(false)

// Filtros
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
const filteredItems = computed(() => { /* ... */ })

// Modales
const showCreateModal = ref(false)
const showEditModal   = ref(false)
const showDeleteModal = ref(false)
const selectedItem    = ref<T | null>(null)

// Formularios
const createForm = reactive({ /* campos */ })
const editForm   = reactive({ /* campos */ })

// Errores / loading por operación
const createError = ref('')
const isCreating  = ref(false)
```

### Modal con Teleport
```html
<Teleport to="body">
  <Transition name="fade">
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- overlay -->
      <div class="absolute inset-0 bg-black/40" @click="showCreateModal = false" />
      <!-- card -->
      <div class="relative bg-white rounded-[1rem] p-6 w-full max-w-md shadow-xl">
        <!-- contenido -->
      </div>
    </div>
  </Transition>
</Teleport>
```

### Avatar y badge de estado
Importar de `@/composables/useFieldStyles` (no redefinir con hexes):
```typescript
import { avatarStyle, initials, statusStyle } from "@/composables/useFieldStyles"
// avatarStyle(id) → { bg, color } con tinte que adapta a claro/oscuro
// statusStyle(isActive) → { bg, dot, text } con tokens success/neutral
```

### Helpers de formato
```typescript
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
```

---

## Componentes reutilizables

### KpiCard
```html
<KpiCard
  title="Pacientes Activos"
  value="248"
  icon="person"
  badge="+12"
  badgeType="positive"   <!-- 'positive' | 'neutral' | 'critical' -->
  iconColor="var(--color-primary)"
/>
<!-- El fondo del ícono se deriva de iconColor (tinte). iconBg quedó obsoleto. -->
<!-- iconColor debe ser un acento: --color-primary/secondary/tertiary/error/success/info -->

```

### AppSidebar
Incluye nav fija con items: Dashboard, Pacientes, Agenda, Clínica, Inventario, Ventas, Reportes, Usuarios.  
Items no implementados muestran badge `"soon"`.  
Al agregar una nueva sección, añadir el item correspondiente al array `navItems` en `AppSidebar.vue`.

---

## Convenciones

- **`<script setup lang="ts">`** en todos los componentes
- **Servicios** para llamadas a la API — nunca llamar axios directamente desde la vista
- **`useHttp`** composable como intermediario entre servicios y axios
- **Pinia** para estado global (auth). Estado local en `ref`/`reactive` dentro del componente
- **Tailwind** para estilos — usar variables CSS del tema para colores (`var(--color-primary)`) en `style` binding cuando Tailwind no alcance
- **Teleport a body** para todos los modales
- **Soft delete** — no eliminar registros, marcar `isActive = false`
- No exponer el JWT en logs ni en la UI

---

## Endpoints backend disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login JWT |
| POST | /api/auth/register | Registro |
| GET | /api/professionals | Listar profesionales |
| GET/POST | /api/professionals | CRUD profesional |
| PUT/DELETE | /api/professionals/{id} | Actualizar / desactivar |
| GET | /api/patients | Listar pacientes |
| GET/POST | /api/patients | CRUD paciente |
| PUT/DELETE | /api/patients/{id} | Actualizar / desactivar |
| GET | /api/roles | Listar roles |
| GET/POST | /api/roles | CRUD rol |
| PUT/DELETE | /api/roles/{id} | Actualizar / eliminar rol |
| GET | /api/users/{userId}/roles | Roles de un usuario |
| POST | /api/users/{userId}/roles | Asignar rol |
| DELETE | /api/users/{userId}/roles/{roleId} | Quitar rol |

---

## Instrucciones para el asistente

- Respetar el stack: Vue 3 Composition API, TypeScript, Tailwind v4, Pinia
- Nuevas vistas siguen el patrón de `PacientesView.vue` (tabla + modales + FAB)
- Nuevos servicios siguen el patrón de `patientService.ts` + `useHttp`
- Usar los colores del tema (CSS variables), no colores hardcoded
- Usar Material Symbols Outlined para iconos
- No instalar librerías de componentes UI — todo se construye con Tailwind
- Registrar las nuevas rutas en `router/index.ts` con `meta: { requiresAuth: true }`
- Agregar el item de navegación correspondiente en `AppSidebar.vue`

## Evitar
- No usar Options API ni `defineComponent`
- No llamar `axios` directamente — usar `useHttp` o los servicios
- No hardcodear colores fuera del tema
- No poner lógica de negocio en el template
- No acceder a `localStorage` directamente — usar el auth store
