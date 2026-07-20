<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import DateInput from "@/components/DateInput.vue"
import { ref, reactive, computed, onMounted, watch, nextTick } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import ClienteSelector from "@/components/ClienteSelector.vue"
import RecetaSelector from "@/components/RecetaSelector.vue"
import TrabajoOpticoCard from "@/components/TrabajoOpticoCard.vue"
import MontoInput from "@/components/MontoInput.vue"
import {
  type AgregarLineaRequest, type CategoriaFiscal, type CondicionVenta, type TipoVenta, type Venta, type Servicio,
  crearVenta, actualizarVenta, confirmarVenta, getPresupuestos, getVentaById, getServicios, resolvePrecioServicio,
} from "@/services/ventasService"
import { type Cliente, getClienteById } from "@/services/clienteService"
import { type ProveedorSimple, getLaboratorios } from "@/services/comprasService"
import { getProductos, type Producto } from "@/services/inventarioService"
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect.vue"
import { http } from "@/api/http"
import { emptyOptica, opticaLineas, opticaTrabajoPedido, type LineaUI } from "@/composables/optica"

const props = defineProps<{ esPresupuesto: boolean }>()

const router = useRouter()
const route  = useRoute()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// ── Cliente / receta / modo / óptica ────────────────────────────────────────────
const selectedCliente = ref<Cliente | null>(null)
const recetaId        = ref<number | null>(null)
const tipoVenta       = ref<TipoVenta>("TrabajoAPedido")
const optica          = reactive(emptyOptica())

const esPedido = computed(() => tipoVenta.value === "TrabajoAPedido")

// ── Datos generales ──────────────────────────────────────────────────────────────
const condicionVenta = ref<CondicionVenta>("Contado")
const fechaVenta     = ref(new Date().toISOString().slice(0, 10))
const validezDias    = ref(15)
const observaciones  = ref("")

// ── Plan de cuotas (opcional, solo aplica a Crédito) ──────────────────────────────
// Si cantidadCuotas queda en null, la venta a crédito es "libre" (cobros parciales
// sin cronograma), igual que antes de que existiera esta funcionalidad.
const cantidadCuotas       = ref<number | null>(null)
const frecuenciaCuotasDias = ref<number | null>(30)
const cantidadCuotasOptions: SelectOption[] = [3, 6, 9, 12].map(n => ({ value: n, label: `${n} cuotas` }))
const frecuenciaOptions: SelectOption[] = [
  { value: 30, label: "Mensual" },
  { value: 15, label: "Quincenal" },
]
// Al pasar a Crédito, si no hay plan definido, se limpia (queda "libre" por defecto).
watch(condicionVenta, (v) => {
  if (v === "Contado") { cantidadCuotas.value = null }
})

// ── Líneas (Directa: productos/manual; A pedido: extras manuales) ─────────────────
const lineas = ref<LineaUI[]>([])
function removeLinea(i: number) { lineas.value.splice(i, 1) }

const lineasFinales = computed<LineaUI[]>(() => {
  if (presupuestoCargado.value) return lineas.value
  return esPedido.value ? [...opticaLineas(optica), ...lineas.value] : lineas.value
})

