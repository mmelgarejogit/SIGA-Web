<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type Producto, getProductos, registrarConteo } from "@/services/inventarioService"

const router = useRouter()

// ── Carga de productos ────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const isLoading = ref(true)
const loadError = ref("")

async function load() {
  try {
    const result = await getProductos({ pageSize: 500, isActive: true })
    productos.value = result.items
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar productos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Filtros ───────────────────────────────────────────────────────────────────

const categoriasSeleccionadas = ref<string[]>([])
const search = ref("")

const categoriasDisponibles = computed(() => {
  const cats = [...new Set(productos.value.map((p) => p.categoria).filter(Boolean))] as string[]
  return cats.sort().map((c) => ({ value: c, label: c }))
})

const productosFiltrados = computed(() => {
  let result = productos.value

  if (categoriasSeleccionadas.value.length > 0)
    result = result.filter((p) => categoriasSeleccionadas.value.includes(p.categoria))

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    result = result.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
    )
  }

  return result
})

// ── Cantidades contadas ───────────────────────────────────────────────────────

// null = producto no contado (excluido del conteo)
const cantidades = ref<Record<number, number | null>>({})

function getCantidad(id: number): string {
  const v = cantidades.value[id]
  return v == null ? "" : String(v)
}

function setCantidad(id: number, raw: string) {
  if (raw === "") {
    cantidades.value[id] = null
  } else {
    const n = Number(raw)
    if (!isNaN(n) && n >= 0) cantidades.value[id] = n
  }
}

// productosIncluidos cuenta sobre TODOS los filtrados, no solo la página visible
const productosIncluidos = computed(() =>
  productosFiltrados.value.filter((p) => cantidades.value[p.id] != null),
)

// ── Paginación ────────────────────────────────────────────────────────────────

const page = ref(1)
const PAGE_SIZE = 20

const totalPages = computed(() => Math.max(1, Math.ceil(productosFiltrados.value.length / PAGE_SIZE)))

const productosPaginados = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return productosFiltrados.value.slice(start, start + PAGE_SIZE)
})

watch([categoriasSeleccionadas, search], () => { page.value = 1 })

// ── Envío ─────────────────────────────────────────────────────────────────────

const observaciones = ref("")
const isSaving = ref(false)
const saveError = ref("")

