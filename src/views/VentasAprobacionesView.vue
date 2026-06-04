<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type SolicitudAnulacionVentaDto,
  getSolicitudesAnulacion,
  gestionarAnulacion,
} from "@/services/ventasService"

const isLoading = ref(false)
const loadError = ref("")
const solicitudes = ref<SolicitudAnulacionVentaDto[]>([])
const estadoFilter = ref<string[]>(["Pendiente"])

const estadoOptions = [
  { value: "Pendiente",  label: "Pendiente"  },
  { value: "Aprobada",   label: "Aprobada"   },
  { value: "Rechazada",  label: "Rechazada"  },
]

const pendientesCount = computed(() => solicitudes.value.filter((s) => s.estado === "Pendiente").length)

const columns = [
  { key: "comprobante", label: "Comprobante"   },
  { key: "paciente",    label: "Paciente"      },
  { key: "total",       label: "Total venta"   },
  { key: "motivo",      label: "Motivo"        },
  { key: "solicitado",  label: "Solicitado por"},
  { key: "estado",      label: "Estado"        },
  { key: "acciones",    label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const estado = estadoFilter.value.length === 1 ? estadoFilter.value[0] : undefined
    solicitudes.value = await getSolicitudesAnulacion(estado)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar solicitudes."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
function onEstadoChange(val: string[]) { estadoFilter.value = val; load() }

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (iso?: string) => iso
  ? new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })
  : "—"

function estadoBadgeStyle(estado: string) {
  if (estado === "Pendiente")  return "background-color: #FEF3C7; color: #92400E"
  if (estado === "Aprobada")   return "background-color: #dcfce7; color: #166534"
  return "background-color: #fee2e2; color: #991b1b"
}

function estadoIcon(estado: string) {
  if (estado === "Pendiente") return "schedule"
  if (estado === "Aprobada")  return "check_circle"
  return "cancel"
}

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(s: SolicitudAnulacionVentaDto): ContextMenuItem[] {
  if (s.estado !== "Pendiente") return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(s) },
  ]
  return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(s) },
    { type: "separator" },
    { type: "item", label: "Aprobar", icon: "check_circle", action: () => openGestion(s, "Aprobada") },
    { type: "item", label: "Rechazar", icon: "cancel", action: () => openGestion(s, "Rechazada"), danger: true },
  ]
}

// ── Modal detalle ─────────────────────────────────────────────────────────────

const showDetalle = ref(false)
const detalleItem = ref<SolicitudAnulacionVentaDto | null>(null)

function openDetalle(s: SolicitudAnulacionVentaDto) {
  detalleItem.value = s
  showDetalle.value = true
}

// ── Modal gestión ─────────────────────────────────────────────────────────────

const showGestion = ref(false)
const gestionItem = ref<SolicitudAnulacionVentaDto | null>(null)
const gestionAccion = ref<"Aprobada" | "Rechazada">("Aprobada")
const gestionObs = ref("")
const isGestionSaving = ref(false)
const gestionError = ref("")

function openGestion(s: SolicitudAnulacionVentaDto, accion: "Aprobada" | "Rechazada") {
  gestionItem.value = s
  gestionAccion.value = accion
  gestionObs.value = ""
  gestionError.value = ""
  showGestion.value = true
}