// ── Productos (modo Directa) ──────────────────────────────────────────────────────
const productos = ref<Producto[]>([])
const productoSearch = ref("")
const showProductoDrop = ref(false)
const filteredProductos = computed(() =>
  productoSearch.value.trim()
    ? productos.value.filter(p => p.nombre.toLowerCase().includes(productoSearch.value.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(productoSearch.value.toLowerCase()))
    : productos.value.slice(0, 20),
)
function addProducto(p: Producto) {
  lineas.value.push({ tipo: "Producto", productoId: p.id, descripcion: p.nombre, cantidad: 1, precioUnitario: p.precioVenta, descuento: 0, categoriaFiscal: "Gravado10" })
  productoSearch.value = ""
  showProductoDrop.value = false
}
function hideProductoDrop() { setTimeout(() => { showProductoDrop.value = false }, 150) }

// ── Servicios (catálogo: consulta, ajuste, reparación…) ───────────────────────────
const servicios = ref<Servicio[]>([])
const buscadorTipo = ref<"Producto" | "Servicio">("Producto")
const servicioSearch = ref("")
const showServicioDrop = ref(false)
const filteredServicios = computed(() =>
  servicioSearch.value.trim()
    ? servicios.value.filter(s => s.nombre.toLowerCase().includes(servicioSearch.value.toLowerCase()))
    : servicios.value.slice(0, 20),
)
function pushServicioLinea(s: Servicio, precio: number, profesionalNombre?: string) {
  lineas.value.push({
    tipo: "Servicio", servicioId: s.id,
    descripcion: profesionalNombre ? `${s.nombre} — ${profesionalNombre}` : s.nombre,
    cantidad: 1, precioUnitario: precio, descuento: 0, categoriaFiscal: "Gravado10",
  })
}
function addServicio(s: Servicio) {
  servicioSearch.value = ""
  showServicioDrop.value = false
  if (s.tarifas && s.tarifas.length) {
    // Tiene precios por profesional/especialidad → pedir profesional y resolver
    abrirTarifaServicio(s)
  } else {
    pushServicioLinea(s, s.precio)
  }
}
function hideServicioDrop() { setTimeout(() => { showServicioDrop.value = false }, 150) }

// ── Servicio con tarifas: elegir profesional y resolver precio ─────────────────────
interface ProfLite { id: number; firstName: string; lastName: string; isActive: boolean }
const profesionales = ref<ProfLite[]>([])
const profesionalOptions = computed(() => profesionales.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })))

const showTarifaServicio   = ref(false)
const servicioPendiente    = ref<Servicio | null>(null)
const tarifaProfesionalId  = ref<number | null>(null)
const precioResuelto       = ref<number>(0)
const origenPrecio         = ref<"profesional" | "especialidad" | "base">("base")
const isResolviendoPrecio  = ref(false)

function abrirTarifaServicio(s: Servicio) {
  servicioPendiente.value   = s
  tarifaProfesionalId.value = null
  precioResuelto.value      = s.precio
  origenPrecio.value        = "base"
  showTarifaServicio.value  = true
}

watch(tarifaProfesionalId, async (profId) => {
  if (!servicioPendiente.value) return
  isResolviendoPrecio.value = true
  try {
    const r = await resolvePrecioServicio(servicioPendiente.value.id, profId ?? undefined)
    precioResuelto.value = r.precio
    origenPrecio.value   = r.origen
  } catch {
    precioResuelto.value = servicioPendiente.value.precio
    origenPrecio.value   = "base"
  } finally {
    isResolviendoPrecio.value = false
  }
})

const origenPrecioLabel = computed(() =>
  origenPrecio.value === "profesional" ? "Tarifa del profesional"
  : origenPrecio.value === "especialidad" ? "Tarifa de la especialidad"
  : "Precio base",
)

function confirmarServicioConTarifa() {
  if (!servicioPendiente.value) return
  const prof = profesionales.value.find(p => p.id === tarifaProfesionalId.value)
  const nombre = prof ? `${prof.firstName} ${prof.lastName}` : undefined
  pushServicioLinea(servicioPendiente.value, precioResuelto.value, nombre)
  showTarifaServicio.value = false
  servicioPendiente.value  = null
}

// ── Línea manual ──────────────────────────────────────────────────────────────────
const showLineaManual = ref(false)
const lineaManualForm = reactive({ descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, categoriaFiscal: "Gravado10" as CategoriaFiscal })
const CATEGORIA_FISCAL_OPTIONS = [
  { value: "Exento", label: "Exento" },
  { value: "Gravado5", label: "IVA 5%" },
  { value: "Gravado10", label: "IVA 10%" },
]
function addLineaManual() {
  if (!lineaManualForm.descripcion || lineaManualForm.precioUnitario <= 0) return
  lineas.value.push({ tipo: "Servicio", descripcion: lineaManualForm.descripcion, cantidad: lineaManualForm.cantidad, precioUnitario: lineaManualForm.precioUnitario, descuento: lineaManualForm.descuento, categoriaFiscal: lineaManualForm.categoriaFiscal })
  Object.assign(lineaManualForm, { descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, categoriaFiscal: "Gravado10" })
  showLineaManual.value = false
}

