# Design System — SIGA-Web

> **Fuente de verdad: los tokens en `src/assets/main.css`.** Esta guía documenta cómo usarlos.
> Todo color/sombra/radio/transición sale de un token. **No hardcodear** valores salvo las
> excepciones documentadas (marca fija). Todo lo que usa `var(--color-*)` o utilities de Tailwind
> (`bg-primary`, `text-on-surface`, …) **flipea solo** entre claro y oscuro.

---

## 0. Cómo funciona el theming (Tailwind v4 + dark mode)

`main.css` define los tokens en un bloque `@theme` (valores light) y los **sobrescribe** en `.dark`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-primary: #00288e;            /* valores light */
  --color-surface: #e9edf6;
  --radius-md: 0.75rem;
  --shadow-md: 0 4px 12px rgba(0,40,142,.1);
  /* … */
}

.dark {
  --color-primary: #b8c4ff;            /* overrides dark */
  --color-surface: #0c0f13;
  /* … */
}
```

- La clase `.dark` vive en `<html>`, controlada por `src/stores/theme.ts` + un guard anti-flash
  inline en `index.html`. El toggle (sol/luna) está en `AppHeader`.
- Como utilities **e** inline `style="…var(--color-*)…"` resuelven el mismo token, **ambos flipean**.
- Radius, sombras y motion son estáticos (no cambian entre temas).

---

## 1. Tokens de color

### Marca (fija; no se reasigna, solo se aclara en dark)
| Token | Light | Dark |
|---|---|---|
| `--color-primary` | `#00288e` | `#b8c4ff` |
| `--color-on-primary` | `#ffffff` | `#001453` |
| `--color-primary-container` | `#1e40af` | `#173bab` |
| `--color-secondary` | `#006780` | `#6cd3f7` |
| `--color-tertiary` | `#2000b1` | `#c3c0ff` |

> `--color-primary-container` queda **azul oscuro en ambos temas** → texto/ícono blanco encima es
> legible siempre (se usa así en cajas de ícono).

### Semánticos (cada uno con `container` y `on-container`)
| Familia | `--color-X` | `--color-X-container` | `--color-on-X-container` |
|---|---|---|---|
| `error` | rojo | rojo claro / oscuro | — |
| `success` | verde | verde claro / oscuro | — |
| `warning` | ámbar | ámbar claro / oscuro | — |
| `info` | azul | azul claro / oscuro | — |

Patrón de badge: `background: var(--color-X-container); color: var(--color-on-X-container)`.
Patrón de acento sutil (tinte): `color-mix(in srgb, var(--color-X) 12-16%, transparent)`.

### Superficies — jerarquía de elevación
La página es la superficie **base**; las cards se **elevan** sobre ella.

| Token | Uso | Light | Dark |
|---|---|---|---|
| `--color-surface` / `--color-background` | fondo de página, fondo de inputs | `#e9edf6` | `#0c0f13` |
| `--color-surface-container-lowest` | **cards, tablas, modales** (superficie elevada) | `#ffffff` | `#171c24` |
| `--color-surface-container-low` | cards de insight, filas toggle, hover suave | `#f1f4f9` | `#1c222a` |
| `--color-surface-container` | — | `#eceef3` | `#222932` |
| `--color-surface-container-high` | hover de botones ghost / paginación | `#e6e8ed` | `#2b323c` |
| `--color-surface-container-highest` | badge "Inactivo" | `#e0e2e7` | `#353d48` |

> **Clave de dark mode:** la página (`surface`) es la **más oscura**; las cards (`lowest`) quedan
> **más claras** que la página → resaltan (convención de elevación en dark). En light es al revés
> (cards blancas sobre página gris-azulada). Por eso al pasar el mouse, los hovers se **aclaran en
> dark** y se **oscurecen en light** — comportamiento esperado en ambos.

### Texto y bordes
| Token | Uso | Light | Dark |
|---|---|---|---|
| `--color-on-surface` | texto primario | `#181c20` | `#e1e2e8` |
| `--color-on-surface-variant` | texto secundario | `#444653` | `#c4c6d0` |
| `--color-outline` | labels, texto terciario | `#757684` | `#8e909c` |
| `--color-outline-variant` | bordes de input | `#c4c5d5` | `#44464f` |

