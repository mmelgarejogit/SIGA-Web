<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useSidebarStore } from "@/stores/sidebar"
import { menuConfig, nodeMatchesQuery, type MenuItem, type MenuChild } from "@/config/menuConfig"
import SidebarItem from "./SidebarItem.vue"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const sidebar = useSidebarStore()

// En mobile el sidebar es un drawer expandido; el colapso a iconos es solo de desktop.
const effectiveCollapsed = computed(() => !sidebar.isMobile && sidebar.collapsed)

const navStyle = computed(() => {
  const base =
    "background: linear-gradient(180deg, #1b3350 0%, #142943 100%); min-width: 0; transition: transform 0.28s ease, width 0.25s ease;"
  if (sidebar.isMobile) {
    return base + `width: 280px; transform: translateX(${sidebar.mobileOpen ? "0" : "-100%"});`
  }
  return base + "width: var(--sidebar-width); transform: none;"
})

// ── Accordion state ─────────────────────────────────────────
const expandedGroupId = ref<string | null>(null)

function toggleGroup(id: string) {
  expandedGroupId.value = expandedGroupId.value === id ? null : id
}

function navigate(routePath: string) {
  router.push(routePath)
  sidebar.closeMobile()
}

// ── Expand sidebar + group when collapsed group is clicked ──
function onCollapsedGroupClick(id: string) {
  sidebar.toggle()
  expandedGroupId.value = id
}

// ── RBAC: filter visible items ───────────────────────────────
// Filtra hijos por permiso, recursivo: descarta subgrupos que quedan vacíos.
function filterChildren(children: MenuChild[]): MenuChild[] {
  const out: MenuChild[] = []
  for (const c of children) {
    if (c.children) {
      const sub = filterChildren(c.children)
      if (sub.length) out.push({ ...c, children: sub })
    } else if (!c.permission || auth.hasPermission(c.permission)) {
      out.push(c)
    }
  }
  return out
}

// Aplana un árbol de hijos a sus hojas (ítems con route).
function leavesOf(children: MenuChild[]): MenuChild[] {
  const out: MenuChild[] = []
  for (const c of children) {
    if (c.children) out.push(...leavesOf(c.children))
    else out.push(c)
  }
  return out
}

const visibleItems = computed<MenuItem[]>(() => {
  return menuConfig
    .map((item) => {
      if (!item.children) {
        if (item.permission && !auth.hasPermission(item.permission)) return null
        return item
      }
      const filteredChildren = filterChildren(item.children)
      if (filteredChildren.length === 0) return null
      return { ...item, children: filteredChildren }
    })
    .filter((item): item is MenuItem => item !== null)
})

// ── Buscador rápido ("/" enfoca, Escape limpia) ──────────────
const searchQuery = ref("")
const searchInputRef = ref<HTMLInputElement | null>(null)
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

// Solo los módulos (y subgrupos) que matchean, ya sea por su propia etiqueta
// o porque algún descendiente matchea — mismo criterio en todos los niveles.
const searchedItems = computed<MenuItem[]>(() => {
  if (!normalizedQuery.value) return visibleItems.value
  return visibleItems.value.filter((item) => nodeMatchesQuery(item, normalizedQuery.value))
})

function clearSearch() {
  searchQuery.value = ""
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === "/" && document.activeElement !== searchInputRef.value) {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
  if (e.key === "Escape" && document.activeElement === searchInputRef.value) {
    clearSearch()
    searchInputRef.value?.blur()
  }
}

// ── Agrupación por zona (General/Atención/Óptica/Comercial/Gestión) ─────────
// Una zona solo aparece si tiene al menos un módulo visible para este usuario;
// los módulos sin zona (ninguno hoy) se mostrarían sueltos, sin título.
const ZONE_ORDER = ["General", "Atención", "Óptica", "Comercial", "Gestión"]

const groupedItems = computed(() => {
  const byZone = new Map<string, MenuItem[]>()
  const unzoned: MenuItem[] = []
  for (const item of searchedItems.value) {
    if (item.zone) {
      if (!byZone.has(item.zone)) byZone.set(item.zone, [])
      byZone.get(item.zone)!.push(item)
    } else {
      unzoned.push(item)
    }
  }
  const groups: { zone: string | null; items: MenuItem[] }[] = []
  if (unzoned.length) groups.push({ zone: null, items: unzoned })
  for (const z of ZONE_ORDER) {
    const items = byZone.get(z)
    if (items?.length) groups.push({ zone: z, items })
  }
  return groups
})