// ── Totales ────────────────────────────────────────────────────────────────────────
const subtotalLinea = (l: LineaUI) => l.cantidad * l.precioUnitario - l.descuento
const sumBy = (cat: CategoriaFiscal) => lineasFinales.value.filter(l => l.categoriaFiscal === cat).reduce((s, l) => s + subtotalLinea(l), 0)
const montoExento    = computed(() => sumBy("Exento"))
const montoGravado5  = computed(() => sumBy("Gravado5"))
const montoGravado10 = computed(() => sumBy("Gravado10"))
const iva5  = computed(() => Math.round(montoGravado5.value / 21))
const iva10 = computed(() => Math.round(montoGravado10.value / 11))
const total = computed(() => montoExento.value + montoGravado5.value + montoGravado10.value)

const fechaVencimiento = computed(() => {
  const base = new Date(fechaVenta.value + "T00:00:00")
  base.setDate(base.getDate() + (validezDias.value || 0))
  return base.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })
})

// ── Presupuestos del cliente (solo en modo venta) ─────────────────────────────────
const presupuestosDelCliente = ref<Venta[]>([])
const presupuestoCargado     = ref<Venta | null>(null)

// Laboratorio para asignar al convertir un presupuesto a pedido (la óptica queda bloqueada).
const laboratorios       = ref<ProveedorSimple[]>([])
const labSeleccionadoId  = ref<number | null>(null)
const laboratorioOptions = computed(() => laboratorios.value.map(l => ({ value: l.id, label: l.nombre })))

watch(selectedCliente, async (c) => {
  if (props.esPresupuesto) return
  presupuestosDelCliente.value = []
  if (!c || presupuestoCargado.value) return
  try {
    const res = await getPresupuestos(c.id)
    presupuestosDelCliente.value = res.items
  } catch {}
})

function cargarPresupuesto(v: Venta) {
  presupuestoCargado.value = v
  tipoVenta.value      = v.tipo
  condicionVenta.value = v.condicionVenta
  observaciones.value  = v.observaciones ?? ""
  recetaId.value       = v.recetaId ?? null
  cantidadCuotas.value       = v.cantidadCuotas ?? null
  frecuenciaCuotasDias.value = v.frecuenciaCuotasDias ?? 30
  labSeleccionadoId.value = v.trabajoPedido?.laboratorioProveedorId ?? null
  presupuestosDelCliente.value = []
  lineas.value = v.lineas.map(l => ({ tipo: l.tipo, productoId: l.productoId, servicioId: l.servicioId, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario, descuento: l.descuento, categoriaFiscal: l.categoriaFiscal }))
}
function limpiarPresupuesto() {
  presupuestoCargado.value = null
  lineas.value = []
}

onMounted(async () => {
  if (props.esPresupuesto) tipoVenta.value = "TrabajoAPedido"
  const prodsRes = await getProductos({ pageSize: 300 }).catch(() => null)
  if (prodsRes) productos.value = prodsRes.items.filter(p => p.isActive)
  const servsRes = await getServicios().catch(() => null)
  if (servsRes) servicios.value = servsRes.filter(s => s.isActive)
  const labsRes = await getLaboratorios().catch(() => null)
  if (labsRes) laboratorios.value = labsRes
  try {
    const { data } = await http.get<{ items: ProfLite[] }>("/api/professionals?pageSize=200")
    profesionales.value = (data.items ?? []).filter(p => p.isActive)
  } catch { /* no crítico */ }

  // Precarga desde un presupuesto (solo en modo venta)
  const presupuestoId = Number(route.query.presupuesto)
  if (!props.esPresupuesto && presupuestoId) {
    try {
      const venta = await getVentaById(presupuestoId)
      if (venta.clienteId) {
        try { selectedCliente.value = await getClienteById(venta.clienteId) } catch {}
        await nextTick()
      }
      cargarPresupuesto(venta)
    } catch {}
  }
})