### Líneas finas (reemplazan los `rgba(196,197,213,…)` literales)
| Token | Uso |
|---|---|
| `--color-hairline-soft` | separadores de fila/footer (muy sutil) |
| `--color-hairline` | bordes y divisores estándar |
| `--color-hairline-strong` | divisores marcados |

### Foco
`--color-focus-ring` (derivado del primary). El anillo de foco accesible está en `main.css`:
una regla base `:focus-visible` para botones/links, y una regla (sin `@layer`, para ganarle al
utility `shadow-none`) que da box-shadow ring a `input, textarea, select, [data-field]`.
Los triggers custom (SearchableSelect, DateInput) llevan `data-field` para recibir el ring.

### Excepciones de color hardcodeado (intencionales — superficies theme-independent)
- Sidebar (`AppSidebar`): navy `#1e3a5f` en ambos temas.
- Hero del Dashboard (`InsightsPanel`) y card "Reservar turno": gradiente/navy de marca fijo
  (`#00288e`/`#1e40af`) para que el texto blanco siga legible en dark.
- Hero de Login/Register y header de email (`ConfirmarTurnoView`): bandas de marca fijas.
- Logos de Google (botón social) usan sus colores oficiales.

---

## 2. Radius

Escala sana (en `@theme`). **Ya no aplica la vieja regla "rounded-xl prohibido"** — el bug del
`--radius-xl: 3rem` está corregido.

| Token / utility | Valor | Uso |
|---|---|---|
| `--radius-xs` / `rounded-xs` | 6px | dots, badges rectangulares |
| `--radius-sm` / `rounded-sm` | 8px | chips, filtros de toolbar |
| `--radius-md` / `rounded-md` | 12px | **inputs, campos, dropdowns** |
| `--radius-lg` / `rounded-lg` | 16px | **cards, tablas, KpiCard** |
| `--radius-xl` / `rounded-xl` | 20px | **modales, paneles** |
| `--radius-2xl` / `rounded-2xl` | 24px | paneles grandes |
| `--radius-3xl` / `rounded-3xl` | 28px | hero / dashboard |
| `--radius-full` / `rounded-full` | — | avatares, pills, botón primary |

> Inputs/campos: usar `var(--radius-md)` (vía `useFieldStyles`) o `rounded-md`.

---

## 3. Sombras

Tonales con el azul de marca (se profundizan a negro en dark). Utilities: `shadow-sm/md/lg/xl`.

| Token | Uso |
|---|---|
| `--shadow-xs` | borde elevado mínimo |
| `--shadow-sm` | **cards, tablas, KpiCard** |
| `--shadow-md` | dropdowns, menús contextuales |
| `--shadow-lg` | popovers grandes, calendarios, modales secundarios |
| `--shadow-xl` | modales |
| `--shadow-primary` | glow del botón primario |

---

## 4. Motion

| Token | Valor |
|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--duration-fast` | `120ms` |
| `--duration-base` | `180ms` |
| `--duration-slow` | `250ms` |

---

## 5. Tipografía

Fuentes globales definidas en `main.css` (aplicadas en `body` y `h1–h6`). **No declarar
`font-family` inline.**
- `--font-headline`: "Plus Jakarta Sans" (títulos, `h1–h6`).
- `--font-body`: "Manrope" (UI, body).

### Escala de uso
| Elemento | Clases | Color |
|---|---|---|
| Título de página (H1) | `text-4xl font-extrabold tracking-tight mb-2` | hereda |
| Subtítulo | `font-medium` | `--color-on-surface-variant` |
| Título de sección (H3) | `text-xl font-extrabold` | `--color-primary` |
| Label de formulario | `text-xs font-bold uppercase tracking-wider` | `--color-outline` |
| Nombre en tabla | `font-bold text-sm` | `--color-on-surface` |
| Metadato en tabla | `text-xs` | `--color-on-surface-variant` |
| Stat / valor grande | `text-3xl font-black` | `--color-on-surface` |
| Error de campo | `text-xs font-medium` | `--color-error` |

---

## 6. Espaciado y layout

### Estructura de página autenticada
```html
<div class="min-h-screen" style="background-color: var(--color-background)">
  <AppSidebar />
  <AppHeader />
  <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
    <div class="p-8"><!-- contenido --></div>
  </main>
