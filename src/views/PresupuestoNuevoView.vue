<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import {
  type AgregarLineaRequest,
  type CategoriaFiscal,
  crearVenta,
} from "@/services/ventasService"
import { getPatients, type Patient } from "@/services/patientService"
import { getProductos, type Producto } from "@/services/inventarioService"

const router = useRouter()

// ── Formato ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// ── Paciente ──────────────────────────────────────────────────────────────────

const pacienteSearch   = ref("")
const allPacientes     = ref<Patient[]>([])
const selectedPaciente = ref<Patient | null>(null)
const showPacienteDrop = ref(false)

onMounted(async () => {
  const [ptsRes, prodsRes] = await Promise.allSettled([
    getPatients({ pageSize: 500, isActive: true }),
    getProductos({ pageSize: 200 }),
  ])
  if (ptsRes.status === "fulfilled")   allPacientes.value = ptsRes.value.items
  if (prodsRes.status === "fulfilled") productos.value    = prodsRes.value.items.filter(p => p.isActive)
})

const filteredPacientes = computed(() => {
  const q = pacienteSearch.value.trim().toLowerCase()
  if (!q) return allPacientes.value.slice(0, 8)
  return allPacientes.value
    .filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.ci.toLowerCase().includes(q),
    )
    .slice(0, 8)
})

function selectPaciente(p: Patient) {
  selectedPaciente.value = p
  pacienteSearch.value   = `${p.firstName} ${p.lastName}`
  showPacienteDrop.value = false
}

function onPacienteBlur() {
  setTimeout(() => { showPacienteDrop.value = false }, 150)
}

function clearPaciente() {
  selectedPaciente.value = null
  pacienteSearch.value   = ""
}

// ── Productos ─────────────────────────────────────────────────────────────────

const productos        = ref<Producto[]>([])
const productoSearch   = ref("")
const showProductoDrop = ref(false)

const filteredProductos = computed(() =>
  productoSearch.value.trim()
    ? productos.value.filter((p) =>
        p.nombre.toLowerCase().includes(productoSearch.value.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(productoSearch.value.toLowerCase())),
      )
    : productos.value.slice(0, 20),
)

function hideProductoDrop() {
  setTimeout(() => (showProductoDrop.value = false), 150)
}

function addProducto(p: Producto) {
  lineas.value.push({
    tipo: "Producto",
    productoId: p.id,
    descripcion: p.nombre,
    cantidad: 1,
    precioUnitario: p.precioVenta,
    descuento: 0,
    categoriaFiscal: "Gravado10",
  })
  productoSearch.value = ""
  showProductoDrop.value = false
}

// ── Línea manual / servicio ───────────────────────────────────────────────────

const showLineaManual = ref(false)
const lineaManualForm = reactive({
  descripcion: "",
  cantidad: 1,
  precioUnitario: 0,
  descuento: 0,
  categoriaFiscal: "Gravado10" as CategoriaFiscal,
})

function addLineaManual() {
  if (!lineaManualForm.descripcion || lineaManualForm.precioUnitario <= 0) return
  lineas.value.push({
    tipo: "Servicio",
    descripcion: lineaManualForm.descripcion,
    cantidad: lineaManualForm.cantidad,
    precioUnitario: lineaManualForm.precioUnitario,
    descuento: lineaManualForm.descuento,
    categoriaFiscal: lineaManualForm.categoriaFiscal,
  })
  lineaManualForm.descripcion = ""
  lineaManualForm.cantidad = 1
  lineaManualForm.precioUnitario = 0
  lineaManualForm.descuento = 0
  lineaManualForm.categoriaFiscal = "Gravado10"
  showLineaManual.value = false
}

// ── Líneas ────────────────────────────────────────────────────────────────────

interface LineaUI extends AgregarLineaRequest {
  descripcion: string
}

const lineas = ref<LineaUI[]>([])

function removeLinea(i: number) { lineas.value.splice(i, 1) }

// ── Totales ───────────────────────────────────────────────────────────────────

const subtotalLinea = (l: LineaUI) => l.cantidad * l.precioUnitario - l.descuento

