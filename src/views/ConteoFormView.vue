<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchInput from "@/components/SearchInput.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import { type Producto, getProductos, registrarConteo } from "@/services/inventarioService"

const router = useRouter()

// ── Carga de productos ────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const isLoading = ref(true)
const loadError = ref("")

async function load() {
  try {
    // Traemos TODO el catálogo: página 1 para saber cuántas hay y el resto en paralelo.
    // Así la tabla y las pills nunca quedan incompletas por más grande que sea el inventario.
    const PAGE = 200
    const first = await getProductos({ page: 1, pageSize: PAGE })
    const items = [...first.items]
    if (first.totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: first.totalPages - 1 }, (_, i) =>
          getProductos({ page: i + 2, pageSize: PAGE }),
        ),
      )
      for (const r of rest) items.push(...r.items)
    }
    productos.value = items.filter((p) => p.isActive)
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

// Categorías disponibles con la cantidad de productos de cada una (para las pills de alcance).
const categoriasConConteo = computed(() => {
  const map = new Map<string, number>()
  for (const p of productos.value) {
    if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }))
})

function toggleCategoria(cat: string) {
  const sel = categoriasSeleccionadas.value
  categoriasSeleccionadas.value = sel.includes(cat) ? sel.filter((c) => c !== cat) : [...sel, cat]
}
function seleccionarTodas() {
  categoriasSeleccionadas.value = []
}

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

const rangeStart = computed(() =>
  productosFiltrados.value.length === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, productosFiltrados.value.length))

// Progreso del conteo sobre el conjunto filtrado ("en esta vista").
const progresoPct = computed(() =>
  productosFiltrados.value.length === 0
    ? 0
    : Math.round((productosIncluidos.value.length / productosFiltrados.value.length) * 100),
)

watch([categoriasSeleccionadas, search], () => { page.value = 1 })

// ── PDF planilla en blanco ────────────────────────────────────────────────────

