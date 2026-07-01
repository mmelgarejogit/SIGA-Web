<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type ConteoInventarioDto, getConteoById, getConteos } from "@/services/inventarioService"

const router = useRouter()
const isLoading = ref(false)
const loadError = ref("")
const conteos = ref<ConteoInventarioDto[]>([])
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "Pendiente", label: "Pendiente" },
  { value: "Aprobado",  label: "Aprobado"  },
  { value: "Rechazado", label: "Rechazado" },
]

const pendientesCount = computed(() => conteos.value.filter((c) => c.estado === "Pendiente").length)

const columns = [
  { key: "fecha",       label: "Fecha" },
  { key: "operador",    label: "Registrado por" },
  { key: "productos",   label: "Productos" },
  { key: "diferencias", label: "Con diferencia" },
  { key: "estado",      label: "Estado" },
  { key: "acciones",    label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const estado = estadoFilter.value.length === 1 ? estadoFilter.value[0] : undefined
    conteos.value = await getConteos(estado)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar inventarios."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
function onEstadoChange(val: string[]) { estadoFilter.value = val; load() }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function estadoBadgeStyle(estado: string) {
  if (estado === "Pendiente") return "background-color: var(--color-warning-container); color: var(--color-on-warning-container)"
  if (estado === "Aprobado")  return "background-color: var(--color-success-container); color: var(--color-on-success-container)"
  return "background-color: var(--color-error-container); color: var(--color-on-error-container)"
}

function estadoIcon(estado: string) {
  if (estado === "Pendiente") return "schedule"
  if (estado === "Aprobado")  return "check_circle"
  return "cancel"
}

const pdfLoadingId = ref<number | null>(null)

async function descargarPdf(c: ConteoInventarioDto) {
  pdfLoadingId.value = c.id
  try {
    const detalle = await getConteoById(c.id)
    generarPdf(detalle)
  } finally {
    pdfLoadingId.value = null
  }
}

function generarPdf(detalle: Awaited<ReturnType<typeof getConteoById>>) {
  const PRIMARY: [number, number, number] = [0, 40, 142]
  const WHITE:   [number, number, number] = [255, 255, 255]
  const GRAY:    [number, number, number] = [107, 114, 128]
  const GREEN:   [number, number, number] = [22, 101, 52]
  const RED:     [number, number, number] = [153, 27, 27]

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, 210, 28, "F")
  doc.setTextColor(...WHITE)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("INVENTARIO FÍSICO", 15, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.text(`Inventario #${detalle.id}  ·  ${detalle.estado}`, 15, 20)
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PY")}`, 210 - 15, 20, { align: "right" })

  let y = 34
  doc.setTextColor(...GRAY)
  doc.setFontSize(8.5)
  doc.text(`Registrado por: ${detalle.creadoPorNombre}`, 15, y)
  doc.text(`Fecha: ${new Date(detalle.fechaConteo).toLocaleDateString("es-PY")}`, 210 - 15, y, { align: "right" })
  if (detalle.observaciones) {
    y += 5
    doc.text(`Obs: ${detalle.observaciones}`, 15, y)
  }
  if (detalle.aprobadoPorNombre) {
    y += 5
    doc.text(`${detalle.estado} por: ${detalle.aprobadoPorNombre}`, 15, y)
  }

  autoTable(doc, {
    startY: y + 8,
    margin: { left: 15, right: 15 },
    head: [["Producto", "SKU", "Categoría", "Sistema", "Físico", "Diferencia", "Ajuste"]],
    body: detalle.lineas.map((l) => [
      l.productoNombre,
      l.productoSku ?? "—",
      l.productoCategoria ?? "—",
      l.cantidadSistema.toString(),
      l.cantidadFisica.toString(),
      l.diferencia === 0 ? "—" : (l.diferencia > 0 ? "+" : "") + l.diferencia,
      l.diferencia === 0 ? "Sin ajuste" : l.diferencia > 0 ? "Entrada" : "Salida",
    ]),
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw as string
        if (val.startsWith("+")) data.cell.styles.textColor = GREEN
        else if (val.startsWith("-")) data.cell.styles.textColor = RED
      }
      if (data.section === "body" && data.column.index === 6) {
        const val = data.cell.raw as string
        if (val === "Entrada") data.cell.styles.textColor = GREEN
        else if (val === "Salida") data.cell.styles.textColor = RED
      }
    },
    alternateRowStyles: { fillColor: [248, 249, 254] },
  })

  // @ts-expect-error — jspdf-autotable extiende el doc
  const finalY: number = doc.lastAutoTable.finalY + 8
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(
    `SIGA — Sistema Integral de Gestión para Óptica · Inventario #${detalle.id}`,
    210 / 2, finalY, { align: "center" },
  )

  doc.save(`Inventario-${detalle.id}-${detalle.estado}.pdf`)
}

function menuItems(c: ConteoInventarioDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver detalle",   icon: "visibility",    action: () => router.push(`/stock/conteos/${c.id}`) },
    { type: "item", label: "Descargar PDF", icon: "picture_as_pdf", action: () => descargarPdf(c) },
  ]
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial de Inventario</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ conteos.length }} inventario{{ conteos.length !== 1 ? "s" : "" }}
              <span v-if="pendientesCount > 0"
                class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
                <span class="material-symbols-outlined" style="font-size: 13px">schedule</span>
                {{ pendientesCount }} pendiente{{ pendientesCount !== 1 ? "s" : "" }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 mb-8 flex-wrap">
          <FilterChips
            :model-value="estadoFilter"
            :options="estadoOptions"
            placeholder="Estado"
            @update:model-value="onEstadoChange"
          />
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable :columns="columns" :items="conteos" :loading="isLoading"
          empty-text="No hay inventarios registrados."
          @row-click="(item) => router.push(`/stock/conteos/${item.id}`)">

          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface)">{{ formatDate(item.fechaConteo) }}</span>
          </template>

          <template #operador="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">{{ item.creadoPorNombre }}</span>
          </template>

          <template #productos="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.totalLineas }}</span>
          </template>

          <template #diferencias="{ item }">
            <span v-if="item.lineasConDiferencia > 0"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">warning</span>
              {{ item.lineasConDiferencia }}
            </span>
            <span v-else class="text-xs" style="color: var(--color-outline)">Sin diferencias</span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              :style="estadoBadgeStyle(item.estado)">
              <span class="material-symbols-outlined" style="font-size: 13px">{{ estadoIcon(item.estado) }}</span>
              {{ item.estado }}
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
  </div>
</template>
