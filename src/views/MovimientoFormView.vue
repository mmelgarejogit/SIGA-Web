<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from "vue"
import { useRouter } from "vue-router"
import { inputStyle } from "@/composables/useFieldStyles"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  type Producto,
  type MotivoMovimiento,
  type CreateMovimientoRequest,
  getProductos,
  getMotivosMovimiento,
  registrarMovimiento,
} from "@/services/inventarioService"

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_URL ?? ""

// ── Carga inicial ──────────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const motivos = ref<MotivoMovimiento[]>([])
const isLoading = ref(true)
const loadError = ref("")

// ── Selector de producto ───────────────────────────────────────────────────────

const productoSeleccionado = ref<Producto | null>(null)
const selectorOpen = ref(false)
const productoSearch = ref("")
const selectorRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const productosFiltrados = computed(() => {
  const q = productoSearch.value.trim().toLowerCase()
  if (!q) return productos.value
  return productos.value.filter((p) => p.nombre.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))
})

async function openSelector() {
  selectorOpen.value = true
  productoSearch.value = ""
  await new Promise((r) => setTimeout(r, 0))
  searchInputRef.value?.focus()
}

function seleccionarProducto(p: Producto) {
  productoSeleccionado.value = p
  selectorOpen.value = false
  movForm.tipo = "Entrada"
  movForm.cantidad = 1
  movForm.motivoMovimientoId = undefined
  movError.value = ""
}

function limpiarProducto() {
  productoSeleccionado.value = null
  selectorOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (selectorRef.value && !selectorRef.value.contains(e.target as Node)) {
    selectorOpen.value = false
  }
}

// ── Formulario de movimiento ──────────────────────────────────────────────────

function nowLocalIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const movForm = reactive<CreateMovimientoRequest & { fechaMovimientoLocal: string }>({
  tipo: "Entrada",
  cantidad: 1,
  fechaMovimientoLocal: nowLocalIso(),
})
const isSaving = ref(false)
const movError = ref("")

const motivoOptions = computed(() =>
  motivos.value
    .filter((m) => m.tipo === movForm.tipo || m.tipo === "Ambos")
    .map((m) => ({ value: m.id, label: m.nombre })),
)

function onTipoChange(tipo: "Entrada" | "Salida") {
  movForm.tipo = tipo
  const valid = motivos.value.find(
    (m) => m.id === movForm.motivoMovimientoId && (m.tipo === tipo || m.tipo === "Ambos"),
  )
  if (!valid) movForm.motivoMovimientoId = undefined
}

