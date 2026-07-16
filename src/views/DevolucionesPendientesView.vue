<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { inputStyle } from "@/composables/useFieldStyles"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type Devolucion,
  getDevolucionesPendientes, gestionarDevolucion,
} from "@/services/ventasService"

const router = useRouter()

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const devoluciones = ref<Devolucion[]>([])
const isLoading     = ref(false)
const search        = ref("")

async function load() {
  isLoading.value = true
  try {
    devoluciones.value = await getDevolucionesPendientes()
  } catch {
    devoluciones.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Filtro ───────────────────────────────────────────────────────────────────

const filtered = computed(() => {
  if (!search.value.trim()) return devoluciones.value
  const q = search.value.toLowerCase()
  return devoluciones.value.filter(d =>
    d.clienteNombre.toLowerCase().includes(q) ||
    d.numeroComprobante.toLowerCase().includes(q) ||
    d.solicitadoPorNombre.toLowerCase().includes(q),
  )
})

// Resumen por tipo
const cantCambios      = computed(() => filtered.value.filter(d => d.tipo === "Cambio").length)
const cantDevoluciones = computed(() => filtered.value.filter(d => d.tipo === "Devolucion").length)

// ── Badge de tipo ──────────────────────────────────────────────────────────────

function tipoBadge(tipo: string) {
  return tipo === "Cambio"
    ? { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "Cambio" }
    : { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Devolución" }
}

// ── Antigüedad ─────────────────────────────────────────────────────────────────

function antiguedad(createdAt: string): { color: string; label: string } {
  const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (dias <= 2)  return { color: "var(--color-on-success-container)", label: `${dias}d` }
  if (dias <= 7)  return { color: "var(--color-on-warning-container)", label: `${dias}d` }
  return { color: "var(--color-on-error-container)", label: `${dias}d` }
}

// ── Modal: Gestionar devolución ───────────────────────────────────────────────

const showGestion    = ref(false)
const isGestionando   = ref(false)
const gestionId       = ref(0)
const gestionAccion   = ref<"Confirmar" | "Rechazar">("Confirmar")
const gestionObs      = ref("")
const gestionError    = ref("")

function openGestion(d: Devolucion, accion: "Confirmar" | "Rechazar") {
  gestionId.value     = d.id
  gestionAccion.value = accion
  gestionObs.value    = ""
  gestionError.value  = ""
  showGestion.value   = true
}

async function submitGestion() {
  isGestionando.value = true
  gestionError.value  = ""
  try {
    await gestionarDevolucion(gestionId.value, {
      accion:                gestionAccion.value,
      observacionesRevision: gestionObs.value || undefined,
    })
    showGestion.value = false
    await load()
  } catch (e) {
    gestionError.value = e instanceof Error ? e.message : "Error al gestionar la devolución"
  } finally {
    isGestionando.value = false
  }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(d: Devolucion): ContextMenuItem[] {
  return [
    { type: "item", label: "Confirmar",   icon: "check_circle", action: () => openGestion(d, "Confirmar") },
    { type: "item", label: "Rechazar",    icon: "cancel",       action: () => openGestion(d, "Rechazar") },
    { type: "separator" },
    { type: "item", label: "Ver venta",   icon: "visibility",   action: () => router.push(`/ventas/${d.ventaId}`) },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Encabezado -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Devoluciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} solicitud{{ filtered.length !== 1 ? "es" : "" }} pendiente{{ filtered.length !== 1 ? "s" : "" }} de aprobación
            </p>
          </div>
          <div class="flex gap-3">
            <div class="rounded-2xl px-5 py-4 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Devoluciones</p>
              <p class="text-2xl font-extrabold" style="color: var(--color-on-warning-container)">{{ cantDevoluciones }}</p>
            </div>
            <div class="rounded-2xl px-5 py-4 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cambios</p>
              <p class="text-2xl font-extrabold" style="color: var(--color-on-info-container)">{{ cantCambios }}</p>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-end mb-4">
          <SearchInput v-model="search" placeholder="Buscar por cliente, comprobante o solicitante…" class="w-full sm:w-80" />
        </div>

        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay devoluciones pendientes">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Productos</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Solicitó</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Antigüedad</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="d in filtered"
                :key="d.id"
                class="hover:bg-surface-container-low cursor-pointer"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
                @click="router.push(`/ventas/${d.ventaId}`)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ d.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm font-medium" style="color: var(--color-on-surface)">{{ d.clienteNombre }}</p>
                  <p class="text-xs mt-0.5 truncate max-w-[220px]" style="color: var(--color-on-surface-variant)" :title="d.motivo">{{ d.motivo }}</p>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${tipoBadge(d.tipo).bg}; color: ${tipoBadge(d.tipo).text}`"
                  >{{ tipoBadge(d.tipo).label }}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="space-y-0.5">
                    <div v-for="l in d.lineas" :key="l.id" class="text-xs flex gap-1.5 items-center" style="color: var(--color-on-surface-variant)">
                      <span>↩ {{ l.cantidadDevuelta }}× {{ l.productoDevueltoNombre }}</span>
                      <span v-if="l.productoNuevoNombre" style="color: var(--color-on-info-container)">→ {{ l.cantidadNueva }}× {{ l.productoNuevoNombre }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ d.solicitadoPorNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(d.createdAt) }}</td>
                <td class="px-6 py-4">
                  <span
                    class="text-xs font-bold px-2 py-1 rounded-full"
                    :style="`background: ${antiguedad(d.createdAt).color}22; color: ${antiguedad(d.createdAt).color}`"
                  >{{ antiguedad(d.createdAt).label }}</span>
                </td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <RowContextMenu :items="menuItems(d)" />
                </td>
              </tr>
            </template>
          </BaseTable>
        </div>

      </div>
    </main>

    <!-- ── Modal: Gestionar devolución ──────────────────────────────────────── -->
    <BaseModal :open="showGestion" size="sm" :title="gestionAccion === 'Confirmar' ? 'Confirmar Devolución' : 'Rechazar Devolución'" @close="showGestion = false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            <span v-if="gestionAccion === 'Confirmar'">Al confirmar se aplicarán los movimientos de stock y caja correspondientes.</span>
            <span v-else>La devolución quedará rechazada sin impacto en stock ni caja.</span>
          </p>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Observaciones</label>
            <textarea v-model="gestionObs" rows="2" class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle()"></textarea>
          </div>
          <p v-if="gestionError" class="text-xs font-medium" style="color: var(--color-error)">{{ gestionError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showGestion = false">Cancelar</BaseButton>
        <BaseButton :variant="gestionAccion === 'Confirmar' ? 'primary' : 'danger'" class="flex-1" :disabled="isGestionando" @click="submitGestion">
          {{ isGestionando ? "Procesando…" : gestionAccion }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
