<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  getFacturasDisponiblesRecepcion,
  getComprasPedidoById,
  registrarRecepcion,
  type FacturaDisponibleRecepcion,
  type PedidoCompras,
} from "@/services/comprasService"

const router = useRouter()

const isLoading = ref(true)
const isSaving = ref(false)
const saveError = ref("")

// ── Catálogo de facturas disponibles ─────────────────────────────────────────
const facturas = ref<FacturaDisponibleRecepcion[]>([])
const selectedFacturaId = ref<number | null>(null)

const selectedFactura = computed(() =>
  facturas.value.find(f => f.id === selectedFacturaId.value) ?? null,
)

// ── Detalle de OC (cargado al seleccionar factura) ───────────────────────────
const pedido = ref<PedidoCompras | null>(null)
const loadingPedido = ref(false)

// ── Form ─────────────────────────────────────────────────────────────────────
const fechaRecepcion = ref(new Date().toISOString().slice(0, 10))
const observaciones = ref("")

interface LineaRecepcion {
  itemId: number
  productoNombre: string
  cantidadOC: number
  yaRecibido: number
  pendiente: number
  cantidadRecibida: number
  lote: string
  fechaVencimiento: string
  observaciones: string
}

const lineas = ref<LineaRecepcion[]>([])

const totalRecibir = computed(() => lineas.value.reduce((s, l) => s + l.cantidadRecibida, 0))

// ── Historial OC ─────────────────────────────────────────────────────────────
const historial = computed(() => pedido.value?.recepciones ?? [])

onMounted(async () => {
  try {
    facturas.value = await getFacturasDisponiblesRecepcion()
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al cargar facturas disponibles."
  } finally {
    isLoading.value = false
  }
})

async function onFacturaChange() {
  if (!selectedFacturaId.value) {
    pedido.value = null
    lineas.value = []
    return
  }
  const fact = selectedFactura.value
  if (!fact) return

  loadingPedido.value = true
  saveError.value = ""
  try {
    const p = await getComprasPedidoById(fact.pedidoProveedorId)
    pedido.value = p
    lineas.value = p.items
      .filter(i => i.cantidad - i.cantidadRecibida > 0)
      .map(i => ({
        itemId: i.id,
        productoNombre: i.productoNombre,
        cantidadOC: i.cantidad,
        yaRecibido: i.cantidadRecibida,
        pendiente: i.cantidad - i.cantidadRecibida,
        cantidadRecibida: i.cantidad - i.cantidadRecibida,
        lote: "",
        fechaVencimiento: "",
        observaciones: "",
      }))
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al cargar la OC."
    pedido.value = null
    lineas.value = []
  } finally {
    loadingPedido.value = false
  }
}

