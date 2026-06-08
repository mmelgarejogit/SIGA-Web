<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import { type TrabajoPedidoListDto, type Venta, getVentas } from "@/services/ventasService"
import { getPedidos, crearPedido } from "@/services/laboratorioService"
import { getLaboratorios, type ProveedorSimple } from "@/services/comprasService"
import { getTiposLente, getTratamientos, type TipoLente, type Tratamiento } from "@/services/inventarioService"

const router = useRouter()
const auth   = useAuthStore()
const canCreate = auth.hasPermission("gestionar_laboratorio")

const formatDate = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const estadoFiltro = ref<string[]>([])

const estadoOptions = [
  { value: "PendienteAprobacion", label: "Pend. aprobación", dot: "#6B7280" },
  { value: "PendienteEnvio",      label: "Pend. envío",      dot: "#1D4ED8" },
  { value: "Enviado",             label: "Enviado",           dot: "#92400E" },
  { value: "Recibido",            label: "Recibido",          dot: "#166534" },
  { value: "Rechazado",           label: "Rechazado",         dot: "#991B1B" },
]

async function load() {
  isLoading.value = true
  try {
    items.value = await getPedidos(estadoFiltro.value.length === 1 ? estadoFiltro.value[0] : undefined)
  } catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    i.clienteNombre.toLowerCase().includes(q) ||
    i.numeroComprobante.toLowerCase().includes(q) ||
    i.laboratorioNombre.toLowerCase().includes(q),
  )
})

// ── Badges ─────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PendienteAprobacion: { bg: "#F3F4F6", text: "#6B7280", label: "Pend. aprobación" },
    PendienteEnvio:      { bg: "#DBEAFE", text: "#1D4ED8", label: "Pend. envío"      },
    Enviado:             { bg: "#FEF3C7", text: "#92400E", label: "Enviado"           },
    Recibido:            { bg: "#DCFCE7", text: "#166534", label: "Recibido"          },
    Rechazado:           { bg: "#FEE2E2", text: "#991B1B", label: "Rechazado"         },
  }
  return map[estado] ?? { bg: "#F3F4F6", text: "#6B7280", label: estado }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
  ]
}

// ── Registrar nuevo pedido ──────────────────────────────────────────────────────

const showTP        = ref(false)
const isCreandoTP   = ref(false)
const tpError       = ref("")
const candidatos    = ref<Venta[]>([])
const laboratorios  = ref<ProveedorSimple[]>([])
const tiposLente    = ref<TipoLente[]>([])
const tratamientos  = ref<Tratamiento[]>([])

const tpForm = reactive({
  ventaId:                0,
  tipoLenteId:            0,
  tratamientoIds:         [] as number[],
  laboratorioProveedorId: 0,
  observacion:            "",
})

async function openTP() {
  tpError.value = ""
  Object.assign(tpForm, { ventaId: 0, tipoLenteId: 0, tratamientoIds: [], laboratorioProveedorId: 0, observacion: "" })
  tpVentaSearch.value        = ""
  tpTipoLenteSearch.value    = ""
  tpLabSearch.value          = ""
  tpTratamientosSearch.value = ""
  tpShowTratDrop.value       = false
  const [vts, labs, tipos, tratos] = await Promise.allSettled([
    getVentas({ tipo: "TrabajoAPedido", pageSize: 200 }),
    laboratorios.value.length  ? Promise.resolve(laboratorios.value)  : getLaboratorios(),
    tiposLente.value.length    ? Promise.resolve(tiposLente.value)    : getTiposLente(),
    tratamientos.value.length  ? Promise.resolve(tratamientos.value)  : getTratamientos(),
  ])
  if (vts.status   === "fulfilled") candidatos.value   = vts.value.items.filter(v => !v.trabajoPedido && !["Borrador", "Cancelada"].includes(v.estado))
  if (labs.status  === "fulfilled") laboratorios.value = labs.value
  if (tipos.status === "fulfilled") tiposLente.value   = tipos.value.filter((t: TipoLente) => t.isActive)
  if (tratos.status === "fulfilled") tratamientos.value = tratos.value.filter((t: Tratamiento) => t.isActive)
  showTP.value = true
}

// Selector de venta
const tpVentaSearch   = ref("")
const tpShowVentaDrop = ref(false)
const tpSelectedVenta = computed(() => candidatos.value.find(v => v.id === tpForm.ventaId) ?? null)
const tpFilteredVentas = computed(() => {
  const q = tpVentaSearch.value.trim().toLowerCase()
  return q
    ? candidatos.value.filter(v => v.clienteNombre.toLowerCase().includes(q) || v.numeroComprobante.toLowerCase().includes(q))
    : candidatos.value
})
function selectVenta(v: Venta) {
  tpForm.ventaId      = v.id
  tpVentaSearch.value = `${v.numeroComprobante} · ${v.clienteNombre}`
  tpShowVentaDrop.value = false
}
function clearVenta() { tpForm.ventaId = 0; tpVentaSearch.value = "" }
function onVentaBlur() { setTimeout(() => { tpShowVentaDrop.value = false }, 150) }

