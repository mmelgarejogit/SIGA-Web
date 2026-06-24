<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import {
  type Producto, type Tratamiento, type TipoLente,
  getProductos, getTratamientos, getTiposLente,
} from "@/services/inventarioService"
import { type ProveedorSimple, getLaboratorios } from "@/services/comprasService"
import type { OpticaState } from "@/composables/optica"

const props = defineProps<{ state: OpticaState }>()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const allArmazones  = ref<Producto[]>([])
const allTratam     = ref<Tratamiento[]>([])
const allLabs       = ref<ProveedorSimple[]>([])
const allTipos      = ref<TipoLente[]>([])

onMounted(async () => {
  const [arm, trat, labs, tipos] = await Promise.allSettled([
    getProductos({ pageSize: 500, tipoCategoria: "Armazon" }),
    getTratamientos(),
    getLaboratorios(),
    getTiposLente(),
  ])
  if (arm.status === "fulfilled")   allArmazones.value = arm.value.items.filter(p => p.isActive)
  if (trat.status === "fulfilled")  allTratam.value    = trat.value.filter(t => t.isActive)
  if (labs.status === "fulfilled")  allLabs.value      = labs.value
  if (tipos.status === "fulfilled") allTipos.value     = tipos.value.filter(t => t.isActive)
})

// ── Armazón ──────────────────────────────────────────────────────────────────
const armazonSearch = ref("")
const showArmazonDrop = ref(false)
const filteredArmazones = computed(() => {
  const q = armazonSearch.value.trim().toLowerCase()
  return (q ? allArmazones.value.filter(p => p.nombre.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)) : allArmazones.value).slice(0, 8)
})
function selectArmazon(p: Producto) {
  props.state.armazon = p
  props.state.armazonPrecio = p.precioVenta
  armazonSearch.value = ""
  showArmazonDrop.value = false
}
function clearArmazon() { props.state.armazon = null; props.state.armazonPrecio = 0 }
function toggleArmazonCliente() {
  props.state.armazonDelCliente = !props.state.armazonDelCliente
  if (props.state.armazonDelCliente) clearArmazon()
}

// ── Lente (diseño + precio) ──────────────────────────────────────────────────
// Elegir el diseño autocompleta el precio sugerido (PrecioBase), editable por venta.
function selectTipoLente(id: number | null) {
  props.state.tipoLenteId = id
  const t = allTipos.value.find(x => x.id === id)
  props.state.tipoLenteNombre = t?.nombre ?? ""
  if (t) props.state.lentePrecio = t.precioBase
}

// ── Tratamientos ─────────────────────────────────────────────────────────────
const isTratSel = (t: Tratamiento) => props.state.tratamientos.some(x => x.tratamiento.id === t.id)
function toggleTrat(t: Tratamiento) {
  const idx = props.state.tratamientos.findIndex(x => x.tratamiento.id === t.id)
  if (idx >= 0) props.state.tratamientos.splice(idx, 1)
  else props.state.tratamientos.push({ tratamiento: t, precio: t.precio })
}

// ── Laboratorio ──────────────────────────────────────────────────────────────
const labSearch = ref("")
const showLabDrop = ref(false)
const filteredLabs = computed(() => {
  const q = labSearch.value.trim().toLowerCase()
  return (q ? allLabs.value.filter(l => l.nombre.toLowerCase().includes(q)) : allLabs.value).slice(0, 8)
})
function selectLab(l: ProveedorSimple) { props.state.laboratorio = l; labSearch.value = ""; showLabDrop.value = false }
function clearLab() { props.state.laboratorio = null }

const blur = (fn: () => void) => setTimeout(fn, 150)
const dropStyle = "border-radius: 12px; background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); max-height: 200px; overflow-y: auto;"
const inputStyle = "border-radius: 12px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
const priceStyle = "border-radius: 8px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-lowest);"
</script>

