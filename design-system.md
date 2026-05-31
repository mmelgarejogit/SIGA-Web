# Design System — Vue Corporate App
> Generado a partir del código fuente real. Usar como referencia para todas las páginas nuevas.

---

## 1. Tokens de Color (CSS Variables)

Toda la app usa variables CSS con naming de Material Design 3. **Nunca usar colores hardcodeados** salvo las excepciones documentadas abajo.

### Superficies
| Variable | Uso |
|---|---|
| `--color-surface` | Fondo principal de página (`<main>`, `<body>`) |
| `--color-surface-container-lowest` | Tablas, tarjetas principales |
| `--color-surface-container-low` | Cards de insight, filas de toggle |
| `--color-surface-container-high` | Hover de botones ghost/paginación |
| `--color-surface-container-highest` | Badge "Inactivo" background |

### Texto
| Variable | Uso |
|---|---|
| `--color-on-surface` | Texto primario, valores importantes, `<strong>` |
| `--color-on-surface-variant` | Texto secundario, subtítulos, metadatos |
| `--color-outline` | Labels de formulario, texto terciario, ellipsis |
| `--color-outline-variant` | Bordes de inputs en estado normal |

### Marca
| Variable | Uso |
|---|---|
| `--color-primary` | Botón primario, página activa en paginador, avatar 1, ícono principal |
| `--color-secondary` | Avatar 2, íconos secundarios |
| `--color-tertiary` | Avatar 3 |
| `--color-on-primary` | Texto sobre botón primario (normalmente blanco) |

### Semánticos
| Variable | Uso |
|---|---|
| `--color-error` | Borde de input con error, texto de error, ícono de error |
| `--color-error-container` | Fondo de alertas de error, fondo del ícono de modal destructivo |
| `--color-on-error-container` | Texto dentro de alertas de error |

### Colores hardcodeados (excepciones aceptadas)
```
#dcfce7   → badge "Activo" background  (verde claro)
#16a34a   → badge "Activo" dot
#166534   → badge "Activo" texto
#fff0c2   → banner warning background
#7a5000   → banner warning texto
#FFF8F7   → input con error background
```
> Estas excepciones existen porque los tokens semánticos de éxito/warning aún no están definidos en el tema. Cuando se agreguen `--color-success-container` y `--color-warning-container`, migrar a ellos.

---

## 2. Tipografía

**Font stack:** heredado del sistema (no se declara explícitamente en esta página).

### Escala de uso
| Elemento | Clases Tailwind | Notas |
|---|---|---|
| Page title (H1) | `text-4xl font-extrabold tracking-tight` | Solo 1 por página |
| Page subtitle | `font-medium` + `color: --color-on-surface-variant` | Debajo del H1 |
| Label de formulario | `text-xs font-bold uppercase tracking-wider` + `color: --color-outline` | Siempre uppercase |
| Nombre en tabla | `font-bold text-sm` + `color: --color-on-surface` | Fila principal |
| Metadato en tabla | `text-xs` + `color: --color-on-surface-variant` | Email/teléfono bajo el nombre |
| Celda normal | `text-sm font-medium` | C.I., fechas |
| Stat de insight card | `text-3xl font-black` | Números grandes en cards |
| Label de stat | `text-xs font-bold uppercase tracking-widest` + `color: --color-outline` | Debajo del número |
| Texto de modal destructivo | `text-sm` + `color: --color-on-surface-variant` | Centrado |
| Error de campo | `text-xs font-medium` + `color: --color-error` | Debajo del input |

---

## 3. Espaciado y Layout

### Estructura de página
```
<main style="margin-left: var(--sidebar-width); padding-top: 64px">
  <div class="p-8">          ← padding interior de página
    <!-- Page header -->     ← mb-8
    <!-- Filters + Search --> ← mb-8
    <!-- Contenido -->
  </div>
</main>
```

### Reglas de espaciado
- Separación entre secciones principales: `mb-8`
- Gap entre columnas de formulario: `gap-4`
- Padding interno de cards/tabla-footer: `px-6 py-4`
- Padding interno de modales/banners: `px-4 py-3`
- Separación entre campos de formulario: `space-y-5`
- Gap dentro de un campo (label → input → error): `gap-1.5`

### Border radius
| Elemento | Valor |
|---|---|
| Tabla, cards, modales | `rounded-2xl` |
| Inputs de formulario (text, select, date, textarea) | `border-radius: 12px` vía `inputStyle()` — **no usar** `rounded-xl` (en este proyecto vale 3rem) |
| Dropdowns (SearchableSelect, DateRangeBar, RowContextMenu) | `border-radius: 12px` |
| Filtros de barra (FilterChips, SearchableSelect en toolbar) | `border-radius: 8px` |
| Avatares, badges de estado, botones de paginación | `rounded-full` |

> **Importante:** `--radius-xl` está definido como `3rem` en este proyecto. Usar siempre `border-radius: 12px` inline o vía `inputStyle()` para campos de formulario — **nunca** `rounded-xl`.

---

## 4. Componentes Base

### `<BaseButton>`

**Props:**
- `variant`: `primary` | `secondary` | `ghost` | `danger`
- `size`: `sm` | `md` (default) | `lg`
- `disabled`: boolean

