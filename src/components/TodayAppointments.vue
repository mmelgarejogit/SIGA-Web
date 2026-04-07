<script setup lang="ts">
const appointments = [
  {
    initials: 'MS',
    name: 'Mariana Silva',
    time: '13:30 – 14:00',
    procedure: 'Examen de Refracción',
    status: 'Activo',
    avatarBg: '#DDE1FF',
    avatarColor: '#00288E',
  },
  {
    initials: 'RF',
    name: 'Roberto Fontes',
    time: '14:15 – 14:45',
    procedure: 'Consulta de Retorno',
    status: 'Pendiente',
    avatarBg: '#B7EAFF',
    avatarColor: '#006780',
  },
  {
    initials: 'AL',
    name: 'Ana Lucía',
    time: '15:00 – 15:30',
    procedure: 'Lentes de Contacto',
    status: 'Cancelado',
    avatarBg: '#E2DFFF',
    avatarColor: '#2000B1',
  },
  {
    initials: 'CP',
    name: 'Carlos Pereira',
    time: '16:00 – 16:30',
    procedure: 'Avaliación Quirúrgica',
    status: 'Activo',
    avatarBg: '#B7EAFF',
    avatarColor: '#006780',
  },
]

const statusStyle = (s: string) => {
  if (s === 'Activo')
    return { bg: 'background-color: #dcfce7;', dot: 'background-color: #16a34a;', text: 'color: #166534;' }
  if (s === 'Pendiente')
    return { bg: 'background-color: #fef9c3;', dot: 'background-color: #ca8a04;', text: 'color: #854d0e;' }
  return { bg: 'background-color: #fee2e2;', dot: 'background-color: #dc2626;', text: 'color: #991b1b;' }
}
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

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr style="background-color: #E8EFFC;">
            <th
              class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest"
              style="color: #00288E;"
            >Paciente</th>
            <th
              class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest hidden sm:table-cell"
              style="color: #00288E;"
            >Horario</th>
            <th
              class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest hidden md:table-cell"
              style="color: #00288E;"
            >Procedimiento</th>
            <th
              class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest"
              style="color: #00288E;"
            >Estado</th>
            <th
              class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-right"
              style="color: #00288E;"
            >Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="apt in appointments"
            :key="apt.name"
            class="group transition-colors"
            style="border-bottom: 1px solid rgba(196,197,213,0.08);"
            onmouseover="this.style.backgroundColor='#F1F4F9'"
            onmouseout="this.style.backgroundColor=''"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  :style="`background-color: ${apt.avatarBg}; color: ${apt.avatarColor};`"
                >
                  {{ apt.initials }}
                </div>
                <span class="text-sm font-semibold" style="color: #181C20;">{{ apt.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm hidden sm:table-cell" style="color: #757684;">
              {{ apt.time }}
            </td>
            <td class="px-6 py-4 text-sm hidden md:table-cell" style="color: #444653;">
              {{ apt.procedure }}
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                :style="statusStyle(apt.status).bg + statusStyle(apt.status).text"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="statusStyle(apt.status).dot"></span>
                {{ apt.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                class="p-2 rounded-full transition-colors hover:opacity-80"
                style="color: #757684;"
                onmouseover="this.style.backgroundColor='#E6E8ED'"
                onmouseout="this.style.backgroundColor=''"
              >
                <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">more_vert</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
