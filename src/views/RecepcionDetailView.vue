<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { getRecepcionById, type RecepcionDetalle, type EstadoPedido } from "@/services/comprasService"

const route  = useRoute()
const router = useRouter()

const recepcionId = Number(route.params.id)

const recepcion = ref<RecepcionDetalle | null>(null)
const isLoading = ref(true)
const loadError = ref("")

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    recepcion.value = await getRecepcionById(recepcionId)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar la recepción."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function estadoOCStyle(estado: EstadoPedido) {
  switch (estado) {
    case "Facturada":       return { bg: "#ede9fe", text: "#5b21b6" }
    case "RecibidaParcial": return { bg: "#fef3c7", text: "#92400e" }
    case "RecibidaTotal":   return { bg: "#dcfce7", text: "#166534" }
    default:                return { bg: "#f3f4f6", text: "#374151" }
  }
}

function estadoOCLabel(estado: EstadoPedido) {
  if (estado === "RecibidaParcial") return "Recibida parcial"
  if (estado === "RecibidaTotal")   return "Recibida total"
  return estado
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else-if="recepcion">

          <!-- Breadcrumb + header -->
          <div class="mb-8">
            <button @click="router.push('/compras/recepciones')"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Recepciones de Mercadería
            </button>

            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-4xl font-extrabold tracking-tight">Recepción #{{ recepcion.id }}</h1>
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                    :style="`background-color: ${estadoOCStyle(recepcion.estadoOC).bg}; color: ${estadoOCStyle(recepcion.estadoOC).text}`">
                    {{ estadoOCLabel(recepcion.estadoOC) }}
                  </span>
                </div>
                <p class="font-medium" style="color: var(--color-on-surface-variant)">
                  {{ recepcion.proveedorNombre }} · {{ formatDate(recepcion.fechaRecepcion) }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <BaseButton v-if="recepcion.facturaCompraId" variant="secondary" size="lg"
                  @click="router.push(`/compras/facturas/${recepcion.facturaCompraId}`)">
                  <span class="material-symbols-outlined" style="font-size: 18px">receipt_long</span>
                  Ver Factura
                </BaseButton>
                <BaseButton variant="secondary" size="lg"
                  @click="router.push(`/compras/oc/${recepcion.pedidoProveedorId}`)">
                  <span class="material-symbols-outlined" style="font-size: 18px">open_in_new</span>
                  Ver OC #{{ recepcion.pedidoProveedorId }}
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Datos generales -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

            <div class="grid grid-cols-2 gap-x-12 gap-y-3">
              <div class="flex justify-between text-sm">
                <span class="font-medium" style="color: var(--color-outline)">Proveedor</span>
                <span class="font-semibold" style="color: var(--color-on-surface)">{{ recepcion.proveedorNombre }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="font-medium" style="color: var(--color-outline)">Fecha de recepción</span>
                <span style="color: var(--color-on-surface)">{{ formatDate(recepcion.fechaRecepcion) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="font-medium" style="color: var(--color-outline)">Factura asociada</span>
                <button v-if="recepcion.facturaCompraId"
                  class="font-mono font-semibold transition-all hover:opacity-75"
                  style="color: var(--color-primary)"
                  @click="router.push(`/compras/facturas/${recepcion.facturaCompraId}`)">
                  {{ recepcion.nroFactura ?? `#${recepcion.facturaCompraId}` }}
                </button>
                <span v-else style="color: var(--color-outline)">—</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="font-medium" style="color: var(--color-outline)">Registrado por</span>
                <span style="color: var(--color-on-surface)">{{ recepcion.usuarioNombre }}</span>
              </div>
              <div v-if="recepcion.observaciones" class="col-span-2 flex justify-between text-sm">
                <span class="font-medium" style="color: var(--color-outline)">Observaciones</span>
                <span class="italic" style="color: var(--color-on-surface-variant)">{{ recepcion.observaciones }}</span>
              </div>
            </div>
          </div>

          <!-- Ítems recepcionados -->
          <div class="rounded-2xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <div class="px-6 py-4 flex items-center justify-between"
              style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <div>
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Ítems recepcionados</h3>
                <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">
                  {{ recepcion.items.length }} ítem{{ recepcion.items.length !== 1 ? 's' : '' }} ·
                  {{ recepcion.items.reduce((s, i) => s + i.cantidad, 0) }} unidades en total
                </p>
              </div>
            </div>

            <div v-if="recepcion.items.length === 0" class="px-6 py-10 text-center"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-4xl mb-2">inventory_2</span>
              <p class="text-sm font-medium">Sin ítems registrados.</p>
            </div>

            <table v-else class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 90px; color: var(--color-outline)">Cantidad</th>
                  <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 160px; color: var(--color-outline)">Lote</th>
                  <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 150px; color: var(--color-outline)">Vencimiento</th>
                  <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in recepcion.items" :key="item.pedidoItemId"
                  style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-4 font-medium" style="color: var(--color-on-surface)">{{ item.productoNombre }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="font-bold" style="color: var(--color-primary)">+{{ item.cantidad }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span v-if="item.lote" class="font-mono text-xs px-2 py-1 rounded-lg font-semibold"
                      style="background-color: var(--color-surface-container-high); color: var(--color-on-surface)">
                      {{ item.lote }}
                    </span>
                    <span v-else style="color: var(--color-outline)">—</span>
                  </td>
                  <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                    {{ formatDate(item.fechaVencimiento) }}
                  </td>
                  <td class="px-6 py-4 text-sm italic" style="color: var(--color-on-surface-variant)">
                    {{ item.observaciones || "—" }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                  <td class="px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total</td>
                  <td class="px-6 py-4 text-center font-extrabold" style="color: var(--color-primary)">
                    {{ recepcion.items.reduce((s, i) => s + i.cantidad, 0) }} und.
                  </td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
