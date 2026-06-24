<script setup lang="ts">
const patients = [
  { nombre: "María González", ci: "3.456.789", telefono: "0981 234 567", fecha: "06/04/2026" },
  { nombre: "Carlos Benítez", ci: "2.789.012", telefono: "0991 345 678", fecha: "05/04/2026" },
  { nombre: "Ana Fernández", ci: "4.123.456", telefono: "0976 456 789", fecha: "05/04/2026" },
  { nombre: "Luis Ramírez", ci: "1.890.345", telefono: "0985 567 890", fecha: "04/04/2026" },
  { nombre: "Sandra López", ci: "5.234.678", telefono: "0961 678 901", fecha: "04/04/2026" },
]

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
]
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-[#1E3A5F]">Últimos Pacientes Registrados</h2>
        <p class="text-xs text-slate-500 mt-0.5">Registros más recientes del sistema</p>
      </div>
      <button
        class="text-xs text-[#3B82F6] hover:text-[var(--color-primary-container)] font-medium transition-colors"
      >
        Ver todos →
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-slate-50">
            <th
              class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"
            >
              Nombre
            </th>
            <th
              class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell"
            >
              C.I.
            </th>
            <th
              class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell"
            >
              Teléfono
            </th>
            <th
              class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell"
            >
              Fecha de Registro
            </th>
            <th
              class="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"
            >
              Acción
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr
            v-for="(patient, i) in patients"
            :key="patient.ci"
            class="hover:bg-slate-50/60 transition-colors"
          >
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    avatarColors[i % avatarColors.length],
                  ]"
                >
                  {{ initials(patient.nombre) }}
                </div>
                <span class="text-sm font-medium text-slate-700">{{ patient.nombre }}</span>
              </div>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-500 font-mono hidden sm:table-cell">
              {{ patient.ci }}
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-500 hidden md:table-cell">
              {{ patient.telefono }}
            </td>
            <td class="px-4 py-3.5 hidden lg:table-cell">
              <span
                class="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium"
              >
                {{ patient.fecha }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                class="text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[var(--color-primary-container)] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Ver
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
      <p class="text-xs text-slate-400 text-center">Mostrando 5 de 847 pacientes registrados</p>
    </div>
  </div>
</template>
