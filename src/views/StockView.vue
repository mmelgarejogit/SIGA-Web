<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { inputStyle } from "@/composables/useFieldStyles"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Producto,
  getProductos,
  updateStockConfig,
} from "@/services/inventarioService"

const router = useRouter()

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))

// ── Productos ─────────────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")

const productosFiltrados = computed(() => {
  if (!search.value.trim()) return productos.value
  const q = search.value.toLowerCase()
  return productos.value.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q),
  )
})

const bajoStockCount = computed(() => productos.value.filter((p) => p.bajoStock).length)

const columns = [
  { key: "producto", label: "Producto" },
  { key: "categoria", label: "Categoría" },
  { key: "stockActual", label: "Stock actual" },
  { key: "minimo", label: "Stock mín." },
  { key: "maximo", label: "Stock máx." },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getProductos({ pageSize: 500 })
    productos.value = result.items
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar productos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

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

// ── Modal editar niveles ──────────────────────────────────────────────────────

const showNivelesModal = ref(false)
const editingProducto = ref<Producto | null>(null)
const isNivelesSaving = ref(false)
const nivelesError = ref("")
const nivelesForm = ref({ stockMinimo: 0, stockMaximo: null as number | null })

function openNiveles(p: Producto) {
  editingProducto.value = p
  nivelesForm.value = { stockMinimo: p.stockMinimo, stockMaximo: p.stockMaximo }
  nivelesError.value = ""
  showNivelesModal.value = true
}

async function submitNiveles() {
  if (!editingProducto.value) return
  if (nivelesForm.value.stockMaximo !== null && nivelesForm.value.stockMaximo < nivelesForm.value.stockMinimo) {
    nivelesError.value = "El stock máximo no puede ser menor al mínimo."
    return
  }
  isNivelesSaving.value = true
  nivelesError.value = ""
  try {
    const updated = await updateStockConfig(editingProducto.value.id, {
      precioCosto: editingProducto.value.precioCosto,
      stockMinimo: nivelesForm.value.stockMinimo,
      stockMaximo: nivelesForm.value.stockMaximo,
    })
    const idx = productos.value.findIndex((p) => p.id === updated.id)
    if (idx !== -1) productos.value[idx] = updated
    showNivelesModal.value = false
  } catch (err: unknown) {
    nivelesError.value = err instanceof Error ? err.message : "Error al guardar."
  } finally {
    isNivelesSaving.value = false
  }
}

function menuItems(p: Producto): ContextMenuItem[] {
  if (!canManage.value) return []
  return [{ type: "item", label: "Editar niveles de stock", icon: "tune", action: () => openNiveles(p) }]
}

</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Niveles de Stock</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ productos.length }} producto{{ productos.length !== 1 ? "s" : "" }}
              <span v-if="bajoStockCount > 0" class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
                <span class="material-symbols-outlined" style="font-size: 13px">warning</span>
                {{ bajoStockCount }} bajo stock
              </span>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <BaseButton variant="secondary" size="lg" @click="descargarPlanilla">
              <span class="material-symbols-outlined" style="font-size: 20px">download</span>
              Descargar planilla
            </BaseButton>
          </div>
        </div>

        <!-- Filtro -->
        <div class="flex items-center justify-end mb-6">
          <SearchInput
            :model-value="search"
            placeholder="Buscar por nombre, SKU o categoría..."
            class="w-80"
            @update:model-value="search = $event"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="productosFiltrados" :loading="isLoading" empty-text="No hay productos activos.">

          <template #producto="{ item }">
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
              <p v-if="item.sku" class="text-xs" style="color: var(--color-outline)">SKU {{ item.sku }}</p>
            </div>
          </template>

          <template #categoria="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.categoria || "—" }}</span>
          </template>

          <template #stockActual="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.stockActual }}</span>
          </template>

          <template #minimo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.stockMinimo }}</span>
          </template>

          <template #maximo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ item.stockMaximo != null ? item.stockMaximo : "—" }}
            </span>
          </template>

          <template #estado="{ item }">
            <span v-if="item.bajoStock"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">warning</span>
              Bajo stock
            </span>
            <span v-else-if="item.stockMaximo != null && item.stockActual >= item.stockMaximo"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-info-container); color: var(--color-on-info-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">arrow_upward</span>
              Sobre stock
            </span>
            <span v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-success-container); color: var(--color-on-success-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>
              OK
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>

        </BaseTable>

      </div>
    </main>

    <!-- MODAL NIVELES -->
    <BaseModal :show="showNivelesModal" title="Niveles de Stock" size="sm" @close="showNivelesModal = false">
      <div v-if="editingProducto" class="flex items-center gap-3 mb-5 p-3 rounded-xl"
        style="background-color: var(--color-surface-container-low)">
        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary)">inventory_2</span>
        <div>
          <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ editingProducto.nombre }}</p>
          <p class="text-xs" style="color: var(--color-outline)">Stock actual: <strong>{{ editingProducto.stockActual }}</strong></p>
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Stock mínimo</label>
          <input v-model.number="nivelesForm.stockMinimo" type="number" min="0" step="1"
            class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle()" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Alerta de bajo stock cuando el stock llegue a este valor.</p>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Stock máximo <span style="font-weight: normal">(opcional)</span>
          </label>
          <input
            :value="nivelesForm.stockMaximo ?? ''"
            @input="nivelesForm.stockMaximo = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)"
            type="number" min="0" step="1" placeholder="Sin límite"
            class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle()" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Alerta de sobre stock cuando el stock llegue a este valor.</p>
        </div>
      </div>
      <div v-if="nivelesError" class="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ nivelesError }}
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showNivelesModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isNivelesSaving" @click="submitNiveles">
          {{ isNivelesSaving ? "Guardando…" : "Guardar" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
