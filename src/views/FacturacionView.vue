<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type Venta,
  getVentas,
  emitirFactura,
} from "@/services/ventasService"

// ── Carga ventas sin factura ──────────────────────────────────────────────────

const ventas = ref<Venta[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")

const ventasFiltradas = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(
    (v) =>
      v.pacienteNombre.toLowerCase().includes(q) ||
      v.numeroComprobante.toLowerCase().includes(q),
  )
})

const columns = [
  { key: "comprobante", label: "Comprobante" },
  { key: "paciente",    label: "Paciente"    },
  { key: "fecha",       label: "Fecha"       },
  { key: "total",       label: "Total"       },
  { key: "estado",      label: "Estado"      },
  { key: "acciones",    label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    // Carga ventas confirmadas o pendiente de pago sin factura
    const [conf, pend] = await Promise.all([
      getVentas({ estado: "Confirmada",      pageSize: 200 }),
      getVentas({ estado: "PendienteDePago", pageSize: 200 }),
    ])
    const todas = [...(conf.items ?? []), ...(pend.items ?? [])]
    ventas.value = todas.filter((v) => !v.factura)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar ventas."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })

function estadoBadgeStyle(estado: string) {
  if (estado === "Confirmada")      return "background-color: #EDE9FE; color: #7C3AED"
  if (estado === "PendienteDePago") return "background-color: #FEF3C7; color: #92400E"
  return "background-color: #F3F4F6; color: #6B7280"
}

function estadoLabel(estado: string) {
  if (estado === "PendienteDePago") return "Pend. Pago"
  return estado
}

function menuItems(v: Venta): ContextMenuItem[] {
  return [
    { type: "item", label: "Emitir factura", icon: "post_add", action: () => openFactura(v) },
  ]
}

// ── Modal emitir factura ──────────────────────────────────────────────────────

const showFactura = ref(false)
const isEmitiendo = ref(false)
const facturaError = ref("")
const facturaVenta = ref<Venta | null>(null)
const facturaForm = reactive({
  ventaId: 0,
  numeroFactura: "",
  timbrado: "",
  establecimiento: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  observaciones: "",
})

function openFactura(v: Venta) {
  facturaVenta.value = v
  Object.assign(facturaForm, {
    ventaId: v.id,
    numeroFactura: "",
    timbrado: "",
    establecimiento: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    observaciones: "",
  })
  facturaError.value = ""
  showFactura.value = true
}

async function submitFactura() {
  if (!facturaForm.numeroFactura.trim() || !facturaForm.timbrado.trim() || !facturaForm.establecimiento.trim()) {
    facturaError.value = "Completá número de factura, timbrado y establecimiento."
    return
  }
  isEmitiendo.value = true
  facturaError.value = ""
  try {
    await emitirFactura({
      ventaId:        facturaForm.ventaId,
      numeroFactura:  facturaForm.numeroFactura.trim(),
      timbrado:       facturaForm.timbrado.trim(),
      establecimiento: facturaForm.establecimiento.trim(),
      fechaEmision:   facturaForm.fechaEmision,
      observaciones:  facturaForm.observaciones.trim() || undefined,
    })
    showFactura.value = false
    await load()
  } catch (e: any) {
    facturaError.value = e?.response?.data?.message ?? "Error al emitir la factura."
  } finally {
    isEmitiendo.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Emitir Factura</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ ventasFiltradas.length }} venta{{ ventasFiltradas.length !== 1 ? "s" : "" }} pendiente{{ ventasFiltradas.length !== 1 ? "s" : "" }} de facturación
            </p>
          </div>
        </div>

        <!-- Filtro -->
        <div class="flex items-center justify-end mb-6">
          <SearchInput
            :model-value="search"
            placeholder="Buscar por paciente o comprobante..."
            class="w-80"
            @update:model-value="search = $event"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable
          :columns="columns"
          :items="ventasFiltradas"
          :loading="isLoading"
          empty-text="No hay ventas pendientes de facturación."
        >
          <template #comprobante="{ item }">
            <span class="text-sm font-mono font-semibold" style="color: var(--color-on-surface)">
              {{ item.numeroComprobante }}
            </span>
          </template>

          <template #paciente="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">
              {{ item.pacienteNombre }}
            </span>
          </template>

          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatDate(item.fechaVenta) }}
            </span>
          </template>

          <template #total="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-primary)">
              {{ formatPrice(item.total) }}
            </span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="estadoBadgeStyle(item.estado)">
              {{ estadoLabel(item.estado) }}
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

    <!-- MODAL EMITIR FACTURA -->
    <BaseModal :show="showFactura" title="Emitir Factura" size="lg" @close="showFactura = false">

      <!-- Info de la venta -->
      <div v-if="facturaVenta" class="flex items-center justify-between p-4 rounded-xl mb-4"
        style="background-color: var(--color-surface-container-low)">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Venta</p>
          <p class="text-sm font-semibold font-mono" style="color: var(--color-on-surface)">
            {{ facturaVenta.numeroComprobante }}
          </p>
          <p class="text-xs" style="color: var(--color-outline)">{{ facturaVenta.pacienteNombre }}</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Total</p>
          <p class="text-xl font-extrabold" style="color: var(--color-primary)">{{ formatPrice(facturaVenta.total) }}</p>
        </div>
      </div>

      <div v-if="facturaError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ facturaError }}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Nro. de Factura *
          </label>
          <input v-model="facturaForm.numeroFactura" type="text" placeholder="001-001-0000001"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Fecha de Emisión *
          </label>
          <input v-model="facturaForm.fechaEmision" type="date"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Timbrado *
          </label>
          <input v-model="facturaForm.timbrado" type="text" placeholder="12345678"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Establecimiento *
          </label>
          <input v-model="facturaForm.establecimiento" type="text" placeholder="001-001"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Observaciones
          </label>
          <input v-model="facturaForm.observaciones" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showFactura = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEmitiendo" @click="submitFactura">
          {{ isEmitiendo ? "Emitiendo…" : "Emitir Factura" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
