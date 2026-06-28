<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type Venta,
  getVentaById, emitirComprobante, emitirFactura,
} from "@/services/ventasService"
import { type Timbrado, getTimbradosActivos } from "@/services/timbradoService"

const route  = useRoute()
const router = useRouter()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const venta     = ref<Venta | null>(null)
const isLoading = ref(false)
const error     = ref("")

const yaEmitido  = computed(() => !!venta.value?.comprobante || !!venta.value?.factura)
const puedeEmitir = computed(() => venta.value?.estado === "ListaParaCobrar" && !yaEmitido.value)

type TipoDocumento = "ReciboSimple" | "FacturaTimbrada"
const tipoDoc = ref<TipoDocumento>("ReciboSimple")

const timbrados    = ref<Timbrado[]>([])
const selectedTimbrado = ref<Timbrado | null>(null)

const factForm = reactive({
  fechaEmision:  new Date().toISOString().slice(0, 10),
  observaciones: "",
})

const isSaving = ref(false)
const opError  = ref("")

async function load() {
  isLoading.value = true
  error.value = ""
  try {
    venta.value = await getVentaById(Number(route.params.id))
    const activos = await getTimbradosActivos()
    timbrados.value = activos
    if (activos.length > 0 && activos[0]) selectedTimbrado.value = activos[0]
  } catch {
    error.value = "No se pudo cargar la venta"
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function emitir() {
  if (!venta.value) return
  opError.value = ""

  if (tipoDoc.value === "FacturaTimbrada") {
    if (!selectedTimbrado.value) {
      opError.value = "Seleccioná un timbrado activo."
      return
    }
    if (!factForm.fechaEmision) {
      opError.value = "La fecha de emisión es obligatoria."
      return
    }
  }

  isSaving.value = true
  try {
    if (tipoDoc.value === "ReciboSimple") {
      await emitirComprobante(venta.value.id)
    } else if (selectedTimbrado.value) {
      await emitirFactura({
        ventaId:       venta.value.id,
        timbradoId:    selectedTimbrado.value.id,
        fechaEmision:  factForm.fechaEmision,
        observaciones: factForm.observaciones || undefined,
      })
    }
    router.push(`/ventas/${venta.value.id}`)
  } catch (e: any) {
    opError.value = e instanceof Error ? e.message : "Error al emitir el documento"
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <button class="flex items-center gap-1.5 mb-6 text-sm font-semibold transition-colors hover:opacity-70"
          style="color: var(--color-primary)" @click="router.back()">
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Volver
        </button>

        <div v-if="isLoading" class="py-16 text-center" style="color: var(--color-outline)">Cargando…</div>
        <div v-else-if="error" class="py-16 text-center" style="color: var(--color-error)">{{ error }}</div>

        <template v-else-if="venta">
          <div class="flex items-center gap-3 mb-8 flex-wrap">
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">Emitir documento</h1>
            <span class="text-2xl font-mono font-bold" style="color: var(--color-primary)">{{ venta.numeroComprobante }}</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Emisión -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Ya emitido -->
              <div v-if="yaEmitido" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <span class="material-symbols-outlined mb-2" style="font-size: 40px; color: var(--color-on-success-container)">verified</span>
                <p class="text-lg font-bold" style="color: var(--color-on-surface)">Documento ya emitido</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  Esta venta ya tiene {{ venta.factura ? "factura timbrada" : "recibo simple" }} emitido.
                </p>
                <BaseButton variant="secondary" class="mt-4" @click="router.push(`/ventas/${venta.id}`)">Ver detalle</BaseButton>
              </div>

              <!-- No disponible -->
              <div v-else-if="!puedeEmitir" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  Esta venta no está lista para emitir documento (estado actual: {{ venta.estado }}).
                </p>
              </div>

              <!-- Formulario -->
              <template v-else>
                <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                  <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Tipo de documento</h3>

                  <!-- Selector -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      class="flex items-center gap-3 px-4 py-3 text-left transition-all"
                      style="border-radius:12px"
                      :style="tipoDoc === 'ReciboSimple'
                        ? 'border:1.5px solid var(--color-primary);background:#EFF6FF'
                        : 'border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low)'"
                      @click="tipoDoc = 'ReciboSimple'"
                    >
                      <span class="material-symbols-outlined" :style="`font-size:22px;color:${tipoDoc === 'ReciboSimple' ? 'var(--color-primary)' : 'var(--color-outline)'}`">receipt_long</span>
                      <div>
                        <p class="text-sm font-bold" style="color: var(--color-on-surface)">Recibo Simple</p>
                        <p class="text-xs" style="color: var(--color-on-surface-variant)">Sin datos fiscales</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-3 px-4 py-3 text-left transition-all"
                      style="border-radius:12px"
                      :style="tipoDoc === 'FacturaTimbrada'
                        ? 'border:1.5px solid var(--color-primary);background:#EFF6FF'
                        : 'border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low)'"
                      @click="tipoDoc = 'FacturaTimbrada'"
                    >
                      <span class="material-symbols-outlined" :style="`font-size:22px;color:${tipoDoc === 'FacturaTimbrada' ? 'var(--color-primary)' : 'var(--color-outline)'}`">receipt</span>
                      <div>
                        <p class="text-sm font-bold" style="color: var(--color-on-surface)">Factura Timbrada</p>
                        <p class="text-xs" style="color: var(--color-on-surface-variant)">Documento fiscal</p>
                      </div>
                    </button>
                  </div>

                  <!-- Datos fiscales (solo factura) -->
                  <div v-if="tipoDoc === 'FacturaTimbrada'" class="space-y-4">
                    <!-- Sin timbrados activos -->
                    <div v-if="timbrados.length === 0" class="text-center py-6 rounded-xl" style="background-color: var(--color-surface-container-low)">
                      <span class="material-symbols-outlined text-3xl mb-2" style="color: var(--color-outline)">warning</span>
                      <p class="text-sm font-medium mb-3" style="color: var(--color-on-surface-variant)">No hay timbrados activos configurados.</p>
                      <BaseButton variant="secondary" size="sm" @click="router.push('/ventas/timbrados')">
                        Ir a Timbrados
                      </BaseButton>
                    </div>
                    <template v-else>
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Timbrado *</label>
                        <select v-model="selectedTimbrado" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                          style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)">
                          <option v-for="t in timbrados" :key="t.id" :value="t">
                            {{ t.numeroTimbrado }} — {{ t.establecimiento }}-{{ t.puntoExpedicion }}
                          </option>
                        </select>
                      </div>
                      <!-- Preview del próximo número -->
                      <div v-if="selectedTimbrado" class="rounded-xl px-4 py-3 text-sm font-mono font-semibold"
                        style="background-color:#EFF6FF;color:var(--color-primary)">
                        Próximo: {{ selectedTimbrado.numeroCompletoPreview }}
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Establecimiento</label>
                          <input :value="selectedTimbrado?.establecimiento" type="text" disabled
                            class="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                            style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-outline)" />
                        </div>
                        <div>
                          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Punto Exped.</label>
                          <input :value="selectedTimbrado?.puntoExpedicion" type="text" disabled
                            class="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                            style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-outline)" />
                        </div>
                      </div>
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Fecha de Emisión *</label>
                        <input v-model="factForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
                      </div>
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observaciones</label>
                        <textarea v-model="factForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
                      </div>
                    </template>
                  </div>

                  <p class="text-sm mt-4" style="color: var(--color-on-surface-variant)">
                    Al emitir se generan los movimientos de <strong>stock</strong> y <strong>caja</strong> correspondientes
                    y la venta pasa a <strong>Comprobante emitido</strong>. Esta acción no se puede deshacer.
                  </p>
                  <p v-if="opError" class="mt-2 text-xs font-medium" style="color: var(--color-error)">{{ opError }}</p>

                  <div class="mt-4">
                    <BaseButton variant="primary" size="lg" :disabled="isSaving" @click="emitir">
                      <span class="material-symbols-outlined" style="font-size:18px">{{ tipoDoc === 'FacturaTimbrada' ? 'receipt' : 'receipt_long' }}</span>
                      {{ isSaving ? "Emitiendo…" : (tipoDoc === 'FacturaTimbrada' ? "Emitir factura" : "Emitir recibo") }}
                    </BaseButton>
                  </div>
                </div>
              </template>
            </div>

            <!-- Resumen -->
            <div class="space-y-6">
              <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Venta</h3>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ venta.clienteNombre }}</p>
                <p class="text-xs mb-4" style="color: var(--color-on-surface-variant)">
                  {{ venta.condicionVenta === "Credito" ? "Crédito" : "Contado" }} · {{ formatDate(venta.fechaVenta) }}
                </p>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Total</span><span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(venta.total) }}</span></div>
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Cobrado</span><span style="color:var(--color-on-success-container)">{{ formatPrice(venta.totalCobrado) }}</span></div>
                  <div class="flex justify-between font-bold pt-2" style="border-top: 1px solid var(--color-hairline)"><span style="color: var(--color-on-surface)">Saldo</span><span style="color:var(--color-on-warning-container)">{{ formatPrice(venta.saldoPendiente) }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
