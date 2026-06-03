<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import { getEgresoById, type Egreso } from "@/services/egresosService"

const route = useRoute()
const router = useRouter()

const egreso = ref<Egreso | null>(null)
const isLoading = ref(true)
const loadError = ref("")

const showRechazar = ref(false)
const rechazarMotivo = ref("")
const isSavingRechazar = ref(false)
const rechazarError = ref("")

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) { loadError.value = "ID inválido"; isLoading.value = false; return }
  try {
    const res = await getEgresoById(id)
    egreso.value = res
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar egreso."
  } finally {
    isLoading.value = false
  }
})

function formatDate(s?: string) {
  return s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function estadoColor(estado: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Pendiente: { bg: "#FEF9C3", color: "#854D0E" },
    Aprobado: { bg: "#DCFCE7", color: "#166534" },
    Rechazado: { bg: "#FEE2E2", color: "#991B1B" },
    Pagado: { bg: "#DBEAFE", color: "#1E40AF" },
    Anulado: { bg: "#F3F4F6", color: "#374151" },
  }
  return map[estado] ?? { bg: "#F3F4F6", color: "#374151" }
}

function tipoColor(tipo: string) {
  const map: Record<string, { bg: string; color: string }> = {
    FacturaCompra: { bg: "#DBEAFE", color: "#1D4ED8" },
    Honorario: { bg: "#EDE9FE", color: "#6D28D9" },
    GastoGeneral: { bg: "#FEF3C7", color: "#92400E" },
    Salario: { bg: "#DCFCE7", color: "#166534" },
  }
  return map[tipo] ?? { bg: "#F3F4F6", color: "#374151" }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8 max-w-3xl mx-auto">
        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color: var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size: 20px">arrow_back</span>
          </button>
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight">Detalle de Egreso</h1>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-16 text-sm" style="color: var(--color-outline)">Cargando...</div>
        <div v-else-if="loadError" class="rounded-2xl p-4 text-sm font-medium" style="background-color: var(--color-error-container); color: var(--color-on-error-container)">{{ loadError }}</div>

        <template v-else-if="egreso">
          <!-- Badges -->
          <div class="flex items-center gap-3 mb-6">
            <span class="px-3 py-1 rounded-full text-xs font-bold" :style="`background-color: ${estadoColor(egreso.estado).bg}; color: ${estadoColor(egreso.estado).color}`">{{ egreso.estado }}</span>
            <span class="px-3 py-1 rounded-full text-xs font-bold" :style="`background-color: ${tipoColor(egreso.tipo).bg}; color: ${tipoColor(egreso.tipo).color}`">{{ egreso.tipo }}</span>
          </div>

          <!-- Monto principal -->
          <div class="rounded-2xl p-6 mb-6" style="background-color: var(--color-surface-container-low)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Monto</p>
            <p class="text-4xl font-extrabold" style="color: var(--color-primary)">{{ formatPrice(egreso.monto) }}</p>
          </div>

          <!-- Datos principales -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="rounded-2xl p-4" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Concepto</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.concepto }}</p>
            </div>
            <div class="rounded-2xl p-4" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Sucursal</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.sucursalNombre ?? "—" }}</p>
            </div>
            <div class="rounded-2xl p-4" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Creado por</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.creadoPorUserNombre ?? "—" }}</p>
            </div>
            <div class="rounded-2xl p-4" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Fecha creación</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatDate(egreso.fechaCreacion) }}</p>
            </div>
          </div>

          <!-- Datos específicos por tipo -->
          <template v-if="egreso.tipo === 'Honorario'">
            <div class="rounded-2xl p-4 mb-6" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Profesional</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.professionalNombre ?? "—" }}</p>
              <p class="text-xs mt-1" style="color: var(--color-outline)">Período: {{ egreso.periodoMes }}/{{ egreso.periodoAnio }}</p>
            </div>
          </template>
          <template v-else-if="egreso.tipo === 'GastoGeneral'">
            <div class="rounded-2xl p-4 mb-6" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Categoría</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.categoriaGastoNombre ?? "—" }}</p>
            </div>
          </template>
          <template v-else-if="egreso.tipo === 'Salario'">
            <div class="rounded-2xl p-4 mb-6" style="background-color: var(--color-surface)">
              <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Empleado</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.empleadoNombre ?? "—" }}</p>
              <p class="text-xs mt-1" style="color: var(--color-outline)">Período: {{ egreso.periodoMes }}/{{ egreso.periodoAnio }}</p>
            </div>
          </template>

          <!-- Datos de pago (si existe) -->
          <template v-if="egreso.egresoPagoId">
            <div class="rounded-2xl p-4 mb-6" style="background-color: var(--color-surface-container-low)">
              <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Datos del Pago</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs" style="color: var(--color-outline)">Fecha pago</p>
                  <p class="text-sm font-semibold">{{ formatDate(egreso.egresoPagoFechaPago) }}</p>
                </div>
                <div>
                  <p class="text-xs" style="color: var(--color-outline)">Método</p>
                  <p class="text-sm font-semibold">{{ egreso.egresoPagoMetodoPago }}</p>
                </div>
                <div v-if="egreso.egresoPagoNumeroComprobante">
                  <p class="text-xs" style="color: var(--color-outline)">Nro. Comprobante</p>
                  <p class="text-sm font-semibold">{{ egreso.egresoPagoNumeroComprobante }}</p>
                </div>
                <div v-if="egreso.egresoPagoRegistradoPorUserNombre">
                  <p class="text-xs" style="color: var(--color-outline)">Registrado por</p>
                  <p class="text-sm font-semibold">{{ egreso.egresoPagoRegistradoPorUserNombre }}</p>
                </div>
              </div>
            </div>
          </template>

          <!-- Observaciones -->
          <div v-if="egreso.observaciones" class="rounded-2xl p-4 mb-6" style="background-color: var(--color-surface)">
            <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Observaciones</p>
            <p class="text-sm" style="color: var(--color-on-surface)">{{ egreso.observaciones }}</p>
          </div>

          <!-- Rechazo -->
          <div v-if="egreso.motivoRechazo" class="rounded-2xl p-4 mb-6" style="background-color: var(--color-error-container)">
            <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-on-error-container)">Motivo de Rechazo</p>
            <p class="text-sm" style="color: var(--color-on-error-container)">{{ egreso.motivoRechazo }}</p>
          </div>

          <!-- Acciones según estado -->
          <div class="flex gap-3">
            <BaseButton v-if="egreso.estado === 'Aprobado'" variant="primary" @click="router.push(`/egresos/pagos/${egreso.id}`)">
              <span class="material-symbols-outlined" style="font-size: 18px">payments</span>
              Registrar Pago
            </BaseButton>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>