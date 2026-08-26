<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type SesionCajaListItem,
  type SesionCaja,
  getSesiones,
  getSesionById,
  aprobarCierre,
  rechazarCierre,
} from "@/services/ventasService"

const router = useRouter()

// ── Formato ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(Math.abs(n))

const fmtSigned = (n: number) => {
  const prefix = n > 0 ? "+" : n < 0 ? "−" : ""
  return prefix + fmt(n)
}

const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

// ── Lista ─────────────────────────────────────────────────────────────────────

const sesiones  = ref<SesionCajaListItem[]>([])
const total     = ref(0)
const page      = ref(1)
const isLoading = ref(false)
const loadError = ref("")

const PAGE_SIZE  = 10
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const rangeStart = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const rangeEnd   = computed(() => Math.min(page.value * PAGE_SIZE, total.value))

async function cargar() {
  isLoading.value = true
  loadError.value = ""
  try {
    const res = await getSesiones(page.value, PAGE_SIZE, "PendienteAprobacion")
    sesiones.value = res.items
    total.value    = res.totalCount
  } catch (e: any) {
    loadError.value = e?.message ?? "Error al cargar las aprobaciones"
  } finally {
    isLoading.value = false
  }
}

function irAPagina(p: number) {
  page.value = p
  cargar()
}

onMounted(cargar)

// ── Detalle ───────────────────────────────────────────────────────────────────

const detalle      = ref<SesionCaja | null>(null)
const detalleError = ref("")
const isDetalleLoading = ref(false)
const showDetalle  = ref(false)

async function verDetalle(s: SesionCajaListItem) {
  detalleError.value = ""
  isDetalleLoading.value = true
  showDetalle.value  = true
  detalle.value      = null
  try {
    detalle.value = await getSesionById(s.id)
  } catch (e: any) {
    detalleError.value = e?.message ?? "Error al cargar el detalle"
  } finally {
    isDetalleLoading.value = false
  }
}

function menuItems(s: SesionCajaListItem): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver arqueo",   icon: "visibility",  action: () => verDetalle(s) },
    { type: "item", label: "Aprobar",      icon: "check_circle", action: () => iniciarAprobar(s) },
    { type: "item", label: "Rechazar",     icon: "cancel",       action: () => iniciarRechazar(s) },
  ]
}

// ── Aprobar ───────────────────────────────────────────────────────────────────

const showAprobar   = ref(false)
const sesionTarget  = ref<SesionCajaListItem | null>(null)
const isAprobar     = ref(false)
const aprobarError  = ref("")

function iniciarAprobar(s: SesionCajaListItem) {
  sesionTarget.value = s
  aprobarError.value = ""
  showAprobar.value  = true
}

async function submitAprobar() {
  if (!sesionTarget.value) return
  isAprobar.value   = true
  aprobarError.value = ""
  try {
    await aprobarCierre(sesionTarget.value.id)
    showAprobar.value = false
    await cargar()
  } catch (e: any) {
    aprobarError.value = e?.message ?? "Error al aprobar el cierre"
  } finally {
    isAprobar.value = false
  }
}

// ── Rechazar ──────────────────────────────────────────────────────────────────

const showRechazar  = ref(false)
const motivoRechazo = ref("")
const isRechazar    = ref(false)
const rechazarError = ref("")

function iniciarRechazar(s: SesionCajaListItem) {
  sesionTarget.value  = s
  motivoRechazo.value = ""
  rechazarError.value = ""
  showRechazar.value  = true
}