**Reglas de uso:**
- Botón principal de página → `variant="primary" size="lg"` con ícono a la izquierda
- Acciones de tabla (editar/eliminar) → `variant="ghost" size="sm"` con solo ícono
- Footer de modales → `variant="secondary"` (cancelar) + `variant="primary"` (confirmar)
- Modales destructivos → `variant="danger"` para la acción destructiva, ambos con `class="flex-1"`
- Estado cargando: mostrar spinner SVG animado + texto "Guardando..." o acción en gerundio

**Spinner estándar (copiar tal cual):**
```vue
<svg v-if="isSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
</svg>
{{ isSaving ? "Guardando..." : "Guardar" }}
```

### `<BaseModal>`

**Props:**
- `show`: boolean
- `title`: string
- `size`: `sm` | `md` | `lg`
- `@close`: evento al cerrar

**Slots:**
- `default` → cuerpo del modal (formularios, texto)
- `footer` → botones de acción

**Tamaños por caso de uso:**
- Formularios de crear/editar → `size="lg"`
- Confirmaciones destructivas → `size="sm"`

**Modal destructivo — estructura estándar del body:**
```vue
<div class="text-center">
  <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
       style="background-color: var(--color-error-container)">
    <span class="material-symbols-outlined"
          style="color: var(--color-error); font-size: 28px">ICONO</span>
  </div>
  <p class="text-sm" style="color: var(--color-on-surface-variant)">
    Texto de confirmación con <strong style="color: var(--color-on-surface)">nombre</strong>.
  </p>
</div>
```

### `<BaseTable>`

**Props:**
- `columns`: `{ key, label }[]`
- `items`: array
- `loading`: boolean
- `emptyText`: string
- `@row-click`: evento con el item

**Columnas de acción:** usar `key: "acciones"`, `label: "Acciones"`. Usar siempre `RowContextMenu` para las acciones de fila — ver sección 17.

**Slots de celda:** `#nombre="{ item: p }"`, `#ci="{ item: p }"`, etc.

**Wrapper de tabla:**
```vue
<div class="rounded-2xl overflow-hidden"
     style="background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196,197,213,0.25);
            outline: 1px solid rgba(196,197,213,0.15);">
  <BaseTable ... />
  <!-- footer de paginación -->
</div>
```

### `<FilterTabs>`

```vue
<FilterTabs
  v-model="activeFilter"
  :tabs="[
    { label: 'Todos',    value: 'todos' },
    { label: 'Activos',  value: 'activos' },
    { label: 'Inactivos', value: 'inactivos' },
  ]"
/>
```

### `<SearchInput>`

```vue
<SearchInput v-model="searchQuery" placeholder="Buscar por ..." />
```

---

## 5. Formularios e Inputs

### Input estándar
```vue
<div class="flex flex-col gap-1.5">
  <label class="text-xs font-bold uppercase tracking-wider"
         style="color: var(--color-outline)">
    Nombre del campo *
  </label>
  <input
    v-model="form.campo"
    type="text"
    placeholder="Placeholder"
    class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
    :style="inputStyle(!!errors.campo)"
  />
  <p v-if="errors.campo" class="text-xs font-medium" style="color: var(--color-error)">
    {{ errors.campo }}
  </p>
</div>
```

### Reglas de aspecto para campos de formulario

- **Alto fijo:** `h-12` (48px) en todos los campos — text, tel, email, select, date. Garantiza que todos los campos tengan la misma altura independientemente del browser.
- **Border radius:** siempre `border-radius: 12px` vía `inputStyle()`. **No usar** `rounded-xl` (en este proyecto = 3rem).
- **Sin decoraciones nativas:** `appearance-none shadow-none` elimina el inset shadow y el estilo nativo del browser, dando un aspecto plano y rectangular.
- **Textarea:** no usa `h-12` (es multi-línea), pero sí `appearance-none shadow-none` y `border-radius: 12px`.
- **Campos de solo lectura** (ej: CI no editable): mismo aspecto pero con fondo `var(--color-surface-container-low)`, texto `var(--color-on-surface-variant)` y `cursor-not-allowed`.

### Función `inputStyle` (copiar en cada página)
```ts
function inputStyle(hasError: boolean) {
  const base = 'border-radius: 12px; '
  return hasError
    ? base + 'border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;'
    : base + 'border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);'
}
```

### Campo de solo lectura (no editable)
```vue
<input
  :value="item.ci"
  type="text"
  readonly
  class="px-4 h-12 text-sm outline-none appearance-none shadow-none cursor-not-allowed"
  style="border-radius: 12px; border: 1px solid var(--color-outline-variant);
         color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low);"
/>
```

### Toggle de estado
```vue
<div class="flex items-center justify-between px-4 py-3 rounded-xl"
     style="background-color: var(--color-surface-container-low)">
  <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
    Etiqueta
  </span>
  <button type="button" @click="form.isActive = !form.isActive"
          class="relative w-12 h-6 rounded-full transition-all"
          :style="form.isActive
            ? 'background-color: var(--color-primary);'
            : 'background-color: var(--color-outline-variant);'">
    <span class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          :style="form.isActive ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'">
    </span>
  </button>
</div>
```

### Grid de 2 columnas (formularios)
```vue
<div class="grid grid-cols-2 gap-4">
  <!-- campo izquierdo -->
  <!-- campo derecho -->
</div>
```

