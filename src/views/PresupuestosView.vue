<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Venta, getPresupuestos, eliminarPresupuesto, getVentaById } from "@/services/ventasService"
import { getConfiguracion } from "@/services/configService"
import { usePresupuestoPdf } from "@/composables/usePresupuestoPdf"

const router = useRouter()
const { generarPdfPresupuesto } = usePresupuestoPdf()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const diasDesde = (s: string) =>
  Math.floor((Date.now() - new Date(s + "T00:00:00").getTime()) / 86_400_000)

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<Venta[]>([])
const isLoading = ref(false)
const search    = ref("")

async function load() {
  isLoading.value = true
  try {
    const res = await getPresupuestos()
    items.value = res.items
  } catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(v =>
    v.clienteNombre.toLowerCase().includes(q) ||
    v.numeroComprobante.toLowerCase().includes(q),
  )
})

// ── Semáforo de vigencia ──────────────────────────────────────────────────────

function vigenciaBadge(v: Venta) {
  const validez   = v.validezDias > 0 ? v.validezDias : 15
  const dias      = diasDesde(v.fechaVenta)
  const restantes = validez - dias
  if (restantes < 0)  return { label: "Vencido",            bg: "var(--color-error-container)", text: "var(--color-on-error-container)" }
  if (restantes <= 5) return { label: `${restantes}d`,       bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)" }
  return                     { label: `${restantes}d rest.`, bg: "var(--color-success-container)", text: "var(--color-on-success-container)" }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function descargarPdf(v: Venta) {
  const [detalle, config] = await Promise.all([
    getVentaById(v.id),
    getConfiguracion(),
  ])
  generarPdfPresupuesto(detalle, config)
}

// ── Generar venta ─────────────────────────────────────────────────────────────
// Lleva a la vista de Nueva Venta con los datos del presupuesto precargados.

function generarVenta(v: Venta) {
  router.push(`/ventas/nueva?presupuesto=${v.id}`)
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

const showEliminar   = ref(false)
const isEliminando   = ref(false)
const eliminarError  = ref("")
const eliminarItem   = ref<Venta | null>(null)

function openEliminar(v: Venta) {
  eliminarItem.value  = v
  eliminarError.value = ""
  showEliminar.value  = true
}

async function submitEliminar() {
  if (!eliminarItem.value) return
  isEliminando.value  = true
  eliminarError.value = ""
  try {
    await eliminarPresupuesto(eliminarItem.value.id)
    showEliminar.value = false
    await load()
  } catch (e: any) {
    eliminarError.value = e?.response?.data?.message ?? "Error al eliminar"
  } finally {
    isEliminando.value = false
  }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(v: Venta): ContextMenuItem[] {
  return [
    { type: "item", label: "Descargar PDF",       icon: "picture_as_pdf", action: () => descargarPdf(v) },
    { type: "item", label: "Generar venta",        icon: "shopping_cart",  action: () => generarVenta(v) },
    { type: "separator" },
    { type: "item", label: "Eliminar",             icon: "delete",         action: () => openEliminar(v), danger: true },
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Presupuestos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} presupuesto{{ filtered.length !== 1 ? "s" : "" }} pendiente{{ filtered.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="router.push('/ventas/presupuestos/nuevo')">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Presupuesto
          </BaseButton>
        </div>

        <!-- Filtro -->
        <div class="flex justify-end mb-6">
          <SearchInput v-model="search" placeholder="Buscar por cliente o número…" class="w-full sm:w-72" />
        </div>

        <!-- Tabla -->
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay presupuestos pendientes">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">N° Presupuesto</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Total</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Vigencia</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="v in filtered" :key="v.id"
                class="hover:bg-surface-container-low"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ v.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ v.clienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(v.fechaVenta) }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ v.tipo === "TrabajoAPedido" ? "A pedido" : "Directa" }}
                </td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(v.total) }}</td>
                <td class="px-6 py-4">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    :style="`background:${vigenciaBadge(v).bg};color:${vigenciaBadge(v).text}`">
                    {{ vigenciaBadge(v).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <RowContextMenu :items="menuItems(v)" />
                </td>
              </tr>
            </template>
          </BaseTable>
        </div>

      </div>
    </main>

    <!-- Modal: Eliminar -->
    <BaseModal :open="showEliminar" size="sm" title="Eliminar Presupuesto" @close="showEliminar = false">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm" style="color:var(--color-on-surface-variant)">
            ¿Eliminar el presupuesto
            <strong style="color:var(--color-on-surface)">{{ eliminarItem?.numeroComprobante }}</strong>
            de <strong style="color:var(--color-on-surface)">{{ eliminarItem?.clienteNombre }}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <p v-if="eliminarError" class="text-xs font-medium" style="color:var(--color-error)">{{ eliminarError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showEliminar = false">Cancelar</BaseButton>
        <BaseButton variant="danger" class="flex-1" :disabled="isEliminando" @click="submitEliminar">
          {{ isEliminando ? "Eliminando…" : "Eliminar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