const montoExento = computed(() =>
  lineas.value.filter((l) => l.categoriaFiscal === "Exento").reduce((s, l) => s + subtotalLinea(l), 0),
)
const montoGravado5 = computed(() =>
  lineas.value.filter((l) => l.categoriaFiscal === "Gravado5").reduce((s, l) => s + subtotalLinea(l), 0),
)
const montoGravado10 = computed(() =>
  lineas.value.filter((l) => l.categoriaFiscal === "Gravado10").reduce((s, l) => s + subtotalLinea(l), 0),
)
const iva5  = computed(() => Math.round(montoGravado5.value / 21))
const iva10 = computed(() => Math.round(montoGravado10.value / 11))
const total = computed(() => montoExento.value + montoGravado5.value + montoGravado10.value)

// ── Datos del presupuesto ─────────────────────────────────────────────────────

const fechaVenta    = ref(new Date().toISOString().slice(0, 10))
const validezDias   = ref(15)
const observaciones = ref("")

// Fecha de vencimiento calculada (informativa)
const fechaVencimiento = computed(() => {
  const base = new Date(fechaVenta.value + "T00:00:00")
  base.setDate(base.getDate() + (validezDias.value || 0))
  return base.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })
})

// ── Guardar ───────────────────────────────────────────────────────────────────

const isSaving  = ref(false)
const saveError = ref("")

const canSave = computed(() =>
  !!selectedPaciente.value && lineas.value.length > 0 && total.value > 0,
)