function toggleTratamiento(id: number) {
  const idx = tpForm.tratamientoIds.indexOf(id)
  if (idx === -1) tpForm.tratamientoIds.push(id)
  else tpForm.tratamientoIds.splice(idx, 1)
}

// Tipo de lente
const tpTipoLenteSearch   = ref("")
const tpShowTipoLenteDrop = ref(false)
const tpSelectedTipoLente = computed(() => tiposLente.value.find(t => t.id === tpForm.tipoLenteId) ?? null)
const tpFilteredTiposLente = computed(() => {
  const q = tpTipoLenteSearch.value.trim().toLowerCase()
  return q ? tiposLente.value.filter(t => t.nombre.toLowerCase().includes(q)) : tiposLente.value
})
function selectTipoLente(id: number, nombre: string) {
  tpForm.tipoLenteId        = id
  tpTipoLenteSearch.value   = nombre
  tpShowTipoLenteDrop.value = false
}
function clearTipoLente() { tpForm.tipoLenteId = 0; tpTipoLenteSearch.value = "" }
function onTipoLenteBlur() { setTimeout(() => { tpShowTipoLenteDrop.value = false }, 150) }

// Tratamientos
const tpTratamientosSearch = ref("")
const tpShowTratDrop = ref(false)
const tpSelectedTratamientos = computed(() => tratamientos.value.filter(t => tpForm.tratamientoIds.includes(t.id)))
const tpFilteredTratamientosDisponibles = computed(() => {
  const q = tpTratamientosSearch.value.trim().toLowerCase()
  const disponibles = tratamientos.value.filter(t => !tpForm.tratamientoIds.includes(t.id))
  return q ? disponibles.filter(t => t.nombre.toLowerCase().includes(q)) : disponibles
})
function onTratBlur() { setTimeout(() => { tpShowTratDrop.value = false }, 150) }

// Laboratorio
const tpLabSearch   = ref("")
const tpShowLabDrop = ref(false)
const tpSelectedLab = computed(() => laboratorios.value.find(l => l.id === tpForm.laboratorioProveedorId) ?? null)
const tpFilteredLabs = computed(() => {
  const q = tpLabSearch.value.trim().toLowerCase()
  return q ? laboratorios.value.filter(l => l.nombre.toLowerCase().includes(q)) : laboratorios.value
})
function selectLab(id: number, nombre: string) {
  tpForm.laboratorioProveedorId = id
  tpLabSearch.value   = nombre
  tpShowLabDrop.value = false
}
function clearLab() { tpForm.laboratorioProveedorId = 0; tpLabSearch.value = "" }
function onLabBlur() { setTimeout(() => { tpShowLabDrop.value = false }, 150) }

