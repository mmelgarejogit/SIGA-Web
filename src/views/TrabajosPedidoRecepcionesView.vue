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
import { type TrabajoPedidoListDto, type MedioEnvioLaboratorio } from "@/services/ventasService"
import { getPedidos, registrarEnvio, registrarRecepcion } from "@/services/laboratorioService"
import { imprimirOrdenTrabajo } from "@/utils/ordenTrabajoPrint"
import { inputStyle } from "@/composables/useFieldStyles"

const router = useRouter()

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const diasDesde = (s: string) =>
  Math.floor((Date.now() - new Date(s + "T00:00:00").getTime()) / 86_400_000)

// Días faltantes (negativo = atrasado) hasta una fecha estimada.
const diasHasta = (s: string) =>
  Math.ceil((new Date(s + "T00:00:00").getTime() - Date.now()) / 86_400_000)

const hoyISO = new Date().toISOString().slice(0, 10)

const medioOptions: { value: MedioEnvioLaboratorio; label: string }[] = [
  { value: "WhatsApp",  label: "WhatsApp" },
  { value: "Email",     label: "Email" },
  { value: "Portal",    label: "Portal del laboratorio" },
  { value: "Telefono",  label: "Teléfono" },
  { value: "EnPersona", label: "En persona" },
  { value: "Otro",      label: "Otro" },
]

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

// Datos del envío (solo para actionType === "enviar")
const fechaEstimada = ref("")
const medioEnvio    = ref<MedioEnvioLaboratorio | "">("")

function openAction(item: TrabajoPedidoListDto, type: "enviar" | "recibir") {
  selectedItem.value  = item
  actionType.value    = type
  actionError.value   = ""
  fechaEstimada.value = ""
  medioEnvio.value    = ""
  showConfirm.value   = true
}

async function submitAction() {
  if (!selectedItem.value) return
  isProcessing.value = true
  actionError.value  = ""
  try {
    if (actionType.value === "enviar")
      await registrarEnvio(selectedItem.value.id, {
        fechaEstimadaEntrega: fechaEstimada.value || undefined,
        medioEnvio:           medioEnvio.value || undefined,
      })
    else
      await registrarRecepcion(selectedItem.value.id)
    showConfirm.value = false
    await load()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Error al procesar"
  } finally {
    isProcessing.value = false
  }
}

// Semáforo de entrega: contra la fecha estimada si existe; si no, días en tránsito.
function entregaBadge(item: TrabajoPedidoListDto): { label: string; style: string; title: string } | null {
  if (item.estado !== "Enviado") return null
  const verde  = "background:var(--color-success-container);color:var(--color-on-success-container)"
  const ambar  = "background:var(--color-warning-container);color:var(--color-on-warning-container)"
  const rojo   = "background:var(--color-error-container);color:var(--color-on-error-container)"
  if (item.fechaEstimadaEntrega) {
    const d = diasHasta(item.fechaEstimadaEntrega)
    const title = `Entrega estimada: ${formatDate(item.fechaEstimadaEntrega)}`
    if (d < 0)  return { label: `${-d}d atraso`, style: rojo,  title }
    if (d <= 2) return { label: `faltan ${d}d`,  style: ambar, title }
    return { label: `faltan ${d}d`, style: verde, title }
  }
  if (item.fechaEnvio) {
    const d = diasDesde(item.fechaEnvio)
    const style = d > 10 ? rojo : d > 5 ? ambar : verde
    return { label: `${d}d en tránsito`, style, title: "Sin fecha estimada de entrega" }
  }
  return null
}

function imprimir(item: TrabajoPedidoListDto) {
  imprimirOrdenTrabajo(item)
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  if (estado === "PendienteEnvio") return { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "Pend. envío" }
  if (estado === "Enviado")        return { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Enviado" }
  return { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Imprimir orden de trabajo", icon: "print", action: () => imprimir(item) },
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
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Envíos y Recepciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }} en tránsito
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por cliente o laboratorio…" class="w-full sm:w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos en tránsito">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo de lente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Enviado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Entrega</th>
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
                  <span v-if="entregaBadge(item)" class="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                    :style="entregaBadge(item)!.style" :title="entregaBadge(item)!.title">{{ entregaBadge(item)!.label }}</span>
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
        <div class="space-y-4">
          <div class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ selectedItem?.clienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">{{ selectedItem?.tipoLenteNombre }} · {{ selectedItem?.laboratorioNombre }}</p>
          </div>

          <!-- Envío: orden de trabajo + compromiso de entrega + medio -->
          <template v-if="actionType === 'enviar'">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all hover:scale-[1.01] active:scale-95"
              style="background:var(--color-surface-container-high);color:var(--color-on-surface-variant)"
              @click="selectedItem && imprimir(selectedItem)"
            >
              <span class="material-symbols-outlined" style="font-size:18px">print</span>
              Imprimir orden de trabajo
            </button>

            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Entrega estimada</label>
              <input type="date" v-model="fechaEstimada" :min="hoyISO"
                class="mt-1 w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)" />
            </div>

            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Medio de envío</label>
              <select v-model="medioEnvio"
                class="mt-1 w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)">
                <option value="">Sin especificar</option>
                <option v-for="m in medioOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>

            <p class="text-xs" style="color:var(--color-on-surface-variant)">
              Se registrará el envío de los lentes al laboratorio. La fecha estimada alimenta el semáforo de atrasos.
            </p>
          </template>

          <p v-else class="text-sm" style="color:var(--color-on-surface-variant)">
            Se registrará la recepción de los lentes terminados. El cobro de la venta es independiente y no se ve afectado.
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
