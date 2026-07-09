<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { nodeMatchesQuery, type MenuItem, type MenuChild } from "@/config/menuConfig"

const props = defineProps<{
  item: MenuItem
  expanded: boolean
  active: boolean
  activeChildRoute: string | null
  collapsed: boolean
  /** Query normalizada (lowercase, trim) del buscador rápido. Vacía = sin búsqueda activa. */
  searchQuery?: string
}>()

const emit = defineEmits<{
  navigate: [route: string]
  toggle: []
  "collapsed-group-click": []
}>()

const isGroup = computed(() => !!props.item.children && props.item.children.length > 0)

const headerIconStyle = computed(() =>
  props.active
    ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;"
    : "font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;",
)

const simpleIconStyle = computed(() =>
  props.active
    ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;"
    : "font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;",
)

const childIconStyleFor = (route: string) =>
  props.activeChildRoute === route
    ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;"
    : "font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;"

function handleClick() {
  if (isGroup.value) {
    if (props.collapsed) {
      emit("collapsed-group-click")
    } else if (props.item.route) {
      // Grupo con ruta propia (p. ej. hub de Reportes): navega y asegura el submenú abierto.
      emit("navigate", props.item.route)
      if (!props.expanded) emit("toggle")
    } else {
      emit("toggle")
    }
  } else if (props.item.route) {
    emit("navigate", props.item.route)
  }
}

function handleChildClick(route: string) {
  emit("navigate", route)
}

// Durante una búsqueda activa, solo se muestran los hijos que matchean (por sí mismos
// o por algún descendiente) — mismo criterio que usa el buscador del sidebar.
function visibleOf(children: MenuChild[] | undefined): MenuChild[] {
  const list = children ?? []
  if (!props.searchQuery) return list
  return list.filter((c) => nodeMatchesQuery(c, props.searchQuery!))
}

