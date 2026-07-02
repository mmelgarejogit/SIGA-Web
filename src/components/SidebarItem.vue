<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { MenuItem } from "@/config/menuConfig"

const props = defineProps<{
  item: MenuItem
  expanded: boolean
  active: boolean
  activeChildRoute: string | null
  collapsed: boolean
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

// ── Sub-grupos anidados (un nivel) ──────────────────────────
const openSub = ref<Set<string>>(new Set())
function toggleSub(key: string) {
  const s = new Set(openSub.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  openSub.value = s
}
function isSubOpen(key: string) {
  return openSub.value.has(key)
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
      <span class="material-symbols-outlined flex-shrink-0" :style="headerIconStyle">{{
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
      <div v-if="expanded && !collapsed" class="ml-3 mt-1 mb-1 flex flex-col gap-0.5">
        <template v-for="child in item.children" :key="child.label">
          <!-- Sub-grupo anidado -->
          <div v-if="child.children && child.children.length">
            <button
              @click="toggleSub(child.label)"
              class="nav-child w-full flex items-center gap-3 py-2 px-4 rounded-lg text-left text-[13px] font-medium"
            >
              <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">{{ child.icon }}</span>
              <span class="flex-1 tracking-wide">{{ child.label }}</span>
              <span
                class="material-symbols-outlined sidebar-chevron"
                :class="{ rotated: isSubOpen(child.label) }"
                style="font-size: 16px"
                >expand_more</span
              >
            </button>
            <Transition name="sidebar-expand">
              <div v-if="isSubOpen(child.label)" class="ml-4 mt-0.5 mb-0.5 flex flex-col gap-0.5">
                <button
                  v-for="leaf in child.children"
                  :key="leaf.route"
                  @click="handleChildClick(leaf.route!)"
                  class="nav-child w-full flex items-center gap-3 py-2 px-4 rounded-lg text-left text-[13px]"
                  :class="activeChildRoute === leaf.route ? 'font-bold is-active' : 'font-medium'"
                >
                  <span
                    class="material-symbols-outlined flex-shrink-0"
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
              class="material-symbols-outlined flex-shrink-0"
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
    <span class="material-symbols-outlined flex-shrink-0" :style="simpleIconStyle">{{
      item.icon
    }}</span>
    <span v-if="!collapsed" class="text-sm tracking-wide">{{ item.label }}</span>
  </button>
</template>

<style scoped>
/* ── Ítems del menú: estado en CSS (sin JS inline) ──────────────────────────── */
.nav-btn {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  background-color: transparent;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}
.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}
.nav-btn.is-active,
.nav-btn.is-active:hover {
  background-color: #dbeafe;
  color: #00288e;
}

.nav-child {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  background-color: transparent;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.nav-child:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75);
}
.nav-child.is-active,
.nav-child.is-active:hover {
  background-color: #dbeafe;
  color: #00288e;
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
