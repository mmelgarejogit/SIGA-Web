<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type TrabajoPedidoListDto } from "@/services/ventasService"
import { getPedidos, registrarEnvio, registrarRecepcion } from "@/services/laboratorioService"

const router = useRouter()

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const diasDesde = (s: string) =>
  Math.floor((Date.now() - new Date(s + "T00:00:00").getTime()) / 86_400_000)

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const estadoFiltro = ref<string[]>([])

const estadoOptions = [
  { value: "PendienteEnvio", label: "Pend. envío", dot: "var(--color-on-info-container)" },
  { value: "Enviado",        label: "Enviado",     dot: "var(--color-on-warning-container)" },
]

async function load() {
  isLoading.value = true
  try {
    const [pendEnvio, enviados] = await Promise.all([
      getPedidos("PendienteEnvio"),
      getPedidos("Enviado"),
    ])
    const all = [...pendEnvio, ...enviados]
    if (estadoFiltro.value.includes("PendienteEnvio") && estadoFiltro.value.includes("Enviado"))
      items.value = all
    else if (estadoFiltro.value.includes("PendienteEnvio"))
      items.value = pendEnvio
    else if (estadoFiltro.value.includes("Enviado"))
      items.value = enviados
    else
      items.value = all
  } catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    i.clienteNombre.toLowerCase().includes(q) || i.laboratorioNombre.toLowerCase().includes(q),
  )
})

// ── Acciones ───────────────────────────────────────────────────────────────────

const showConfirm   = ref(false)
const isProcessing  = ref(false)
const actionError   = ref("")
const selectedItem  = ref<TrabajoPedidoListDto | null>(null)
const actionType    = ref<"enviar" | "recibir">("enviar")

function openAction(item: TrabajoPedidoListDto, type: "enviar" | "recibir") {
  selectedItem.value = item
  actionType.value   = type
  actionError.value  = ""
  showConfirm.value  = true
}

async function submitAction() {
  if (!selectedItem.value) return
  isProcessing.value = true
  actionError.value  = ""
  try {
    if (actionType.value === "enviar")
      await registrarEnvio(selectedItem.value.id)
    else
      await registrarRecepcion(selectedItem.value.id)
    showConfirm.value = false
    await load()
  } catch (e: any) {
    actionError.value = e?.response?.data?.message ?? "Error al procesar"
  } finally {
    isProcessing.value = false
  }
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  if (estado === "PendienteEnvio") return { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "Pend. envío" }
  if (estado === "Enviado")        return { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Enviado" }
  return { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
    { type: "separator" },
    ...(item.estado === "PendienteEnvio"
      ? [{ type: "item" as const, label: "Registrar envío al lab", icon: "local_shipping", action: () => openAction(item, "enviar") }]
      : []),
    ...(item.estado === "Enviado"
      ? [{ type: "item" as const, label: "Registrar recepción", icon: "inventory", action: () => openAction(item, "recibir") }]
      : []),
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Envíos y Recepciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }} en tránsito
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por cliente o laboratorio…" class="w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos en tránsito">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo de lente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Enviado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Días</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr v-for="item in filtered" :key="item.id"
                class="hover:bg-surface-container-low"
                style="border-bottom: 1px solid var(--color-hairline-soft)">
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ item.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.tipoLenteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.laboratorioNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaEnvio) }}</td>
                <td class="px-6 py-4">
                  <span v-if="item.fechaEnvio" class="text-xs font-bold px-2 py-1 rounded-full"
                    :style="diasDesde(item.fechaEnvio) > 10
                      ? 'background:var(--color-error-container);color:var(--color-on-error-container)'
                      : diasDesde(item.fechaEnvio) > 5
                        ? 'background:var(--color-warning-container);color:var(--color-on-warning-container)'
                        : 'background:var(--color-success-container);color:var(--color-on-success-container)'"
                  >{{ diasDesde(item.fechaEnvio) }}d</span>
                  <span v-else class="text-xs" style="color:var(--color-outline)">—</span>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoBadge(item.estado).bg}; color: ${estadoBadge(item.estado).text}`">
                    {{ estadoBadge(item.estado).label }}
                  </span>
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

    <!-- Modal confirmar acción -->
    <BaseModal :open="showConfirm" size="sm"
      :title="actionType === 'enviar' ? 'Registrar Envío al Laboratorio' : 'Registrar Recepción'"
      @close="showConfirm = false">
      <template #body>
        <div class="space-y-3">
          <div class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ selectedItem?.clienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">{{ selectedItem?.tipoLenteNombre }} · {{ selectedItem?.laboratorioNombre }}</p>
          </div>
          <p class="text-sm" style="color:var(--color-on-surface-variant)">
            <span v-if="actionType === 'enviar'">Se registrará el envío de los lentes al laboratorio.</span>
            <span v-else>Se registrará la recepción de los lentes terminados. El cobro de la venta es independiente y no se ve afectado.</span>
          </p>
          <p v-if="actionError" class="text-xs font-medium" style="color:var(--color-error)">{{ actionError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showConfirm = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isProcessing" @click="submitAction">
          {{ isProcessing ? "Registrando…" : actionType === "enviar" ? "Registrar envío" : "Registrar recepción" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
