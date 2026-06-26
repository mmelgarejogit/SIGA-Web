<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import DateInput from "@/components/DateInput.vue"
import {
  registrarFacturaDirecta,
  registrarFactura,
  getComprasPedidos,
  getComprasPedidoById,
  type FacturaItemLineaRequest,
  type TipoIva,
} from "@/services/comprasService"
import {
  getProveedores,
  getProductos,
  type Proveedor,
  type Producto,
} from "@/services/inventarioService"

const route = useRoute()
const router = useRouter()

// Si viene ?pedidoId=N pre-seteamos modo "Con OC"
const initialPedidoId = computed(() => {
  const v = route.query.pedidoId
  return v ? Number(v) : null
})

const origen = ref<"ConOC" | "Directa">(initialPedidoId.value ? "ConOC" : "Directa")
const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])
const pedidosConfirmados = ref<{ id: number; nro: string; proveedorNombre: string }[]>([])

const isLoading = ref(true)
const isSaving = ref(false)
const loadingOCItems = ref(false)
const saveError = ref("")

interface ItemLinea {
  productoId: number | null
  descripcion: string
  cantidad: number
  precioUnitario: number
  tipoIva: TipoIva
}

function newItemLinea(): ItemLinea {
  return { productoId: null, descripcion: "", cantidad: 1, precioUnitario: 0, tipoIva: "Iva10" }
}

const tipoIvaOpciones: { value: TipoIva; label: string }[] = [
  { value: "Exento", label: "Exento" },
  { value: "Iva5",   label: "IVA 5%" },
  { value: "Iva10",  label: "IVA 10%" },
]

const ocItems = ref<ItemLinea[]>([])
const directaItems = ref<ItemLinea[]>([newItemLinea()])

const form = reactive({
  proveedorId: null as number | null,
  pedidoId: initialPedidoId.value as number | null,
  nroFactura: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
  condicionVenta: "Contado",
  observaciones: "",
})

// ── Montos calculados desde los ítems (read-only) ────────────────────────────
const itemsActuales = computed(() => origen.value === "ConOC" ? ocItems.value : directaItems.value)

function sumByTipoIva(tipo: TipoIva) {
  return itemsActuales.value
    .filter(i => i.tipoIva === tipo)
    .reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
}

const montoExento   = computed(() => sumByTipoIva("Exento"))
const montoGravado5 = computed(() => sumByTipoIva("Iva5"))
const montoGravado10 = computed(() => sumByTipoIva("Iva10"))
const montoTotal    = computed(() => montoExento.value + montoGravado5.value + montoGravado10.value)
const totalDesdeItems = computed(() => ocItems.value.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0))
const iva5          = computed(() => Math.round(montoGravado5.value / 21))
const iva10         = computed(() => Math.round(montoGravado10.value / 11))

const ocProveedorNombre = computed(() => {
  if (origen.value !== "ConOC" || !form.pedidoId) return ""
  return pedidosConfirmados.value.find(p => p.id === Number(form.pedidoId))?.proveedorNombre ?? ""
})

const itemsConProducto = computed(() =>
  directaItems.value.filter(i => i.productoId !== null).length,
)

const proveedorOptions = computed(() =>
  proveedores.value
    .filter(p => p.isActive)
    .map(p => ({ value: p.id, label: p.nombre, code: p.ruc })),
)

const productoOptions = computed(() =>
  productos.value.map(p => ({ value: p.id, label: p.nombre, code: p.sku ?? undefined })),
)

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n)
}

