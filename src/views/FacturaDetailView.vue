<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import { useAuthStore } from "@/stores/auth"
import {
  getFacturaById,
  anularFactura,
  type FacturaCompraItem,
  type TipoIva,
} from "@/services/comprasService"

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const facturaId = Number(route.params.id)

const factura  = ref<FacturaCompraItem | null>(null)
const isLoading = ref(true)
const loadError = ref("")

const canGestionar = computed(() => auth.hasPermission("gestionar_pedidos"))

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    factura.value = await getFacturaById(facturaId)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar la factura."
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

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency", currency: "PYG", minimumFractionDigits: 0,
  }).format(n)
}

function ivaLabel(tipo: TipoIva) {
  if (tipo === "Exento") return "Exento"
  if (tipo === "Iva5")   return "IVA 5%"
  return "IVA 10%"
}

function estadoBadge(estado: string) {
  if (estado === "Anulado") return { text: "Anulada",  bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" }
  if (estado === "Pagado")  return { text: "Pagada",   bg: "#DCFCE7", color: "#16a34a", border: "#BBF7D0" }
  return                           { text: "Vigente",  bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" }
}

// ── Anular ─────────────────────────────────────────────────────────────────────

const showAnularModal  = ref(false)
const motivoAnulacion  = ref("")
const anularError      = ref("")
const isAnulando       = ref(false)

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}

function openAnularModal() {
  motivoAnulacion.value = ""
  anularError.value = ""
  showAnularModal.value = true
}

async function confirmarAnulacion() {
  if (!motivoAnulacion.value.trim()) { anularError.value = "El motivo es obligatorio."; return }
  isAnulando.value = true
  anularError.value = ""
  try {
    factura.value = await anularFactura(facturaId, { motivo: motivoAnulacion.value.trim() })
    showAnularModal.value = false
  } catch (err: any) {
    anularError.value = err.response?.data?.message ?? err.message ?? "Error al anular."
  } finally {
    isAnulando.value = false
  }
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

        <template v-else-if="factura">

          <!-- Breadcrumb + header -->
          <div class="mb-8">
            <button @click="router.push('/compras/facturas')"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Facturas de Compra
            </button>

            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-4xl font-extrabold tracking-tight">
                    {{ factura.nroFactura ?? `Factura #${factura.id}` }}
                  </h1>
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                    :style="`background-color: ${estadoBadge(factura.estado).bg}; color: ${estadoBadge(factura.estado).color}; border: 1px solid ${estadoBadge(factura.estado).border}`">
                    {{ estadoBadge(factura.estado).text }}
                  </span>
                </div>
                <p class="font-medium" style="color: var(--color-on-surface-variant)">
                  {{ factura.proveedorNombre }} · {{ formatDate(factura.fechaEmision) }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <BaseButton v-if="canGestionar && factura.estado !== 'Anulado'" variant="danger" size="lg"
                  @click="openAnularModal">
                  <span class="material-symbols-outlined" style="font-size: 18px">block</span>
                  Anular Factura
                </BaseButton>
              </div>
            </div>

            <!-- Banner anulación -->
            <div v-if="factura.estado === 'Anulado' && factura.motivoAnulacion"
              class="mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm"
              style="background-color: var(--color-error-container); color: var(--color-error)">
              <span class="material-symbols-outlined flex-shrink-0 mt-0.5" style="font-size: 18px">block</span>
              <div>
                <p class="font-bold">Factura anulada</p>
                <p class="mt-0.5" style="color: var(--color-on-error-container)">{{ factura.motivoAnulacion }}</p>
              </div>
            </div>
          </div>

          <!-- Grid: datos + fiscal -->
          <div class="grid grid-cols-2 gap-6 mb-6">

            <!-- Datos generales -->
            <div class="rounded-2xl p-6"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

              <dl class="space-y-3">
                <div class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Proveedor</dt>
                  <dd class="font-semibold text-right" style="color: var(--color-on-surface)">{{ factura.proveedorNombre }}</dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Nro. Factura</dt>
                  <dd class="font-mono font-semibold" style="color: var(--color-on-surface)">{{ factura.nroFactura ?? "—" }}</dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Condición</dt>
                  <dd class="font-semibold" style="color: var(--color-on-surface)">
                    {{ factura.condicionVenta === "Credito" ? "Crédito" : "Contado" }}
                  </dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Fecha de emisión</dt>
                  <dd style="color: var(--color-on-surface)">{{ formatDate(factura.fechaEmision) }}</dd>
                </div>
                <div v-if="factura.fechaVencimiento" class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Vencimiento</dt>
                  <dd style="color: var(--color-on-surface)">{{ formatDate(factura.fechaVencimiento) }}</dd>
                </div>
                <div v-if="factura.fechaPago" class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Fecha de pago</dt>
                  <dd style="color: var(--color-on-surface)">{{ formatDate(factura.fechaPago) }}</dd>
                </div>
                <div v-if="factura.observaciones" class="flex justify-between text-sm">
                  <dt class="font-medium" style="color: var(--color-outline)">Observaciones</dt>
                  <dd class="italic text-right max-w-[60%]" style="color: var(--color-on-surface-variant)">{{ factura.observaciones }}</dd>
                </div>
              </dl>
            </div>

            <!-- Resumen fiscal -->
            <div class="rounded-2xl p-6"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Resumen fiscal</h3>

              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Exento</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(factura.montoExento) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(factura.montoGravado5) }}</span>
                </div>
                <div class="flex justify-between text-xs pl-3" style="color: var(--color-on-surface-variant)">
                  <span>↳ IVA 5%</span>
                  <span>{{ formatMonto(factura.iva5) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(factura.montoGravado10) }}</span>
                </div>
                <div class="flex justify-between text-xs pl-3" style="color: var(--color-on-surface-variant)">
                  <span>↳ IVA 10%</span>
                  <span>{{ formatMonto(factura.iva10) }}</span>
                </div>
              </div>

              <div class="flex justify-between items-center pt-3 border-t"
                style="border-color: rgba(196,197,213,0.2)">
                <span class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total</span>
                <span class="text-2xl font-extrabold" style="color: var(--color-primary)">{{ formatMonto(factura.montoTotal) }}</span>
              </div>

              <p class="text-xs mt-2 text-right" style="color: var(--color-on-surface-variant)">
                IVA total: {{ formatMonto(factura.iva5 + factura.iva10) }}
              </p>
            </div>
          </div>

          <!-- Ítems de línea -->
          <div class="rounded-2xl overflow-hidden mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <div class="px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Ítems</h3>
            </div>

            <div v-if="factura.items.length === 0" class="px-6 py-10 text-center"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-4xl mb-2">receipt_long</span>
              <p class="text-sm font-medium">Sin ítems registrados.</p>
            </div>

            <table v-else class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</th>
                  <th class="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 80px; color: var(--color-outline)">Cant.</th>
                  <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 150px; color: var(--color-outline)">P. Unit.</th>
                  <th class="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 110px; color: var(--color-outline)">IVA</th>
                  <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="width: 150px; color: var(--color-outline)">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in factura.items" :key="item.id"
                  style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-4">
                    <p class="font-medium" style="color: var(--color-on-surface)">{{ item.descripcion }}</p>
                    <p v-if="item.productoId" class="text-xs mt-0.5" style="color: var(--color-outline)">
                      <span class="material-symbols-outlined align-middle mr-1" style="font-size: 13px">inventory_2</span>
                      Vinculado a stock
                    </p>
                  </td>
                  <td class="px-6 py-4 text-center" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                  <td class="px-6 py-4 text-right" style="color: var(--color-on-surface-variant)">{{ formatMonto(item.precioUnitario) }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
                      {{ ivaLabel(item.tipoIva) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(item.total) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                  <td colspan="4" class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total Factura</td>
                  <td class="px-6 py-4 text-right font-extrabold" style="color: var(--color-primary); font-size: 1rem">{{ formatMonto(factura.montoTotal) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </template>
      </div>
    </main>

    <!-- Modal Anular -->
    <BaseModal :show="showAnularModal" title="Anular Factura" size="sm" @close="showAnularModal = false">
      <div class="flex items-center gap-3 mb-5 p-4 rounded-2xl"
        style="background-color: var(--color-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 22px; color: var(--color-error)">block</span>
        <div>
          <p class="text-sm font-semibold" style="color: var(--color-error)">
            Vas a anular la factura
            <strong>{{ factura?.nroFactura ?? `#${facturaId}` }}</strong>.
          </p>
          <p v-if="factura?.pedidoProveedorId" class="text-xs mt-0.5" style="color: var(--color-error)">
            La OC asociada volverá a estado Confirmada.
          </p>
        </div>
      </div>

      <div>
        <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
          Motivo de anulación <span style="color: var(--color-error)">*</span>
        </label>
        <textarea v-model="motivoAnulacion" rows="3"
          placeholder="Indicá el motivo de la anulación…"
          class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none transition-all resize-none"
          :style="inputStyle(!!anularError)"
          maxlength="500" />
        <p v-if="anularError" class="mt-1 text-xs font-medium" style="color: var(--color-error)">{{ anularError }}</p>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" :disabled="isAnulando" @click="showAnularModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isAnulando" @click="confirmarAnulacion">
            <span v-if="isAnulando" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isAnulando ? "Anulando…" : "Anular Factura" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