async function submitGestion() {
  if (!gestionItem.value) return
  isGestionSaving.value = true
  gestionError.value = ""
  try {
    await gestionarAnulacion(gestionItem.value.id, {
      accion: gestionAccion.value,
      observacionesRevision: gestionObs.value.trim() || undefined,
    })
    showGestion.value = false
    if (showDetalle.value) showDetalle.value = false
    await load()
  } catch (err: unknown) {
    gestionError.value = err instanceof Error ? err.message : "Error al procesar."
  } finally {
    isGestionSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobaciones de Ventas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Solicitudes de anulación pendientes de revisión
              <span v-if="pendientesCount > 0" class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style="background-color: #FEF3C7; color: #92400E">
                <span class="material-symbols-outlined" style="font-size: 13px">schedule</span>
                {{ pendientesCount }} pendiente{{ pendientesCount !== 1 ? "s" : "" }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 mb-6">
          <FilterChips
            :model-value="estadoFilter"
            :options="estadoOptions"
            placeholder="Estado"
            @update:model-value="onEstadoChange"
          />
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable :columns="columns" :items="solicitudes" :loading="isLoading"
          empty-text="No hay solicitudes de anulación.">

          <template #comprobante="{ item }">
            <span class="text-sm font-mono font-semibold" style="color: var(--color-on-surface)">
              {{ item.numeroComprobante }}
            </span>
          </template>

          <template #paciente="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface)">{{ item.pacienteNombre }}</span>
          </template>

          <template #total="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-primary)">
              {{ formatPrice(item.totalVenta) }}
            </span>
          </template>

          <template #motivo="{ item }">
            <span class="text-sm italic" style="color: var(--color-on-surface-variant)">
              {{ item.motivo.length > 50 ? item.motivo.slice(0, 50) + "…" : item.motivo }}
            </span>
          </template>

          <template #solicitado="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ item.solicitadoPorNombre }}
            </span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              :style="estadoBadgeStyle(item.estado)">
              <span class="material-symbols-outlined" style="font-size: 13px">{{ estadoIcon(item.estado) }}</span>
              {{ item.estado }}
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>

        </BaseTable>
      </div>
    </main>

    <!-- MODAL DETALLE -->
    <BaseModal :show="showDetalle" title="Solicitud de Anulación" size="lg" @close="showDetalle = false">
      <template v-if="detalleItem">
        <div class="grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Comprobante</p>
            <p class="text-sm font-semibold font-mono" style="color: var(--color-on-surface)">{{ detalleItem.numeroComprobante }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Paciente</p>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ detalleItem.pacienteNombre }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Total venta</p>
            <p class="text-sm font-semibold" style="color: var(--color-primary)">{{ formatPrice(detalleItem.totalVenta) }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Solicitado por</p>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ detalleItem.solicitadoPorNombre }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Motivo</p>
            <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleItem.motivo }}</p>
          </div>
          <div v-if="detalleItem.revisadoPorNombre" class="col-span-2 pt-3" style="border-top: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">
              {{ detalleItem.estado }} por
            </p>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">
              {{ detalleItem.revisadoPorNombre }} · {{ formatDate(detalleItem.fechaRevision) }}
            </p>
            <p v-if="detalleItem.observacionesRevision" class="text-xs italic mt-0.5" style="color: var(--color-on-surface-variant)">
              {{ detalleItem.observacionesRevision }}
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" @click="showDetalle = false">Cerrar</BaseButton>
        <template v-if="detalleItem?.estado === 'Pendiente'">
          <BaseButton variant="danger" @click="openGestion(detalleItem!, 'Rechazada')">Rechazar</BaseButton>
          <BaseButton variant="primary" @click="openGestion(detalleItem!, 'Aprobada')">Aprobar</BaseButton>
        </template>
      </template>
    </BaseModal>

    <!-- MODAL GESTIÓN -->
    <BaseModal
      :show="showGestion"
      :title="gestionAccion === 'Aprobada' ? 'Aprobar anulación' : 'Rechazar anulación'"
      size="sm"
      @close="showGestion = false"
    >
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        <template v-if="gestionAccion === 'Aprobada'">
          La venta <strong style="color: var(--color-on-surface)">{{ gestionItem?.numeroComprobante }}</strong>
          quedará anulada.
        </template>
        <template v-else>
          La solicitud será rechazada y la venta volverá a su estado anterior.
        </template>
      </p>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
          Observaciones (opcional)
        </label>
        <textarea v-model="gestionObs" rows="3"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
      </div>
      <div v-if="gestionError" class="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        {{ gestionError }}
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showGestion = false">Cancelar</BaseButton>
        <BaseButton
          :variant="gestionAccion === 'Aprobada' ? 'primary' : 'danger'"
          :disabled="isGestionSaving"
          @click="submitGestion"
        >
          {{ isGestionSaving ? "Procesando…" : gestionAccion === "Aprobada" ? "Confirmar aprobación" : "Confirmar rechazo" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