async function submitTP() {
  if (!tpForm.ventaId) { tpError.value = "Seleccioná una venta"; return }
  if (!tpForm.tipoLenteId || !tpForm.laboratorioProveedorId) {
    tpError.value = "Tipo de lente y laboratorio son obligatorios"; return
  }
  isCreandoTP.value = true
  tpError.value     = ""
  try {
    await crearPedido({
      ventaId:                tpForm.ventaId,
      recetaId:               tpSelectedVenta.value?.recetaId ?? 0,
      tipoLenteId:            tpForm.tipoLenteId,
      tratamientoIds:         tpForm.tratamientoIds,
      laboratorioProveedorId: tpForm.laboratorioProveedorId,
      observacion:            tpForm.observacion || undefined,
    })
    showTP.value = false
    await load()
  } catch (e: any) {
    tpError.value = e?.response?.data?.message ?? "Error al registrar pedido"
  } finally {
    isCreandoTP.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Pedidos a Laboratorio</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canCreate" variant="primary" size="lg" @click="openTP">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nuevo pedido
          </BaseButton>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por cliente, comprobante o laboratorio…" class="w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos que mostrar">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo de lente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Factura</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="item in filtered" :key="item.id"
                class="hover:bg-surface-container-low cursor-pointer"
                style="border-bottom: 1px solid rgba(196,197,213,0.12)"
                @click="router.push(`/ventas/${item.ventaId}`)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ item.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.tipoLenteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.laboratorioNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoBadge(item.estado).bg}; color: ${estadoBadge(item.estado).text}`">
                    {{ estadoBadge(item.estado).label }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span v-if="item.factura" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style="background:#DCFCE7;color:#166534">
                    <span class="material-symbols-outlined" style="font-size:13px">receipt</span>
                    {{ item.factura.numeroFactura }}
                  </span>
                  <span v-else class="text-xs" style="color: var(--color-outline)">—</span>
                </td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <RowContextMenu :items="menuItems(item)" />
                </td>
              </tr>
            </template>
          </BaseTable>
        </div>

      </div>
    </main>

    <!-- ── Modal: Nuevo pedido al laboratorio ─────────────────────────────────── -->
    <BaseModal :open="showTP" size="lg" title="Nuevo Pedido al Laboratorio" @close="showTP = false">
      <template #body>
        <div class="space-y-5">

          <!-- Venta — autocomplete -->
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Venta *</label>
            <div class="relative">
              <input
                v-model="tpVentaSearch"
                :disabled="!!tpSelectedVenta"
                type="text"
                placeholder="Buscar venta por comprobante o cliente…"
                class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
                style="border-radius:12px;border:1px solid var(--color-outline-variant);color:var(--color-on-surface);background-color:var(--color-surface-container-low)"
                @focus="tpShowVentaDrop = true"
                @blur="onVentaBlur"
              />
              <div
                v-if="tpShowVentaDrop && tpFilteredVentas.length"
                class="absolute left-0 right-0 z-30 mt-1 shadow-lg overflow-hidden"
                style="border-radius:12px;background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);max-height:220px;overflow-y:auto"
              >
                <button
                  v-for="v in tpFilteredVentas"
                  :key="v.id"
                  type="button"
                  class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                  style="border-bottom:1px solid rgba(196,197,213,0.1)"
                  @mousedown.prevent="selectVenta(v)"
                >
                  <span class="font-mono font-semibold" style="color:var(--color-primary)">{{ v.numeroComprobante }}</span>
                  <span class="ml-2 font-medium" style="color:var(--color-on-surface)">{{ v.clienteNombre }}</span>
                </button>
              </div>
              <div v-if="tpShowVentaDrop && !tpFilteredVentas.length" class="absolute left-0 right-0 z-30 mt-1 px-4 py-3 text-sm rounded-xl"
                style="background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);color:var(--color-outline)">
                No hay ventas a pedido en proceso sin pedido cargado.
              </div>
              <!-- Seleccionada -->
              <div v-if="tpSelectedVenta" class="mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl"
                style="background:#EFF6FF;border:1px solid #BFDBFE">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:18px;color:#1D4ED8">receipt_long</span>
                  <div>
                    <p class="text-sm font-semibold" style="color:#1D4ED8">{{ tpSelectedVenta.numeroComprobante }}</p>
                    <p class="text-xs" style="color:#3B82F6">{{ tpSelectedVenta.clienteNombre }}</p>
                  </div>
                </div>
                <button @click="clearVenta" class="p-1 rounded-full hover:bg-blue-100 transition-colors">
                  <span class="material-symbols-outlined" style="font-size:16px;color:#3B82F6">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Tipo de lente — autocomplete -->
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Tipo de Lente *</label>
            <div class="relative">
              <input
                v-model="tpTipoLenteSearch"
                :disabled="!!tpSelectedTipoLente"
                type="text"
                placeholder="Buscar tipo de lente…"
                class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
                style="border-radius:12px;border:1px solid var(--color-outline-variant);color:var(--color-on-surface);background-color:var(--color-surface-container-low)"
                @focus="tpShowTipoLenteDrop = true"
                @blur="onTipoLenteBlur"
              />
              <div
                v-if="tpShowTipoLenteDrop && tpFilteredTiposLente.length"
                class="absolute left-0 right-0 z-30 mt-1 shadow-lg overflow-hidden"
                style="border-radius:12px;background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);max-height:200px;overflow-y:auto"
              >
                <button
                  v-for="t in tpFilteredTiposLente"
                  :key="t.id"
                  type="button"
                  class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                  style="border-bottom:1px solid rgba(196,197,213,0.1)"
                  @mousedown.prevent="selectTipoLente(t.id, t.nombre)"
                >
                  <span class="font-medium" style="color:var(--color-on-surface)">{{ t.nombre }}</span>
                </button>
              </div>
              <div v-if="tpSelectedTipoLente" class="mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl"
                style="background:#EFF6FF;border:1px solid #BFDBFE">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:18px;color:#1D4ED8">lens</span>
                  <span class="text-sm font-semibold" style="color:#1D4ED8">{{ tpSelectedTipoLente.nombre }}</span>
                </div>
                <button @click="clearTipoLente" class="p-1 rounded-full hover:bg-blue-100 transition-colors">
                  <span class="material-symbols-outlined" style="font-size:16px;color:#3B82F6">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Tratamientos — multi-select con chips -->
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Tratamientos</label>
            <div v-if="tratamientos.length">
              <div v-if="tpSelectedTratamientos.length" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="t in tpSelectedTratamientos"
                  :key="t.id"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style="background:#EDE9FE;color:#5B21B6"
                >
                  {{ t.nombre }}
                  <button type="button" @click="toggleTratamiento(t.id)" class="hover:opacity-70 transition-opacity ml-0.5">
                    <span class="material-symbols-outlined" style="font-size:13px;line-height:1">close</span>
                  </button>
                </span>
              </div>
              <div class="relative">
                <input
                  v-model="tpTratamientosSearch"
                  type="text"
                  :placeholder="tpSelectedTratamientos.length ? 'Agregar otro tratamiento…' : 'Buscar tratamiento…'"
                  class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
                  style="border-radius:12px;border:1px solid var(--color-outline-variant);color:var(--color-on-surface);background-color:var(--color-surface-container-low)"
                  @focus="tpShowTratDrop = true"
                  @blur="onTratBlur"
                />
                <div
                  v-if="tpShowTratDrop && tpFilteredTratamientosDisponibles.length"
                  class="absolute left-0 right-0 z-30 mt-1 shadow-lg overflow-hidden"
                  style="border-radius:12px;background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);max-height:200px;overflow-y:auto"
                >
                  <button
                    v-for="t in tpFilteredTratamientosDisponibles"
                    :key="t.id"
                    type="button"
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                    style="border-bottom:1px solid rgba(196,197,213,0.1)"
                    @mousedown.prevent="toggleTratamiento(t.id); tpTratamientosSearch = ''"
                  >
                    <span class="font-medium" style="color:var(--color-on-surface)">{{ t.nombre }}</span>
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="text-sm" style="color:var(--color-outline)">No hay tratamientos configurados aún.</p>
          </div>

          <!-- Laboratorio — autocomplete -->
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Laboratorio *</label>
            <div class="relative">
              <input
                v-model="tpLabSearch"
                :disabled="!!tpSelectedLab"
                type="text"
                placeholder="Buscar laboratorio…"
                class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
                style="border-radius:12px;border:1px solid var(--color-outline-variant);color:var(--color-on-surface);background-color:var(--color-surface-container-low)"
                @focus="tpShowLabDrop = true"
                @blur="onLabBlur"
              />
              <div
                v-if="tpShowLabDrop && tpFilteredLabs.length"
                class="absolute left-0 right-0 z-30 mt-1 shadow-lg overflow-hidden"
                style="border-radius:12px;background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);max-height:200px;overflow-y:auto"
              >
                <button
                  v-for="lab in tpFilteredLabs"
                  :key="lab.id"
                  type="button"
                  class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                  style="border-bottom:1px solid rgba(196,197,213,0.1)"
                  @mousedown.prevent="selectLab(lab.id, lab.nombre)"
                >
                  <span class="font-medium" style="color:var(--color-on-surface)">{{ lab.nombre }}</span>
                  <span class="ml-2 text-xs" style="color:var(--color-outline)">RUC {{ lab.ruc }}</span>
                </button>
              </div>
              <div v-if="tpShowLabDrop && !tpFilteredLabs.length" class="absolute left-0 right-0 z-30 mt-1 px-4 py-3 text-sm rounded-xl"
                style="background-color:var(--color-surface-container-lowest);border:1px solid var(--color-outline-variant);color:var(--color-outline)">
                No hay laboratorios configurados.
              </div>
              <div v-if="tpSelectedLab" class="mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl"
                style="background:#F0FDF4;border:1px solid #BBF7D0">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:18px;color:#166534">science</span>
                  <div>
                    <p class="text-sm font-semibold" style="color:#166534">{{ tpSelectedLab.nombre }}</p>
                    <p class="text-xs" style="color:#4ADE80">RUC {{ tpSelectedLab.ruc }}</p>
                  </div>
                </div>
                <button @click="clearLab" class="p-1 rounded-full hover:bg-green-100 transition-colors">
                  <span class="material-symbols-outlined" style="font-size:16px;color:#166534">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observaciones</label>
            <textarea
              v-model="tpForm.observacion"
              rows="2"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"
            ></textarea>
          </div>

          <p v-if="tpError" class="text-xs font-medium" style="color:var(--color-error)">{{ tpError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showTP = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isCreandoTP" @click="submitTP">
          {{ isCreandoTP ? "Guardando…" : "Registrar pedido" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
