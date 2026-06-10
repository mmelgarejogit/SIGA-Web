<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Venta, getVentas, getVentaById } from "@/services/ventasService"
import { getConfiguracion } from "@/services/configService"
import { useFacturaVentaPdf } from "@/composables/useFacturaVentaPdf"

const ventas = ref<Venta[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")
const isDownloading = ref<number | null>(null)

const ventasFiltradas = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(
    (v) =>
      v.clienteNombre.toLowerCase().includes(q) ||
      v.numeroComprobante.toLowerCase().includes(q) ||
      v.factura?.numeroFactura?.toLowerCase().includes(q),
  )
})

const columns = [
  { key: "factura",     label: "Nro. Factura"  },
  { key: "comprobante", label: "Comprobante"   },
  { key: "paciente",    label: "Cliente"       },
  { key: "fecha",       label: "Fecha emisión" },
  { key: "total",       label: "Total"         },
  { key: "iva",         label: "IVA total"     },
  { key: "acciones",    label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getVentas({ pageSize: 500 })
    ventas.value = (result.items ?? []).filter((v) => !!v.factura)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar facturas."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

function menuItems(item: Venta): ContextMenuItem[] {
  return [
    { type: "item", label: "Descargar PDF", icon: "picture_as_pdf", action: () => descargarPdf(item) },
  ]
}

async function descargarPdf(item: Venta) {
  if (isDownloading.value === item.id) return
  isDownloading.value = item.id
  try {
    const [ventaCompleta, config] = await Promise.all([
      getVentaById(item.id),
      getConfiguracion(),
    ])
    const { generarPdfFactura } = useFacturaVentaPdf()
    generarPdfFactura(ventaCompleta, config)
  } catch {
    // silently fail — user can retry
  } finally {
    isDownloading.value = null
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas de Venta</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ ventasFiltradas.length }} factura{{ ventasFiltradas.length !== 1 ? "s" : "" }} emitida{{ ventasFiltradas.length !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end mb-6">
          <SearchInput
            :model-value="search"
            placeholder="Buscar por factura, comprobante o cliente..."
            class="w-80"
            @update:model-value="search = $event"
          />
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable :columns="columns" :items="ventasFiltradas" :loading="isLoading"
          empty-text="No hay facturas emitidas.">

          <template #factura="{ item }">
            <span class="text-sm font-mono font-semibold" style="color: var(--color-on-surface)">
              {{ item.factura?.numeroFactura || "—" }}
            </span>
          </template>

          <template #comprobante="{ item }">
            <span class="text-sm font-mono" style="color: var(--color-on-surface-variant)">
              {{ item.numeroComprobante }}
            </span>
          </template>

          <template #paciente="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</span>
          </template>

          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatDate(item.factura?.fechaEmision) }}
            </span>
          </template>

          <template #total="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-primary)">
              {{ formatPrice(item.factura?.total ?? item.total) }}
            </span>
          </template>

          <template #iva="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatPrice((item.factura?.iva5 ?? 0) + (item.factura?.iva10 ?? 0)) }}
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex justify-end" @click.stop>
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>

        </BaseTable>

      </div>
    </main>
  </div>
</template>