---

## 6. Alertas y Banners

### Error (rojo)
```vue
<div class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
     style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
  <span class="material-symbols-outlined" style="font-size: 18px">error</span>
  {{ mensajeDeError }}
</div>
```

### Warning (amarillo — excepción de color hardcodeado)
```vue
<div class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
     style="background-color: #fff0c2; color: #7a5000">
  <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
  {{ mensajeDeWarning }}
</div>
```

> Ambos banners usan `rounded-2xl`, `px-4 py-3`, ícono de 18px a la izquierda, `text-sm font-medium`.

---

## 7. Badges de Estado

```vue
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`">
  <span class="w-1.5 h-1.5 rounded-full"
        :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
  {{ statusStyle(item.isActive).label }}
</span>
```

```ts
function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: '#dcfce7', dot: '#16a34a', text: '#166534', label: 'Activo' }
    : { bg: 'var(--color-surface-container-highest)', dot: 'var(--color-outline)',
        text: 'var(--color-on-surface-variant)', label: 'Inactivo' }
}
```

---

## 8. Avatares con Iniciales

```ts
const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.06)',   color: 'var(--color-primary)'   },
  { bg: 'rgba(0,103,128,0.06)',  color: 'var(--color-secondary)' },
  { bg: 'rgba(32,0,177,0.06)',   color: 'var(--color-tertiary)'  },
  { bg: 'rgba(117,118,132,0.08)',color: 'var(--color-outline)'   },
]

function avatarStyle(item: { id?: number }) {
  const idx = (item.id ?? 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]!
}

function initials(item: { firstName: string; lastName: string }) {
  return `${item.firstName[0] ?? ''}${item.lastName[0] ?? ''}`.toUpperCase()
}
```

```vue
<div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
     :style="`background-color: ${avatarStyle(item).bg}; color: ${avatarStyle(item).color};`">
  {{ initials(item) }}
</div>
```

---

## 9. Paginación

### Estructura obligatoria

El footer de paginación va **dentro** del wrapper de la tabla (después de `</BaseTable>` pero antes del `</div>` de cierre):

```vue
<!-- Tabla + footer en el mismo contenedor -->
<div class="rounded-2xl overflow-hidden"
     style="background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
            outline: 1px solid rgba(196, 197, 213, 0.15);">
  <BaseTable ... />

  <!-- Footer: conteo + paginador -->
  <div v-if="items.length > 0" ...>
    ...
  </div>
</div>
```

### Lógica (computed)
```ts
const PAGE_SIZE = 10   // estándar de toda la app
const currentPage = ref(1)
const totalPages  = ref(1)  // viene del backend, o computed para client-side
const totalCount  = ref(0)

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

// Máx 7 botones con ellipsis automática
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})
```

### Template (footer de tabla)
```vue
<!-- Footer: conteo + paginador -->
<div
  v-if="items.length > 0"
  class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
  style="border-top: 1px solid rgba(196, 197, 213, 0.12);
         background-color: var(--color-surface-container-lowest);"
>
  <!-- Conteo -->
  <span class="text-sm" style="color: var(--color-on-surface-variant)">
    Mostrando
    <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
    de
    <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
    registros
  </span>

  <!-- Paginador -->
  <div v-if="totalPages > 1" class="flex items-center gap-1">
    <!-- Anterior -->
    <button
      @click="currentPage--; load()"
      :disabled="currentPage === 1"
      class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
      style="color: var(--color-on-surface-variant)"
    ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>

    <!-- Números + ellipsis -->
    <template v-for="p in visiblePages" :key="p">
      <span v-if="p === '...'"
            class="w-9 h-9 flex items-center justify-center text-sm"
            style="color: var(--color-outline)">…</span>
      <button
        v-else
        @click="currentPage = (p as number); load()"
        class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
        :class="currentPage === p
          ? 'bg-primary text-white'
          : 'text-on-surface-variant hover:bg-surface-container-high'"
      >{{ p }}</button>
    </template>

    <!-- Siguiente -->
    <button
      @click="currentPage++; load()"
      :disabled="currentPage === totalPages"
      class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
      style="color: var(--color-on-surface-variant)"
    ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
  </div>
</div>
```

### Reglas
- **Nunca** usar `BaseButton` para los controles de paginación — usar `<button>` con clases directas.
- **Nunca** usar `onmouseover`/`onmouseout` inline — usar `hover:bg-surface-container-high` de Tailwind.
- La página activa usa clases Tailwind: `bg-primary text-white`.
- Las páginas inactivas usan: `text-on-surface-variant hover:bg-surface-container-high`.
- Prev/Next deshabilitados: `disabled:opacity-30`.
- `rangeStart` y `rangeEnd` son siempre `computed`, nunca valores en template.
- Al cambiar filtros o búsqueda, resetear `currentPage.value = 1` antes de cargar.
- Para paginación client-side (MarcasView, ModelosView): `totalCount` y `totalPages` son `computed` sobre el array filtrado.

---

## 10. Cards de Insight (Bento)

```vue
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
  <div class="p-8 rounded-2xl flex flex-col justify-between"
       style="background-color: var(--color-surface-container-low); height: 192px">
    <span class="material-symbols-outlined"
          style="color: var(--color-primary); font-size: 32px; width: 32px; height: 32px">
      ICONO
    </span>
    <div>
      <div class="text-3xl font-black" style="color: var(--color-on-surface)">
        {{ valorNumerico }}
      </div>
      <div class="text-xs font-bold uppercase tracking-widest mt-1"
           style="color: var(--color-outline)">
        Etiqueta
      </div>
    </div>
  </div>
