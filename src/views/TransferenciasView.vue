<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import SearchInput from "@/components/SearchInput.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import { inputStyle } from "@/composables/useFieldStyles"
import {
  type Transferencia,
  getTransferencias,
  createTransferencia,
  gestionarTransferencia,
} from "@/services/transferenciaService"
import { type Sucursal, getSucursales } from "@/services/sucursalService"
import { type Producto, getProductos } from "@/services/inventarioService"

const auth = useAuthStore()
const propiaSucursalId = computed(() => auth.user?.sucursalId ?? null)

const transferencias = ref<Transferencia[]>([])
const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const loadError = ref("")

function estadoStyle(estado: string) {
  switch (estado) {
    case "Aceptada":  return { bg: "var(--color-success-container)", text: "var(--color-on-success-container)" }
    case "Rechazada": return { bg: "var(--color-error-container)", text: "var(--color-on-error-container)" }
    default:          return { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)" }
  }
}

// El destino (mi sucursal, o admin global) puede aceptar/rechazar una transferencia pendiente.
function puedeGestionar(t: Transferencia): boolean {
  if (t.estado !== "Pendiente") return false
  return propiaSucursalId.value === null || propiaSucursalId.value === t.sucursalDestinoId
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [tr, su] = await Promise.all([getTransferencias(), getSucursales(true)])
    transferencias.value = tr
    sucursales.value = su
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar transferencias."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Paginación (design-system §14) ───────────────────────────────────────────────
const PAGE_SIZE = 10
const currentPage = ref(1)
const totalCount  = computed(() => transferencias.value.length)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart  = computed(() => (totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1))
const rangeEnd    = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))
const transferenciasPaged = computed(() =>
  transferencias.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
)
watch(transferencias, () => {
  // Al recargar (p. ej. tras aceptar/rechazar) clampear la página al nuevo total.
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

// ── Gestionar (aceptar / rechazar) ───────────────────────────────────────────
const gestionandoId = ref<number | null>(null)
async function gestionar(t: Transferencia, aceptar: boolean) {
  gestionandoId.value = t.id
  try {
    await gestionarTransferencia(t.id, aceptar)
    await load()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al gestionar la transferencia."
  } finally {
    gestionandoId.value = null
  }
}

// ── Nueva transferencia ──────────────────────────────────────────────────────
const showCreate = ref(false)
const isSaving = ref(false)
const createError = ref("")
const form = reactive({
  sucursalOrigenId: null as number | null,
  sucursalDestinoId: null as number | null,
  observaciones: "",
})
const lineas = ref<{ productoId: number; productoNombre: string; cantidad: number }[]>([])

const productoSearch = ref("")
const productos = ref<Producto[]>([])
const isSearchingProd = ref(false)

const destinos = computed(() =>
  sucursales.value.filter(s => s.id !== (propiaSucursalId.value ?? form.sucursalOrigenId)),
)

const sucursalSelectOptions = computed(() => [
  { value: null as number | null, label: "— Seleccionar —" },
  ...sucursales.value.map(s => ({ value: s.id, label: s.nombre })),
])

const destinoSelectOptions = computed(() => [
  { value: null as number | null, label: "— Seleccionar —" },
  ...destinos.value.map(s => ({ value: s.id, label: s.nombre })),
])

function openCreate() {
  form.sucursalOrigenId = propiaSucursalId.value
  form.sucursalDestinoId = null
  form.observaciones = ""
  lineas.value = []
  productoSearch.value = ""
  productos.value = []
  createError.value = ""
  showCreate.value = true
}

async function buscarProductos() {
  if (!productoSearch.value.trim()) { productos.value = []; return }
  isSearchingProd.value = true
  try {
    const res = await getProductos({ search: productoSearch.value.trim(), pageSize: 8 })
    productos.value = res.items
  } catch { /* silencioso */ } finally {
    isSearchingProd.value = false
  }
}

function addLinea(p: Producto) {
  if (lineas.value.some(l => l.productoId === p.id)) return
  lineas.value.push({ productoId: p.id, productoNombre: p.nombre, cantidad: 1 })
  productoSearch.value = ""
  productos.value = []
}

function removeLinea(productoId: number) {
  lineas.value = lineas.value.filter(l => l.productoId !== productoId)
}

async function submitCreate() {
  createError.value = ""
  if (!form.sucursalDestinoId) { createError.value = "Seleccioná la sucursal de destino."; return }
  if (propiaSucursalId.value === null && !form.sucursalOrigenId) { createError.value = "Seleccioná la sucursal de origen."; return }
  if (lineas.value.length === 0) { createError.value = "Agregá al menos un producto."; return }
  if (lineas.value.some(l => l.cantidad <= 0)) { createError.value = "Las cantidades deben ser mayores a cero."; return }

  isSaving.value = true
  try {
    await createTransferencia({
      sucursalOrigenId: propiaSucursalId.value ?? form.sucursalOrigenId ?? undefined,
      sucursalDestinoId: form.sucursalDestinoId,
      observaciones: form.observaciones.trim() || undefined,
      items: lineas.value.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
    })
    showCreate.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear la transferencia."
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Transferencias de Stock</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Mové mercadería entre sucursales.
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Transferencia
          </BaseButton>
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else-if="transferencias.length === 0" class="py-16 text-center rounded-2xl"
          style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline-variant)">sync_alt</span>
          <p class="mt-3 text-sm font-medium" style="color: var(--color-outline)">No hay transferencias registradas.</p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <article v-for="t in transferenciasPaged" :key="t.id" class="rounded-2xl p-5"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-2 text-sm font-bold" style="color: var(--color-on-surface)">
                <span>{{ t.sucursalOrigenNombre }}</span>
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">arrow_forward</span>
                <span>{{ t.sucursalDestinoNombre }}</span>
              </div>
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="`background-color: ${estadoStyle(t.estado).bg}; color: ${estadoStyle(t.estado).text}`">
                {{ t.estado }}
              </span>
            </div>

            <div class="flex flex-wrap gap-2 mb-3">
              <span v-for="it in t.items" :key="it.productoId"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
                {{ it.productoNombre }} <strong style="color: var(--color-on-surface)">×{{ it.cantidad }}</strong>
              </span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs" style="color: var(--color-outline)">
                {{ t.fecha }} · {{ t.creadoPorNombre || "—" }}
                <template v-if="t.observaciones"> · {{ t.observaciones }}</template>
              </p>
              <div v-if="puedeGestionar(t)" class="flex items-center gap-2">
                <BaseButton variant="secondary" size="sm" :disabled="gestionandoId === t.id" @click="gestionar(t, false)">
                  Rechazar
                </BaseButton>
                <BaseButton variant="primary" size="sm" :disabled="gestionandoId === t.id" @click="gestionar(t, true)">
                  Aceptar
                </BaseButton>
              </div>
            </div>
          </article>

          <div v-if="totalCount > 0" class="rounded-lg overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
            <PaginationFooter
              :current-page="currentPage"
              :total-pages="totalPages"
              :range-start="rangeStart"
              :range-end="rangeEnd"
              :total="totalCount"
              noun="transferencias"
              @update:current-page="currentPage = $event"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Modal Nueva transferencia -->
    <BaseModal :show="showCreate" title="Nueva Transferencia" size="lg" @close="showCreate = false">
      <div class="space-y-4">
        <div v-if="createError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>

        <div v-if="propiaSucursalId === null" class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Origen *</label>
          <SearchableSelect v-model="form.sucursalOrigenId" :options="sucursalSelectOptions" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Destino *</label>
          <SearchableSelect v-model="form.sucursalDestinoId" :options="destinoSelectOptions" />
        </div>

        <!-- Productos -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Productos</label>
          <SearchInput v-model="productoSearch" placeholder="Buscar producto..." @update:model-value="buscarProductos" />
          <div v-if="productos.length > 0" class="rounded-xl overflow-hidden mt-1"
            style="border: 1px solid var(--color-hairline)">
            <button v-for="p in productos" :key="p.id" type="button"
              class="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-surface-container-low"
              style="color: var(--color-on-surface)" @click="addLinea(p)">
              {{ p.nombre }}
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">add</span>
            </button>
          </div>
          <p v-else-if="isSearchingProd" class="text-xs py-1" style="color: var(--color-outline)">Buscando…</p>
        </div>

        <!-- Líneas agregadas -->
        <div v-if="lineas.length > 0" class="flex flex-col gap-2">
          <div v-for="l in lineas" :key="l.productoId"
            class="flex items-center gap-3 px-3 py-2 rounded-xl"
            style="background-color: var(--color-surface-container-low)">
            <span class="flex-1 text-sm font-semibold" style="color: var(--color-on-surface)">{{ l.productoNombre }}</span>
            <input v-model.number="l.cantidad" type="number" min="1"
              class="w-20 px-3 h-10 text-sm outline-none appearance-none shadow-none"
              style="border-radius: 10px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-lowest)" />
            <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center"
              style="background-color: var(--color-error-container); color: var(--color-error)" @click="removeLinea(l.productoId)">
              <span class="material-symbols-outlined" style="font-size: 16px">close</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="form.observaciones" rows="2"
            class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
            :style="inputStyle()" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreate = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">
            {{ isSaving ? "Creando..." : "Crear transferencia" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
