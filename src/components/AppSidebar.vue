<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useSidebarStore } from "@/stores/sidebar"
import { menuConfig, type MenuItem, type MenuChild } from "@/config/menuConfig"
import SidebarItem from "./SidebarItem.vue"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const sidebar = useSidebarStore()

// En mobile el sidebar es un drawer expandido; el colapso a iconos es solo de desktop.
const effectiveCollapsed = computed(() => !sidebar.isMobile && sidebar.collapsed)

const navStyle = computed(() => {
  const base =
    "background-color: #1e3a5f; min-width: 0; transition: transform 0.28s ease, width 0.25s ease;"
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
    class="fixed left-0 top-0 bottom-0 z-[60] flex flex-col py-6 shadow-2xl overflow-hidden"
    :style="navStyle"
  >
    <!-- Logo -->
    <div
      class="mb-8 flex items-center gap-3 overflow-hidden flex-shrink-0"
      :class="effectiveCollapsed ? 'justify-center px-0' : 'px-6'"
      style="transition: padding 0.25s ease"
    >
      <div
        class="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md cursor-pointer"
        @click="sidebar.toggle"
        title="Colapsar / expandir menú"
      >
        <span
          class="material-symbols-outlined"
          style="
            color: #1e3a5f;
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          "
          >visibility</span
        >
      </div>
      <div class="overflow-hidden" style="transition: opacity 0.2s ease, width 0.25s ease" :style="effectiveCollapsed ? 'opacity: 0; width: 0;' : 'opacity: 1; width: auto;'">
        <h1 class="text-xl font-black text-white uppercase tracking-widest leading-none whitespace-nowrap">
          SIGA-Óptica
        </h1>
        <p class="text-blue-100/50 text-[10px] uppercase tracking-widest mt-0.5 font-semibold whitespace-nowrap">
          Optical Precision
        </p>
      </div>
    </div>

    <!-- Nav Items -->
    <div class="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 flex flex-col gap-0.5">
      <div v-for="item in visibleItems" :key="item.id" class="flex-shrink-0">
        <SidebarItem
          :item="item"
          :expanded="expandedGroupId === item.id"
          :active="item.id === activeItemId || item.id === activeGroupId"
          :active-child-route="item.id === activeGroupId ? activeChildRoute : null"
          :collapsed="effectiveCollapsed"
          @navigate="navigate"
          @toggle="toggleGroup(item.id)"
          @collapsed-group-click="onCollapsedGroupClick(item.id)"
        />
      </div>
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