</div>
```

---

## 11. Page Header (estructura estándar)

### Botón único
```vue
<div class="flex items-start justify-between mb-8">
  <div>
    <h1 class="text-4xl font-extrabold tracking-tight mb-2">Título de la Página</h1>
    <p class="font-medium" style="color: var(--color-on-surface-variant)">
      Descripción breve de la sección.
    </p>
  </div>
  <BaseButton variant="primary" size="lg" @click="abrirModal">
    <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
    Acción Principal
  </BaseButton>
</div>
```

### Múltiples botones
```vue
<div class="flex items-start justify-between mb-8">
  <div>
    <h1 class="text-4xl font-extrabold tracking-tight mb-2">Título de la Página</h1>
    <p class="font-medium" style="color: var(--color-on-surface-variant)">
      Descripción breve de la sección.
    </p>
  </div>
  <div class="flex items-center gap-3">
    <BaseButton variant="secondary" size="lg" @click="accionSecundaria">
      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">icono</span>
      Acción Secundaria
    </BaseButton>
    <BaseButton variant="primary" size="lg" @click="accionPrincipal">
      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
      Acción Principal
    </BaseButton>
  </div>
</div>
```

### Reglas
- `h1`: clases `text-4xl font-extrabold tracking-tight mb-2` — **sin** `style="color: var(--color-on-surface)"`, el color hereda.
- Subtítulo: solo `font-medium` + `style="color: var(--color-on-surface-variant)"` — **sin** `text-sm` ni `mt-*`.
- Botón principal (crear/agregar): `variant="primary" size="lg"`.
- Botón secundario (acción complementaria en el mismo header): `variant="secondary" size="lg"`.
- Botón utilitario (no CRUD, ej: "Actualizar", "Exportar"): `variant="secondary" size="sm"`, ícono `style="font-size:18px"`.
- Ícono en botones `lg`: siempre `style="width:20px;height:20px;font-size:20px"`.
- Wrapper de múltiples botones: `<div class="flex items-center gap-3">`.
- Wrapper del header: `flex items-start justify-between mb-8` (no `items-end`).

---

## 12. Filtros + Búsqueda (Toolbar)

```vue
<div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
  <FilterTabs v-model="activeFilter" :tabs="tabs" />
  <SearchInput v-model="searchQuery" placeholder="Buscar por ..." />
</div>
```

---

## 13. Iconografía

**Librería:** Material Symbols Outlined (`material-symbols-outlined`)

**Tamaños estándar:**
| Contexto | font-size | width/height |
|---|---|---|
| Botón de acción / banner | 18px | — |
| Botón primario | 20px | 20px × 20px |
| Ícono de modal destructivo | 28px | — |
| Ícono de insight card | 32px | 32px × 32px |

**Regla:** siempre declarar `font-size` inline. Para íconos con tamaño fijo, agregar también `width` y `height`.

---

## 14. Búsqueda con Debounce

```ts
let searchTimer = 0
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    currentPage.value = 1
    loadItems()
  }, 350)
})
```

---

## 15. Validación de Formularios

### Regexes comunes
```ts
const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

### Patrón de errores tipados
```ts
type FormErrors = {
  campo1?: string
  campo2?: string
}
const errors = ref<FormErrors>({})

function validate(): boolean {
  const e: FormErrors = {}
  // ... reglas
  errors.value = e
  return Object.keys(e).length === 0
}
```

### Reglas de validación estándar
- Campos de texto requeridos: verificar `.trim()` antes de regex
- Máximo longitud: nombre/apellido 120 chars, CI 30 chars
- Email: regex + solo si no está vacío
- Contacto opcional-pero-requerido-uno: validar que al menos teléfono o email esté presente

---

## 16. Dark Mode

**Estado actual:** pendiente de definición. Las variables CSS con naming de MD3 soportan dark mode nativo si el tema lo define. Al implementarlo:

1. Definir valores dark para todas las variables en `:root.dark` o `@media (prefers-color-scheme: dark)`
2. Los colores hardcodeados (ver sección 1) deberán migrar a variables semánticas
3. El color `#dcfce7 / #16a34a / #166534` (badge activo) es el principal a resolver — usar `--color-success-container` / `--color-on-success-container`

---

## 17. Menú Contextual de Fila (⋮)

Usar cuando una fila de tabla tiene 3 o más acciones. Reemplaza los botones ghost individuales por un botón ⋮ que despliega un dropdown.

### Cuándo usar

Usar `RowContextMenu` en **todas** las columnas de acciones de tabla, independientemente del número de acciones por fila.

### Componente RowContextMenu.vue

