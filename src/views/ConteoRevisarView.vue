<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import {
  type ConteoInventarioDetalleDto,
  getConteoById,
  gestionarConteo,
} from "@/services/inventarioService"

const route  = useRoute()
const router = useRouter()
const id     = Number(route.params.id)

const conteo     = ref<ConteoInventarioDetalleDto | null>(null)
const isLoading  = ref(true)
const loadError  = ref("")

onMounted(async () => {
  try {
    conteo.value = await getConteoById(id)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar el inventario."
  } finally {
    isLoading.value = false
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const lineasConDiferencia = computed(() =>
  conteo.value?.lineas.filter((l) => l.diferencia !== 0) ?? [],
)

const hayDiferencias = computed(() => lineasConDiferencia.value.length > 0)

function diferenciaStyle(d: number) {
  if (d > 0) return "color: #166534; font-weight: 700"
  if (d < 0) return "color: #991b1b; font-weight: 700"
  return "color: var(--color-outline)"
}

// ── Acciones ──────────────────────────────────────────────────────────────────

const showConfirmModal = ref(false)
const accionPendiente  = ref<"Aprobado" | "Rechazado">("Aprobado")
const obsAprobacion    = ref("")
const isSaving         = ref(false)
const saveError        = ref("")

function openConfirm(accion: "Aprobado" | "Rechazado") {
  accionPendiente.value = accion
  obsAprobacion.value   = ""
  saveError.value       = ""
  showConfirmModal.value = true
}

async function confirmar() {
  isSaving.value   = true
  saveError.value  = ""
  try {
    await gestionarConteo(id, {
      accion: accionPendiente.value,
      observaciones: obsAprobacion.value.trim() || undefined,
    })
    showConfirmModal.value = false
    // Recargar para mostrar el estado actualizado
    conteo.value = await getConteoById(id)
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al procesar."
  } finally {
    isSaving.value = false
  }
}

function volverAAprobaciones() {
  router.push("/stock/conteos")
}

function descargarPdf() {
  if (!conteo.value) return
  const d = conteo.value
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
  doc.text(`Inventario #${d.id}  ·  ${d.estado}`, 15, 20)
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PY")}`, 210 - 15, 20, { align: "right" })

  let y = 34
  doc.setTextColor(...GRAY)
  doc.setFontSize(8.5)
  doc.text(`Registrado por: ${d.creadoPorNombre}`, 15, y)
  doc.text(`Fecha: ${new Date(d.fechaConteo).toLocaleDateString("es-PY")}`, 210 - 15, y, { align: "right" })
  if (d.observaciones) { y += 5; doc.text(`Obs: ${d.observaciones}`, 15, y) }
  if (d.aprobadoPorNombre) { y += 5; doc.text(`${d.estado} por: ${d.aprobadoPorNombre}`, 15, y) }

  autoTable(doc, {
    startY: y + 8,
    margin: { left: 15, right: 15 },
    head: [["Producto", "SKU", "Categoría", "Sistema", "Físico", "Diferencia", "Ajuste"]],
    body: d.lineas.map((l) => [
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
        else if (val === "Salida")  data.cell.styles.textColor = RED
      }
    },
    alternateRowStyles: { fillColor: [248, 249, 254] },
  })

  // @ts-expect-error — jspdf-autotable extiende el doc
  const finalY: number = doc.lastAutoTable.finalY + 8
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(`SIGA — Sistema Integral de Gestión para Óptica · Inventario #${d.id}`, 210 / 2, finalY, { align: "center" })
  doc.save(`Inventario-${d.id}-${d.estado}.pdf`)
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

        <!-- Error -->
        <div v-else-if="loadError" class="rounded-2xl p-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <p class="font-semibold">{{ loadError }}</p>
          <BaseButton variant="secondary" size="default" class="mt-3" @click="volverAAprobaciones">Volver</BaseButton>
        </div>

        <template v-else-if="conteo">

          <!-- Header -->
          <div class="mb-8">
            <button
              @click="volverAAprobaciones"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Historial de Inventarios
            </button>

            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-4xl font-extrabold tracking-tight">Inventario #{{ id }}</h1>
                  <BaseButton variant="secondary" size="sm" @click="descargarPdf">
                    <span class="material-symbols-outlined" style="font-size: 16px">picture_as_pdf</span>
                    PDF
                  </BaseButton>
                  <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold"
                    :style="conteo.estado === 'Pendiente'
                      ? 'background-color: #FEF3C7; color: #92400E'
                      : conteo.estado === 'Aprobado'
                        ? 'background-color: #dcfce7; color: #166534'
                        : 'background-color: #fee2e2; color: #991b1b'">
                    {{ conteo.estado }}
                  </span>
                </div>
                <p class="font-medium" style="color: var(--color-on-surface-variant)">
                  Registrado por <strong style="color: var(--color-on-surface)">{{ conteo.creadoPorNombre }}</strong>
                  el {{ formatDate(conteo.fechaConteo) }}
                  <span v-if="conteo.observaciones"> · {{ conteo.observaciones }}</span>
                </p>
              </div>
            </div>

            <!-- Resultado de aprobación/rechazo -->
            <div v-if="conteo.aprobadoPorNombre" class="mt-4 flex items-start gap-3 p-4 rounded-2xl"
              :style="conteo.estado === 'Aprobado'
                ? 'background-color: #dcfce7'
                : 'background-color: #fee2e2'">
              <span class="material-symbols-outlined mt-0.5"
                :style="conteo.estado === 'Aprobado' ? 'color: #166534' : 'color: #991b1b'">
                {{ conteo.estado === "Aprobado" ? "check_circle" : "cancel" }}
              </span>
              <div>
                <p class="text-sm font-bold"
                  :style="conteo.estado === 'Aprobado' ? 'color: #166534' : 'color: #991b1b'">
                  {{ conteo.estado === "Aprobado" ? "Aprobado" : "Rechazado" }} por {{ conteo.aprobadoPorNombre }}
                  · {{ formatDate(conteo.fechaAprobacion!) }}
                </p>
                <p v-if="conteo.observacionesAprobacion" class="text-xs mt-0.5 italic"
                  :style="conteo.estado === 'Aprobado' ? 'color: #166534' : 'color: #991b1b'">
                  {{ conteo.observacionesAprobacion }}
                </p>
                <p v-if="conteo.estado === 'Aprobado'" class="text-xs mt-1"
                  :style="hayDiferencias ? 'color: #166534' : 'color: #166534; opacity: 0.7'">
                  {{ hayDiferencias
                    ? `Se generaron movimientos de ajuste para ${lineasConDiferencia.length} producto${lineasConDiferencia.length !== 1 ? "s" : ""}.`
                    : "No había diferencias — no se generaron movimientos." }}
                </p>
              </div>
            </div>
          </div>

          <!-- Resumen de diferencias -->
          <div v-if="conteo.estado === 'Pendiente'" class="flex items-center gap-6 mb-6 p-4 rounded-2xl"
            style="background-color: var(--color-surface-container-lowest); outline: 1px solid rgba(196,197,213,0.15)">
            <div class="text-sm" style="color: var(--color-on-surface-variant)">
              <span class="text-2xl font-extrabold" style="color: var(--color-on-surface)">{{ conteo.totalLineas }}</span>
              <span class="ml-1">productos contados</span>
            </div>
            <div class="w-px h-8" style="background-color: rgba(196,197,213,0.3)"></div>
            <div class="text-sm" style="color: var(--color-on-surface-variant)">
              <span class="text-2xl font-extrabold"
                :style="hayDiferencias ? 'color: #92400E' : 'color: #166534'">
                {{ lineasConDiferencia.length }}
              </span>
              <span class="ml-1">con diferencia</span>
            </div>
            <div v-if="!hayDiferencias" class="flex items-center gap-1.5 text-sm font-semibold ml-2"
              style="color: #166534">
              <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
              El inventario físico coincide con el sistema
            </div>
          </div>

          <!-- Planilla de comparación -->
          <div class="rounded-2xl mb-8 overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">

            <div class="px-6 py-4 flex items-center justify-between"
              style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <div>
                <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Planilla de comparación</h3>
                <p class="text-xs mt-0.5" style="color: var(--color-outline)">
                  Sistema = stock al momento del conteo · Físico = cantidad contada por el operario
                </p>
              </div>
            </div>

            <table class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 150px">Categoría</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 110px">Sistema</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 110px">Físico</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 110px">Diferencia</th>
                  <th class="text-center px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline); width: 120px">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="linea in conteo.lineas"
                  :key="linea.id"
                  style="border-top: 1px solid rgba(196,197,213,0.12)"
                  :style="linea.diferencia !== 0 ? 'background-color: #FFFBEB' : ''"
                >
                  <td class="px-6 py-3">
                    <p class="font-semibold" style="color: var(--color-on-surface)">{{ linea.productoNombre }}</p>
                    <p v-if="linea.productoSku" class="text-xs" style="color: var(--color-outline)">SKU {{ linea.productoSku }}</p>
                  </td>
                  <td class="px-6 py-3">
                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant)">
                      {{ linea.productoCategoria || "—" }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-center" style="color: var(--color-on-surface-variant)">
                    {{ linea.cantidadSistema }}
                  </td>
                  <td class="px-6 py-3 text-center font-semibold" style="color: var(--color-on-surface)">
                    {{ linea.cantidadFisica }}
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span :style="diferenciaStyle(linea.diferencia)">
                      {{ linea.diferencia === 0 ? "—" : (linea.diferencia > 0 ? "+" : "") + linea.diferencia }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span v-if="linea.diferencia === 0" class="text-xs" style="color: var(--color-outline)">Sin ajuste</span>
                    <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      :style="linea.diferencia > 0
                        ? 'background-color: #dcfce7; color: #166534'
                        : 'background-color: #fee2e2; color: #991b1b'">
                      <span class="material-symbols-outlined" style="font-size: 13px">
                        {{ linea.diferencia > 0 ? "add" : "remove" }}
                      </span>
                      {{ linea.diferencia > 0 ? "Entrada" : "Salida" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer de acciones (solo si Pendiente) -->
          <div v-if="conteo.estado === 'Pendiente'"
            class="flex items-center justify-between gap-3 fixed bottom-0 py-4 px-8 z-40"
            :style="`left: var(--sidebar-width); right: 0; background-color: var(--color-background); border-top: 1px solid rgba(196,197,213,0.2)`">
            <div class="text-sm" style="color: var(--color-on-surface-variant)">
              <template v-if="hayDiferencias">
                Se generarán movimientos de ajuste para
                <strong style="color: var(--color-on-surface)">{{ lineasConDiferencia.length }}</strong>
                producto{{ lineasConDiferencia.length !== 1 ? "s" : "" }} al aprobar.
              </template>
              <template v-else>
                <span class="flex items-center gap-1.5" style="color: #166534">
                  <span class="material-symbols-outlined" style="font-size: 16px">check_circle</span>
                  Sin diferencias — no se generarán movimientos al aprobar.
                </span>
              </template>
            </div>
            <div class="flex items-center gap-3">
              <BaseButton variant="danger" size="lg" @click="openConfirm('Rechazado')">
                <span class="material-symbols-outlined" style="font-size: 18px">cancel</span>
                Rechazar
              </BaseButton>
              <BaseButton variant="primary" size="lg" @click="openConfirm('Aprobado')">
                <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
                {{ hayDiferencias ? "Aprobar con ajuste" : "Aprobar" }}
              </BaseButton>
            </div>
          </div>

          <!-- Espaciado para el footer sticky -->
          <div v-if="conteo.estado === 'Pendiente'" class="h-20"></div>

        </template>
      </div>
    </main>

    <!-- MODAL CONFIRMAR ACCIÓN -->
    <BaseModal
      :show="showConfirmModal"
      :title="accionPendiente === 'Aprobado' ? 'Confirmar aprobación' : 'Confirmar rechazo'"
      size="sm"
      @close="showConfirmModal = false"
    >
      <div class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        <template v-if="accionPendiente === 'Aprobado'">
          <p v-if="hayDiferencias">
            Se crearán <strong style="color: var(--color-on-surface)">{{ lineasConDiferencia.length }} movimiento{{ lineasConDiferencia.length !== 1 ? "s" : "" }} de ajuste</strong>
            en la sección de Movimientos de Stock.
          </p>
          <p v-else>
            No hay diferencias entre el físico y el sistema. Se aprobará el inventario
            <strong>sin generar movimientos</strong>.
          </p>
        </template>
        <p v-else>
          El inventario quedará rechazado y no se aplicará ningún ajuste.
        </p>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
          Observaciones (opcional)
        </label>
        <textarea v-model="obsAprobacion" rows="3"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
      </div>

      <div v-if="saveError" class="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        {{ saveError }}
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showConfirmModal = false">Cancelar</BaseButton>
        <BaseButton
          :variant="accionPendiente === 'Aprobado' ? 'primary' : 'danger'"
          :disabled="isSaving"
          @click="confirmar"
        >
          {{ isSaving ? "Procesando…" : accionPendiente === "Aprobado" ? "Confirmar" : "Rechazar" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
