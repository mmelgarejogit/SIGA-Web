<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import {
  type MovimientoStock,
  getMovimientos,
  aprobarRechazarMovimiento,
} from "@/services/inventarioService"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { http } from "@/api/http"

// ── Lista ─────────────────────────────────────────────────────────────────────

const movimientos = ref<MovimientoStock[]>([])
const isLoading = ref(false)
const loadError = ref("")
const tipoFilter = ref<string[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 10

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

const tipoOptions = [
  { value: "Entrada", label: "Entradas", dot: "var(--color-on-success-container)" },
  { value: "Salida",  label: "Salidas",  dot: "var(--color-on-error-container)" },
]

const columns = [
  { key: "fecha",    label: "Fecha movimiento" },
  { key: "producto", label: "Producto" },
  { key: "tipo",     label: "Tipo" },
  { key: "cantidad", label: "Cantidad" },
  { key: "motivo",   label: "Motivo" },
  { key: "usuario",  label: "Registrado por" },
  { key: "acciones", label: "", align: "right" as const },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function tipoStyle(tipo: string) {
  return tipo === "Entrada"
    ? { bg: "var(--color-success-container)", text: "var(--color-on-success-container)" }
    : { bg: "var(--color-error-container)", text: "var(--color-on-error-container)" }
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getMovimientos({
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      tipo: tipoFilter.value[0] || undefined,
      estado: "Pendiente",
    })
    movimientos.value = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar movimientos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function onTipoChange(val: string[]) { tipoFilter.value = val; currentPage.value = 1; load() }

function menuItems(m: MovimientoStock): ContextMenuItem[] {
  return [
    { type: "item", label: "Aprobar", icon: "check_circle", action: () => openGestion(m, "Aprobado") },
    { type: "item", label: "Rechazar", icon: "cancel", action: () => openGestion(m, "Rechazado"), danger: true },
    { type: "separator" },
    { type: "item", label: "Descargar PDF", icon: "picture_as_pdf", action: () => downloadPdf(m) },
  ]
}

// ── Detalle ───────────────────────────────────────────────────────────────────

const showDetailModal = ref(false)
const detailTarget = ref<MovimientoStock | null>(null)

function openDetail(m: MovimientoStock) { detailTarget.value = m; showDetailModal.value = true }
function closeDetail() { showDetailModal.value = false }

// ── Aprobar / Rechazar ────────────────────────────────────────────────────────

const showGestionModal = ref(false)
const gestionTarget = ref<MovimientoStock | null>(null)
const gestionAccion = ref<"Aprobado" | "Rechazado">("Aprobado")
const gestionObs = ref("")
const isGestioning = ref(false)
const gestionError = ref("")

function openGestion(m: MovimientoStock, accion: "Aprobado" | "Rechazado") {
  gestionTarget.value = m
  gestionAccion.value = accion
  gestionObs.value = ""
  gestionError.value = ""
  showGestionModal.value = true
}

function openGestionFromDetail(accion: "Aprobado" | "Rechazado") {
  if (!detailTarget.value) return
  const m = detailTarget.value
  closeDetail()
  openGestion(m, accion)
}

async function submitGestion() {
  if (!gestionTarget.value) return
  isGestioning.value = true
  gestionError.value = ""
  try {
    await aprobarRechazarMovimiento(gestionTarget.value.id, {
      estado: gestionAccion.value,
      observaciones: gestionObs.value.trim() || undefined,
    })
    showGestionModal.value = false
    await load()
  } catch (err: unknown) {
    gestionError.value = err instanceof Error ? err.message : "Error al procesar el movimiento."
  } finally {
    isGestioning.value = false
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

const pdfLoadingId = ref<number | null>(null)

async function downloadPdf(m: MovimientoStock) {
  pdfLoadingId.value = m.id
  try {
    const response = await http.get(`/api/productos/movimientos/${m.id}/pdf`, { responseType: "blob" })
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `movimiento-${m.id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* silent */ } finally {
    pdfLoadingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">Aprobaciones</h1>
            <p class="mt-1 font-medium" style="color: var(--color-on-surface-variant)">
              <span v-if="totalCount > 0">
                {{ totalCount }} movimiento{{ totalCount !== 1 ? "s" : "" }} pendiente{{ totalCount !== 1 ? "s" : "" }} de aprobación
              </span>
              <span v-else>Sin movimientos pendientes</span>
            </p>
          </div>
          <!-- Badge contador -->
          <div v-if="totalCount > 0"
            class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold"
            style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">schedule</span>
            {{ totalCount }} pendiente{{ totalCount !== 1 ? "s" : "" }}
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <FilterChips :model-value="tipoFilter" :options="tipoOptions" placeholder="Tipo" @update:model-value="onTipoChange" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
          <BaseTable :columns="columns" :items="movimientos" :loading="isLoading" empty-text="No hay movimientos pendientes de aprobación." @row-click="openDetail">

            <template #fecha="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaMovimiento) }}</span>
            </template>

            <template #producto="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.productoNombre }}</span>
            </template>

            <template #tipo="{ item }">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="`background-color: ${tipoStyle(item.tipo).bg}; color: ${tipoStyle(item.tipo).text}`">
                {{ item.tipo }}
              </span>
            </template>

            <template #cantidad="{ item }">
              <span class="text-sm font-bold" style="color: var(--color-on-surface)">
                {{ item.tipo === "Entrada" ? "+" : "-" }}{{ item.cantidad }}
              </span>
            </template>

            <template #motivo="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.motivo ?? "—" }}</span>
            </template>

            <template #usuario="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.creadoPorNombre ?? "—" }}</span>
            </template>

            <template #acciones="{ item }">
              <div class="flex items-center justify-end">
                <RowContextMenu :items="menuItems(item)" />
              </div>
            </template>

          </BaseTable>

          <!-- Paginador -->
          <div v-if="movimientos.length > 0" class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong> movimientos
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--; load()" :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button v-else @click="currentPage = (p as number); load()"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :style="currentPage === p ? 'background-color: var(--color-primary); color: var(--color-on-primary);' : 'color: var(--color-on-surface-variant)'">
                  {{ p }}
                </button>
              </template>
              <button @click="currentPage++; load()" :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- MODAL DETALLE -->
    <BaseModal :show="showDetailModal" :title="`Movimiento #${String(detailTarget?.id ?? 0).padStart(6, '0')}`" size="lg" @close="closeDetail">
      <div v-if="detailTarget" class="space-y-5">

        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold"
            :style="`background-color: ${tipoStyle(detailTarget.tipo).bg}; color: ${tipoStyle(detailTarget.tipo).text}`">
            {{ detailTarget.tipo }}
          </span>
          <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold" style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
            <span class="material-symbols-outlined" style="font-size: 13px">schedule</span>
            Pendiente
          </span>
        </div>

        <div class="rounded-2xl overflow-hidden" style="border: 1px solid var(--color-surface-variant)">
          <div class="grid grid-cols-2">
            <div class="px-5 py-3.5" style="border-bottom: 1px solid var(--color-surface-variant); border-right: 1px solid var(--color-surface-variant)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Producto</p>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ detailTarget.productoNombre }}</p>
            </div>
            <div class="px-5 py-3.5" style="border-bottom: 1px solid var(--color-surface-variant)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cantidad</p>
              <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ detailTarget.tipo === "Entrada" ? "+" : "-" }}{{ detailTarget.cantidad }}</p>
            </div>
            <div class="px-5 py-3.5" style="border-bottom: 1px solid var(--color-surface-variant); border-right: 1px solid var(--color-surface-variant)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Fecha y hora</p>
              <p class="text-sm" style="color: var(--color-on-surface)">{{ formatDate(detailTarget.fechaMovimiento) }}</p>
            </div>
            <div class="px-5 py-3.5" style="border-bottom: 1px solid var(--color-surface-variant)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Registrado por</p>
              <p class="text-sm" style="color: var(--color-on-surface)">{{ detailTarget.creadoPorNombre ?? "—" }}</p>
            </div>
            <div class="col-span-2 px-5 py-3.5">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Motivo</p>
              <p class="text-sm" style="color: var(--color-on-surface)">{{ detailTarget.motivo ?? "—" }}</p>
            </div>
          </div>
        </div>

      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full gap-3">
          <button @click="detailTarget && downloadPdf(detailTarget)"
            class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 bg-blue-100 text-blue-700">
            <span v-if="detailTarget && pdfLoadingId === detailTarget.id" class="material-symbols-outlined animate-spin" style="font-size: 16px">progress_activity</span>
            <span v-else class="material-symbols-outlined" style="font-size: 16px">picture_as_pdf</span>
            Descargar PDF
          </button>
          <div class="flex items-center gap-2">
            <BaseButton variant="secondary" @click="closeDetail">Cerrar</BaseButton>
            <BaseButton variant="danger" @click="openGestionFromDetail('Rechazado')">
              <span class="material-symbols-outlined" style="font-size: 16px">cancel</span>
              Rechazar
            </BaseButton>
            <BaseButton variant="primary" @click="openGestionFromDetail('Aprobado')">
              <span class="material-symbols-outlined" style="font-size: 16px">check_circle</span>
              Aprobar
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- MODAL CONFIRMAR ACCIÓN -->
    <BaseModal
      :show="showGestionModal"
      :title="gestionAccion === 'Aprobado' ? 'Aprobar Movimiento' : 'Rechazar Movimiento'"
      size="sm"
      @close="showGestionModal = false"
    >
      <div v-if="gestionTarget">
        <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
          <span v-if="gestionAccion === 'Aprobado'">
            ¿Aprobar el movimiento de
            <strong style="color: var(--color-on-surface)">{{ gestionTarget.tipo === 'Entrada' ? '+' : '-' }}{{ gestionTarget.cantidad }}</strong>
            en <strong style="color: var(--color-on-surface)">{{ gestionTarget.productoNombre }}</strong>?
            Se actualizará el stock al confirmar.
          </span>
          <span v-else>
            ¿Rechazar el movimiento de <strong style="color: var(--color-on-surface)">{{ gestionTarget.productoNombre }}</strong>?
            No se aplicarán cambios al stock.
          </span>
        </p>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            {{ gestionAccion === 'Rechazado' ? 'Motivo del rechazo' : 'Observaciones (opcional)' }}
          </label>
          <textarea v-model="gestionObs" rows="3" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)"
            :placeholder="gestionAccion === 'Rechazado' ? 'Indicá el motivo del rechazo…' : 'Opcional…'" />
        </div>

        <div v-if="gestionError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          {{ gestionError }}
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showGestionModal = false">Cancelar</BaseButton>
        <BaseButton :variant="gestionAccion === 'Aprobado' ? 'primary' : 'danger'" :disabled="isGestioning" @click="submitGestion">
          {{ isGestioning ? "Procesando…" : (gestionAccion === 'Aprobado' ? 'Aprobar' : 'Rechazar') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