Crear en `src/components/RowContextMenu.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export type ContextMenuItem =
  | { type: 'item'; label: string; icon: string; action: () => void; danger?: boolean; hidden?: boolean }
  | { type: 'separator' }

const props = defineProps<{ items: ContextMenuItem[] }>()

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const btnRef  = ref<HTMLElement | null>(null)
const menuPos = ref({ top: '0px', left: '0px' })

const MENU_WIDTH = 180

function toggle() {
  if (!open.value && btnRef.value) {
    const rect = btnRef.value.getBoundingClientRect()
    menuPos.value = {
      top:  `${rect.bottom + 4}px`,
      left: `${Math.max(4, rect.right - MENU_WIDTH)}px`,
    }
  }
  open.value = !open.value
}

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node) &&
      btnRef.value  && !btnRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

function runAction(item: ContextMenuItem) {
  if (item.type === 'item') { item.action(); open.value = false }
}

onMounted(()  => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div style="position: relative; display: inline-flex;" @click.stop>
    <button
      ref="btnRef"
      type="button"
      @click.stop="toggle"
      class="ctx-trigger"
      :class="{ active: open }"
      aria-label="Más acciones"
      :aria-expanded="open"
    >
      <span class="material-symbols-outlined" style="font-size: 20px;">more_vert</span>
    </button>

    <Transition name="ctx">
      <div v-if="open" ref="menuRef" class="ctx-menu" role="menu" :style="menuPos">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.type === 'separator'" class="ctx-sep"></div>
          <button
            v-else-if="!item.hidden"
            type="button"
            class="ctx-item"
            :class="{ danger: item.danger }"
            role="menuitem"
            @click="runAction(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px;">{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ctx-trigger {
  width: 32px; height: 32px; border-radius: 6px;
  border: none; background: transparent;
  color: var(--color-outline); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.ctx-trigger:hover,
.ctx-trigger.active {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.ctx-menu {
  position: fixed; z-index: 9999;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px; padding: 4px;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.ctx-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 12px; border-radius: 8px;
  border: none; background: transparent;
  font-size: 13px; font-family: inherit;
  color: var(--color-on-surface); cursor: pointer;
  text-align: left; transition: background 0.12s;
}
.ctx-item:hover { background: var(--color-surface-container-high); }
.ctx-item.danger { color: var(--color-error); }
.ctx-item.danger:hover { background: var(--color-error-container); }
.ctx-item .material-symbols-outlined { color: var(--color-outline); }
.ctx-item.danger .material-symbols-outlined { color: var(--color-error); }

.ctx-sep { height: 1px; background: var(--color-outline-variant); margin: 4px 0; opacity: 0.4; }

.ctx-enter-active, .ctx-leave-active { transition: opacity 0.12s, transform 0.12s; }
.ctx-enter-from, .ctx-leave-to { opacity: 0; transform: translateY(-4px) scale(0.97); }
</style>
```

### Uso en una página

```vue
<script setup lang="ts">
import RowContextMenu, { type ContextMenuItem } from '@/components/RowContextMenu.vue'

function menuItems(p: Patient): ContextMenuItem[] {
  return [
    { type: 'item', label: 'Ver detalle',  icon: 'visibility',   action: () => router.push(`/pacientes/${p.id}`) },
    { type: 'item', label: 'Editar',       icon: 'edit',         action: () => openEditModal(p),
      hidden: !auth.hasPermission('editar_paciente') },
    { type: 'separator' },
    { type: 'item', label: 'Desactivar',   icon: 'person_off',   action: () => openDeleteModal(p),
      danger: true, hidden: !auth.hasPermission('desactivar_paciente') },
  ]
}
</script>

<template>
  <!-- Dentro del slot #acciones de BaseTable -->
  <template #acciones="{ item: p }">
    <div class="flex justify-end">
      <RowContextMenu :items="menuItems(p)" />
    </div>
  </template>
</template>
```

### Reglas de uso

- La columna "acciones" en `columns` mantiene `label: ""` igual que antes.
- Los permisos se manejan con `hidden: !auth.hasPermission(...)` por ítem, no ocultando el botón ⋮ entero.
- Siempre poner las acciones destructivas al final, separadas con `{ type: 'separator' }`.
- El menú se cierra al hacer click fuera o al ejecutar una acción.
- Usar en todas las tablas con acciones, sin importar cuántas acciones tenga cada fila.

---

## 18. Filtro con Chips Removibles

Reemplaza FilterTabs cuando se necesita multi-selección visible.
El botón disparador muestra un badge con la cantidad activa.
Los chips aparecen inline al lado del botón y son removibles uno a uno.

### Componente FilterChips.vue

