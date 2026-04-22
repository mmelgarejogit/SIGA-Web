<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const navItems = [
  { id: 'dashboard',     label: 'Panel de Control', icon: 'dashboard',        to: '/',          permission: null },
  { id: 'pacientes',     label: 'Pacientes',         icon: 'groups',           to: '/pacientes', permission: 'ver_pacientes' },
  { id: 'profesionales', label: 'Profesionales',     icon: 'stethoscope',      to: '/profesionales', permission: 'ver_profesionales' },
  { id: 'agenda',        label: 'Agenda',            icon: 'calendar_month',   to: '/agenda',        permission: 'ver_calendario' },
  { id: 'clinica',       label: 'Clínica',           icon: 'medical_services', to: '/clinica',       permission: 'ver_historia_clinica' },
  { id: 'inventario',    label: 'Inventario',        icon: 'inventory_2',      to: '/inventario',    permission: 'ver_inventario' },
  { id: 'ventas',        label: 'Ventas',            icon: 'payments',         to: '/ventas',        permission: 'ver_ventas' },
  { id: 'reportes',      label: 'Reportes',          icon: 'analytics',        to: '/reportes',      permission: 'ver_reportes' },
  { id: 'usuarios',      label: 'Usuarios y Roles',  icon: 'manage_accounts',  to: '/usuarios',  permission: 'ver_usuarios' },
]

// Oculta los items activos (con ruta) si el usuario no tiene el permiso requerido.
// Los items "soon" (to: null) siempre son visibles — son placeholders, no exponen datos.
const visibleNavItems = computed(() =>
  navItems.filter(item => !item.permission || auth.hasPermission(item.permission))
)

const activeId = computed(() => {
  const match = visibleNavItems.value.find(item => item.to && item.to !== '/' && route.path.startsWith(item.to))
  if (match) return match.id
  if (route.path === '/') return 'dashboard'
  return ''
})

function navigate(item: (typeof navItems)[number]) {
  if (item.to) router.push(item.to)
}
</script>

<template>
  <nav
    class="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col py-6 shadow-2xl"
    style="background-color: #1E3A5F;"
  >
    <!-- Logo -->
    <div class="px-8 mb-10 flex items-center gap-3">
      <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
        <span
          class="material-symbols-outlined"
          style="color: #1E3A5F; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;"
        >visibility</span>
      </div>
      <div>
        <h1 class="text-xl font-black text-white uppercase tracking-widest leading-none">SIGA-Óptica</h1>
        <p class="text-blue-100/50 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">Optical Precision</p>
      </div>
    </div>

    <!-- Nav Items -->
    <div class="flex-1 flex flex-col gap-0.5 overflow-y-auto px-3">
      <button
        v-for="item in visibleNavItems"
        :key="item.id"
        @click="navigate(item)"
        :class="[
          'w-full flex items-center gap-3 py-3 px-4 rounded-full transition-all duration-200 text-left cursor-pointer',
          activeId === item.id ? 'font-bold' : 'font-medium',
          activeId !== item.id ? 'text-blue-100/70 hover:text-white hover:bg-white/10' : '',
        ]"
        :style="activeId === item.id ? 'background-color: #DBEAFE; color: #00288E;' : ''"
      >
        <span
          class="material-symbols-outlined flex-shrink-0"
          :style="activeId === item.id
            ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;'
            : 'font-variation-settings: \'FILL\' 0, \'wght\' 300, \'GRAD\' 0, \'opsz\' 24;'"
        >{{ item.icon }}</span>
        <span class="text-sm tracking-wide">{{ item.label }}</span>
      </button>
    </div>

    <!-- Nueva Cita CTA -->
    <div class="px-6 mt-6">
      <button
        class="w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg text-sm"
        style="background-color: #76DCFF; color: #006077;"
      >
        <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">add</span>
        Nueva Cita
      </button>
    </div>
  </nav>
</template>
