<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const label = computed(() => route.meta.label as string ?? 'Esta sección')
</script>

<template>
  <AppSidebar />
  <AppHeader />
  <main class="ml-[280px] pt-16 min-h-screen flex items-center justify-center" style="background-color: #F7F9FE;">
    <div class="flex flex-col items-center gap-5 text-center px-8">
      <div
        class="w-20 h-20 rounded-3xl flex items-center justify-center"
        style="background-color: rgba(0,40,142,0.06);"
      >
        <span class="material-symbols-outlined" style="font-size: 40px; color: #00288E; font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;">
          construction
        </span>
      </div>
      <div>
        <h1 class="text-2xl font-black" style="color: #181C20;">{{ label }}</h1>
        <p class="mt-2 text-sm" style="color: #757684;">Esta sección está en desarrollo y estará disponible próximamente.</p>
      </div>
      <span
        class="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
        style="background-color: rgba(0,40,142,0.08); color: #00288E;"
      >En desarrollo</span>
    </div>
  </main>
</template>