// ── Guardar ────────────────────────────────────────────────────────────────────────
const isSaving  = ref(false)
const saveError = ref("")

const opticaLinesCount = computed(() =>
  esPedido.value && !presupuestoCargado.value ? opticaLineas(optica).length : 0
)

const canSave = computed(() => lineasFinales.value.length > 0 && total.value > 0)

function buildPayload() {
  return {
    clienteId:      selectedCliente.value?.id,
    recetaId:       esPedido.value ? (recetaId.value ?? undefined) : undefined,
    tipo:           tipoVenta.value,
    condicionVenta: condicionVenta.value,
    fechaVenta:     fechaVenta.value,
    validezDias:    props.esPresupuesto ? (validezDias.value < 1 ? 15 : validezDias.value) : undefined,
    observaciones:  observaciones.value || undefined,
    lineas:         lineasFinales.value.map(l => ({ ...l }) as AgregarLineaRequest),
    trabajoPedido:  esPedido.value ? opticaTrabajoPedido(optica) : undefined,
    cantidadCuotas:       condicionVenta.value === "Credito" ? (cantidadCuotas.value ?? undefined) : undefined,
    frecuenciaCuotasDias: condicionVenta.value === "Credito" && cantidadCuotas.value ? (frecuenciaCuotasDias.value ?? undefined) : undefined,
  }
}

async function guardar() {
  if (!canSave.value) return
  // Receta obligatoria para toda venta o presupuesto de tipo "a pedido".
  if (esPedido.value && !presupuestoCargado.value && !recetaId.value) {
    saveError.value = "La receta es obligatoria para una venta a pedido."; return
  }
  // Laboratorio solo se exige al confirmar una venta (en presupuesto se asigna después).
  if (!props.esPresupuesto && esPedido.value && !presupuestoCargado.value && !optica.laboratorio) {
    saveError.value = "Seleccioná el laboratorio para la venta a pedido."; return
  }
  // Presupuesto a pedido cargado: el laboratorio se asigna en su selector dedicado.
  if (!props.esPresupuesto && esPedido.value && presupuestoCargado.value && !labSeleccionadoId.value) {
    saveError.value = "Seleccioná el laboratorio para la venta a pedido."; return
  }
  isSaving.value = true
  saveError.value = ""
  try {
    if (props.esPresupuesto) {
      await crearVenta(buildPayload())
      router.push("/ventas/presupuestos")
      return
    }
    let ventaId: number
    if (presupuestoCargado.value) {
      // Persistir los ajustes hechos sobre el presupuesto (líneas/precios/condición) antes de confirmar.
      ventaId = presupuestoCargado.value.id
      await actualizarVenta(ventaId, {
        condicionVenta:         condicionVenta.value,
        fechaVenta:             fechaVenta.value,
        observaciones:          observaciones.value || undefined,
        lineas:                 lineasFinales.value.map(l => ({ ...l }) as AgregarLineaRequest),
        laboratorioProveedorId: esPedido.value ? (labSeleccionadoId.value ?? undefined) : undefined,
        cantidadCuotas:         condicionVenta.value === "Credito" ? (cantidadCuotas.value ?? undefined) : undefined,
        frecuenciaCuotasDias:   condicionVenta.value === "Credito" && cantidadCuotas.value ? (frecuenciaCuotasDias.value ?? undefined) : undefined,
      })
    } else {
      const v = await crearVenta(buildPayload())
      ventaId = v.id
    }
    await confirmarVenta(ventaId)
    // Tras confirmar se va a la pantalla de cobro de la venta (cobro independiente del laboratorio).
    router.push(`/ventas/${ventaId}/cobrar`)
  } catch (e: any) {
    saveError.value = e instanceof Error ? e.message : "Error al guardar"
  } finally {
    isSaving.value = false
  }
}