async function submit() {
  saveError.value = ""

  const items = productosIncluidos.value.map((p) => ({
    productoId: p.id,
    cantidadFisica: cantidades.value[p.id]!,
  }))

  if (items.length === 0) {
    saveError.value = "Ingresá la cantidad contada de al menos un producto."
    return
  }

  isSaving.value = true
  try {
    await registrarConteo({ items, observaciones: observaciones.value.trim() || undefined })
    router.push("/stock")
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al registrar el inventario."
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
      <div class="p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="rounded-2xl p-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <p class="font-semibold">{{ loadError }}</p>
          <BaseButton variant="secondary" size="default" class="mt-3" @click="router.push('/stock')">Volver</BaseButton>
        </div>

        <template v-else>

          <!-- Header -->
          <div class="mb-8">
            <button
              @click="router.push('/stock')"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Niveles de Stock
            </button>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nuevo Conteo de Inventario</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Seleccioná las categorías a contar, ingresá las cantidades físicas y dejá en blanco los productos que no contaste.
            </p>
          </div>

          <!-- Error de guardado -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Filtros y búsqueda -->
          <div class="rounded-2xl p-5 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Segmentación</h3>
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3 flex-wrap">
                <FilterChips
                  :model-value="categoriasSeleccionadas"
                  :options="categoriasDisponibles"
                  placeholder="Todas las categorías"
                  @update:model-value="categoriasSeleccionadas = $event"
                />
              </div>
              <SearchInput
                :model-value="search"
                placeholder="Buscar producto o SKU..."
                class="w-72"
                @update:model-value="search = $event"
              />
            </div>

            <!-- Resumen -->
            <div class="flex items-center gap-6 mt-4 pt-4"
              style="border-top: 1px solid rgba(196,197,213,0.15)">
              <div class="text-sm" style="color: var(--color-on-surface-variant)">
                <span class="font-bold" style="color: var(--color-on-surface)">{{ productosFiltrados.length }}</span>
                producto{{ productosFiltrados.length !== 1 ? "s" : "" }} en vista
              </div>
              <div class="text-sm" style="color: var(--color-on-surface-variant)">
                <span class="font-bold" :style="productosIncluidos.length > 0 ? 'color: var(--color-primary)' : 'color: var(--color-outline)'">
                  {{ productosIncluidos.length }}
                </span>
                incluido{{ productosIncluidos.length !== 1 ? "s" : "" }} en el conteo
              </div>
            </div>
          </div>

          <!-- Tabla de productos -->
          <div class="rounded-2xl mb-6 overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">

            <div class="px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Productos</h3>
              <p class="text-xs mt-0.5" style="color: var(--color-outline)">
                Dejá el campo en blanco para excluir el producto del conteo.
              </p>
            </div>

            <div v-if="productosFiltrados.length === 0" class="px-6 py-16 text-center"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-4xl mb-2" style="display: block">inventory_2</span>
              <p class="text-sm font-medium">No hay productos para las categorías seleccionadas.</p>
            </div>

            <table v-else class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 160px">Categoría</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 160px">Cant. contada</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 120px">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in productosPaginados"
                  :key="p.id"
                  style="border-top: 1px solid rgba(196,197,213,0.12)"
                  :style="cantidades[p.id] != null ? 'background-color: #F8FAFF' : ''"
                >
                  <td class="px-6 py-3">
                    <p class="font-semibold" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                    <p v-if="p.sku" class="text-xs" style="color: var(--color-outline)">SKU {{ p.sku }}</p>
                  </td>
                  <td class="px-6 py-3">
                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant)">
                      {{ p.categoria || "—" }}
                    </span>
                  </td>
                  <td class="px-6 py-3">
                    <input
                      :value="getCantidad(p.id)"
                      @input="setCantidad(p.id, ($event.target as HTMLInputElement).value)"
                      type="number"
                      min="0"
                      placeholder="Sin contar"
                      class="w-full px-3 py-2 rounded-xl text-sm text-center outline-none transition-all"
                      :style="cantidades[p.id] != null
                        ? 'border: 1.5px solid var(--color-primary); color: var(--color-on-surface); background-color: #fff; font-weight: 700'
                        : 'border: 1px solid var(--color-outline-variant); color: var(--color-outline); background-color: var(--color-surface-container-low)'"
                    />
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span v-if="cantidades[p.id] == null" class="text-xs" style="color: var(--color-outline)">—</span>
                    <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style="background-color: #dcfce7; color: #166534">
                      <span class="material-symbols-outlined" style="font-size: 13px">check</span>
                      Contado
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Paginación -->
            <div class="px-6 py-4 flex items-center justify-between"
              style="border-top: 1px solid rgba(196,197,213,0.12)">
              <p class="text-sm" style="color: var(--color-on-surface-variant)">
                Mostrando
                <span class="font-semibold" style="color: var(--color-on-surface)">
                  {{ Math.min((page - 1) * PAGE_SIZE + 1, productosFiltrados.length) }}–{{ Math.min(page * PAGE_SIZE, productosFiltrados.length) }}
                </span>
                de <span class="font-semibold" style="color: var(--color-on-surface)">{{ productosFiltrados.length }}</span>
                producto{{ productosFiltrados.length !== 1 ? "s" : "" }}
              </p>
              <div v-if="totalPages > 1" class="flex gap-2">
                <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--">Anterior</BaseButton>
                <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++">Siguiente</BaseButton>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div class="rounded-2xl p-6 mb-24"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">
            <h3 class="text-xl font-extrabold mb-3" style="color: var(--color-primary)">Observaciones</h3>
            <textarea
              v-model="observaciones"
              rows="3"
              placeholder="Ej. Conteo parcial de lentes — categoría contactología"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)"
            />
          </div>

          <!-- Footer sticky -->
          <div class="flex items-center justify-between gap-3 fixed bottom-0 py-4 px-8 z-40"
            :style="`left: var(--sidebar-width); right: 0; background-color: var(--color-background); border-top: 1px solid rgba(196,197,213,0.2)`">
            <div class="text-sm" style="color: var(--color-on-surface-variant)">
              <template v-if="productosIncluidos.length > 0">
                <span class="font-semibold" style="color: var(--color-on-surface)">{{ productosIncluidos.length }}</span>
                producto{{ productosIncluidos.length !== 1 ? "s" : "" }} incluido{{ productosIncluidos.length !== 1 ? "s" : "" }} en el conteo
              </template>
              <template v-else>
                Ningún producto incluido todavía
              </template>
            </div>
            <div class="flex items-center gap-3">
              <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="router.push('/stock')">
                Cancelar
              </BaseButton>
              <BaseButton
                variant="primary"
                size="lg"
                :disabled="isSaving || productosIncluidos.length === 0"
                @click="submit"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">fact_check</span>
                {{ isSaving ? "Registrando…" : "Confirmar Conteo" }}
              </BaseButton>
            </div>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
