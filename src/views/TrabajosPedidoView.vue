<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type TrabajoPedidoListDto, getTrabajosPedido } from "@/services/ventasService"

const router = useRouter()

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const estadoFiltro = ref<string[]>([])

const estadoOptions = [
  { value: "PendienteAprobacion", label: "Pend. aprobación", dot: "#6B7280" },
  { value: "PendienteEnvio",      label: "Pend. envío",      dot: "#1D4ED8" },
  { value: "Enviado",             label: "Enviado",           dot: "#92400E" },
  { value: "Recibido",            label: "Recibido",          dot: "#166534" },
  { value: "Rechazado",           label: "Rechazado",         dot: "#991B1B" },
]

async function load() {
  isLoading.value = true
  try {
    items.value = await getTrabajosPedido(estadoFiltro.value.length === 1 ? estadoFiltro.value[0] : undefined)
  } catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    i.pacienteNombre.toLowerCase().includes(q) ||
    i.numeroComprobante.toLowerCase().includes(q) ||
    i.laboratorioNombre.toLowerCase().includes(q),
  )
})

// ── Badges ─────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PendienteAprobacion: { bg: "#F3F4F6", text: "#6B7280", label: "Pend. aprobación" },
    PendienteEnvio:      { bg: "#DBEAFE", text: "#1D4ED8", label: "Pend. envío"      },
    Enviado:             { bg: "#FEF3C7", text: "#92400E", label: "Enviado"           },
    Recibido:            { bg: "#DCFCE7", text: "#166534", label: "Recibido"          },
    Rechazado:           { bg: "#FEE2E2", text: "#991B1B", label: "Rechazado"         },
  }
  return map[estado] ?? { bg: "#F3F4F6", text: "#6B7280", label: estado }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Pedidos a Laboratorio</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por paciente, comprobante o laboratorio…" class="w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos que mostrar">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Paciente</th>
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
                style="border-bottom: 1px solid rgba(196,197,213,0.12)"
                @click="router.push(`/ventas/${item.ventaId}`)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ item.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ item.pacienteNombre }}</td>
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
                  <span v-if="item.factura" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style="background:#DCFCE7;color:#166534">
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
  </div>
</template>