Crear en `src/components/FilterChips.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

export type FilterOption = {
  value: string
  label: string
  dot?: string
}

const props = defineProps<{
  modelValue: string[]
  options: FilterOption[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string[]]
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)

const selected = computed(() => props.modelValue)

function toggle() { open.value = !open.value }

function toggleOption(val: string) {
  const next = selected.value.includes(val)
    ? selected.value.filter(v => v !== val)
    : [...selected.value, val]
  emit('update:modelValue', next)
}

function removeChip(val: string) {
  emit('update:modelValue', selected.value.filter(v => v !== val))
}

function clear() {
  emit('update:modelValue', [])
  open.value = false
}

function labelOf(val: string) {
  return props.options.find(o => o.value === val)?.label ?? val
}

function dotOf(val: string) {
  return props.options.find(o => o.value === val)?.dot
}

function onClickOutside(e: MouseEvent) {
  if (
    triggerRef.value && !triggerRef.value.contains(e.target as Node) &&
    dropRef.value    && !dropRef.value.contains(e.target as Node)
  ) open.value = false
}

import { onMounted, onUnmounted } from 'vue'
onMounted(()  => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="fc-wrap">
    <!-- Disparador -->
    <div class="fc-trigger-wrap">
      <button
        ref="triggerRef"
        type="button"
        class="fc-trigger"
        :class="{ open }"
        @click="toggle"
        :aria-expanded="open"
      >
        <span class="material-symbols-outlined" style="font-size:18px">filter_list</span>
        {{ placeholder ?? 'Filtrar' }}
        <span v-if="selected.length" class="fc-badge">{{ selected.length }}</span>
        <span
          class="material-symbols-outlined fc-chevron"
          :class="{ rotated: open }"
          style="font-size:16px"
        >expand_more</span>
      </button>

      <!-- Dropdown -->
      <div v-if="open" ref="dropRef" class="fc-dropdown">
        <p class="fc-group-label">{{ placeholder ?? 'Estado' }}</p>
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="fc-item"
          :class="{ selected: selected.includes(opt.value) }"
          @click="toggleOption(opt.value)"
        >
          <span class="fc-check">
            <span v-if="selected.includes(opt.value)" class="material-symbols-outlined" style="font-size:13px">check</span>
          </span>
          <span v-if="opt.dot" class="fc-dot" :style="`background:${opt.dot}`"></span>
          {{ opt.label }}
        </button>
        <div v-if="selected.length" class="fc-footer">
          <button type="button" class="fc-clear-dd" @click="clear">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Chips -->
    <template v-for="val in selected" :key="val">
      <span class="fc-chip" :data-val="val">
        <span v-if="dotOf(val)" class="fc-chip-dot" :style="`background:${dotOf(val)}`"></span>
        {{ labelOf(val) }}
        <button type="button" class="fc-chip-x" @click="removeChip(val)" :aria-label="`Quitar ${labelOf(val)}`">×</button>
      </span>
    </template>

    <button v-if="selected.length > 1" type="button" class="fc-clear-all" @click="clear">
      Limpiar todo
    </button>
  </div>
</template>

<style scoped>
.fc-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.fc-trigger-wrap { position: relative; }

.fc-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  color: var(--color-on-surface);
  cursor: pointer; transition: background 0.12s;
  font-family: inherit;
}
.fc-trigger:hover { background: var(--color-surface-container-high); }
.fc-trigger.open  { border-color: var(--color-primary); color: var(--color-primary); }

.fc-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 17px; height: 17px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  font-size: 10px; font-weight: 700;
}

.fc-chevron { transition: transform 0.15s; }
.fc-chevron.rotated { transform: rotate(180deg); }

.fc-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 50;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px; padding: 6px;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.fc-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--color-outline);
  padding: 6px 10px 4px; margin: 0;
}

.fc-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 10px; border-radius: 8px;
  border: none; background: transparent;
  font-size: 13px; font-family: inherit;
  color: var(--color-on-surface); cursor: pointer; text-align: left;
  transition: background 0.1s;
}
.fc-item:hover { background: var(--color-surface-container-high); }
.fc-item.selected { color: var(--color-primary); font-weight: 500; }

.fc-check {
  width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
  border: 1.5px solid var(--color-outline-variant);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.fc-item.selected .fc-check { background: var(--color-primary); border-color: var(--color-primary); }

.fc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.fc-footer { border-top: 1px solid var(--color-outline-variant); margin-top: 4px; padding: 6px 6px 2px; display: flex; justify-content: flex-end; opacity: 0.4; }
.fc-clear-dd { font-size: 12px; color: var(--color-on-surface-variant); border: none; background: none; cursor: pointer; font-family: inherit; }
.fc-clear-dd:hover { color: var(--color-error); }

.fc-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 8px;
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-outline-variant);
  border-radius: 20px;
  font-size: 12px; font-weight: 500;
  color: var(--color-on-surface);
  animation: fc-in 0.12s ease;
}
@keyframes fc-in { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }

.fc-chip-dot { width: 6px; height: 6px; border-radius: 50%; }

.fc-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  border: none; background: var(--color-outline-variant);
  color: var(--color-on-surface-variant);
  font-size: 14px; cursor: pointer; padding: 0; line-height: 1;
  transition: background 0.1s;
}
.fc-chip-x:hover { background: var(--color-error-container); color: var(--color-error); }

.fc-clear-all {
  font-size: 12px; color: var(--color-outline);
  border: none; background: none; cursor: pointer; padding: 0 4px;
  font-family: inherit;
}
.fc-clear-all:hover { color: var(--color-error); }
</style>
```

### Uso en una página

```vue
<script setup lang="ts">
import FilterChips from '@/components/FilterChips.vue'

const activeFilters = ref<string[]>([])

const statusOptions = [
  { value: 'activo',    label: 'Activo',    dot: '#16a34a' },
  { value: 'inactivo',  label: 'Inactivo',  dot: 'var(--color-outline)' },
]

const statusParam = computed(() => {
  if (activeFilters.value.includes('activo') && !activeFilters.value.includes('inactivo')) return 'active'
  if (activeFilters.value.includes('inactivo') && !activeFilters.value.includes('activo')) return 'inactive'
  return undefined
})

watch(activeFilters, () => { currentPage.value = 1; loadItems() })
</script>

<template>
  <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
    <FilterChips
      v-model="activeFilters"
      :options="statusOptions"
      placeholder="Estado"
    />
    <SearchInput v-model="searchQuery" placeholder="Buscar..." />
  </div>
</template>
```

