<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type TrabajoPedidoListDto } from "@/services/ventasService"
import { getPedidos } from "@/services/laboratorioService"

const router = useRouter()

const formatDate = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// Dioptría con signo (+1.25 / −0.50). Eje en grados.
const fmtDiop = (n?: number) =>
  n === undefined || n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}`
const fmtEje = (n?: number) =>
  n === undefined || n === null ? "—" : `${n}°`

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const estadoFiltro = ref<string[]>([])

const estadoOptions = [
  { value: "PendienteAprobacion", label: "Pend. aprobación", dot: "var(--color-outline)" },
  { value: "PendienteEnvio",      label: "Pend. envío",      dot: "var(--color-on-info-container)" },
  { value: "Enviado",             label: "Enviado",           dot: "var(--color-on-warning-container)" },
  { value: "Recibido",            label: "Recibido",          dot: "var(--color-on-success-container)" },
  { value: "Rechazado",           label: "Rechazado",         dot: "var(--color-on-error-container)" },
]

async function load() {
  isLoading.value = true
  try {
    items.value = await getPedidos(estadoFiltro.value.length === 1 ? estadoFiltro.value[0] : undefined)
  } catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    i.clienteNombre.toLowerCase().includes(q) ||
    i.numeroComprobante.toLowerCase().includes(q) ||
    i.laboratorioNombre.toLowerCase().includes(q),
  )
})

// ── Badges ─────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PendienteAprobacion: { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: "Pend. aprobación" },
    PendienteEnvio:      { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "Pend. envío"      },
    Enviado:             { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Enviado"           },
    Recibido:            { bg: "var(--color-success-container)", text: "var(--color-on-success-container)", label: "Recibido"          },
    Rechazado:           { bg: "var(--color-error-container)", text: "var(--color-on-error-container)", label: "Rechazado"         },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

// ── Referencia del pedido (datos de la venta, solo lectura) ──────────────────────

const showRef  = ref(false)
const selected = ref<TrabajoPedidoListDto | null>(null)

function verReferencia(item: TrabajoPedidoListDto) {
  selected.value = item
  showRef.value  = true
}

const tieneReceta = computed(() => {
  const r = selected.value?.receta
  if (!r) return false
  return [r.odEsferico, r.odCilindro, r.odEje, r.odAdicion, r.oiEsferico, r.oiCilindro, r.oiEje, r.oiAdicion]
    .some(v => v !== undefined && v !== null)
})

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver pedido",  icon: "description", action: () => verReferencia(item) },
    { type: "item", label: "Ver venta",   icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Pedidos a Laboratorio</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por cliente, comprobante o laboratorio…" class="w-full sm:w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos que mostrar">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo de lente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Factura</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="item in filtered" :key="item.id"
                class="hover:bg-surface-container-low cursor-pointer"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
                @click="verReferencia(item)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ item.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.tipoLenteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.laboratorioNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoBadge(item.estado).bg}; color: ${estadoBadge(item.estado).text}`">
                    {{ estadoBadge(item.estado).label }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span v-if="item.factura" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style="background:var(--color-success-container);color:var(--color-on-success-container)">
                    <span class="material-symbols-outlined" style="font-size:13px">receipt</span>
                    {{ item.factura.numeroFactura }}
                  </span>
                  <span v-else class="text-xs" style="color: var(--color-outline)">—</span>
                </td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <RowContextMenu :items="menuItems(item)" />
                </td>
              </tr>
            </template>
          </BaseTable>
        </div>

      </div>
    </main>

    <!-- ── Modal: Referencia del pedido (datos de la venta, solo lectura) ──────── -->
    <BaseModal :open="showRef" size="lg" title="Pedido al Laboratorio" @close="showRef = false">
      <template #body>
        <div v-if="selected" class="space-y-5">

          <!-- Cabecera -->
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p class="text-lg font-mono font-extrabold" style="color: var(--color-primary)">{{ selected.numeroComprobante }}</p>
              <p class="text-sm font-medium" style="color: var(--color-on-surface)">{{ selected.clienteNombre }}</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
              :style="`background-color: ${estadoBadge(selected.estado).bg}; color: ${estadoBadge(selected.estado).text}`">
              {{ estadoBadge(selected.estado).label }}
            </span>
          </div>

          <!-- Especificaciones ópticas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Laboratorio</p>
              <p style="color: var(--color-on-surface)">{{ selected.laboratorioNombre || "—" }}</p>
            </div>
            <div v-if="selected.tipoLenteNombre">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Lente</p>
              <p style="color: var(--color-on-surface)">{{ selected.tipoLenteNombre }}</p>
            </div>
            <div v-if="selected.armazonNombre || selected.armazonDelCliente">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Armazón</p>
              <p style="color: var(--color-on-surface)">{{ selected.armazonDelCliente ? "Propio del cliente" : selected.armazonNombre }}</p>
            </div>
            <div v-if="selected.tratamientos.length" class="col-span-2">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Tratamientos</p>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="t in selected.tratamientos" :key="t"
                  class="px-2 py-0.5 rounded-full text-xs font-medium" style="background:color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest));color:var(--color-tertiary)">{{ t }}</span>
              </div>
            </div>
          </div>

          <!-- Receta (prescripción) -->
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Receta</p>
            <div v-if="tieneReceta" class="rounded-xl overflow-hidden" style="border: 1px solid var(--color-outline-variant)">
              <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
                <thead>
                  <tr style="background-color: var(--color-surface-container-low)">
                    <th class="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Ojo</th>
                    <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Esf.</th>
                    <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cil.</th>
                    <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Eje</th>
                    <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Adic.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-top: 1px solid var(--color-hairline-soft)">
                    <td class="px-4 py-2 font-semibold" style="color: var(--color-on-surface)">OD</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.odEsferico) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.odCilindro) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtEje(selected.receta?.odEje) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.odAdicion) }}</td>
                  </tr>
                  <tr style="border-top: 1px solid var(--color-hairline-soft)">
                    <td class="px-4 py-2 font-semibold" style="color: var(--color-on-surface)">OI</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.oiEsferico) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.oiCilindro) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtEje(selected.receta?.oiEje) }}</td>
                    <td class="px-4 py-2 text-right font-mono" style="color: var(--color-on-surface)">{{ fmtDiop(selected.receta?.oiAdicion) }}</td>
                  </tr>
                </tbody>
              </table></div>
              <div v-if="selected.receta?.distanciaInterpupilar || selected.receta?.observaciones"
                class="px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1" style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
                <span v-if="selected.receta?.distanciaInterpupilar" class="text-xs" style="color: var(--color-on-surface-variant)">
                  <span class="font-bold uppercase tracking-wider" style="color: var(--color-outline)">DIP:</span> {{ selected.receta.distanciaInterpupilar }} mm
                </span>
                <span v-if="selected.receta?.observaciones" class="text-xs" style="color: var(--color-on-surface-variant)">
                  <span class="font-bold uppercase tracking-wider" style="color: var(--color-outline)">Obs. receta:</span> {{ selected.receta.observaciones }}
                </span>
              </div>
            </div>
            <p v-else class="text-sm" style="color: var(--color-outline)">La venta no tiene receta cargada.</p>
          </div>

          <!-- Observación del pedido -->
          <div v-if="selected.observacion">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observación del pedido</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">{{ selected.observacion }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showRef = false">Cerrar</BaseButton>
        <BaseButton variant="primary" class="flex-1" @click="selected && router.push(`/ventas/${selected.ventaId}`)">Ver venta completa</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