function fillAll() {
  lineas.value.forEach(l => { l.cantidadRecibida = l.pendiente })
}
function clearAll() {
  lineas.value.forEach(l => { l.cantidadRecibida = 0 })
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

async function submit() {
  saveError.value = ""

  if (!selectedFacturaId.value) { saveError.value = "Seleccioná una factura."; return }
  if (!fechaRecepcion.value) { saveError.value = "La fecha de recepción es obligatoria."; return }

  const validas = lineas.value.filter(l => l.cantidadRecibida > 0)
  if (validas.length === 0) {
    saveError.value = "Ingresá cantidad a recibir en al menos un ítem."
    return
  }

  for (const l of validas) {
    if (l.cantidadRecibida > l.pendiente) {
      saveError.value = `"${l.productoNombre}" excede lo pendiente (${l.pendiente}).`
      return
    }
    const tieneLote = l.lote.trim().length > 0
    const tieneVenc = l.fechaVencimiento.trim().length > 0
    if (tieneLote !== tieneVenc) {
      saveError.value = `Para "${l.productoNombre}": si se completa lote o vencimiento, ambos son obligatorios.`
      return
    }
  }

  isSaving.value = true
  try {
    await registrarRecepcion({
      facturaCompraId: selectedFacturaId.value,
      fechaRecepcion: fechaRecepcion.value,
      observaciones: observaciones.value.trim() || undefined,
      items: validas.map(l => ({
        itemId: l.itemId,
        cantidadRecibida: l.cantidadRecibida,
        lote: l.lote.trim() || undefined,
        fechaVencimiento: l.fechaVencimiento || undefined,
        observaciones: l.observaciones.trim() || undefined,
      })),
    })
    router.push("/compras/recepciones")
  } catch (err: any) {
    saveError.value = err.response?.data?.message ?? err.message ?? "Error al registrar recepción."
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  router.push("/compras/recepciones")
}

const inputStyle = "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
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

          <!-- Header -->
          <div class="mb-8">
            <button @click="cancel"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Recepciones de Mercadería
            </button>

            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nueva Recepción</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Seleccioná una factura con OC para cargar los ítems pendientes de recepción.
            </p>
          </div>

          <!-- Error general -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- ─── SECCIÓN 1: Origen ──────────────────────────────────────────── -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">1. Factura y origen</h3>

            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Factura de Compra *
                </label>
                <select v-model="selectedFacturaId" @change="onFacturaChange"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                  :style="inputStyle">
                  <option :value="null">Seleccionar factura…</option>
                  <option v-for="f in facturas" :key="f.id" :value="f.id">
                    {{ f.nroFactura }} — {{ f.proveedorNombre }} (OC #{{ f.pedidoProveedorId }})
                  </option>
                </select>
                <p v-if="facturas.length === 0" class="text-xs mt-1" style="color: var(--color-on-surface-variant)">
                  No hay facturas con OC pendientes de recepción.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                  Fecha de recepción *
                </label>
                <input v-model="fechaRecepcion" type="date"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle" />
              </div>
            </div>

            <!-- Info autocompletada -->
            <div v-if="selectedFactura" class="grid grid-cols-3 gap-4 mb-4 p-4 rounded-xl"
              style="background-color: var(--color-surface-container-low)">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Proveedor</p>
                <p class="font-semibold text-sm" style="color: var(--color-on-surface)">{{ selectedFactura.proveedorNombre }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">OC asociada</p>
                <p class="font-mono font-semibold text-sm" style="color: var(--color-primary)">#{{ selectedFactura.pedidoProveedorId }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Ítems pendientes</p>
                <p class="font-semibold text-sm" style="color: var(--color-on-surface)">{{ selectedFactura.itemsPendientes }}</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                Observaciones generales
              </label>
              <textarea v-model="observaciones" rows="2" placeholder="Notas sobre la recepción (opcional)…"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle" />
            </div>
          </div>

          <!-- ─── SECCIÓN 2: Detalle de ítems ───────────────────────────────── -->
          <div v-if="selectedFacturaId" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

            <div class="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
              style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <div>
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">2. Detalle de ítems</h3>
                <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">
                  Editá las cantidades a recibir. Ítems en 0 se ignoran.
                </p>
              </div>
              <div v-if="lineas.length > 0" class="flex items-center gap-2">
                <button @click="fillAll"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style="background-color: #EEF2FF; color: var(--color-primary)">
                  <span class="material-symbols-outlined" style="font-size: 14px">done_all</span>
                  Recibir todo
                </button>
                <button @click="clearAll"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
                  <span class="material-symbols-outlined" style="font-size: 14px">close</span>
                  Limpiar
                </button>
              </div>
            </div>

            <div v-if="loadingPedido" class="px-6 py-8 flex items-center gap-2"
              style="color: var(--color-on-surface-variant)">
              <span class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
              <span class="text-sm">Cargando ítems de la OC…</span>
            </div>

            <div v-else-if="lineas.length === 0" class="px-6 py-10 text-center">
              <span class="material-symbols-outlined text-4xl mb-2" style="color: var(--color-outline)">check_circle</span>
              <p class="font-bold text-sm" style="color: var(--color-on-surface)">Esta OC ya recibió todos sus ítems.</p>
            </div>

            <table v-else class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 80px; color: var(--color-outline)">OC</th>
                  <th class="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 90px; color: var(--color-outline)">Recibido</th>
                  <th class="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 90px; color: var(--color-outline)">Pendiente</th>
                  <th class="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 110px; color: var(--color-outline)">Recibir *</th>
                  <th class="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 140px; color: var(--color-outline)">Lote</th>
                  <th class="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider" style="width: 150px; color: var(--color-outline)">Vto.</th>
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="min-width: 180px; color: var(--color-outline)">Obs.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in lineas" :key="l.itemId" style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ l.productoNombre }}</td>
                  <td class="px-3 py-3 text-center" style="color: var(--color-on-surface-variant)">{{ l.cantidadOC }}</td>
                  <td class="px-3 py-3 text-center" style="color: var(--color-on-surface-variant)">{{ l.yaRecibido }}</td>
                  <td class="px-3 py-3 text-center font-semibold" style="color: #92400e">{{ l.pendiente }}</td>
                  <td class="px-3 py-3">
                    <input v-model.number="l.cantidadRecibida" type="number" :min="0" :max="l.pendiente"
                      class="w-full px-2 py-2 rounded-lg text-sm text-center outline-none font-bold"
                      :style="inputStyle" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model="l.lote" type="text" placeholder="—" maxlength="80"
                      class="w-full px-2 py-2 rounded-lg text-sm outline-none" :style="inputStyle" />
                  </td>
                  <td class="px-3 py-3">
                    <input v-model="l.fechaVencimiento" type="date"
                      class="w-full px-2 py-2 rounded-lg text-sm outline-none" :style="inputStyle" />
                  </td>
                  <td class="px-6 py-3">
                    <input v-model="l.observaciones" type="text" placeholder="—" maxlength="500"
                      class="w-full px-3 py-2 rounded-lg text-sm outline-none" :style="inputStyle" />
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                  <td colspan="4" class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total a recibir</td>
                  <td class="px-3 py-3 text-center font-extrabold" style="color: var(--color-primary)">{{ totalRecibir }}</td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- ─── SECCIÓN 3: Historial ───────────────────────────────────────── -->
          <div v-if="selectedFacturaId && pedido" class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <div class="px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">3. Recepciones anteriores de esta OC</h3>
              <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">Sólo lectura.</p>
            </div>

            <div v-if="historial.length === 0" class="px-6 py-8 text-center"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-3xl mb-1">inventory</span>
              <p class="text-sm">No hay recepciones previas para esta OC.</p>
            </div>

            <div v-else class="divide-y" style="border-color: rgba(196,197,213,0.12)">
              <div v-for="rec in historial" :key="rec.id" class="px-6 py-4">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style="background-color: var(--color-primary); color: #fff">#{{ rec.id }}</span>
                    <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
                      {{ formatDate(rec.fechaRecepcion) }}
                    </span>
                    <span class="text-xs" style="color: var(--color-on-surface-variant)">
                      (registrado {{ formatDateTime(rec.createdAt) }})
                    </span>
                  </div>
                  <span v-if="rec.usuarioNombre" class="text-xs px-2.5 py-1 rounded-full"
                    style="background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant)">
                    <span class="material-symbols-outlined align-middle mr-1" style="font-size: 14px">person</span>
                    {{ rec.usuarioNombre }}
                  </span>
                </div>
                <p v-if="rec.observaciones" class="text-xs italic mb-2" style="color: var(--color-on-surface-variant)">
                  {{ rec.observaciones }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <span v-for="i in rec.items" :key="i.pedidoItemId"
                    class="text-xs px-2.5 py-1 rounded-lg"
                    style="background-color: var(--color-surface-container-low); color: var(--color-on-surface)">
                    {{ i.productoNombre }} <strong style="color: var(--color-primary)">+{{ i.cantidad }}</strong>
                    <span v-if="i.lote" style="color: var(--color-on-surface-variant)"> · Lote {{ i.lote }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer acciones -->
          <div class="flex items-center justify-end gap-3 sticky bottom-0 py-4" style="background-color: var(--color-background)">
            <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="cancel">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="isSaving || !selectedFacturaId || lineas.length === 0" @click="submit">
              <span class="material-symbols-outlined" style="font-size: 18px">inventory</span>
              {{ isSaving ? "Registrando…" : "Confirmar Recepción" }}
            </BaseButton>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