</div>
```
- `<main>` con `margin-left: var(--sidebar-width)` (no `ml-[...]`).
- El `<div class="p-8">` interior no lleva `max-w-*` ni `mx-auto` (edge-to-edge).

### Reglas
- Separación entre secciones principales / header / toolbar: `mb-8`.
- Padding interno de cards / footer de tabla: `px-6 py-4`. Modales/banners: `px-4 py-3`.
- Campos de formulario: `space-y-5`; dentro de un campo (label→input→error): `gap-1.5`.
- Grid de formulario de 2 columnas: `grid grid-cols-2 gap-4`.

---

## 7. Estilos centralizados — `useFieldStyles()`

`src/composables/useFieldStyles.ts` exporta los helpers del design system (reemplaza las copias
por-vista). Importar en lugar de copiar:

```ts
import { inputStyle, readonlyFieldStyle, statusStyle, avatarStyle, initials } from "@/composables/useFieldStyles"
```

- `inputStyle(hasError)` → radio `--radius-md`, borde y fondo por token; error = borde `--color-error`
  + fondo `color-mix(error 8%, surface)`. El focus ring lo da la regla global de campos.
- `readonlyFieldStyle()` → campo de solo lectura (gris).
- `statusStyle(isActive)` → `{ bg, dot, text }` con tokens `success` (activo) / neutral (inactivo).
- `avatarStyle(id)` → `{ bg, color }` con tinte `color-mix` que adapta a claro/oscuro.
- `initials(first, last)`.

### Input estándar
```vue
<div class="flex flex-col gap-1.5">
  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
    Nombre *
  </label>
  <input class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
         :style="inputStyle(!!errors.campo)" />
  <p v-if="errors.campo" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.campo }}</p>
</div>
```
- Alto fijo `h-12` (48px) en todos los campos; `appearance-none shadow-none` quita el estilo nativo.
- Nunca `<input type="date">` → usar `DateInput`; fechas de nacimiento → `BirthDateInput`.
- Selects de búsqueda → `SearchableSelect`; multi-selección → `MultiSelect`. Nunca `<select>` nativo.

---

## 8. Badges de estado

Usar `statusStyle(isActive)` del composable. Dos variantes:
- **Pill** (filas de tabla): `rounded-full` en badge y dot.
- **Rectangular** (display de estado en modal de edición): `rounded-xs` en badge, contenedor con
  `var(--radius-md)` y fondo `--color-surface-container-low` (igual que `ToggleSwitch`).

```vue
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`">
  <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
  {{ item.isActive ? 'Activo' : 'Inactivo' }}
</span>
```

> Activar/desactivar es acción de menú contextual + badge de solo lectura, **no** un toggle inline
> (salvo cuando el estado es una edición más dentro del mismo formulario → `ToggleSwitch`).

---

## 9. Avatares e íconos

- **Avatar:** `avatarStyle(id)` + `initials()`. `w-10 h-10 rounded-full`, tinte `color-mix` + color.
- **Iconografía:** Material Symbols Outlined. Declarar `font-size` inline. Tamaños: acción/banner
  18px; botón primario 20px (con `width/height`); ícono de modal 28px; ícono de KpiCard 32px.

---

## 10. KpiCard

```vue
<KpiCard title="Cobrado" value="₲ 250.000" icon="account_balance_wallet"
         iconColor="var(--color-secondary)" badge="Caja" badgeType="positive" />
```
- El **fondo del ícono se deriva** como `color-mix(iconColor 16%, transparent)` → contraste
  garantizado en ambos temas. La prop `iconBg` quedó **obsoleta** (se ignora).
- `iconColor` debe ser un acento saturado (`--color-primary/secondary/tertiary/error/success/info`).
- `badgeType`: `positive` (success) | `critical` (error) | `neutral` (primary).

---

## 11. Componentes base (fuente: `src/components/`)

> No se incrusta el código fuente acá (se desincroniza). Ver el `.vue`. Resumen de props/uso:

| Componente | Notas de uso |
|---|---|
| `BaseButton` | `variant`: primary/secondary/ghost/danger · `size`: sm/md/lg. Botón principal de página: `primary` `lg` con ícono. Acciones de tabla: ver `RowContextMenu`. |
| `BaseModal` | `show`/`title`/`size` (sm confirmaciones, lg formularios). `rounded-xl`, `--shadow-xl`. |
| `BaseTable` | `columns`/`items`/`loading`/`emptyText`. Slots de celda `#<key>="{ item }"`. Wrapper `rounded-lg` + `--shadow-sm`. |
| `FilterChips` | Filtro multi-select con chips (reemplaza `FilterTabs`, **deprecado**). |
| `SearchInput` | Búsqueda con debounce de 350ms en la vista. |
| `RowContextMenu` | Acciones de fila (⋮). Permisos por ítem con `hidden: !auth.hasPermission(...)`. |
| `ToggleSwitch` | Toggle con confirmación inline. |
| `DateInput` / `BirthDateInput` | Fecha dd/mm/aaaa / fecha de nacimiento (3 campos). |
| `SearchableSelect` / `MultiSelect` | Selects con búsqueda / multi-selección. |
| `DateRangeBar` | Navegación de fechas (día/semana/mes) + mini calendario. |

---

## 12. Alertas y banners

```vue
<!-- Error -->
<div class="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium"
     style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
  <span class="material-symbols-outlined" style="font-size: 18px">error</span>
  {{ mensaje }}
</div>

<!-- Warning -->
<div class="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
     style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
  <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
  {{ mensaje }}
</div>
```

---

## 13. Page header

```vue
<div class="flex items-start justify-between mb-8">
  <div>
    <h1 class="text-4xl font-extrabold tracking-tight mb-2">Título</h1>
    <p class="font-medium" style="color: var(--color-on-surface-variant)">Descripción.</p>
  </div>
  <BaseButton variant="primary" size="lg">
    <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
    Acción Principal
  </BaseButton>
</div>
```
- Botón utilitario (Actualizar/Exportar): `variant="secondary" size="sm"`, ícono 18px.
- Múltiples botones: wrapper `flex items-center gap-3`.

---

## 14. Paginación

Footer **dentro** del wrapper de la tabla. `PAGE_SIZE = 10`. Máx 7 botones con ellipsis.
- Controles con `<button>` directo (no `BaseButton`).
- Página activa: `bg-primary text-on-primary`. Inactivas: `text-on-surface-variant hover:bg-surface-container-high`.
- `rangeStart`/`rangeEnd` siempre `computed`. Resetear `currentPage = 1` al cambiar filtros/búsqueda.

---

## 15. Reglas y anti-patrones

- **Sin hardcodear** colores/sombras/radios fuera de los tokens (salvo §1 excepciones de marca).
- **Sin JS inline de hover** (`onmouseover`/`onmouseout`): usar `:hover` en CSS o clases.
- **Sin librerías de componentes UI**: todo con Tailwind v4 + CSS.
- `text-on-primary` (no `text-white`) sobre fondos `bg-primary`/`var(--color-primary)` que flipean.
- No declarar `font-family`/`color` en `<main>`; confiar en `main.css`.

---

## 16. Checklist para nuevas páginas

- [ ] Layout: `AppSidebar` + `AppHeader` + `<main style="margin-left: var(--sidebar-width); padding-top: 64px">` + `<div class="p-8">`
- [ ] Header con H1 `text-4xl`, subtítulo y botón principal `primary lg`
- [ ] Toolbar: `FilterChips` a la izquierda, `SearchInput` (debounce 350ms) a la derecha, `mb-8`
- [ ] Tabla con `BaseTable` (`rounded-lg` + `--shadow-sm`) + footer de paginación
- [ ] Modales: crear/editar `lg`, confirmar `sm`
- [ ] Inputs `h-12 appearance-none shadow-none` con `inputStyle()` de `useFieldStyles`
- [ ] `DateInput`/`BirthDateInput`/`SearchableSelect`/`MultiSelect` (nunca nativos)
- [ ] Acciones de fila con `RowContextMenu`; permisos por ítem con `hidden`
- [ ] Estados loading/vacío/error; try/catch en servicios
- [ ] Verificar en **claro y oscuro** (todo debe salir de tokens → flipea solo)
```