function descargarPlanilla() {
  const lista = productosFiltrados.value
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const PRIMARY: [number, number, number] = [0, 40, 142]
  const WHITE: [number, number, number] = [255, 255, 255]
  const GRAY: [number, number, number] = [107, 114, 128]

  // Encabezado
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, 210, 28, "F")
  doc.setTextColor(...WHITE)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("PLANILLA DE INVENTARIO FÍSICO", 15, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-PY")}`, 15, 20)
  doc.text(`Total de productos: ${lista.length}`, 210 - 15, 20, { align: "right" })

  autoTable(doc, {
    startY: 34,
    margin: { left: 15, right: 15 },
    head: [["#", "Producto", "SKU", "Categoría", "Cantidad contada"]],
    body: lista.map((p, i) => [
      (i + 1).toString(),
      p.nombre,
      p.sku ?? "—",
      p.categoria ?? "—",
      "",
    ]),
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5, minCellHeight: 10 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28 },
      3: { cellWidth: 32 },
      4: { cellWidth: 36, halign: "center" },
    },
    alternateRowStyles: { fillColor: [248, 249, 254] },
  })

  // @ts-expect-error — jspdf-autotable extiende el doc
  const finalY: number = doc.lastAutoTable.finalY + 14
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text("Contado por: ___________________________", 15, finalY)
  doc.text("Verificado por: ___________________________", 15, finalY + 8)
  doc.text(`Fecha de conteo: _______________`, 210 - 15, finalY, { align: "right" })

  doc.save(`Planilla-Inventario-${new Date().toISOString().slice(0, 10)}.pdf`)
}

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
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="rounded-lg p-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <p class="font-semibold">{{ loadError }}</p>
          <BaseButton variant="secondary" size="default" class="mt-3" @click="router.push('/stock')">Volver</BaseButton>
        </div>

        <template v-else>

          <!-- Header -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div>
              <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nuevo Conteo de Inventario</h1>
              <p class="font-medium" style="color: var(--color-on-surface-variant)">
                Seleccioná las categorías a contar, ingresá las cantidades físicas y dejá en blanco los productos que no contaste.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <BaseButton variant="secondary" size="lg" @click="descargarPlanilla">
                <span class="material-symbols-outlined" style="font-size: 20px">download</span>
                Descargar planilla
              </BaseButton>
            </div>
          </div>

          <!-- Error de guardado -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Filtros y búsqueda -->
          <div class="rounded-lg p-5 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-1" style="color: var(--color-primary)">Alcance del conteo</h3>
            <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
              Filtrá los productos que vas a contar. Podés contar por categoría o buscar uno puntual.
            </p>
            <!-- Pills de alcance: categorías con su conteo de productos -->
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="seleccionarTodas"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                :style="categoriasSeleccionadas.length === 0
                  ? 'background-color: var(--color-primary); color: var(--color-on-primary); border: 1px solid var(--color-primary)'
                  : 'background-color: var(--color-surface); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant)'"
              >
                Todas
                <span class="text-xs font-bold"
                  :style="categoriasSeleccionadas.length === 0 ? 'opacity: 0.7' : 'color: var(--color-outline)'">
                  {{ productos.length }}
                </span>
              </button>
              <button
                v-for="c in categoriasConConteo"
                :key="c.value"
                type="button"
                @click="toggleCategoria(c.value)"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                :style="categoriasSeleccionadas.includes(c.value)
                  ? 'background-color: var(--color-primary); color: var(--color-on-primary); border: 1px solid var(--color-primary)'
                  : 'background-color: var(--color-surface); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant)'"
              >
                {{ c.value }}
                <span class="text-xs font-bold"
                  :style="categoriasSeleccionadas.includes(c.value) ? 'opacity: 0.7' : 'color: var(--color-outline)'">
                  {{ c.count }}
                </span>
              </button>
            </div>

            <!-- Búsqueda puntual -->
            <div class="flex justify-end mt-3">
              <SearchInput
                :model-value="search"
                placeholder="Buscar un producto o SKU puntual..."
                class="w-full sm:w-80"
                @update:model-value="search = $event"
              />
            </div>

            <!-- Progreso del conteo -->
            <div class="mt-4 pt-4" style="border-top: 1px solid var(--color-hairline)">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  <span class="font-bold" :style="productosIncluidos.length > 0 ? 'color: var(--color-primary)' : 'color: var(--color-outline)'">{{ productosIncluidos.length }}</span>
                  de
                  <span class="font-bold" style="color: var(--color-on-surface)">{{ productosFiltrados.length }}</span>
                  producto{{ productosFiltrados.length !== 1 ? "s" : "" }} contado{{ productosIncluidos.length !== 1 ? "s" : "" }} en esta vista
                </p>
                <span class="text-xs font-bold" style="color: var(--color-outline)">{{ progresoPct }}%</span>
              </div>
              <div class="h-2 rounded-full overflow-hidden" style="background-color: var(--color-surface-container-high)">
                <div class="h-full rounded-full transition-all"
                  :style="`width: ${progresoPct}%; background-color: var(--color-primary)`"></div>
              </div>
            </div>
          </div>

          <!-- Tabla de productos -->
          <div class="rounded-lg mb-6 overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">

            <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
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

            <div v-else class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color: var(--color-outline)">Categoría</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color: var(--color-outline); width: 128px">Cant. contada</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 110px">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in productosPaginados"
                  :key="p.id"
                  style="border-top: 1px solid var(--color-hairline-soft)"
                  :style="cantidades[p.id] != null ? 'background-color: color-mix(in srgb, var(--color-primary) 6%, transparent)' : ''"
                >
                  <td class="px-6 py-3">
                    <p class="font-semibold" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                    <p v-if="p.sku" class="text-xs" style="color: var(--color-outline)">SKU {{ p.sku }}</p>
                  </td>
                  <td class="px-6 py-3">
                    <span class="inline-block text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap"
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
                      class="w-full px-3 py-2 rounded-md text-sm text-center outline-none transition-all"
                      :style="cantidades[p.id] != null
                        ? 'border: 1.5px solid var(--color-primary); color: var(--color-on-surface); background-color: var(--color-surface-container-lowest); font-weight: 700'
                        : 'border: 1px solid var(--color-outline-variant); color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low)'"
                    />
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span v-if="cantidades[p.id] == null" class="text-xs" style="color: var(--color-outline)">—</span>
                    <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style="background-color: var(--color-success-container); color: var(--color-on-success-container)">
                      <span class="material-symbols-outlined" style="font-size: 13px">check</span>
                      Contado
                    </span>
                  </td>
                </tr>
              </tbody>
            </table></div>

            <!-- Paginación (§14) -->
            <PaginationFooter
              v-if="productosFiltrados.length > 0"
              :current-page="page"
              :total-pages="totalPages"
              :range-start="rangeStart"
              :range-end="rangeEnd"
              :total="productosFiltrados.length"
              noun="productos"
              @update:current-page="(p: number) => (page = p)"
            />
          </div>

          <!-- Observaciones -->
          <div class="rounded-lg p-6 mb-24"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-3" style="color: var(--color-primary)">Observaciones</h3>
            <textarea
              v-model="observaciones"
              rows="3"
              placeholder="Ej. Conteo parcial de lentes — categoría contactología"
              class="w-full px-4 py-3 rounded-md text-sm outline-none appearance-none shadow-none resize-none transition-all"
              :style="inputStyle()"
            />
          </div>

          <!-- Footer sticky -->
          <div class="flex items-center justify-between gap-3 fixed bottom-0 py-4 px-8 z-40"
            :style="`left: var(--sidebar-width); right: 0; background-color: var(--color-background); border-top: 1px solid var(--color-hairline)`">
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
