<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import KpiCard from '@/components/KpiCard.vue'
import TodayAppointments from '@/components/TodayAppointments.vue'
import InsightsPanel from '@/components/InsightsPanel.vue'

const kpis = [
  {
    title: 'Pacientes Activos',
    value: '1.284',
    icon: 'group',
    badge: '+12%',
    badgeType: 'positive' as const,
    iconBg: '#DDE1FF',
    iconColor: '#00288E',
  },
  {
    title: 'Agendamientos',
    value: '24',
    icon: 'calendar_today',
    badge: 'Hoy',
    badgeType: 'neutral' as const,
    iconBg: '#B7EAFF',
    iconColor: '#006780',
  },
  {
    title: 'Ingresos Semanales',
    value: '₲ 12.4M',
    icon: 'sell',
    badge: '+8.4%',
    badgeType: 'positive' as const,
    iconBg: '#E2DFFF',
    iconColor: '#2000B1',
  },
  {
    title: 'Stock Crítico',
    value: '18',
    icon: 'warning',
    badge: 'Crítico',
    badgeType: 'critical' as const,
    iconBg: '#FFDAD6',
    iconColor: '#BA1A1A',
  },
]

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

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
              {{ greeting() }}, Beatriz
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
            <p class="text-2xl font-bold mt-1" style="color: #00288E;">Buen día, Beatriz</p>
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
