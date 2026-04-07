<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'

const activeFilter = ref('todos')

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'recientes', label: 'Recientes' },
  { id: 'cronicos', label: 'Crónicos' },
  { id: 'pendientes', label: 'Pendientes' },
]

const patients = [
  {
    initials: 'LM',
    name: 'Lucía Méndez',
    email: 'lucia.m@email.com',
    ci: '1-0982-0442',
    lastVisit: '12 Oct, 2023',
    status: 'Activo',
    avatarBg: 'rgba(0,40,142,0.06)',
    avatarColor: '#00288E',
  },
  {
    initials: 'CR',
    name: 'Carlos Ruiz',
    email: 'carlos.ruiz@pro.net',
    ci: '8-122-9011',
    lastVisit: '05 Nov, 2023',
    status: 'Pendiente',
    avatarBg: 'rgba(0,103,128,0.06)',
    avatarColor: '#006780',
  },
  {
    initials: 'MS',
    name: 'Mariana Silva',
    email: 'marianasilva@web.com',
    ci: '4-762-1290',
    lastVisit: '29 Sep, 2023',
    status: 'Activo',
    avatarBg: 'rgba(32,0,177,0.06)',
    avatarColor: '#2000B1',
  },
  {
    initials: 'RV',
    name: 'Roberto Valdez',
    email: 'rvaldez@corporativo.mx',
    ci: '3-902-1823',
    lastVisit: '15 Ago, 2023',
    status: 'Inactivo',
    avatarBg: 'rgba(117,118,132,0.08)',
    avatarColor: '#757684',
  },
]

const statusStyle = (s: string) => {
  if (s === 'Activo')
    return { bg: '#dcfce7', dot: '#16a34a', text: '#166534' }
  if (s === 'Pendiente')
    return { bg: '#ffedd5', dot: '#ea580c', text: '#9a3412' }
  return { bg: '#E0E2E7', dot: '#757684', text: '#444653' }
}