const titulo   = computed(() => props.esPresupuesto ? "Nuevo Presupuesto" : "Nueva Venta")
const backTo   = computed(() => props.esPresupuesto ? "/ventas/presupuestos" : "/ventas")
const guardarLabel = computed(() =>
  props.esPresupuesto ? "Guardar presupuesto" : presupuestoCargado.value ? "Confirmar y crear venta" : "Crear venta",
)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Encabezado -->
        <div class="flex items-center gap-4 mb-6">
          <button @click="router.push(backTo)" class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105" style="background-color: var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">{{ titulo }}</h1>
            <p class="mt-0.5 font-medium" style="color: var(--color-on-surface-variant)">
              {{ esPedido ? "Trabajo a pedido: receta, armazón y lente" : "Venta directa de productos en mostrador" }}
            </p>
          </div>
        </div>

        <!-- Toggle de modo -->
        <div v-if="!presupuestoCargado" class="inline-flex p-1 rounded-2xl mb-6" style="background-color: var(--color-surface-container-high)">
          <button @click="tipoVenta = 'TrabajoAPedido'" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            :style="esPedido ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">
            A pedido (óptica)
          </button>
          <button @click="tipoVenta = 'Directa'" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            :style="!esPedido ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">
            Directa (mostrador)
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Columna principal -->
          <div class="col-span-2 space-y-6">
            <ClienteSelector v-model="selectedCliente" />

            <!-- Banner presupuestos del cliente -->
            <div v-if="presupuestosDelCliente.length && !presupuestoCargado" class="rounded-2xl p-5" style="background:var(--color-warning-container);border:1.5px solid var(--color-warning-container)">
              <p class="font-semibold text-sm mb-2" style="color:var(--color-on-warning-container)">
                Este cliente tiene {{ presupuestosDelCliente.length }} presupuesto{{ presupuestosDelCliente.length !== 1 ? "s" : "" }} pendiente{{ presupuestosDelCliente.length !== 1 ? "s" : "" }}
              </p>
              <div class="space-y-2">
                <button v-for="p in presupuestosDelCliente" :key="p.id" @click="cargarPresupuesto(p)"
                  class="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.01]" style="background:var(--color-surface-container-lowest);border:1px solid var(--color-warning-container)">
                  <span class="font-mono font-semibold" style="color:var(--color-on-warning-container)">{{ p.numeroComprobante }}</span>
                  <span class="font-bold" style="color:var(--color-primary)">{{ formatPrice(p.total) }}</span>
                </button>
              </div>
            </div>

            <!-- Presupuesto cargado -->
            <div v-if="presupuestoCargado" class="rounded-2xl p-4 flex items-center justify-between" style="background:var(--color-success-container);border:1.5px solid var(--color-success-container)">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-success-container)">check_circle</span>
                <p class="text-sm font-semibold" style="color:var(--color-on-success-container)">Presupuesto cargado: {{ presupuestoCargado.numeroComprobante }}</p>
              </div>
              <button @click="limpiarPresupuesto" class="p-1 rounded-full hover:bg-green-100"><span class="material-symbols-outlined" style="font-size:16px;color:var(--color-on-success-container)">close</span></button>
            </div>

            <!-- Laboratorio (presupuesto a pedido): la óptica queda bloqueada, pero el laboratorio es obligatorio para confirmar -->
            <div v-if="presupuestoCargado && esPedido" class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Laboratorio</label>
              <SearchableSelect
                :model-value="labSeleccionadoId" :options="laboratorioOptions"
                null-label="Seleccioná un laboratorio"
                @update:model-value="labSeleccionadoId = $event as number | null" />
              <p class="mt-1.5 text-xs" style="color: var(--color-outline)">Obligatorio para confirmar una venta a pedido.</p>
            </div>

            <!-- ── A PEDIDO ── -->
            <template v-if="esPedido && !presupuestoCargado">
              <RecetaSelector :cliente-id="selectedCliente?.id ?? null" v-model="recetaId" />
              <TrabajoOpticoCard :state="optica" />
            </template>

            <!-- ── LÍNEAS / ÍTEMS ADICIONALES ── -->
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">{{ esPedido ? "Ítems adicionales" : "Líneas" }}</h3>
                <button @click="showLineaManual = true" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105" style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
                  <span class="material-symbols-outlined" style="font-size: 16px">add</span> Línea manual
                </button>
              </div>

              <!-- Buscador de productos / servicios -->
              <div class="mb-4">
                <!-- Toggle -->
                <div class="inline-flex p-1 rounded-xl mb-2" style="background-color: var(--color-surface-container-high)">
                  <button type="button" @click="buscadorTipo = 'Producto'" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    :style="buscadorTipo === 'Producto' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">Producto</button>
                  <button type="button" @click="buscadorTipo = 'Servicio'" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    :style="buscadorTipo === 'Servicio' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">Servicio</button>
                </div>

                <!-- Buscador de productos -->
                <div v-if="buscadorTipo === 'Producto'" class="relative">
                  <input v-model="productoSearch" type="text" placeholder="Buscá un producto por nombre o SKU…" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                    :style="inputStyle()"
                    @focus="showProductoDrop = true" @blur="hideProductoDrop" />
                  <div v-if="showProductoDrop && filteredProductos.length" class="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
                    style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); box-shadow: 0 4px 12px rgba(0,0,0,0.08)">
                    <button v-for="p in filteredProductos" :key="p.id" type="button" class="w-full text-left px-4 py-3 text-sm flex items-center justify-between" style="border-bottom: 1px solid rgba(196,197,213,0.1)" @mousedown.prevent="addProducto(p)">
                      <span class="font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</span>
                      <span class="font-semibold text-xs" style="color: var(--color-primary)">{{ formatPrice(p.precioVenta) }}</span>
                    </button>
                  </div>
                </div>

                <!-- Buscador de servicios -->
                <div v-else class="relative">
                  <input v-model="servicioSearch" type="text" placeholder="Buscá un servicio (consulta, ajuste…)" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                    :style="inputStyle()"
                    @focus="showServicioDrop = true" @blur="hideServicioDrop" />
                  <div v-if="showServicioDrop && filteredServicios.length" class="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
                    style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); box-shadow: 0 4px 12px rgba(0,0,0,0.08)">
                    <button v-for="s in filteredServicios" :key="s.id" type="button" class="w-full text-left px-4 py-3 text-sm flex items-center justify-between" style="border-bottom: 1px solid rgba(196,197,213,0.1)" @mousedown.prevent="addServicio(s)">
                      <span class="font-medium" style="color: var(--color-on-surface)">{{ s.nombre }}</span>
                      <span class="font-semibold text-xs" style="color: var(--color-primary)">{{ formatPrice(s.precio) }}</span>
                    </button>
                  </div>
                  <p v-if="servicios.length === 0" class="mt-1.5 text-xs" style="color: var(--color-outline)">
                    No hay servicios cargados. Creá uno en Ventas → Servicios.
                  </p>
                </div>
              </div>

              <div v-if="lineasFinales.length === 0" class="py-6 text-center rounded-xl" style="border: 1.5px dashed var(--color-outline-variant)">
                <p class="text-sm" style="color: var(--color-outline)">{{ esPedido ? "Buscá un producto o agregá una línea manual" : "Buscá un producto o agregá una línea manual" }}</p>
              </div>

              <div v-else class="space-y-2">
                <div v-for="(l, i) in lineasFinales" :key="i" class="rounded-xl p-3 flex items-start gap-3" style="background: var(--color-surface-container-low); border: 1px solid rgba(196,197,213,0.15)">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ l.descripcion }}</p>

                    <!-- Editable: líneas reales (productos/servicios/manual). Permite ajustar cantidad, precio y descuento. -->
                    <div v-if="i >= opticaLinesCount" class="flex items-center gap-2 mt-2">
                      <label class="flex items-center gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cant</span>
                        <input v-model.number="l.cantidad" type="number" min="1"
                          class="w-14 px-2 py-1 rounded-lg text-xs outline-none"
                          style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface)" />
                      </label>
                      <label class="flex items-center gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--color-outline)">P.Unit</span>
                        <div class="w-24">
                          <!-- Producto: precio fijo del catálogo, no editable -->
                          <span v-if="l.tipo === 'Producto'" class="block text-right text-xs font-semibold px-2 py-1" style="color: var(--color-on-surface)" title="El precio del producto se toma del catálogo y no se edita en la venta">{{ formatPrice(l.precioUnitario) }}</span>
                          <MontoInput v-else compact align="right" :model-value="l.precioUnitario ?? null"
                            @update:model-value="l.precioUnitario = $event ?? 0" />
                        </div>
                      </label>
                      <label class="flex items-center gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--color-outline)">Desc</span>
                        <div class="w-20">
                          <MontoInput compact align="right" :model-value="l.descuento ?? null"
                            @update:model-value="l.descuento = $event ?? 0" />
                        </div>
                      </label>
                    </div>

                    <!-- Read-only: líneas derivadas de la óptica (modo a pedido sin presupuesto cargado) -->
                    <p v-else class="text-xs mt-0.5" style="color: var(--color-outline)">{{ l.cantidad }} × {{ formatPrice(l.precioUnitario) }}{{ l.descuento ? " − " + formatPrice(l.descuento) : "" }}</p>
                  </div>
                  <p class="text-sm font-bold whitespace-nowrap" style="color: var(--color-primary)">{{ formatPrice(subtotalLinea(l)) }}</p>
                  <button
                    v-if="i >= opticaLinesCount"
                    @click="removeLinea(i - opticaLinesCount)"
                    class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
                    style="background-color: var(--color-error-container)"
                    title="Eliminar"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-error)">close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna lateral -->
          <div class="space-y-6">
            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Condiciones</h3>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Condición de Pago</label>
                  <div class="flex gap-2">
                    <button @click="condicionVenta = 'Contado'" class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" :style="condicionVenta === 'Contado' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'background: var(--color-surface-container-high); color: var(--color-on-surface-variant)'">Contado</button>
                    <button @click="condicionVenta = 'Credito'" class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" :style="condicionVenta === 'Credito' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'background: var(--color-surface-container-high); color: var(--color-on-surface-variant)'">Crédito</button>
                  </div>
                </div>
                <div v-if="condicionVenta === 'Credito'" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Plan de cuotas</label>
                    <SearchableSelect
                      v-model="cantidadCuotas"
                      :options="cantidadCuotasOptions"
                      :searchable="false"
                      null-label="Sin plan (libre)"
                      placeholder="Sin plan (libre)"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Frecuencia</label>
                    <SearchableSelect
                      v-model="frecuenciaCuotasDias"
                      :options="frecuenciaOptions"
                      :searchable="false"
                      :disabled="!cantidadCuotas"
                      placeholder="Mensual"
                    />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha</label>
                  <DateInput v-model="fechaVenta" />
                </div>
                <div v-if="esPresupuesto">
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Validez (días)</label>
                  <input v-model.number="validezDias" type="number" min="1" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
                  <p class="mt-1.5 text-xs" style="color: var(--color-outline)">Vence el {{ fechaVencimiento }}</p>
                </div>
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Observaciones</label>
                  <textarea v-model="observaciones" rows="2" class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle()"></textarea>
                </div>
              </div>
            </div>

            <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Resumen</h3>
              <div class="space-y-2 text-sm">
                <div v-if="montoExento > 0" class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Exento</span><span style="color: var(--color-on-surface)">{{ formatPrice(montoExento) }}</span></div>
                <div v-if="montoGravado5 > 0" class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Gravado 5%</span><span style="color: var(--color-on-surface)">{{ formatPrice(montoGravado5) }}</span></div>
                <div v-if="iva5 > 0" class="flex justify-between pl-4 text-xs"><span style="color: var(--color-outline)">IVA 5%</span><span style="color: var(--color-outline)">{{ formatPrice(iva5) }}</span></div>
                <div v-if="montoGravado10 > 0" class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Gravado 10%</span><span style="color: var(--color-on-surface)">{{ formatPrice(montoGravado10) }}</span></div>
                <div v-if="iva10 > 0" class="flex justify-between pl-4 text-xs"><span style="color: var(--color-outline)">IVA 10%</span><span style="color: var(--color-outline)">{{ formatPrice(iva10) }}</span></div>
                <div class="flex justify-between font-bold text-lg pt-2" style="border-top: 1px solid rgba(196,197,213,0.2)"><span style="color: var(--color-on-surface)">Total</span><span style="color: var(--color-primary)">{{ formatPrice(total) }}</span></div>
              </div>

              <p v-if="saveError" class="mt-3 text-xs font-medium" style="color: var(--color-error)">{{ saveError }}</p>

              <div class="mt-4 space-y-2">
                <BaseButton variant="primary" size="lg" class="w-full" :disabled="!canSave || isSaving" @click="guardar">
                  {{ isSaving ? "Guardando…" : guardarLabel }}
                </BaseButton>
                <BaseButton variant="secondary" size="lg" class="w-full" @click="router.push(backTo)">Cancelar</BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Modal Línea Manual -->
  <BaseModal :open="showLineaManual" size="sm" title="Agregar Línea Manual" @close="showLineaManual = false">
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Descripción *</label>
          <input v-model="lineaManualForm.descripcion" type="text" placeholder="Consulta, servicio, etc." class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Cantidad</label>
            <input v-model.number="lineaManualForm.cantidad" type="number" min="1" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Precio Unitario *</label>
            <MontoInput :model-value="lineaManualForm.precioUnitario ?? null" @update:model-value="lineaManualForm.precioUnitario = $event ?? 0" placeholder="0" />
          </div>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Categoría Fiscal</label>
          <SearchableSelect v-model="lineaManualForm.categoriaFiscal" :options="CATEGORIA_FISCAL_OPTIONS" placeholder="Categoría fiscal" />
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showLineaManual = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" @click="addLineaManual">Agregar</BaseButton>
    </template>
  </BaseModal>

  <!-- Modal Servicio con tarifas -->
  <BaseModal :open="showTarifaServicio" size="sm" title="Precio del servicio" @close="showTarifaServicio = false">
    <template #body>
      <div v-if="servicioPendiente" class="space-y-4">
        <div>
          <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ servicioPendiente.nombre }}</p>
          <p class="text-xs" style="color: var(--color-outline)">Este servicio tiene precios según el profesional. Elegí el profesional que atendió.</p>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Profesional</label>
          <SearchableSelect
            :model-value="tarifaProfesionalId" :options="profesionalOptions"
            null-label="Sin profesional (precio base)"
            @update:model-value="tarifaProfesionalId = $event as number | null" />
        </div>
        <div class="flex items-center justify-between rounded-xl px-4 py-3" style="background-color: var(--color-surface-container-low)">
          <div>
            <p class="text-xs font-semibold" style="color: var(--color-outline)">{{ origenPrecioLabel }}</p>
            <p class="text-lg font-extrabold" style="color: var(--color-primary)">{{ formatPrice(precioResuelto) }}</p>
          </div>
          <span v-if="isResolviendoPrecio" class="material-symbols-outlined animate-spin" style="font-size: 20px; color: var(--color-outline)">progress_activity</span>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showTarifaServicio = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isResolviendoPrecio" @click="confirmarServicioConTarifa">Agregar</BaseButton>
    </template>
  </BaseModal>
</template>
