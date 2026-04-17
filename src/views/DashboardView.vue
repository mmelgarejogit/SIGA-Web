<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import KpiCard from '@/components/KpiCard.vue'
import TodayAppointments from '@/components/TodayAppointments.vue'
import InsightsPanel from '@/components/InsightsPanel.vue'
import { getPatients } from '@/services/patientService'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const firstName = computed(() => authStore.user?.firstName ?? '')

const activePatients = ref('—')

onMounted(async () => {
  try {
    const result = await getPatients({ page: 1, pageSize: 1 })
    activePatients.value = result.totalActive.toLocaleString('es-PY')
  } catch {
    activePatients.value = 'N/D'
  }
})

const kpis = computed(() => [
  {
    title: 'Pacientes Activos',
    value: activePatients.value,
    icon: 'group',
    badge: 'Total',
    badgeType: 'neutral' as const,
    iconBg: '#DDE1FF',
    iconColor: '#00288E',
  },
  {
    title: 'Agendamientos',
    value: '—',
    icon: 'calendar_today',
    badge: 'Sin datos',
    badgeType: 'neutral' as const,
    iconBg: '#B7EAFF',
    iconColor: '#006780',
  },
  {
    title: 'Ingresos Semanales',
    value: '—',
    icon: 'sell',
    badge: 'Sin datos',
    badgeType: 'neutral' as const,
    iconBg: '#E2DFFF',
    iconColor: '#2000B1',
  },
  {
    title: 'Stock Crítico',
    value: '—',
    icon: 'warning',
    badge: 'Sin datos',
    badgeType: 'neutral' as const,
    iconBg: '#FFDAD6',
    iconColor: '#BA1A1A',
  },
])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const todayLabel = new Date().toLocaleDateString('es-PY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="p-8">
        <!-- Editorial hero -->
        <div class="mb-10 flex items-end justify-between" style="padding-right: 8rem;">
          <div>
            <p
              class="text-sm font-bold uppercase tracking-[0.2em] mb-2"
              style="color: #00288E;"
            >
              {{ greeting }}, {{ firstName }}
            </p>
            <h1
              class="text-5xl font-extrabold tracking-tight leading-tight"
              style="color: #181C20;"
            >
              Su óptica en<br />
              <span style="color: #00288E;">foco absoluto.</span>
            </h1>
          </div>
          <div class="text-right pb-2 hidden lg:block">
            <p class="text-sm font-medium capitalize" style="color: #757684;">{{ todayLabel }}</p>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <KpiCard v-for="kpi in kpis" :key="kpi.title" v-bind="kpi" />
        </div>

        <!-- Content split -->
        <div class="flex gap-6">
          <div class="flex-1 min-w-0">
            <TodayAppointments />
          </div>
          <div class="w-80 flex-shrink-0">
            <InsightsPanel />
          </div>
        </div>
      </div>
    </main>

    <!-- FAB -->
    <button
      class="fixed bottom-8 right-8 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50"
      style="background-color: #00288E; color: white; box-shadow: 0 8px 32px rgba(0,40,142,0.35);"
    >
      <span
        class="material-symbols-outlined"
        style="width:28px;height:28px;font-size:28px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;"
      >add</span>
    </button>
  </div>
</template>