// ── Active group (contains active route) ───────────────────
const activeGroupId = computed<string | null>(() => {
  let best: { id: string; len: number } | null = null
  for (const item of visibleItems.value) {
    if (!item.children) continue
    // Un grupo con ruta propia (ej. hub /reportes) queda activo también por su ruta.
    if (item.route && (route.path === item.route || route.path.startsWith(item.route + "/"))) {
      if (!best || item.route.length > best.len) best = { id: item.id, len: item.route.length }
    }
    for (const leaf of leavesOf(item.children)) {
      if (!leaf.route) continue
      if (route.path === leaf.route || route.path.startsWith(leaf.route + "/")) {
        if (!best || leaf.route.length > best.len) best = { id: item.id, len: leaf.route.length }
      }
    }
  }
  return best?.id ?? null
})

// ── Active child route (recorre subgrupos hasta las hojas) ──
const activeChildRoute = computed<string | null>(() => {
  let bestMatch: string | null = null
  for (const item of menuConfig) {
    if (!item.children) continue
    for (const leaf of leavesOf(item.children)) {
      if (!leaf.route) continue
      if (route.path === leaf.route || route.path.startsWith(leaf.route + "/")) {
        if (!bestMatch || leaf.route.length > bestMatch.length) bestMatch = leaf.route
      }
    }
  }
  return bestMatch
})

// ── Simple item active (no group) ──────────────────────────
const activeItemId = computed<string | null>(() => {
  if (activeGroupId.value) return null
  const match = visibleItems.value.find(
    (item) =>
      !item.children &&
      item.route &&
      (route.path === item.route || route.path.startsWith(item.route + "/")),
  )
  return match?.id ?? null
})

// ── Auto-expand group when route changes ───────────────────
watch(
  () => route.path,
  () => {
    const groupId = activeGroupId.value
    if (groupId && groupId !== expandedGroupId.value) {
      expandedGroupId.value = groupId
    }
  },
  { immediate: true },
)

onMounted(() => document.addEventListener("keydown", handleGlobalKeydown))
onUnmounted(() => document.removeEventListener("keydown", handleGlobalKeydown))
</script>