const currentPage = ref(1)
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="px-8 pt-10 pb-12 max-w-7xl mx-auto">

        <!-- Page header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h2
              class="text-4xl font-extrabold tracking-tight mb-2"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
            >
              Gestión de Pacientes
            </h2>
            <p class="font-medium" style="color: #444653;">
              Administre la base de datos de pacientes y su historial clínico con precisión.
            </p>
          </div>

          <button
            class="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 20px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">person_add</span>
            Añadir Paciente
          </button>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3 mb-8 flex-wrap">
          <button
            v-for="f in filters"
            :key="f.id"
            @click="activeFilter = f.id"
            class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
            :style="activeFilter === f.id
              ? 'background-color: #1E40AF; color: #A8B8FF;'
              : 'background-color: #E6E8ED; color: #444653;'"
          >
            {{ f.label }}
          </button>

          <div class="ml-auto flex items-center gap-1.5" style="color: #757684;">
            <span class="text-xs font-bold uppercase tracking-widest">Filtrado por:</span>
            <span class="text-xs font-bold" style="color: #00288E;">Fecha de registro</span>
            <span class="material-symbols-outlined" style="width:18px;height:18px;font-size:18px;">expand_more</span>
          </div>
        </div>

        <!-- Table -->
        <div
          class="rounded-2xl overflow-hidden"
          style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
        >
          <table class="w-full text-left">
            <thead>
              <tr style="background-color: #F1F4F9;">
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Nombre del Paciente</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #757684;">ID / Cédula</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Última Visita</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Estado</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in patients"
                :key="p.ci"
                class="group transition-colors"
                style="border-top: 1px solid rgba(196,197,213,0.12);"
                onmouseover="this.style.backgroundColor='#F1F4F9'"
                onmouseout="this.style.backgroundColor=''"
              >
                <!-- Patient name -->
                <td class="px-6 py-5">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      :style="`background-color: ${p.avatarBg}; color: ${p.avatarColor};`"
                    >{{ p.initials }}</div>
                    <div>
                      <div class="font-bold text-sm" style="color: #181C20;">{{ p.name }}</div>
                      <div class="text-xs" style="color: #444653;">{{ p.email }}</div>
                    </div>
                  </div>
                </td>

                <!-- CI -->
                <td class="px-6 py-5 text-sm font-medium tracking-wider hidden sm:table-cell" style="color: #444653;">
                  {{ p.ci }}
                </td>

                <!-- Last visit -->
                <td class="px-6 py-5 text-sm hidden md:table-cell" style="color: #444653;">
                  {{ p.lastVisit }}
                </td>

                <!-- Status -->
                <td class="px-6 py-5">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    :style="`background-color: ${statusStyle(p.status).bg}; color: ${statusStyle(p.status).text};`"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="`background-color: ${statusStyle(p.status).dot};`"
                    ></span>
                    {{ p.status }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-5">
                  <div class="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">visibility</span>
                    </button>
                    <button
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">edit</span>
                    </button>
                    <button
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div
            class="px-6 py-4 flex justify-between items-center"
            style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
          >
            <span class="text-sm" style="color: #444653;">
              Mostrando <strong style="color:#181C20;">4</strong> de
              <strong style="color:#181C20;">1.248</strong> pacientes
            </span>

            <div class="flex items-center gap-1">
              <button
                class="p-2 rounded-full transition-all disabled:opacity-30"
                style="color: #444653;"
                disabled
              >
                <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">chevron_left</span>
              </button>

              <div class="flex items-center gap-1 px-2 text-sm font-bold">
                <button
                  v-for="page in [1, 2, 3]"
                  :key="page"
                  @click="currentPage = page"
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  :style="currentPage === page
                    ? 'background-color: #DDE1FF; color: #00288E; text-decoration: underline; text-underline-offset: 4px;'
                    : 'color: #181C20;'"
                >{{ page }}</button>
                <span class="px-1" style="color: #757684;">...</span>
                <button
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style="color: #181C20;"
                >48</button>
              </div>

              <button
                class="p-2 rounded-full transition-all"
                style="color: #444653;"
                onmouseover="this.style.backgroundColor='#E6E8ED'"
                onmouseout="this.style.backgroundColor=''"
              >
                <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bento insight cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <!-- Card 1: Growth -->
          <div
            class="p-8 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
            style="background-color: #F1F4F9; height: 192px;"
            onmouseover="this.style.backgroundColor='rgba(0,40,142,0.05)'"
            onmouseout="this.style.backgroundColor='#F1F4F9'"
          >
            <span
              class="material-symbols-outlined"
              style="color: #00288E; font-size:32px; width:32px; height:32px; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 32;"
            >insights</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">12%</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Crecimiento Mensual</div>
            </div>
          </div>

          <!-- Card 2: New records -->
          <div
            class="p-8 rounded-2xl flex flex-col justify-between cursor-pointer transition-all"
            style="background-color: #F1F4F9; height: 192px;"
            onmouseover="this.style.backgroundColor='rgba(0,103,128,0.05)'"
            onmouseout="this.style.backgroundColor='#F1F4F9'"
          >
            <span
              class="material-symbols-outlined"
              style="color: #006780; font-size:32px; width:32px; height:32px; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 32;"
            >history_edu</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">45</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Nuevos Expedientes</div>
            </div>
          </div>

          <!-- Card 3: Reminders (primary) -->
          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background: linear-gradient(135deg, #00288E 0%, #1E40AF 100%); height: 192px; box-shadow: 0 8px 24px rgba(0,40,142,0.25);"
          >
            <span
              class="material-symbols-outlined"
              style="color: #DDE1FF; font-size:32px; width:32px; height:32px; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 32;"
            >contact_support</span>
            <div>
              <div class="text-sm font-medium mb-1" style="color: rgba(221,225,255,0.75);">Recordatorios Pendientes</div>
              <div class="text-lg font-bold text-white leading-snug">
                Enviar avisos de retiro de lentes a 12 pacientes.
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- FAB -->
    <button
      class="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50"
      style="background-color: #006780; color: white; box-shadow: 0 8px 32px rgba(0,103,128,0.35);"
    >
      <span
        class="material-symbols-outlined"
        style="font-size:32px; width:32px; height:32px; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 40;"
      >qr_code_scanner</span>
    </button>
  </div>
</template>
