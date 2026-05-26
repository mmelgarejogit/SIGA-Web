<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
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
  proveedorId: 0,
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
const iva5          = computed(() => Math.round(montoGravado5.value / 21))
const iva10         = computed(() => Math.round(montoGravado10.value / 11))

const ocProveedorNombre = computed(() => {
  if (origen.value !== "ConOC" || !form.pedidoId) return ""
  return pedidosConfirmados.value.find(p => p.id === Number(form.pedidoId))?.proveedorNombre ?? ""
})

const itemsConProducto = computed(() =>
  directaItems.value.filter(i => i.productoId !== null).length,
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
  form.proveedorId = 0
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
function onProductoChange(item: ItemLinea, e: Event) {
  const value = (e.target as HTMLSelectElement).value
  if (!value) {
    item.productoId = null
    return
  }
  const prod = productos.value.find(p => p.id === Number(value))
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

const inputStyle = (hasError = false) => hasError
  ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
  : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

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
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Origen de la factura</h3>
            <div class="grid grid-cols-2 gap-3">
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
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

            <div class="grid grid-cols-2 gap-4 mb-4">
              <!-- OC selector -->
              <div v-if="origen === 'ConOC'">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Orden de Compra *
                </label>
                <select v-model="form.pedidoId"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                  :style="inputStyle(false)" @change="onPedidoChange">
                  <option :value="null">Seleccionar OC...</option>
                  <option v-for="oc in pedidosConfirmados" :key="oc.id" :value="oc.id">
                    {{ oc.nro }} — {{ oc.proveedorNombre }}
                  </option>
                </select>
              </div>

              <!-- Proveedor (Directa) -->
              <div v-if="origen === 'Directa'">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Proveedor *
                </label>
                <select v-model="form.proveedorId"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                  :style="inputStyle(false)">
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>

              <!-- Proveedor (Con OC, read-only) -->
              <div v-if="origen === 'ConOC' && form.pedidoId">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Proveedor
                </label>
                <div class="w-full px-4 py-3 rounded-xl text-sm font-medium"
                  style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant); border: 1px solid var(--color-outline-variant);">
                  {{ ocProveedorNombre }}
                </div>
              </div>

              <!-- Nro Factura -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Número de Factura *
                </label>
                <input v-model="form.nroFactura" type="text" placeholder="001-001-0000001" maxlength="15"
                  class="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none" :style="inputStyle(false)" />
                <p class="text-xs mt-1" style="color: var(--color-outline)">Formato: 001-001-0000001</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <!-- Fecha emisión -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Fecha de Emisión *
                </label>
                <input v-model="form.fechaEmision" type="date"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
              </div>

              <!-- Condición -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Condición *
                </label>
                <select v-model="form.condicionVenta"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" :style="inputStyle(false)">
                  <option value="Contado">Contado</option>
                  <option value="Credito">Crédito</option>
                </select>
              </div>

              <!-- Fecha vencimiento -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Vencimiento <span v-if="form.condicionVenta === 'Credito'" style="color: var(--color-error)">*</span>
                </label>
                <input v-model="form.fechaVencimiento" type="date" :disabled="form.condicionVenta !== 'Credito'"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-40" :style="inputStyle(false)" />
              </div>
            </div>
          </div>

          <!-- Ítems Con OC -->
          <div v-if="origen === 'ConOC'" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <div class="px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
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

            <table v-else class="w-full text-sm">
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
                <tr v-for="(item, i) in ocItems" :key="i" style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ item.descripcion }}</td>
                  <td class="px-6 py-3 text-center" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                  <td class="px-6 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ formatMonto(item.precioUnitario) }}</td>
                  <td class="px-6 py-3 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatMonto(item.cantidad * item.precioUnitario) }}</td>
                  <td class="px-6 py-3">
                    <select v-model="item.tipoIva"
                      class="w-full px-2 py-1.5 rounded-lg text-xs outline-none appearance-none"
                      style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface);">
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
            </table>
          </div>

          <!-- Ítems Directa -->
          <div v-if="origen === 'Directa'" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <div class="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
              style="border-bottom: 1px solid rgba(196,197,213,0.12)">
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

            <table class="w-full text-sm">
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
                <tr v-for="(item, i) in directaItems" :key="i" style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-3">
                    <select :value="item.productoId ?? ''" @change="onProductoChange(item, $event)"
                      class="w-full px-2 py-2 rounded-xl text-xs outline-none appearance-none"
                      :style="item.productoId !== null
                        ? 'border: 1.5px solid var(--color-primary); background-color: #EEF2FF; color: var(--color-primary); font-weight: 600;'
                        : 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface);'">
                      <option value="">— Sin producto —</option>
                      <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                    </select>
                  </td>
                  <td class="px-3 py-3">
                    <input v-model="item.descripcion" type="text" placeholder="Descripción…"
                      class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model.number="item.cantidad" type="number" min="1"
                      class="w-full px-3 py-2 rounded-xl text-sm text-center outline-none"
                      style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model.number="item.precioUnitario" type="number" min="0" step="1"
                      class="w-full px-3 py-2 rounded-xl text-sm text-right outline-none"
                      style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  </td>
                  <td class="px-3 py-3">
                    <select v-model="item.tipoIva"
                      class="w-full px-2 py-2 rounded-xl text-xs outline-none appearance-none"
                      style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface);">
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
            </table>

            <!-- Mensaje sobre productos a stock -->
            <div v-if="itemsConProducto > 0" class="px-6 py-3 flex items-center gap-2 text-xs"
              style="background-color: #EEF2FF; border-top: 1px solid rgba(0, 40, 142, 0.15); color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 16px">inventory_2</span>
              <span><strong>{{ itemsConProducto }}</strong> ítem{{ itemsConProducto === 1 ? '' : 's' }} con producto seleccionado se sumará{{ itemsConProducto === 1 ? '' : 'n' }} al stock.</span>
            </div>
          </div>

          <!-- Resumen fiscal (calculado desde ítems, read-only) -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
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

            <div v-else class="grid grid-cols-2 gap-6">
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
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
            <textarea v-model="form.observaciones" rows="2" placeholder="Notas opcionales…"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)" />
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