<template>
  <div class="rounded-2xl p-6 space-y-5" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
    <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Trabajo óptico</h3>

    <!-- Armazón -->
    <div>
      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Armazón</label>
      <div v-if="state.armazon" class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background: #EFF6FF; border: 1px solid #BFDBFE">
        <span class="material-symbols-outlined" style="color:#1D4ED8">eyeglasses</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate" style="color:#1D4ED8">{{ state.armazon.nombre }}</p>
          <p class="text-xs" style="color:#3B82F6">Stock: {{ state.armazon.stockActual }}</p>
        </div>
        <div class="flex items-center gap-1 text-xs" style="color:#3B82F6">Gs.
          <input v-model.number="state.armazonPrecio" type="number" min="0" class="w-28 px-2 py-1 text-sm text-right" :style="priceStyle" />
        </div>
        <button type="button" @click="clearArmazon" class="p-1 rounded-full hover:bg-blue-100"><span class="material-symbols-outlined" style="font-size:18px;color:#3B82F6">close</span></button>
      </div>
      <div v-else-if="!state.armazonDelCliente" class="relative">
        <input v-model="armazonSearch" type="text" placeholder="Buscar armazón…" class="w-full px-4 h-12 text-sm outline-none" :style="inputStyle"
          @focus="showArmazonDrop = true" @blur="blur(() => showArmazonDrop = false)" />
        <div v-if="showArmazonDrop && filteredArmazones.length" class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden" :style="dropStyle">
          <button v-for="p in filteredArmazones" :key="p.id" type="button" class="w-full text-left px-4 py-2.5 text-sm flex justify-between hover:bg-surface-container-low" style="border-bottom:1px solid rgba(196,197,213,0.1)" @mousedown.prevent="selectArmazon(p)">
            <span class="font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</span>
            <span class="text-xs" style="color: var(--color-primary)">{{ formatPrice(p.precioVenta) }}</span>
          </button>
        </div>
        <div v-if="showArmazonDrop && !filteredArmazones.length" class="absolute left-0 right-0 z-20 mt-1 px-4 py-3 text-xs" :style="dropStyle" style="color: var(--color-outline)">
          No hay armazones. Cargá productos en una categoría tipo "Armazón".
        </div>
      </div>
      <label class="flex items-center gap-2 mt-2 text-sm cursor-pointer" style="color: var(--color-on-surface-variant)">
        <input type="checkbox" :checked="state.armazonDelCliente" @change="toggleArmazonCliente" class="w-4 h-4 rounded" />
        El cliente trae su propio armazón
      </label>
    </div>

    <!-- Lente (diseño + precio) -->
    <div>
      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Lente</label>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style="font-size:18px;color:var(--color-outline)">lens</span>
          <select
            :value="state.tipoLenteId ?? ''"
            @change="selectTipoLente(($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
            class="w-full pl-10 pr-4 h-12 text-sm outline-none appearance-none" :style="inputStyle">
            <option value="">Seleccioná el diseño…</option>
            <option v-for="t in allTipos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
          </select>
        </div>
        <div class="flex items-center gap-1 text-xs" style="color: var(--color-on-surface-variant)">Gs.
          <input v-model.number="state.lentePrecio" type="number" min="0" class="w-28 px-2 py-1 text-sm text-right" :style="priceStyle" />
        </div>
      </div>
      <p v-if="!allTipos.length" class="mt-1.5 text-xs" style="color: var(--color-outline)">
        No hay diseños de lente. Creá uno en Catálogo → Tipos de Lente.
      </p>
    </div>

    <!-- Tratamientos -->
    <div>
      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Tratamientos</label>
      <div v-if="!allTratam.length" class="text-sm" style="color: var(--color-outline)">No hay tratamientos configurados.</div>
      <div v-else class="flex flex-wrap gap-2">
        <template v-for="t in allTratam" :key="t.id">
          <button v-if="!isTratSel(t)" type="button" @click="toggleTrat(t)"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
            style="background: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
            <span class="material-symbols-outlined" style="font-size:14px">add</span>{{ t.nombre }}
          </button>
        </template>
      </div>
      <div v-if="state.tratamientos.length" class="mt-2 space-y-2">
        <div v-for="sel in state.tratamientos" :key="sel.tratamiento.id" class="flex items-center gap-3 px-3 py-2 rounded-xl" style="background:#EDE9FE">
          <span class="flex-1 text-sm font-semibold" style="color:#5B21B6">{{ sel.tratamiento.nombre }}</span>
          <div class="flex items-center gap-1 text-xs" style="color:#5B21B6">Gs.
            <input v-model.number="sel.precio" type="number" min="0" class="w-24 px-2 py-1 text-sm text-right" :style="priceStyle" />
          </div>
          <button type="button" @click="toggleTrat(sel.tratamiento)" class="p-1 rounded-full hover:bg-violet-100"><span class="material-symbols-outlined" style="font-size:16px;color:#5B21B6">close</span></button>
        </div>
      </div>
    </div>

    <!-- Laboratorio -->
    <div>
      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Laboratorio</label>
      <div v-if="state.laboratorio" class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant)">
        <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant)">science</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate" style="color: var(--color-on-surface)">{{ state.laboratorio.nombre }}</p>
          <p class="text-xs" style="color: var(--color-outline)">RUC {{ state.laboratorio.ruc }}</p>
        </div>
        <button type="button" @click="clearLab" class="p-1 rounded-full hover:bg-surface-container-high"><span class="material-symbols-outlined" style="font-size:18px;color: var(--color-outline)">close</span></button>
      </div>
      <div v-else class="relative">
        <input v-model="labSearch" type="text" placeholder="Buscar laboratorio…" class="w-full px-4 h-12 text-sm outline-none" :style="inputStyle"
          @focus="showLabDrop = true" @blur="blur(() => showLabDrop = false)" />
        <div v-if="showLabDrop && filteredLabs.length" class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden" :style="dropStyle">
          <button v-for="l in filteredLabs" :key="l.id" type="button" class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low" style="border-bottom:1px solid rgba(196,197,213,0.1)" @mousedown.prevent="selectLab(l)">
            <span class="font-medium" style="color: var(--color-on-surface)">{{ l.nombre }}</span>
            <span class="ml-2 text-xs" style="color: var(--color-outline)">RUC {{ l.ruc }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