// ── Sub-grupos anidados (un nivel) ──────────────────────────
const openSub = ref<Set<string>>(new Set())
function toggleSub(key: string) {
  const s = new Set(openSub.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  openSub.value = s
}
// Con búsqueda activa, cualquier sub-grupo que haya sobrevivido al filtro matchea
// por definición — se fuerza abierto para no obligar a un segundo click.
function isSubOpen(key: string) {
  return !!props.searchQuery || openSub.value.has(key)
}
// Abrir automáticamente el subgrupo que contiene la ruta activa
watch(
  () => props.activeChildRoute,
  (r) => {
    if (!r || !props.item.children) return
    for (const c of props.item.children) {
      if (c.children?.some((l) => l.route === r) && !openSub.value.has(c.label)) {
        const s = new Set(openSub.value)
        s.add(c.label)
        openSub.value = s
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- ── Grupo con submenú ─────────────────────────────────── -->
  <div v-if="isGroup">
    <button
      @click="handleClick"
      class="nav-btn w-full flex items-center py-2.5 rounded-xl text-left overflow-hidden"
      :class="[active ? 'font-bold is-active' : 'font-medium', collapsed ? 'justify-center px-0' : 'gap-3 px-4']"
      :title="collapsed ? item.label : undefined"
    >
      <span class="material-symbols-outlined flex-shrink-0 nav-icon" :style="headerIconStyle">{{
        item.icon
      }}</span>
      <template v-if="!collapsed">
        <span class="flex-1 text-sm tracking-wide">{{ item.label }}</span>
        <span
          class="material-symbols-outlined sidebar-chevron"
          :class="{ rotated: expanded }"
          style="font-size: 18px"
          >expand_more</span
        >
      </template>
    </button>

    <!-- Sub-ítems (solo visible cuando expandido y no colapsado) -->
    <Transition name="sidebar-expand">
      <div v-if="expanded && !collapsed" class="ml-3 mt-1 mb-1 flex flex-col gap-0.5 nested-guide">
        <template v-for="child in visibleOf(item.children)" :key="child.label">
          <!-- Sub-grupo anidado -->
          <div v-if="child.children && child.children.length">
            <button
              @click="toggleSub(child.label)"
              class="nav-child w-full flex items-center gap-3 py-2 px-4 rounded-lg text-left text-[13px] font-medium"
            >
              <span class="material-symbols-outlined flex-shrink-0 nav-icon" style="font-size: 16px">{{ child.icon }}</span>
              <span class="flex-1 tracking-wide">{{ child.label }}</span>
              <span
                class="material-symbols-outlined sidebar-chevron"
                :class="{ rotated: isSubOpen(child.label) }"
                style="font-size: 16px"
                >expand_more</span
              >
            </button>
            <Transition name="sidebar-expand">
              <div v-if="isSubOpen(child.label)" class="ml-4 mt-0.5 mb-0.5 flex flex-col gap-0.5 nested-guide">
                <button
                  v-for="leaf in visibleOf(child.children)"
                  :key="leaf.route"
                  @click="handleChildClick(leaf.route!)"
                  class="nav-child w-full flex items-center gap-3 py-2 px-4 rounded-lg text-left text-[13px]"
                  :class="activeChildRoute === leaf.route ? 'font-bold is-active' : 'font-medium'"
                >
                  <span
                    class="material-symbols-outlined flex-shrink-0 nav-icon"
                    :style="childIconStyleFor(leaf.route!)"
                    style="font-size: 16px"
                    >{{ leaf.icon }}</span
                  >
                  <span class="tracking-wide">{{ leaf.label }}</span>
                </button>
              </div>
            </Transition>
          </div>
          <!-- Hoja directa -->
          <button
            v-else
            @click="handleChildClick(child.route!)"
            class="nav-child w-full flex items-center gap-3 py-2 px-4 rounded-lg text-left text-[13px]"
            :class="activeChildRoute === child.route ? 'font-bold is-active' : 'font-medium'"
          >
            <span
              class="material-symbols-outlined flex-shrink-0 nav-icon"
              :style="childIconStyleFor(child.route!)"
              style="font-size: 16px"
              >{{ child.icon }}</span
            >
            <span class="tracking-wide">{{ child.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>

  <!-- ── Ítem simple ───────────────────────────────────────── -->
  <button
    v-else
    @click="handleClick"
    class="nav-btn w-full flex items-center py-2.5 rounded-xl text-left overflow-hidden"
    :class="[active ? 'font-bold is-active' : 'font-medium', collapsed ? 'justify-center px-0' : 'gap-3 px-4']"
    :title="collapsed ? item.label : undefined"
  >
    <span class="material-symbols-outlined flex-shrink-0 nav-icon" :style="simpleIconStyle">{{
      item.icon
    }}</span>
    <span v-if="!collapsed" class="text-sm tracking-wide">{{ item.label }}</span>
  </button>
</template>

<style scoped>
/* ── Ítems del menú: estado en CSS (sin JS inline) ──────────────────────────── */
.nav-btn {
  position: relative;
  cursor: pointer;
  color: rgba(230, 236, 246, 0.62);
  background-color: transparent;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}
.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.045);
  color: #f3f6fc;
}

.nav-child {
  position: relative;
  cursor: pointer;
  color: rgba(230, 236, 246, 0.55);
  background-color: transparent;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.nav-child:hover {
  background-color: rgba(255, 255, 255, 0.045);
  color: #f3f6fc;
}

/* ── Activo = "en foco": barra cyan + resplandor, no un pill plano ───────────── */
.nav-btn.is-active,
.nav-child.is-active {
  background: linear-gradient(90deg, rgba(127, 224, 255, 0.16), transparent 70%);
  color: #f3f6fc;
}
.nav-btn.is-active::before,
.nav-child.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: #7fe0ff;
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 8px 1px rgba(127, 224, 255, 0.35);
}
.nav-btn.is-active .nav-icon,
.nav-child.is-active .nav-icon {
  color: #7fe0ff;
}

/* ── Chevron del acordeón ────────────────────────────────────────────────────── */
.sidebar-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.sidebar-chevron.rotated {
  transform: rotate(180deg);
}

/* ── Guía de jerarquía: conecta visualmente un nivel anidado con su padre ────── */
.nested-guide {
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding-left: 8px;
  margin-left: 16px;
}

/* ── Transición de apertura del submenú ─────────────────────────────────────── */
.sidebar-expand-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.sidebar-expand-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.sidebar-expand-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.sidebar-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
