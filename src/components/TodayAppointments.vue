<script setup lang="ts">
const appointments: never[] = []
</script>

<template>
  <div
    class="rounded-2xl overflow-hidden"
    style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.3);"
  >
    <!-- Header -->
    <div
      class="px-6 py-5 flex justify-between items-center"
      style="border-bottom: 1px solid rgba(196,197,213,0.15);"
    >
      <h3 class="text-xl font-bold" style="color: #181C20;">Próximos Atendimientos</h3>
      <button
        class="text-sm font-bold px-4 py-2 rounded-full transition-colors hover:opacity-80"
        style="color: #00288E; background-color: #DDE1FF;"
      >
        Ver todos
      </button>
    </div>

    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center py-16 gap-3">
      <span class="material-symbols-outlined" style="color: #C4C5D5; font-size:40px;">calendar_month</span>
      <p class="text-sm font-semibold" style="color: #757684;">No hay atendimientos programados para hoy</p>
      <p class="text-xs" style="color: #C4C5D5;">Los turnos aparecerán aquí cuando se implemente el módulo de Agendamiento</p>
    </div>
  </div>
</template>