async function submit() {
  if (!productoSeleccionado.value) return
  isSaving.value = true
  movError.value = ""
  try {
    await registrarMovimiento(productoSeleccionado.value.id, {
      tipo: movForm.tipo,
      cantidad: movForm.cantidad,
      motivoMovimientoId: movForm.motivoMovimientoId,
      fechaMovimiento: movForm.fechaMovimientoLocal
        ? new Date(movForm.fechaMovimientoLocal).toISOString()
        : undefined,
    })
    router.push("/stock/movimientos")
  } catch (err: unknown) {
    movError.value = err instanceof Error ? err.message : "Error al registrar movimiento."
  } finally {
    isSaving.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  document.addEventListener("mousedown", onClickOutside)
  try {
    const [prodR, movs] = await Promise.all([
      getProductos({ pageSize: 500 }),
      getMotivosMovimiento(),
    ])
    productos.value = prodR.items.filter((p) => p.isActive)
    motivos.value = movs.filter((m) => m.isActive)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => document.removeEventListener("mousedown", onClickOutside))
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="rounded-2xl p-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <p class="font-semibold">{{ loadError }}</p>
          <BaseButton variant="secondary" size="default" class="mt-3" @click="router.push('/stock/movimientos')">Volver</BaseButton>
        </div>

        <template v-else>

          <!-- Breadcrumb + Título -->
          <div class="mb-8">
            <button
              @click="router.push('/stock/movimientos')"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Movimientos de Stock
            </button>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nuevo Movimiento</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Seleccioná un producto, elegí el tipo y completá los datos del movimiento.
            </p>
          </div>

          <!-- Error de guardado -->
          <div v-if="movError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ movError }}
          </div>

          <!-- Card: Seleccionar producto -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Producto</h3>

            <div ref="selectorRef" class="relative">

              <!-- Trigger: producto seleccionado -->
              <div v-if="productoSeleccionado"
                class="flex items-center gap-3 px-4 py-3 rounded-xl"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low)">
                <div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                  style="background-color: var(--color-surface-container-high)">
                  <img v-if="productoSeleccionado.imagenUrl"
                    :src="API_BASE + productoSeleccionado.imagenUrl"
                    :alt="productoSeleccionado.nombre"
                    class="w-full h-full object-cover" />
                  <span v-else class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">inventory_2</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ productoSeleccionado.nombre }}</p>
                  <p class="text-xs" style="color: var(--color-outline)">
                    {{ productoSeleccionado.categoria }}
                    <span v-if="productoSeleccionado.sku"> · SKU {{ productoSeleccionado.sku }}</span>
                    · Stock actual: <strong>{{ productoSeleccionado.stockActual }}</strong>
                  </p>
                </div>
                <span v-if="productoSeleccionado.bajoStock"
                  class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">Bajo stock</span>
                <button
                  @click="limpiarProducto"
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high)"
                  title="Cambiar producto"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">close</span>
                </button>
              </div>

              <!-- Trigger: sin producto -->
              <button v-else
                type="button"
                @click="openSelector"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                :style="selectorOpen
                  ? 'border: 1px solid var(--color-primary); background-color: var(--color-surface-container-low);'
                  : 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low);'"
              >
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-outline)">inventory_2</span>
                <span class="text-sm flex-1" style="color: var(--color-outline)">Seleccioná un producto…</span>
                <span class="material-symbols-outlined transition-transform"
                  :style="selectorOpen ? 'transform: rotate(180deg); color: var(--color-primary)' : 'color: var(--color-outline)'"
                  style="font-size: 18px">expand_more</span>
              </button>

              <!-- Dropdown del selector -->
              <div v-if="selectorOpen && !productoSeleccionado"
                class="absolute left-0 right-0 top-full mt-1.5 rounded-2xl z-50 overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); box-shadow: var(--shadow-lg)">

                <!-- Búsqueda -->
                <div class="flex items-center gap-2 px-4 py-3"
                  style="border-bottom: 1px solid var(--color-hairline)">
                  <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px; color: var(--color-outline)">search</span>
                  <input
                    ref="searchInputRef"
                    v-model="productoSearch"
                    type="text"
                    placeholder="Buscar por nombre o SKU…"
                    class="flex-1 text-sm outline-none bg-transparent"
                    style="color: var(--color-on-surface)"
                    @keydown.esc="selectorOpen = false"
                  />
                </div>

                <!-- Lista de productos -->
                <div style="max-height: 320px; overflow-y: auto">
                  <p v-if="productosFiltrados.length === 0" class="px-4 py-6 text-sm text-center"
                    style="color: var(--color-outline)">Sin productos encontrados</p>
                  <button
                    v-for="p in productosFiltrados"
                    :key="p.id"
                    type="button"
                    @click="seleccionarProducto(p)"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-surface-container-low"
                  >
                    <div class="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                      style="background-color: var(--color-surface-container-high)">
                      <img v-if="p.imagenUrl" :src="API_BASE + p.imagenUrl" :alt="p.nombre" class="w-full h-full object-cover" />
                      <span v-else class="material-symbols-outlined" style="font-size: 15px; color: var(--color-primary)">inventory_2</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                      <p class="text-xs" style="color: var(--color-outline)">
                        {{ p.categoria }}<span v-if="p.sku"> · {{ p.sku }}</span>
                      </p>
                    </div>
                    <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span class="text-xs font-bold"
                        :style="p.bajoStock ? 'color: var(--color-on-warning-container)' : 'color: var(--color-on-surface-variant)'">
                        Stock: {{ p.stockActual }}
                      </span>
                      <span v-if="p.bajoStock" class="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style="background-color: var(--color-warning-container); color: var(--color-on-warning-container); font-size: 10px">↓ bajo</span>
                    </div>
                  </button>
                </div>

              </div>
            </div>
          </div>

          <!-- Card: Detalles del movimiento -->
          <div v-if="productoSeleccionado" class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-5" style="color: var(--color-primary)">Detalles del movimiento</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <!-- Fecha y hora -->
              <div class="col-span-2">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha y hora del movimiento *</label>
                <input
                  v-model="movForm.fechaMovimientoLocal"
                  type="datetime-local"
                  class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                  :style="inputStyle()"
                />
              </div>

              <!-- Tipo -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Tipo *</label>
                <div class="flex gap-2">
                  <button
                    v-for="tipo in ['Entrada', 'Salida'] as const"
                    :key="tipo"
                    type="button"
                    @click="onTipoChange(tipo)"
                    class="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                    :style="movForm.tipo === tipo
                      ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                      : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant); border: 1px solid var(--color-outline-variant);'"
                  >{{ tipo }}</button>
                </div>
              </div>

              <!-- Cantidad -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Cantidad *</label>
                <input
                  v-model.number="movForm.cantidad"
                  type="number"
                  min="1"
                  class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                  :style="inputStyle()"
                />
              </div>

              <!-- Motivo -->
              <div class="col-span-2">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo</label>
                <SearchableSelect
                  :model-value="movForm.motivoMovimientoId ?? null"
                  :options="motivoOptions"
                  null-label="Sin motivo"
                  placeholder="Seleccioná un motivo"
                  @update:model-value="movForm.motivoMovimientoId = $event !== null ? Number($event) : undefined"
                />
                <p class="text-xs mt-1.5" style="color: var(--color-outline)">
                  Solo se muestran los motivos aplicables al tipo de movimiento seleccionado.
                </p>
              </div>

            </div>
          </div>

          <!-- Footer sticky -->
          <div class="flex items-center justify-end gap-3 sticky bottom-0 py-4"
            style="background-color: var(--color-background)">
            <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="router.push('/stock/movimientos')">
              Cancelar
            </BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="!productoSeleccionado || isSaving" @click="submit">
              <span class="material-symbols-outlined" style="font-size: 18px">swap_horiz</span>
              {{ isSaving ? "Registrando…" : "Confirmar Movimiento" }}
            </BaseButton>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