async function guardar() {
  if (!canSave.value || !selectedPaciente.value) return
  isSaving.value  = true
  saveError.value = ""
  try {
    // El presupuesto se guarda como venta en estado Borrador (sin confirmar).
    // La forma de pago se define recién al generar la venta.
    await crearVenta({
      patientId:      selectedPaciente.value.id,
      tipo:           "Directa",
      condicionVenta: "Contado",
      fechaVenta:     fechaVenta.value,
      validezDias:    validezDias.value < 1 ? 15 : validezDias.value,
      observaciones:  observaciones.value || undefined,
      lineas: lineas.value.map((l) => ({
        tipo:           l.tipo,
        productoId:     l.productoId,
        servicioId:     l.servicioId,
        descripcion:    l.descripcion,
        cantidad:       l.cantidad,
        precioUnitario: l.precioUnitario,
        descuento:      l.descuento,
        categoriaFiscal: l.categoriaFiscal,
      })),
    })
    router.push("/ventas/presupuestos")
  } catch (e: any) {
    saveError.value = e?.response?.data?.message ?? "Error al guardar"
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
      <div class="p-8">

        <!-- Encabezado -->
        <div class="flex items-center gap-4 mb-8">
          <button
            @click="router.push('/ventas/presupuestos')"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style="background-color: var(--color-surface-container-high)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">
              Nuevo Presupuesto
            </h1>
            <p class="mt-0.5 font-medium" style="color: var(--color-on-surface-variant)">
              Cargá el paciente y los productos con sus precios
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6">

          <!-- ── Columna principal (2/3) ──────────────────────────────────── -->
          <div class="col-span-2 space-y-6">

            <!-- Paciente -->
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Paciente</h3>
              <div class="relative">
                <input
                  v-model="pacienteSearch"
                  type="text"
                  :disabled="!!selectedPaciente"
                  placeholder="Buscar por nombre o CI…"
                  class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
                  style="border-radius: 12px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
                  @focus="showPacienteDrop = true"
                  @blur="onPacienteBlur"
                />
                <!-- Dropdown -->
                <div
                  v-if="showPacienteDrop && filteredPacientes.length > 0"
                  class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden"
                  style="border-radius: 12px; background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); max-height: 200px; overflow-y: auto;"
                >
                  <button
                    v-for="p in filteredPacientes"
                    :key="p.id"
                    type="button"
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                    style="border-bottom: 1px solid rgba(196,197,213,0.1)"
                    @mousedown.prevent="selectPaciente(p)"
                  >
                    <span class="font-medium" style="color: var(--color-on-surface)">{{ p.firstName }} {{ p.lastName }}</span>
                    <span class="ml-2 text-xs" style="color: var(--color-outline)">CI: {{ p.ci }}</span>
                  </button>
                </div>
                <!-- Paciente seleccionado -->
                <div v-if="selectedPaciente" class="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl" style="background: #EFF6FF; border: 1px solid #BFDBFE">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style="background: #DBEAFE; color: #1D4ED8">
                    {{ selectedPaciente.firstName[0] }}{{ selectedPaciente.lastName[0] }}
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold text-sm" style="color: #1D4ED8">{{ selectedPaciente.firstName }} {{ selectedPaciente.lastName }}</p>
                    <p class="text-xs" style="color: #3B82F6">CI: {{ selectedPaciente.ci }}</p>
                  </div>
                  <button @click="clearPaciente" class="p-1 rounded-full transition-colors hover:bg-blue-100" title="Cambiar paciente">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #3B82F6">close</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Agregar productos -->
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Productos</h3>
                <button
                  @click="showLineaManual = true"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                  style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px">add</span>
                  Línea manual
                </button>
              </div>

              <!-- Buscador de producto -->
              <div class="relative mb-4">
                <input
                  v-model="productoSearch"
                  type="text"
                  placeholder="Buscá un producto por nombre o SKU…"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)"
                  @focus="showProductoDrop = true"
                  @blur="hideProductoDrop"
                />
                <div
                  v-if="showProductoDrop && filteredProductos.length"
                  class="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
                  style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); box-shadow: 0 4px 12px rgba(0,0,0,0.08)"
                >
                  <button
                    v-for="p in filteredProductos"
                    :key="p.id"
                    type="button"
                    class="w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors"
                    style="border-bottom: 1px solid rgba(196,197,213,0.1)"
                    @mousedown.prevent="addProducto(p)"
                  >
                    <div>
                      <span class="font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</span>
                      <span v-if="p.sku" class="ml-2 text-xs" style="color: var(--color-outline)">{{ p.sku }}</span>
                    </div>
                    <div class="text-right flex-shrink-0 ml-4">
                      <span class="font-semibold text-xs" style="color: var(--color-primary)">{{ formatPrice(p.precioVenta) }}</span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Líneas agregadas -->
              <div v-if="lineas.length === 0" class="py-6 text-center rounded-xl" style="border: 1.5px dashed var(--color-outline-variant)">
                <span class="material-symbols-outlined text-4xl mb-2 block" style="color: var(--color-outline)">request_quote</span>
                <p class="text-sm" style="color: var(--color-outline)">Buscá un producto o agregá una línea manual</p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(l, i) in lineas"
                  :key="i"
                  class="rounded-xl p-3"
                  style="background: var(--color-surface-container-low); border: 1px solid rgba(196,197,213,0.15)"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ l.descripcion }}</p>
                      <div class="flex items-center gap-3 mt-2">
                        <div class="flex items-center gap-1">
                          <button
                            @click="l.cantidad = Math.max(1, l.cantidad - 1)"
                            class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
                            style="background: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
                          >−</button>
                          <span class="w-8 text-center text-sm font-bold" style="color: var(--color-on-surface)">{{ l.cantidad }}</span>
                          <button
                            @click="l.cantidad++"
                            class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
                            style="background: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
                          >+</button>
                        </div>
                        <div class="flex items-center gap-1 text-xs" style="color: var(--color-outline)">
                          <span>P.U.</span>
                          <input
                            v-model.number="l.precioUnitario"
                            type="number"
                            min="0"
                            class="w-24 px-2 py-1 rounded-lg text-sm outline-none text-right"
                            style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface)"
                          />
                        </div>
                        <div class="flex items-center gap-1 text-xs" style="color: var(--color-outline)">
                          <span>Desc.</span>
                          <input
                            v-model.number="l.descuento"
                            type="number"
                            min="0"
                            class="w-20 px-2 py-1 rounded-lg text-sm outline-none text-right"
                            style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface)"
                          />
                        </div>
                        <select
                          v-model="l.categoriaFiscal"
                          class="px-2 py-1 rounded-lg text-xs outline-none appearance-none"
                          style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface-variant)"
                        >
                          <option value="Exento">Exento</option>
                          <option value="Gravado5">Gravado 5%</option>
                          <option value="Gravado10">Gravado 10%</option>
                        </select>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p class="text-sm font-bold" style="color: var(--color-primary)">{{ formatPrice(subtotalLinea(l)) }}</p>
                      <button
                        @click="removeLinea(i)"
                        class="mt-1 text-xs transition-colors"
                        style="color: var(--color-outline)"
                        @mouseover="($event.target as HTMLElement).style.color = 'var(--color-error)'"
                        @mouseout="($event.target as HTMLElement).style.color = 'var(--color-outline)'"
                      >
                        <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ── Columna lateral (1/3) ────────────────────────────────────── -->
          <div class="space-y-6">

            <!-- Datos del presupuesto -->
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos</h3>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha</label>
                  <input v-model="fechaVenta" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
                </div>
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Validez (días)</label>
                  <input v-model.number="validezDias" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  <p class="mt-1.5 text-xs" style="color: var(--color-outline)">Vence el {{ fechaVencimiento }}</p>
                </div>
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Observaciones</label>
                  <textarea v-model="observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)"></textarea>
                </div>
              </div>
            </div>

            <!-- Resumen -->
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Resumen</h3>
              <div class="space-y-2 text-sm">
                <div v-if="montoExento > 0" class="flex justify-between">
                  <span style="color: var(--color-on-surface-variant)">Exento</span>
                  <span style="color: var(--color-on-surface)">{{ formatPrice(montoExento) }}</span>
                </div>
                <div v-if="montoGravado5 > 0" class="flex justify-between">
                  <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
                  <span style="color: var(--color-on-surface)">{{ formatPrice(montoGravado5) }}</span>
                </div>
                <div v-if="iva5 > 0" class="flex justify-between pl-4 text-xs">
                  <span style="color: var(--color-outline)">IVA 5%</span>
                  <span style="color: var(--color-outline)">{{ formatPrice(iva5) }}</span>
                </div>
                <div v-if="montoGravado10 > 0" class="flex justify-between">
                  <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
                  <span style="color: var(--color-on-surface)">{{ formatPrice(montoGravado10) }}</span>
                </div>
                <div v-if="iva10 > 0" class="flex justify-between pl-4 text-xs">
                  <span style="color: var(--color-outline)">IVA 10%</span>
                  <span style="color: var(--color-outline)">{{ formatPrice(iva10) }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg pt-2" style="border-top: 1px solid rgba(196,197,213,0.2)">
                  <span style="color: var(--color-on-surface)">Total</span>
                  <span style="color: var(--color-primary)">{{ formatPrice(total) }}</span>
                </div>
              </div>

              <p v-if="saveError" class="mt-3 text-xs font-medium" style="color: var(--color-error)">{{ saveError }}</p>

              <div class="mt-4 space-y-2">
                <BaseButton
                  variant="primary"
                  size="lg"
                  class="w-full"
                  :disabled="!canSave || isSaving"
                  @click="guardar"
                >
                  <span class="material-symbols-outlined" style="font-size: 20px">description</span>
                  {{ isSaving ? "Guardando…" : "Guardar presupuesto" }}
                </BaseButton>
                <BaseButton variant="secondary" size="lg" class="w-full" @click="router.push('/ventas/presupuestos')">
                  Cancelar
                </BaseButton>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- ── Modal Línea Manual ────────────────────────────────────────────────── -->
  <BaseModal :open="showLineaManual" size="sm" title="Agregar Línea Manual" @close="showLineaManual = false">
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Descripción *</label>
          <input v-model="lineaManualForm.descripcion" type="text" placeholder="Consulta, servicio, etc." class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Cantidad</label>
            <input v-model.number="lineaManualForm.cantidad" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Precio Unitario *</label>
            <input v-model.number="lineaManualForm.precioUnitario" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
          </div>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Descuento</label>
          <input v-model.number="lineaManualForm.descuento" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Categoría Fiscal</label>
          <select v-model="lineaManualForm.categoriaFiscal" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)">
            <option value="Exento">Exento</option>
            <option value="Gravado5">Gravado 5%</option>
            <option value="Gravado10">Gravado 10%</option>
          </select>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showLineaManual = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" @click="addLineaManual">Agregar</BaseButton>
    </template>
  </BaseModal>
</template>