### Reglas de uso
- Reemplaza FilterTabs en todas las páginas nuevas.
- El dot de cada opción usa el mismo color que el badge de estado de esa fila.
- Si solo hay un filtro activo, no aparece "Limpiar todo" (solo la X del chip).
- El componente es genérico: pasarle distintos options según la entidad de cada página.

---

## 19. `DateInput` — Selector de Fecha con Formato dd/mm/aaaa

Componente en `src/components/DateInput.vue`.

Reemplaza `<input type="date">` en todos los formularios. Muestra el valor en formato `dd/mm/aaaa`, abre el calendario nativo del browser al hacer clic, y se integra visualmente con los demás campos del formulario.

### Props / Emits
```ts
defineProps<{
  modelValue: string   // yyyy-mm-dd (ISO) o ""
  hasError?: boolean
  placeholder?: string // default: "dd/mm/aaaa"
}>()
defineEmits<{ "update:modelValue": [string] }>()
```

### Uso
```vue
<div class="flex flex-col gap-1.5">
  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
    Fecha de Nacimiento *
  </label>
  <DateInput v-model="form.birthDate" :has-error="!!errors.birthDate" />
  <p v-if="errors.birthDate" class="text-xs font-medium" style="color: var(--color-error)">
    {{ errors.birthDate }}
  </p>
</div>
```

### Comportamiento
- Muestra `dd/mm/aaaa` cuando no hay valor (placeholder en gris).
- Muestra la fecha formateada (ej: `15/06/1990`) cuando hay valor.
- Al hacer clic abre el calendario nativo del browser vía `showPicker()`.
- Emite el valor en formato ISO `yyyy-mm-dd` para la API.
- La `prop` `modelValue` acepta ISO y convierte automáticamente al mostrar.
- `hasError: true` aplica el borde rojo y fondo rosado de `inputStyle()`.

### Aspecto visual
- Mismo alto (48px), `border-radius: 12px`, bordes y fondo que los demás inputs.
- Ícono `calendar_today` a la izquierda.
- El input `type="date"` real queda oculto (`1px × 1px`, `opacity: 0`) anclado en `bottom: 0` del wrapper para que el picker nativo aparezca debajo del botón.

---

## 20. `DateRangeBar` — Barra de Navegación de Fechas con Mini Calendario

Componente en `src/components/DateRangeBar.vue`. Usado en la vista de Agenda.

### Props / Emits
```ts
defineProps<{
  modelValue: Date
  mode: "dia" | "semana" | "mes"
}>()
defineEmits<{
  (e: "update:modelValue", value: Date): void
  (e: "update:mode", value: "dia" | "semana" | "mes"): void
}>()
```

### Uso
```vue
<DateRangeBar v-model="selectedDate" v-model:mode="viewMode" />
```

### Elementos que compone
1. **Navegador de fecha** — botones `chevron_left` / `chevron_right` y etiqueta central clicable.
2. **Botón "Hoy"** — aparece solo cuando no se está viendo hoy (modo día).
3. **Selector de modo** — segmented control Día / Semana / Mes.
4. **Mini calendario flotante** — se abre al clicar la etiqueta de fecha. Es un dropdown posicionado con `position: absolute; top: calc(100% + 8px)` sobre el resto del contenido (no desplaza el layout).

### Mini calendario — aspecto y comportamiento
- Fondo blanco, `border-radius: 16px` (`rounded-2xl`), sombra `0 8px 24px rgba(0,40,142,0.12)`.
- Grilla 7 columnas (Lun–Dom), días del mes anterior/siguiente en `opacity: 0.4`.
- Día seleccionado: fondo `var(--color-primary)`, texto blanco, `border-radius: 8px`.
- Modo semana: días de la semana seleccionada con fondo `color-mix(in srgb, primary 15%, transparent)`.
- Se cierra al seleccionar un día o al hacer clic fuera.
- **Flotante:** `z-index: 50`, nunca empuja el contenido siguiente.

### Regla de posicionamiento del dropdown
El wrapper raíz es `position: relative; display: inline-flex`. El calendario usa:
```css
position: absolute;
top: calc(100% + 8px);
left: 0;
z-index: 50;
min-width: 280px;
```

---

## 21. Checklist para nuevas páginas

