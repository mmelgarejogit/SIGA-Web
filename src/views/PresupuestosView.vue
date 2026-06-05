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
import { type Venta, getPresupuestos, confirmarVenta, eliminarPresupuesto, getVentaById } from "@/services/ventasService"
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
    v.pacienteNombre.toLowerCase().includes(q) ||
    v.numeroComprobante.toLowerCase().includes(q),
  )
})

// ── Semáforo de vigencia (15 días) ────────────────────────────────────────────

function vigenciaBadge(fechaVenta: string) {
  const dias = diasDesde(fechaVenta)
  if (dias > 15) return { label: "Vencido",          bg: "#FEE2E2", text: "#991B1B" }
  if (dias > 10) return { label: `${15 - dias}d`,    bg: "#FEF3C7", text: "#92400E" }
  return              { label: `${15 - dias}d rest.`, bg: "#DCFCE7", text: "#166534" }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function descargarPdf(v: Venta) {
  const [detalle, config] = await Promise.all([
    getVentaById(v.id),
    getConfiguracion(),
  ])
  generarPdfPresupuesto(detalle, config)
}

// ── Convertir a venta ─────────────────────────────────────────────────────────

const showConvertir  = ref(false)
const isConvertiendo = ref(false)
const convertError   = ref("")
const convertItem    = ref<Venta | null>(null)

function openConvertir(v: Venta) {
  convertItem.value  = v
  convertError.value = ""
  showConvertir.value = true
}

async function submitConvertir() {
  if (!convertItem.value) return
  isConvertiendo.value = true
  convertError.value   = ""
  try {
    await confirmarVenta(convertItem.value.id)
    showConvertir.value = false
    router.push(`/ventas/${convertItem.value.id}`)
  } catch (e: any) {
    convertError.value = e?.response?.data?.message ?? "Error al convertir"
  } finally {
    isConvertiendo.value = false
  }
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
    { type: "item", label: "Convertir a venta",   icon: "shopping_cart",  action: () => openConvertir(v) },
    { type: "separator" },
    { type: "item", label: "Eliminar",             icon: "delete",         action: () => openEliminar(v), danger: true },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Presupuestos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} presupuesto{{ filtered.length !== 1 ? "s" : "" }} pendiente{{ filtered.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="router.push('/ventas/nueva?modo=presupuesto')">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Presupuesto
          </BaseButton>
        </div>

        <!-- Filtro -->
        <div class="flex justify-end mb-6">
          <SearchInput v-model="search" placeholder="Buscar por paciente o número…" class="w-72" />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay presupuestos pendientes">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">N° Presupuesto</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Paciente</th>
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
                style="border-bottom: 1px solid rgba(196,197,213,0.12)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ v.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ v.pacienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(v.fechaVenta) }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ v.tipo === "TrabajoAPedido" ? "A pedido" : "Directa" }}
                </td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(v.total) }}</td>
                <td class="px-6 py-4">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    :style="`background:${vigenciaBadge(v.fechaVenta).bg};color:${vigenciaBadge(v.fechaVenta).text}`">
                    {{ vigenciaBadge(v.fechaVenta).label }}
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

    <!-- Modal: Convertir a venta -->
    <BaseModal :open="showConvertir" size="sm" title="Convertir a Venta" @close="showConvertir = false">
      <template #body>
        <div class="space-y-3">
          <div class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ convertItem?.pacienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">{{ convertItem?.numeroComprobante }} · {{ formatPrice(convertItem?.total ?? 0) }}</p>
          </div>
          <p class="text-sm" style="color:var(--color-on-surface-variant)">
            El presupuesto pasará a estado <strong>Confirmada</strong> y se podrá emitir comprobante desde el detalle de la venta.
          </p>
          <p v-if="convertError" class="text-xs font-medium" style="color:var(--color-error)">{{ convertError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showConvertir = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isConvertiendo" @click="submitConvertir">
          {{ isConvertiendo ? "Convirtiendo…" : "Convertir a venta" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal: Eliminar -->
    <BaseModal :open="showEliminar" size="sm" title="Eliminar Presupuesto" @close="showEliminar = false">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm" style="color:var(--color-on-surface-variant)">
            ¿Eliminar el presupuesto
            <strong style="color:var(--color-on-surface)">{{ eliminarItem?.numeroComprobante }}</strong>
            de <strong style="color:var(--color-on-surface)">{{ eliminarItem?.pacienteNombre }}</strong>?
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
