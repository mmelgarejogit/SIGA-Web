<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"

const route = useRoute()
const label = computed(() => (route.meta.label as string) ?? "Esta sección")
</script>

<template>
  <AppSidebar />
  <AppHeader />
  <main
    style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease; min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: var(--color-surface)"
  >
    <div class="flex flex-col items-center gap-5 text-center px-8">
      <div
        class="w-20 h-20 rounded-3xl flex items-center justify-center"
        style="background-color: rgba(0, 40, 142, 0.06)"
      >
        <span
          class="material-symbols-outlined"
          style="
            font-size: 40px;
            color: var(--color-primary);
            font-variation-settings:
              &quot;FILL&quot; 0,
              &quot;wght&quot; 300,
              &quot;GRAD&quot; 0,
              &quot;opsz&quot; 48;
          "
        >
          construction
        </span>
      </div>
      <div>
        <h1 class="text-4xl font-extrabold tracking-tight mb-2">{{ label }}</h1>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">
          Esta sección está en desarrollo y estará disponible próximamente.
        </p>
      </div>
      <span
        class="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
        style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary)"
        >En desarrollo</span
      >
    </div>
  </main>
</template>
