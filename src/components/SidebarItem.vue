<script setup lang="ts">
import { computed } from "vue"
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

const headerTextColor = computed(() =>
  props.active ? "var(--color-primary)" : "rgba(255,255,255,0.65)",
)
const headerBg = computed(() => (props.active ? "#DBEAFE" : ""))

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
</script>

<template>
  <!-- ── Grupo con submenú ─────────────────────────────────── -->
  <div v-if="isGroup">
    <button
      @click="handleClick"
      class="w-full flex items-center py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer group overflow-hidden"
      :class="[active ? 'font-bold' : 'font-medium', collapsed ? 'justify-center px-0' : 'gap-3 px-4']"
      :style="`background-color: ${headerBg}; color: ${headerTextColor};`"
      :title="collapsed ? item.label : undefined"
      onmouseover="
        if (!this.getAttribute('data-active')) {
          this.style.backgroundColor = 'rgba(255,255,255,0.08)'
          this.style.color = 'white'
        }
      "
      onmouseout="
        if (!this.getAttribute('data-active')) {
          this.style.backgroundColor = ''
          this.style.color = 'rgba(255,255,255,0.65)'
        }
      "
      :data-active="active ? 'true' : null"
    >
      <span class="material-symbols-outlined flex-shrink-0" :style="headerIconStyle">{{
        item.icon
      }}</span>
      <template v-if="!collapsed">
        <span class="flex-1 text-sm tracking-wide">{{ item.label }}</span>
        <span
          class="material-symbols-outlined flex-shrink-0 transition-transform duration-200"
          style="font-size: 18px"
          :class="expanded ? 'rotate-180' : ''"
          >expand_more</span
        >
      </template>
    </button>

    <!-- Sub-ítems (solo visible cuando expandido y no colapsado) -->
    <Transition name="sidebar-expand">
      <div v-if="expanded && !collapsed" class="ml-3 mt-1 mb-1 flex flex-col gap-0.5">
        <button
          v-for="child in item.children"
          :key="child.route"
          @click="handleChildClick(child.route)"
          class="w-full flex items-center gap-3 py-2 px-4 rounded-lg transition-all duration-150 text-left cursor-pointer text-[13px]"
          :class="activeChildRoute === child.route ? 'font-bold' : 'font-medium'"
          :style="`background-color: ${activeChildRoute === child.route ? '#DBEAFE' : ''}; color: ${activeChildRoute === child.route ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)'};`"
          onmouseover="
            if (!this.getAttribute('data-active')) {
              this.style.backgroundColor = 'rgba(255,255,255,0.06)'
              this.style.color = 'rgba(255,255,255,0.75)'
            }
          "
          onmouseout="
            if (!this.getAttribute('data-active')) {
              this.style.backgroundColor = ''
              this.style.color = 'rgba(255,255,255,0.5)'
            }
          "
          :data-active="activeChildRoute === child.route ? 'true' : null"
        >
          <span
            class="material-symbols-outlined flex-shrink-0"
            :style="childIconStyleFor(child.route)"
            style="font-size: 16px"
            >{{ child.icon }}</span
          >
          <span class="tracking-wide">{{ child.label }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <!-- ── Ítem simple ───────────────────────────────────────── -->
  <button
    v-else
    @click="handleClick"
    class="w-full flex items-center py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer overflow-hidden"
    :class="[active ? 'font-bold' : 'font-medium', collapsed ? 'justify-center px-0' : 'gap-3 px-4']"
    :style="`background-color: ${active ? '#DBEAFE' : ''}; color: ${active ? 'var(--color-primary)' : 'rgba(255,255,255,0.65)'};`"
    :title="collapsed ? item.label : undefined"
    onmouseover="
      if (!this.getAttribute('data-active')) {
        this.style.backgroundColor = 'rgba(255,255,255,0.08)'
        this.style.color = 'white'
      }
    "
    onmouseout="
      if (!this.getAttribute('data-active')) {
        this.style.backgroundColor = ''
        this.style.color = 'rgba(255,255,255,0.65)'
      }
    "
    :data-active="active ? 'true' : null"
  >
    <span class="material-symbols-outlined flex-shrink-0" :style="simpleIconStyle">{{
      item.icon
    }}</span>
    <span
      v-if="!collapsed"
      class="text-sm tracking-wide"
    >{{ item.label }}</span>
  </button>
</template>

<style scoped>
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