- [ ] Layout: `<AppSidebar />` + `<AppHeader />` + `<main style="margin-left: var(--sidebar-width); padding-top: 64px">`
- [ ] Page header con H1, subtítulo y botón de acción principal
- [ ] Toolbar: `<FilterChips>` a la izquierda, `<SearchInput>` a la derecha
- [ ] Tabla envuelta en `rounded-2xl` con `box-shadow` + `outline` estándar
- [ ] Footer de paginación con conteo "Mostrando X–Y de Z"
- [ ] Modales con `<BaseModal>`: crear (`lg`), editar (`lg`), confirmar (`sm`)
- [ ] Footer de modal con `<div class="flex justify-between w-full">` — Cancelar izquierda, Confirmar derecha
- [ ] `inputStyle()` con `border-radius: 12px` presente para todos los inputs
- [ ] Inputs con `h-12 appearance-none shadow-none` (ver §5)
- [ ] Campos de fecha con `<DateInput>` — nunca `<input type="date">` directo
- [ ] Fechas de nacimiento con `<BirthDateInput>` — nunca `<DateInput>` para este caso (ver §23)
- [ ] Campos de solo lectura con estilo grisáceo (ver §5)
- [ ] Selects de búsqueda con `<SearchableSelect>` — nunca `<select>` nativo en formularios
- [ ] Multi-selección con `<MultiSelect>` — nunca chips manuales ni `<select multiple>` (ver §22)
- [ ] Errores de campo con `text-xs font-medium color: --color-error`
- [ ] Banners de error con `rounded-2xl` e ícono de 18px
- [ ] Spinner: `<span class="material-symbols-outlined animate-spin">progress_activity</span>` mientras `isSaving`
- [ ] Permisos verificados con `auth.hasPermission('...')` antes de mostrar acciones
- [ ] Debounce de 350ms en búsqueda
- [ ] Acciones de fila con `<RowContextMenu>` (ver §17)
- [ ] Cards de insight al final (opcional, según la página)

---

## 22. `MultiSelect` — Selector de múltiples valores

Componente en `src/components/MultiSelect.vue`. Usar **siempre** que un campo de formulario requiera selección múltiple. Nunca usar chips manuales ni `<select multiple>`.

### Props / Emits
```ts
defineProps<{
  modelValue: (number | string)[]
  options: MultiSelectOption[]   // { value: number | string; label: string }
  placeholder?: string           // default: "Seleccioná opciones"
  hasError?: boolean
  disabled?: boolean
}>()
defineEmits<{ "update:modelValue": [v: (number | string)[]] }>()
```

### Uso
```vue
<script setup lang="ts">
import MultiSelect, { type MultiSelectOption } from '@/components/MultiSelect.vue'

const especialidadOptions = computed<MultiSelectOption[]>(() =>
  especialidades.value.map(e => ({ value: e.id, label: e.nombre }))
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
      Especialidades
    </label>
    <MultiSelect
      :model-value="form.especialidadIds"
      :options="especialidadOptions"
      placeholder="Seleccioná especialidades"
      @update:model-value="form.especialidadIds = $event as number[]"
    />
  </div>
</template>
```

### Comportamiento
- Trigger muestra: placeholder (vacío) | nombre (1 seleccionado) | "N seleccionados" (N > 1) + badge azul con el conteo.
- Dropdown con buscador — filtra opciones en tiempo real.
- Cada opción tiene checkbox; el dropdown permanece abierto mientras se selecciona.
- Botón "Limpiar selección" aparece al pie cuando hay al menos un valor seleccionado.
- `hasError: true` aplica borde rojo y fondo `#FFF8F7` al trigger (mismo estilo que `inputStyle(true)`).

### Aspecto visual
- Trigger: mismo alto (48px), `border-radius: 12px`, borde y fondo idénticos a `SearchableSelect`.
- Dropdown: `border-radius: 14px`, sombra `0 8px 24px rgba(0,40,142,0.12)`, lista scrolleable con `max-height: 220px`.
- Checkboxes: `16×16px`, `border-radius: 4px`, fondo `--color-primary` cuando seleccionado.

---

## 23. `BirthDateInput` — Selector de fecha de nacimiento

Componente en `src/components/BirthDateInput.vue`. Usar **siempre** para campos de fecha de nacimiento de pacientes. Reemplaza `<DateInput>` en este contexto — el calendario estándar es inutilizable para fechas históricas (navegar mes a mes desde 1985 requiere cientos de clics).

### Diseño
Tres campos en una fila:

```
[ Día ] [    Mes ▾    ] [ Año  ]
  72px      flex:1       88px
```

- **Día**: input numérico (1–31), sin spinner nativo, centrado.
- **Mes**: botón que abre un dropdown con los 12 meses en grilla 2 columnas. Dropdown teleportado al `<body>` con flip automático.
- **Año**: input numérico (1900–año actual), se tipea directamente.

### Props / Emits
```ts
defineProps<{
  modelValue: string   // yyyy-mm-dd o ""
  hasError?: boolean
}>()
defineEmits<{ "update:modelValue": [string] }>()
```

### Uso
```vue
<script setup lang="ts">
import BirthDateInput from '@/components/BirthDateInput.vue'
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
      Fecha de Nacimiento *
    </label>
    <BirthDateInput v-model="form.birthDate" :has-error="!!errors.birthDate" />
    <p v-if="errors.birthDate" class="text-xs font-medium" style="color: var(--color-error)">
      {{ errors.birthDate }}
    </p>
  </div>
</template>
```

### Comportamiento
- Emite `yyyy-mm-dd` cuando los tres campos tienen valores válidos simultáneamente.
- Si cualquier campo queda vacío o fuera de rango, no emite (no borra el valor anterior).
- El campo Año acepta tipeo libre — el usuario puede escribir "1985" directamente.
- El dropdown de Mes usa `Teleport to="body"` + `position: fixed` con flip automático (mide altura real tras render).
- `hasError: true` aplica borde rojo y fondo `#FFF8F7` a los tres campos simultáneamente.
