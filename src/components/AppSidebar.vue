<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { menuConfig, type MenuItem } from "@/config/menuConfig"
import SidebarItem from "./SidebarItem.vue"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// ── Accordion state ─────────────────────────────────────────
const expandedGroupId = ref<string | null>(null)

function toggleGroup(id: string) {
  expandedGroupId.value = expandedGroupId.value === id ? null : id
}

function navigate(routePath: string) {
  router.push(routePath)
}

// ── RBAC: filter visible items ───────────────────────────────
const visibleItems = computed<MenuItem[]>(() => {
  return menuConfig
    .map((item) => {
      if (!item.children) {
        // Simple top-level item: check its own permission
        if (item.permission && !auth.hasPermission(item.permission)) return null
        return item
      }
      const filteredChildren = item.children.filter(
        (child) => !child.permission || auth.hasPermission(child.permission),
      )
      if (filteredChildren.length === 0) return null
      return { ...item, children: filteredChildren }
    })
    .filter((item): item is MenuItem => item !== null)
})

// ── Active group (contains active route) ───────────────────
const activeGroupId = computed<string | null>(() => {
  for (const item of visibleItems.value) {
    if (item.route && (route.path === item.route || route.path.startsWith(item.route + "/"))) {
      return null
    }
    if (item.children) {
      for (const child of item.children) {
        if (route.path === child.route || route.path.startsWith(child.route + "/")) {
          return item.id
        }
      }
    }
  }
  return null
})

// ── Active child route ─────────────────────────────────────
const activeChildRoute = computed<string | null>(() => {
  for (const item of menuConfig) {
    if (item.children) {
      for (const child of item.children) {
        if (route.path === child.route || route.path.startsWith(child.route + "/")) {
          return child.route
        }
      }
    }
  }
  return null
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
  <nav
    class="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col py-6 shadow-2xl"
    style="background-color: #1e3a5f"
  >
    <!-- Logo -->
    <div class="px-8 mb-8 flex items-center gap-3">
      <div
        class="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
      >
        <span
          class="material-symbols-outlined"
          style="
            color: #1e3a5f;
            font-variation-settings:
              &quot;FILL&quot; 1,
              &quot;wght&quot; 400,
              &quot;GRAD&quot; 0,
              &quot;opsz&quot; 24;
          "
          >visibility</span
        >
      </div>
      <div>
        <h1 class="text-xl font-black text-white uppercase tracking-widest leading-none">
          SIGA-Óptica
        </h1>
        <p class="text-blue-100/50 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">
          Optical Precision
        </p>
      </div>
    </div>

    <!-- Nav Items -->
    <div class="flex-1 flex flex-col gap-0.5 overflow-y-auto px-3">
      <SidebarItem
        v-for="item in visibleItems"
        :key="item.id"
        :item="item"
        :expanded="expandedGroupId === item.id"
        :active="item.id === activeItemId || item.id === activeGroupId"
        :active-child-route="item.id === activeGroupId ? activeChildRoute : null"
        @navigate="navigate"
        @toggle="toggleGroup(item.id)"
      />
    </div>

    <!-- Nueva Cita CTA -->
    <div v-if="auth.hasPermission('gestionar_agenda')" class="px-6 mt-4">
      <button
        @click="router.push('/agenda/nueva')"
        class="w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg text-sm"
        style="
          background-color: var(--color-secondary-container);
          color: var(--color-on-secondary-container);
        "
      >
        <span class="material-symbols-outlined" style="width: 20px; height: 20px; font-size: 20px"
          >add</span
        >
        Nueva Cita
      </button>
    </div>
  </nav>
</template>