async function submitRechazar() {
  if (!sesionTarget.value) return
  if (!motivoRechazo.value.trim()) { rechazarError.value = "El motivo es obligatorio"; return }
  isRechazar.value    = true
  rechazarError.value = ""
  try {
    await rechazarCierre(sesionTarget.value.id, motivoRechazo.value.trim())
    showRechazar.value = false
    await cargar()
  } catch (e: any) {
    rechazarError.value = e?.message ?? "Error al rechazar el cierre"
  } finally {
    isRechazar.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Encabezado -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobaciones de Caja</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Cierres de sesión pendientes de revisión supervisora
            </p>
          </div>
          <BaseButton variant="secondary" @click="router.push('/caja/historial')">
            <span class="material-symbols-outlined" style="font-size:18px">history</span>
            Historial
          </BaseButton>
        </div>

        <!-- Carga -->
        <div v-if="isLoading" class="py-20 text-center">
          <span class="material-symbols-outlined text-5xl animate-spin block mb-3" style="color: var(--color-outline)">progress_activity</span>
          <p style="color: var(--color-outline)">Cargando pendientes…</p>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="py-16 text-center">
          <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-error)">error</span>
          <p class="font-medium" style="color: var(--color-error)">{{ loadError }}</p>
        </div>

        <!-- Tabla -->
        <template v-else>
          <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="sesiones.length === 0">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cajero</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Apertura</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cierre</th>
              <th class="px-6 py-5 text-right text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Esperado</th>
              <th class="px-6 py-5 text-right text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Contado</th>
              <th class="px-6 py-5 text-right text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Diferencia</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="s in sesiones"
                :key="s.id"
                class="hover:bg-surface-container-low"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
              >
                <td class="px-6 py-4 font-semibold" style="color: var(--color-on-surface)">{{ s.abiertaPorNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ fmtDt(s.fechaApertura) }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ s.fechaCierre ? fmtDt(s.fechaCierre) : "—" }}
                </td>
                <td class="px-6 py-4 text-right font-semibold" style="color: var(--color-on-surface)">
                  {{ fmt(s.efectivoEsperado ?? 0) }}
                </td>
                <td class="px-6 py-4 text-right font-semibold" style="color: var(--color-on-surface)">
                  {{ fmt(s.efectivoContado ?? 0) }}
                </td>
                <td class="px-6 py-4 text-right font-extrabold"
                    :style="(s.diferencia ?? 0) === 0 ? 'color:var(--color-on-success-container)' : (s.diferencia ?? 0) > 0 ? 'color:var(--color-on-info-container)' : 'color:var(--color-on-error-container)'">
                  {{ fmtSigned(s.diferencia ?? 0) }}
                </td>
                <td class="px-6 py-4">
                  <RowContextMenu :items="menuItems(s) as ContextMenuItem[]" />
                </td>
              </tr>
            </template>
          </BaseTable>

          <PaginationFooter
            v-if="total > 0"
            :current-page="page"
            :total-pages="totalPages"
            :range-start="rangeStart"
            :range-end="rangeEnd"
            :total="total"
            noun="sesiones pendientes"
            @update:current-page="irAPagina"
          />
          </div>
        </template>

      </div>
    </main>
  </div>

  <!-- Modal detalle arqueo -->
  <BaseModal :show="showDetalle" title="Arqueo de caja" size="lg" @close="showDetalle = false">

    <div v-if="isDetalleLoading" class="py-8 text-center">
      <span class="material-symbols-outlined text-4xl animate-spin block mb-2" style="color: var(--color-outline)">progress_activity</span>
    </div>
    <div v-else-if="detalleError" class="py-6 text-center">
      <p class="text-sm font-medium" style="color: var(--color-error)">{{ detalleError }}</p>
    </div>
    <div v-else-if="detalle" class="space-y-5">
      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style="background-color: var(--color-surface-container-low)">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cajero</p>
          <p class="font-semibold" style="color: var(--color-on-surface)">{{ detalle.abiertaPorNombre }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cerrado por</p>
          <p class="font-semibold" style="color: var(--color-on-surface)">{{ detalle.cerradaPorNombre ?? "—" }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Apertura</p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">{{ fmtDt(detalle.fechaApertura) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cierre</p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">{{ detalle.fechaCierre ? fmtDt(detalle.fechaCierre) : "—" }}</p>
        </div>
      </div>

      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style="background-color: var(--color-surface-container-low)">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Efectivo esperado</p>
          <p class="font-extrabold text-lg" style="color: var(--color-primary)">{{ fmt(detalle.efectivoEsperado ?? 0) }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Efectivo contado</p>
          <p class="font-extrabold text-lg" style="color: var(--color-on-surface)">{{ fmt(detalle.efectivoContado ?? 0) }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Diferencia</p>
          <p class="font-extrabold text-lg"
             :style="(detalle.diferencia ?? 0) === 0 ? 'color:var(--color-on-success-container)' : (detalle.diferencia ?? 0) > 0 ? 'color:var(--color-on-info-container)' : 'color:var(--color-on-error-container)'">
            {{ fmtSigned(detalle.diferencia ?? 0) }}
          </p>
        </div>
      </div>

      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style="background-color: var(--color-surface-container-low)">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Total ingresos</p>
          <p class="font-extrabold" style="color: var(--color-on-success-container)">+{{ fmt(detalle.totalIngresos) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Total egresos</p>
          <p class="font-extrabold" style="color: var(--color-on-error-container)">−{{ fmt(detalle.totalEgresos) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Monto inicial</p>
          <p class="font-semibold" style="color: var(--color-on-surface)">{{ fmt(detalle.montoInicial) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Movimientos</p>
          <p class="font-semibold" style="color: var(--color-on-surface)">{{ detalle.cantidadMovimientos }}</p>
        </div>
      </div>

      <div v-if="detalle.observacionCierre">
        <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observación del cajero</p>
        <p class="text-sm px-4 py-3 rounded-xl" style="background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant)">
          {{ detalle.observacionCierre }}
        </p>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="showDetalle = false">Cerrar</BaseButton>
      <template v-if="detalle">
        <BaseButton variant="danger" @click="showDetalle = false; iniciarRechazar({ id: detalle!.id } as any)">Rechazar</BaseButton>
        <BaseButton variant="primary" @click="showDetalle = false; iniciarAprobar({ id: detalle!.id } as any)">Aprobar cierre</BaseButton>
      </template>
    </template>

  </BaseModal>

  <!-- Modal confirmar aprobación -->
  <BaseModal :show="showAprobar" title="Aprobar cierre" size="sm" @close="showAprobar = false">
    <div class="space-y-4">
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Confirmás la aprobación del cierre de esta sesión? La sesión quedará marcada como cerrada.
      </p>
      <p v-if="aprobarError" class="text-xs font-medium" style="color: var(--color-error)">{{ aprobarError }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showAprobar = false">Cancelar</BaseButton>
      <BaseButton variant="primary" :disabled="isAprobar" @click="submitAprobar">
        {{ isAprobar ? "Aprobando…" : "Confirmar aprobación" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- Modal rechazar cierre -->
  <BaseModal :show="showRechazar" title="Rechazar cierre" size="sm" @close="showRechazar = false">
    <div class="space-y-4">
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        Al rechazar, el cajero deberá realizar un nuevo conteo. Indicá el motivo del rechazo.
      </p>
      <div class="space-y-1">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Motivo</label>
        <textarea
          v-model="motivoRechazo"
          rows="3"
          placeholder="Ej: El monto no coincide con el registrado en el sistema…"
          class="w-full px-4 py-3 rounded-md text-sm outline-none appearance-none shadow-none transition-all resize-none"
          :style="inputStyle()"
        />
      </div>
      <p v-if="rechazarError" class="text-xs font-medium" style="color: var(--color-error)">{{ rechazarError }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showRechazar = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :disabled="isRechazar" @click="submitRechazar">
        {{ isRechazar ? "Rechazando…" : "Confirmar rechazo" }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