<template>
  <!-- Overlay del drawer (solo mobile, cuando está abierto) -->
  <Transition name="sb-overlay">
    <div
      v-if="sidebar.isMobile && sidebar.mobileOpen"
      class="fixed inset-0 z-50"
      style="background-color: rgba(0, 0, 0, 0.45)"
      @click="sidebar.closeMobile()"
    />
  </Transition>

  <nav
    class="fixed left-0 top-0 bottom-0 z-[60] flex flex-col py-5 shadow-2xl overflow-hidden"
    :style="navStyle"
  >
    <!-- Marca: anillos de refracción (eco del hero de login) + wordmark -->
    <div
      class="mb-4 flex items-center gap-3 overflow-hidden flex-shrink-0 cursor-pointer"
      :class="effectiveCollapsed ? 'justify-center px-0' : 'px-5'"
      style="transition: padding 0.25s ease"
      @click="sidebar.toggle"
      title="Colapsar / expandir menú"
    >
      <div class="lens-mark flex-shrink-0">
        <svg viewBox="0 0 40 40" width="36" height="36">
          <defs>
            <radialGradient id="sbLensGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#7fe0ff" stop-opacity="0.55" />
              <stop offset="45%" stop-color="#00b6d9" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#00b6d9" stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle fill="url(#sbLensGradient)" cx="20" cy="20" r="20" />
          <circle class="lens-ring" cx="20" cy="20" r="18.5" />
          <circle class="lens-ring" cx="20" cy="20" r="14" />
          <circle class="lens-ring" cx="20" cy="20" r="9.5" />
          <circle class="lens-ring lens-ring-focal" cx="20" cy="20" r="5.5" />
        </svg>
      </div>
      <div class="overflow-hidden" style="transition: opacity 0.2s ease, width 0.25s ease" :style="effectiveCollapsed ? 'opacity: 0; width: 0;' : 'opacity: 1; width: auto;'">
        <h1 class="text-[17px] font-extrabold text-white leading-tight whitespace-nowrap" style="font-family: var(--font-headline); letter-spacing: -0.01em">
          SIGA<span style="color: #7fe0ff">·</span>ÓPTICA
        </h1>
        <p class="text-[9.5px] uppercase whitespace-nowrap mt-0.5 font-medium" style="font-family: var(--font-mono); letter-spacing: 0.22em; color: rgba(230, 236, 246, 0.38)">
          Precisión clínica
        </p>
      </div>
    </div>

    <!-- Buscador rápido -->
    <div v-if="!effectiveCollapsed" class="quickjump px-4 mb-3 flex-shrink-0 relative">
      <span class="material-symbols-outlined qj-icon" style="font-size: 15px">search</span>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Saltar a un módulo…"
        autocomplete="off"
        class="qj-input"
      />
      <button v-if="searchQuery" class="qj-clear" title="Limpiar búsqueda" @click="clearSearch">
        <span class="material-symbols-outlined" style="font-size: 14px">close</span>
      </button>
      <span v-else class="qj-kbd">/</span>
    </div>

    <!-- Nav Items -->
    <div class="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 flex flex-col gap-0.5">
      <template v-if="groupedItems.length">
        <div v-for="group in groupedItems" :key="group.zone ?? '_'" class="flex-shrink-0">
          <div v-if="group.zone && !effectiveCollapsed" class="zone-label">{{ group.zone }}</div>
          <div v-for="item in group.items" :key="item.id" class="flex-shrink-0">
            <SidebarItem
              :item="item"
              :expanded="expandedGroupId === item.id || !!normalizedQuery"
              :active="item.id === activeItemId || item.id === activeGroupId"
              :active-child-route="item.id === activeGroupId ? activeChildRoute : null"
              :collapsed="effectiveCollapsed"
              :search-query="normalizedQuery"
              @navigate="navigate"
              @toggle="toggleGroup(item.id)"
              @collapsed-group-click="onCollapsedGroupClick(item.id)"
            />
          </div>
        </div>
      </template>
      <p v-else-if="!effectiveCollapsed" class="px-3 py-6 text-center text-xs" style="color: rgba(230, 236, 246, 0.4)">
        Sin resultados para "{{ searchQuery }}"
      </p>
    </div>

    <!-- Toggle button (colapsar — solo desktop) -->
    <div
      v-if="!sidebar.isMobile"
      class="px-3 mt-2 flex-shrink-0"
      :class="effectiveCollapsed ? 'flex justify-center' : ''"
    >
      <button
        @click="sidebar.toggle"
        class="collapse-btn flex items-center py-2 px-3 rounded-xl w-full"
        :class="effectiveCollapsed ? 'justify-center gap-0' : 'gap-2'"
        :title="effectiveCollapsed ? 'Expandir menú' : 'Colapsar menú'"
      >
        <span
          class="material-symbols-outlined"
          style="font-size: 18px; display: inline-flex; align-items: center; justify-content: center; transform-origin: center; transition: transform 0.25s ease; flex-shrink: 0;"
          :style="{ transform: effectiveCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }"
        >chevron_left</span>
        <span
          class="text-xs font-medium overflow-hidden whitespace-nowrap"
          style="transition: opacity 0.2s ease, max-width 0.25s ease"
          :style="effectiveCollapsed ? 'opacity: 0; max-width: 0;' : 'opacity: 1; max-width: 120px;'"
        >
          Colapsar menú
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* ── Marca: anillos de refracción ─────────────────────────────────────────── */
.lens-ring {
  fill: none;
  stroke: rgba(127, 224, 255, 0.32);
  stroke-width: 1;
}
.lens-ring-focal {
  stroke: #7fe0ff;
  stroke-width: 1.6;
}
@media (prefers-reduced-motion: no-preference) {
  .lens-mark {
    animation: sb-breathe 5.5s cubic-bezier(0.2, 0, 0, 1) infinite;
  }
}
@keyframes sb-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

/* ── Buscador rápido ───────────────────────────────────────────────────────── */
.qj-icon {
  position: absolute;
  left: 27px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(230, 236, 246, 0.4);
  pointer-events: none;
}
.qj-input {
  width: 100%;
  height: 36px;
  background: #142943;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #f3f6fc;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  padding: 0 32px;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.qj-input::placeholder {
  color: rgba(230, 236, 246, 0.34);
}
.qj-input:focus {
  border-color: #00b6d9;
  box-shadow: 0 0 0 3px rgba(127, 224, 255, 0.16);
}
.qj-kbd {
  position: absolute;
  right: 23px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: rgba(230, 236, 246, 0.36);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 1px 5px;
  pointer-events: none;
}
.qj-clear {
  position: absolute;
  right: 23px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(230, 236, 246, 0.5);
  transition: color 0.15s ease;
}
.qj-clear:hover {
  color: #f3f6fc;
}

/* ── Título de zona ────────────────────────────────────────────────────────── */
.zone-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: rgba(127, 224, 255, 0.5);
  padding: 14px 12px 6px;
}

/* ── Scrollbar fino acorde al sidebar oscuro (reemplaza el nativo) ───────────── */
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.16);
  border-radius: 9999px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* ── Botón colapsar (hover en CSS, sin JS inline) ───────────────────────────── */
.collapse-btn {
  color: rgba(255, 255, 255, 0.4);
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}
.collapse-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
}

/* ── Overlay del drawer (fade) ───────────────────────────────────────────────── */
.sb-overlay-enter-active,
.sb-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.sb-overlay-enter-from,
.sb-overlay-leave-to {
  opacity: 0;
}
</style>