onMounted(async () => {
  try {
    const [provR, pedR, prodR] = await Promise.all([
      getProveedores({ pageSize: 200 }),
      getComprasPedidos({ estado: "Confirmada", pageSize: 100 }),
      getProductos({ pageSize: 500 }),
    ])
    proveedores.value = Array.isArray(provR) ? provR : (provR.items ?? [])
    productos.value = (prodR.items ?? []).filter(p => p.isActive)
    pedidosConfirmados.value = pedR.items.map(p => ({
      id: p.id,
      nro: `OC #${p.id}`,
      proveedorNombre: p.proveedorNombre,
    }))

    if (initialPedidoId.value) {
      await loadOCItems(initialPedidoId.value)
    }
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
})

async function loadOCItems(pedidoId: number) {
  loadingOCItems.value = true
  try {
    const pedido = await getComprasPedidoById(pedidoId)
    ocItems.value = pedido.items.map(i => ({
      productoId: i.productoId,
      descripcion: i.productoNombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      tipoIva: "Iva10" as TipoIva,
    }))
    const prov = proveedores.value.find(p => p.nombre === pedido.proveedorNombre)
    if (prov) form.proveedorId = prov.id
  } catch {
    ocItems.value = []
  } finally {
    loadingOCItems.value = false
  }
}

function onOrigenChange() {
  form.proveedorId = null
  form.pedidoId = null
  ocItems.value = []
  if (origen.value === "Directa") directaItems.value = [newItemLinea()]
}

async function onPedidoChange() {
  if (!form.pedidoId) { ocItems.value = []; return }
  await loadOCItems(Number(form.pedidoId))
}

function addItem() {
  directaItems.value.push(newItemLinea())
}

function removeItem(i: number) {
  if (directaItems.value.length > 1) directaItems.value.splice(i, 1)
}

/** Al seleccionar un producto autocompleta descripción y precio */
function onProductoChange(item: ItemLinea, val: number | string | null) {
  if (!val) {
    item.productoId = null
    return
  }
  const prod = productos.value.find(p => p.id === Number(val))
  if (!prod) return
  item.productoId = prod.id
  item.descripcion = prod.nombre
  item.precioUnitario = prod.precioCosto
}

async function guardar() {
  saveError.value = ""
  if (!/^\d{3}-\d{3}-\d{7}$/.test(form.nroFactura)) {
    saveError.value = "Formato inválido. Esperado: 001-001-0000001"; return
  }
  if (!form.fechaEmision) { saveError.value = "La fecha de emisión es obligatoria."; return }
  if (form.condicionVenta === "Credito" && !form.fechaVencimiento) {
    saveError.value = "La fecha de vencimiento es obligatoria para crédito."; return
  }
  if (montoTotal.value <= 0) { saveError.value = "El total de la factura debe ser mayor a cero. Agregá ítems."; return }

  if (origen.value === "ConOC") {
    if (!form.pedidoId) { saveError.value = "Seleccioná una Orden de Compra."; return }

    const items: FacturaItemLineaRequest[] | undefined = ocItems.value.length > 0
      ? ocItems.value.map(i => ({
          productoId: i.productoId,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          tipoIva: i.tipoIva,
        }))
      : undefined

    isSaving.value = true
    try {
      await registrarFactura(Number(form.pedidoId), {
        nroFactura: form.nroFactura,
        fechaEmision: form.fechaEmision,
        fechaVencimiento: form.condicionVenta === "Credito" ? form.fechaVencimiento : undefined,
        condicionVenta: form.condicionVenta,
        observaciones: form.observaciones || undefined,
        items,
      })
      router.push("/compras/facturas")
    } catch (err: any) {
      saveError.value = err.response?.data?.message ?? err.message ?? "Error al registrar la factura."
    } finally {
      isSaving.value = false
    }
  } else {
    if (!form.proveedorId) { saveError.value = "Seleccioná un proveedor."; return }
    const itemsValidos = directaItems.value.filter(i => i.descripcion.trim() && i.cantidad > 0)
    if (itemsValidos.length === 0) { saveError.value = "Añadí al menos un ítem con descripción."; return }

    isSaving.value = true
    try {
      await registrarFacturaDirecta({
        proveedorId: form.proveedorId,
        nroFactura: form.nroFactura,
        fechaEmision: form.fechaEmision,
        fechaVencimiento: form.condicionVenta === "Credito" ? form.fechaVencimiento : undefined,
        condicionVenta: form.condicionVenta,
        observaciones: form.observaciones || undefined,
        items: itemsValidos.map(i => ({
          productoId: i.productoId,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          tipoIva: i.tipoIva,
        })),
      })
      router.push("/compras/facturas")
    } catch (err: any) {
      saveError.value = err.response?.data?.message ?? err.message ?? "Error al registrar la factura."
    } finally {
      isSaving.value = false
    }
  }
}

function cancel() {
  router.push("/compras/facturas")
}

const ocOptions = computed(() =>
  pedidosConfirmados.value.map(p => ({ value: p.id, label: `${p.nro} — ${p.proveedorNombre}` })),
)

const condicionOptions = [
  { value: "Contado", label: "Contado" },
  { value: "Credito", label: "Crédito" },
]

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <template v-else>

          <!-- Breadcrumb + Header -->
          <div class="mb-8">
            <button
              @click="cancel"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Facturas de Compra
            </button>

            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nueva Factura de Compra</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Registrá una factura del proveedor — directa (sin OC) o vinculada a una OC confirmada.
            </p>
          </div>

          <!-- Error general -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Origen -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Origen de la factura</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                v-for="opt in [{ v: 'Directa', label: 'Compra directa', desc: 'Sin OC previa', icon: 'shopping_bag' }, { v: 'ConOC', label: 'Con OC', desc: 'Vinculada a OC confirmada', icon: 'shopping_cart' }]"
                :key="opt.v"
                class="flex items-center gap-3 px-4 py-4 rounded-xl cursor-pointer transition-all"
                :style="origen === opt.v
                  ? 'border: 1.5px solid var(--color-primary); background-color: #EEF2FF;'
                  : 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low);'"
              >
                <input type="radio" :value="opt.v" v-model="origen" class="hidden" @change="onOrigenChange" />
                <span class="material-symbols-outlined" style="font-size: 24px"
                  :style="`color: ${origen === opt.v ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'}`">
                  {{ opt.icon }}
                </span>
                <div>
                  <p class="font-bold text-sm"
                    :style="`color: ${origen === opt.v ? 'var(--color-primary)' : 'var(--color-on-surface)'}`">
                    {{ opt.label }}
                  </p>
                  <p class="text-xs" style="color: var(--color-on-surface-variant)">{{ opt.desc }}</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Datos generales -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <!-- OC selector -->
              <div v-if="origen === 'ConOC'">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Orden de Compra *
                </label>
                <SearchableSelect
                  :model-value="form.pedidoId"
                  :options="ocOptions"
                  null-label="Seleccionar OC..."
                  @update:model-value="form.pedidoId = $event as number | null; onPedidoChange()"
                />
              </div>

              <!-- Proveedor (Directa) -->
              <div v-if="origen === 'Directa'">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Proveedor *
                </label>
                <SearchableSelect
                  :model-value="form.proveedorId"
                  :options="proveedorOptions"
                  placeholder="Buscar proveedor..."
                  @update:model-value="form.proveedorId = $event as number | null"
                />
              </div>

              <!-- Proveedor (Con OC, read-only) -->
              <div v-if="origen === 'ConOC' && form.pedidoId">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Proveedor
                </label>
                <div class="w-full px-4 h-12 flex items-center text-sm font-medium appearance-none shadow-none"
                  style="border-radius: 12px; background-color: var(--color-surface-container); color: var(--color-on-surface-variant); border: 1px solid var(--color-outline-variant);">
                  {{ ocProveedorNombre }}
                </div>
              </div>

              <!-- Nro Factura -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Número de Factura *
                </label>
                <input v-model="form.nroFactura" type="text" placeholder="001-001-0000001" maxlength="15"
                  class="w-full px-4 h-12 text-sm font-mono outline-none appearance-none shadow-none transition-all" :style="inputStyle(false)" />
                <p class="text-xs mt-1" style="color: var(--color-outline)">Formato: 001-001-0000001</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Fecha emisión -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Fecha de Emisión *
                </label>
                <DateInput v-model="form.fechaEmision" />
              </div>

              <!-- Condición -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Condición *
                </label>
                <SearchableSelect
                  :model-value="form.condicionVenta"
                  :options="condicionOptions"
                  :searchable="false"
                  @update:model-value="form.condicionVenta = $event as string"
                />
              </div>

              <!-- Fecha vencimiento -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Vencimiento <span v-if="form.condicionVenta === 'Credito'" style="color: var(--color-error)">*</span>
                </label>
                <DateInput v-model="form.fechaVencimiento" :disabled="form.condicionVenta !== 'Credito'" />
              </div>
            </div>
          </div>

          <!-- Ítems Con OC -->
          <div v-if="origen === 'ConOC'" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Ítems de la factura</h3>
              <p class="text-xs mt-1" style="color: var(--color-on-surface-variant)">
                Copiados de la OC seleccionada — podés ajustar el tipo de IVA por ítem.
              </p>
            </div>

            <div v-if="loadingOCItems" class="px-6 py-6 flex items-center gap-2" style="color: var(--color-on-surface-variant)">
              <span class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
              <span class="text-sm">Cargando ítems…</span>
            </div>

            <div v-else-if="!form.pedidoId" class="px-6 py-10 text-center">
              <span class="material-symbols-outlined text-4xl mb-2" style="color: var(--color-outline)">shopping_cart</span>
              <p class="text-sm font-medium" style="color: var(--color-outline)">Seleccioná una OC para ver sus ítems.</p>
            </div>

            <div v-else class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 80px; color: var(--color-outline)">Cant.</th>
                  <th class="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 140px; color: var(--color-outline)">P. Unit.</th>
                  <th class="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 140px; color: var(--color-outline)">Subtotal</th>
                  <th class="px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 130px; color: var(--color-outline)">IVA</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in ocItems" :key="i" style="border-top: 1px solid var(--color-hairline-soft)">
                  <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ item.descripcion }}</td>
                  <td class="px-6 py-3 text-center" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                  <td class="px-6 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ formatMonto(item.precioUnitario) }}</td>
                  <td class="px-6 py-3 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(item.cantidad * item.precioUnitario) }}</td>
                  <td class="px-6 py-3">
                    <select v-model="item.tipoIva"
                      class="w-full px-2 py-1.5 appearance-none shadow-none text-xs outline-none"
                      :style="inputStyle(false)">
                      <option v-for="opt in tipoIvaOpciones" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="ocItems.length > 0">
                <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                  <td colspan="3" class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total ítems</td>
                  <td class="px-6 py-3 text-right font-extrabold" style="color: var(--color-primary)">{{ formatMonto(totalDesdeItems) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table></div>
          </div>

          <!-- Ítems Directa -->
          <div v-if="origen === 'Directa'" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <div class="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
              style="border-bottom: 1px solid var(--color-hairline-soft)">
              <div>
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Ítems de la factura *</h3>
                <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">
                  Si seleccionás un producto, se sumará automáticamente al stock al confirmar la factura.
                </p>
              </div>
              <button @click="addItem"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style="background-color: #EEF2FF; color: var(--color-primary); border: 1px solid rgba(0, 40, 142, 0.15);">
                <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                Agregar ítem
              </button>
            </div>

            <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 200px; color: var(--color-outline)">Producto / Stock</th>
                  <th class="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</th>
                  <th class="px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 80px; color: var(--color-outline)">Cant.</th>
                  <th class="px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 130px; color: var(--color-outline)">P. Unit.</th>
                  <th class="px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 120px; color: var(--color-outline)">IVA</th>
                  <th style="width: 56px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in directaItems" :key="i" style="border-top: 1px solid var(--color-hairline-soft)">
                  <td class="px-6 py-3">
                    <SearchableSelect
                      :model-value="item.productoId"
                      :options="productoOptions"
                      null-label="— Sin producto —"
                      @update:model-value="onProductoChange(item, $event)"
                    />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model="item.descripcion" type="text" placeholder="Descripción…"
                      class="w-full px-3 py-2 appearance-none shadow-none text-sm outline-none"
                      :style="inputStyle(false)" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model.number="item.cantidad" type="number" min="1"
                      class="w-full px-3 py-2 appearance-none shadow-none text-sm text-center outline-none"
                      :style="inputStyle(false)" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model.number="item.precioUnitario" type="number" min="0" step="1"
                      class="w-full px-3 py-2 appearance-none shadow-none text-sm text-right outline-none"
                      :style="inputStyle(false)" />
                  </td>
                  <td class="px-3 py-3">
                    <select v-model="item.tipoIva"
                      class="w-full px-2 py-2 appearance-none shadow-none text-xs outline-none"
                      :style="inputStyle(false)">
                      <option v-for="opt in tipoIvaOpciones" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </td>
                  <td class="px-3 py-3">
                    <button :disabled="directaItems.length <= 1" @click="removeItem(i)"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                      style="background-color: var(--color-error-container)" title="Eliminar ítem">
                      <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-error)">close</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table></div>

            <!-- Mensaje sobre productos a stock -->
            <div v-if="itemsConProducto > 0" class="px-6 py-3 flex items-center gap-2 text-xs"
              style="background-color: #EEF2FF; border-top: 1px solid rgba(0, 40, 142, 0.15); color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 16px">inventory_2</span>
              <span><strong>{{ itemsConProducto }}</strong> ítem{{ itemsConProducto === 1 ? '' : 's' }} con producto seleccionado se sumará{{ itemsConProducto === 1 ? '' : 'n' }} al stock.</span>
            </div>
          </div>

          <!-- Resumen fiscal (calculado desde ítems, read-only) -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Resumen fiscal</h3>
              <span class="text-xs px-2.5 py-1 rounded-full"
                style="background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined align-middle mr-1" style="font-size: 14px">calculate</span>
                Calculado automáticamente desde los ítems
              </span>
            </div>

            <div v-if="montoTotal === 0" class="text-center py-6"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-3xl mb-1">receipt_long</span>
              <p class="text-sm font-medium">Agregá ítems para ver el resumen fiscal.</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <!-- Desglose por tipo de IVA -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Exento</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(montoExento) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(montoGravado5) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs pl-3"
                  style="color: var(--color-on-surface-variant)">
                  <span>↳ IVA 5%</span>
                  <span>{{ formatMonto(iva5) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
                  <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(montoGravado10) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs pl-3"
                  style="color: var(--color-on-surface-variant)">
                  <span>↳ IVA 10%</span>
                  <span>{{ formatMonto(iva10) }}</span>
                </div>
              </div>

              <!-- Total -->
              <div class="flex flex-col items-end justify-center p-4 rounded-xl"
                style="background-color: var(--color-surface-container-low)">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Total Factura</p>
                <p class="text-3xl font-extrabold" style="color: var(--color-primary)">{{ formatMonto(montoTotal) }}</p>
                <p class="text-xs mt-1" style="color: var(--color-on-surface-variant)">
                  IVA total: {{ formatMonto(iva5 + iva10) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
            <textarea v-model="form.observaciones" rows="2" placeholder="Notas opcionales…"
              class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle(false)" />
          </div>

          <!-- Footer acciones -->
          <div class="flex items-center justify-end gap-3 sticky bottom-0 py-4" style="background-color: var(--color-background)">
            <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="cancel">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="isSaving" @click="guardar">
              <span class="material-symbols-outlined" style="font-size: 18px">save</span>
              {{ isSaving ? "Guardando…" : "Guardar Factura" }}
            </BaseButton>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
:deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
}
</style>
