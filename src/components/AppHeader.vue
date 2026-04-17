<script setup lang="ts">
const user = {
  name: 'Dra. Beatriz Santos',
  role: 'Oftalmóloga',
  initials: 'BS',
}
</script>

<template>
  <header
    class="fixed top-0 right-0 z-40 flex justify-between items-center px-8 h-16"
    style="left: 280px; background: rgba(247,249,254,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(196,197,213,0.15);"
  >
    <!-- Left: section title -->
    <div class="flex items-center">
      <h2 class="text-base font-semibold" style="color: #00288E;">Resumen General</h2>
    </div>

    <!-- Right: actions + user -->
    <div class="flex items-center gap-2">
      <button class="p-2 rounded-full transition-colors relative hover:bg-blue-50">
        <span class="material-symbols-outlined" style="color: #444653;">notifications</span>
        <span class="absolute top-2 right-2 w-2 h-2 rounded-full" style="background-color: #BA1A1A;"></span>
      </button>
      <button class="p-2 rounded-full transition-colors hover:bg-blue-50">
        <span class="material-symbols-outlined" style="color: #444653;">settings</span>
      </button>
      <button class="p-2 rounded-full transition-colors hover:bg-blue-50">
        <span class="material-symbols-outlined" style="color: #444653;">help</span>
      </button>

      <div class="w-px h-8 mx-2" style="background-color: rgba(196,197,213,0.4);"></div>

      <!-- User info -->
      <div class="flex items-center gap-3 cursor-pointer">
        <div class="text-right">
          <p class="text-sm font-bold leading-none" style="color: #181C20;">{{ user.name }}</p>
          <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #757684;">
            {{ user.role }}
          </p>
        </div>
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 flex-shrink-0"
          style="background-color: #00288E; ring-color: #DDE1FF;"
        >
          {{ user.initials }}
        </div>
      </div>
    </div>
  </header>
</template>
