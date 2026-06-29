<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Egreso, getEgresos, aprobarEgreso, rechazarEgreso } from "@/services/egresosService"

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Estado ─────────────────────────────────────────────────────────────────────

const egresos = ref<Egreso[]>([])
const totalCount = ref(0)
const isLoading = ref(false)
const loadError = ref("")
const currentPage = ref(1)
const pageSize = 10

const tipoFiltros = ref<string[]>([])
const tipoOptions = [
  { value: "Honorario", label: "Honorario" },
  { value: "GastoGeneral", label: "Gasto General" },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const params: Record<string, unknown> = { estado: "Pendiente", page: currentPage.value, pageSize }
    if (tipoFiltros.value.length === 1) params.tipo = tipoFiltros.value[0]
    const res = await getEgresos(params as Parameters<typeof getEgresos>[0])
    egresos.value = res.items.filter(e => e.estado === "Pendiente")
    totalCount.value = egresos.value.length
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar egresos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function setTipoFiltro(val: string[]) {
  const added = val.find(v => !tipoFiltros.value.includes(v))
  tipoFiltros.value = added ? [added] : val
  currentPage.value = 1
  load()
}

const columns = [
  { key: "tipo", label: "Tipo" },
  { key: "concepto", label: "Concepto" },
  { key: "monto", label: "Monto", align: "right" as const },
  { key: "fechaEmision", label: "Emisión" },
  { key: "acciones", label: "", align: "right" as const },
]

// ── Menú contextual ────────────────────────────────────────────────────────────

function menuItems(e: Egreso): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver detalle",  icon: "visibility",   action: () => openDetalle(e) },
    { type: "separator" },
    { type: "item", label: "Aprobar",      icon: "check_circle", action: () => openAprobar(e) },
    { type: "item", label: "Rechazar",     icon: "cancel",       action: () => openRechazar(e), danger: true },
  ]
}

// ── Detalle ────────────────────────────────────────────────────────────────────

const showDetalle = ref(false)
const detalleEgreso = ref<Egreso | null>(null)

function openDetalle(e: Egreso) {
  detalleEgreso.value = e
  showDetalle.value = true
}

function tipoLabel(tipo: string) {
  return { FacturaCompra: "Factura", Honorario: "Honorario", GastoGeneral: "Gasto" }[tipo] ?? tipo
}

function tipoColor(tipo: string) {
  return {
    FacturaCompra: { bg: "var(--color-info-container)", color: "var(--color-on-info-container)" },
    Honorario:     { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "#6D28D9" },
    GastoGeneral:  { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" },
  }[tipo] ?? { bg: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
}

function tipoIcon(tipo: string) {
  return { FacturaCompra: "receipt", Honorario: "person_check", GastoGeneral: "payments" }[tipo] ?? "attach_money"
}

// ── Aprobar ────────────────────────────────────────────────────────────────────

const showAprobar = ref(false)
const isSavingAprobar = ref(false)
const aprobarError = ref("")
const aprobarId = ref(0)

function openAprobar(e: Egreso) {
  aprobarId.value = e.id
  aprobarError.value = ""
  showAprobar.value = true
}

async function submitAprobar() {
  isSavingAprobar.value = true
  aprobarError.value = ""
  try {
    await aprobarEgreso(aprobarId.value)
    showAprobar.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    aprobarError.value = err instanceof Error ? err.message : "Error al aprobar egreso."
  } finally {
    isSavingAprobar.value = false
  }
}

// ── Rechazar ───────────────────────────────────────────────────────────────────

const showRechazar = ref(false)
const isSavingRechazar = ref(false)
const rechazarError = ref("")
const rechazarId = ref(0)
const rechazarMotivo = ref("")

function openRechazar(e: Egreso) {
  rechazarId.value = e.id
  rechazarMotivo.value = ""
  rechazarError.value = ""
  showRechazar.value = true
}

function inputStyle(hasError = false) {
  const base = 'border-radius: 12px; '
  return hasError
    ? base + 'border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));'
    : base + 'border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);'
}

async function submitRechazar() {
  if (!rechazarMotivo.value.trim()) { rechazarError.value = "El motivo es obligatorio."; return }
  isSavingRechazar.value = true
  rechazarError.value = ""
  try {
    await rechazarEgreso(rechazarId.value, { motivo: rechazarMotivo.value.trim() })
    showRechazar.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    rechazarError.value = err instanceof Error ? err.message : "Error al rechazar egreso."
  } finally {
    isSavingRechazar.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobación de Egresos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} egreso{{ totalCount !== 1 ? "s" : "" }} pendiente{{ totalCount !== 1 ? "s" : "" }} de aprobación
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6">
          <FilterChips :options="tipoOptions" :modelValue="tipoFiltros" placeholder="Tipo" @update:modelValue="setTipoFiltro" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="egresos" :loading="isLoading" empty-text="No hay egresos pendientes de aprobación.">

          <template #tipo="{ item }">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-full flex-shrink-0"
                :style="`background-color: ${tipoColor(item.tipo).bg}; display: flex; align-items: center; justify-content: center`">
                <span class="material-symbols-outlined" :style="`font-size: 18px; color: ${tipoColor(item.tipo).color}`">{{ tipoIcon(item.tipo) }}</span>
              </span>
              <span class="text-xs font-bold" :style="`color: ${tipoColor(item.tipo).color}`">{{ tipoLabel(item.tipo) }}</span>
            </div>
          </template>

          <template #concepto="{ item }">
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.concepto }}</p>
              <p class="text-xs" style="color: var(--color-outline)">
                <span v-if="item.tipo === 'Honorario'">{{ item.professionalNombre ?? '—' }} {{ item.periodo ? `· ${item.periodo}` : '' }}</span>
                <span v-else>{{ item.categoriaGastoNombre ?? '—' }}</span>
              </p>
            </div>
          </template>

          <template #monto="{ item }">
            <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{ formatPrice(item.monto) }}</span>
          </template>

          <template #fechaEmision="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaEmision) }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalCount > pageSize" class="flex items-center justify-between mt-4">
          <p class="text-sm" style="color: var(--color-outline)">
            Mostrando {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, totalCount) }} de {{ totalCount }}
          </p>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="currentPage === 1" @click="currentPage--; load()">
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
            </BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="currentPage * pageSize >= totalCount" @click="currentPage++; load()">
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
            </BaseButton>
          </div>
        </div>
      </div>
    </main>

    <!-- ── MODAL DETALLE ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showDetalle" title="Detalle de Solicitud" size="lg" @close="showDetalle = false">
      <div v-if="detalleEgreso" class="space-y-4">
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid var(--color-hairline)">
          <span class="w-12 h-12 rounded-2xl flex items-center justify-center"
            :style="`background-color: ${tipoColor(detalleEgreso.tipo).bg}`">
            <span class="material-symbols-outlined" :style="`font-size: 22px; color: ${tipoColor(detalleEgreso.tipo).color}`">{{ tipoIcon(detalleEgreso.tipo) }}</span>
          </span>
          <div>
            <p class="font-extrabold text-lg" style="color: var(--color-on-surface)">{{ detalleEgreso.concepto }}</p>
            <p class="text-sm" style="color: var(--color-outline)">{{ tipoLabel(detalleEgreso.tipo) }}</p>
          </div>
          <p class="ml-auto text-2xl font-extrabold" style="color: var(--color-primary)">{{ formatPrice(detalleEgreso.monto) }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaEmision) }}</p>
          </div>
          <div v-if="detalleEgreso.fechaVencimiento">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Vencimiento</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaVencimiento) }}</p>
          </div>
          <template v-if="detalleEgreso.tipo === 'Honorario'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Profesional</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.professionalNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.periodo">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Período</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.periodo }}</p>
            </div>
          </template>
          <template v-if="detalleEgreso.tipo === 'GastoGeneral'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Categoría</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.categoriaGastoNombre ?? '—' }}</p>
            </div>
          </template>
        </div>

        <div v-if="detalleEgreso.observaciones" class="rounded-2xl p-3" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observaciones</p>
          <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleEgreso.observaciones }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="danger" size="default" @click="openRechazar(detalleEgreso!)">Rechazar</BaseButton>
        <BaseButton variant="primary" size="default" @click="openAprobar(detalleEgreso!)">Aprobar</BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL APROBAR ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showAprobar" title="Aprobar Egreso" size="sm" @close="showAprobar = false">
      <div v-if="aprobarError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ aprobarError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Confirmás la aprobación? El responsable de caja podrá registrar el pago.
      </p>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showAprobar = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingAprobar" @click="submitAprobar">
            <span v-if="isSavingAprobar" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingAprobar ? "Aprobando..." : "Confirmar Aprobación" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── MODAL RECHAZAR ────────────────────────────────────────────────────── -->
    <BaseModal :show="showRechazar" title="Rechazar Egreso" size="sm" @close="showRechazar = false">
      <div v-if="rechazarError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ rechazarError }}
      </div>
      <div class="space-y-3">
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          El egreso será rechazado y no podrá reactivarse.
        </p>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo *</label>
          <textarea v-model="rechazarMotivo" rows="3" class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
            :style="inputStyle(false)"
            placeholder="Explicá el motivo del rechazo..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showRechazar = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isSavingRechazar" @click="submitRechazar">
            <span v-if="isSavingRechazar" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingRechazar ? "Rechazando..." : "Confirmar Rechazo" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
