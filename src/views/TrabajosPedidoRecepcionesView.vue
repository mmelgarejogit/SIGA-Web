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
import { type TrabajoPedidoListDto, type MedioEnvioLaboratorio, type MotivoRetrabajo, type ResponsableRetrabajo } from "@/services/ventasService"
import { getPedidos, registrarEnvio, registrarRecepcion, registrarEntrega, registrarRetrabajo } from "@/services/laboratorioService"
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

const motivoRetrabajoOptions: { value: MotivoRetrabajo; label: string }[] = [
  { value: "DefectoLaboratorio",  label: "Defecto del laboratorio" },
  { value: "ErrorOptica",         label: "Error de la óptica" },
  { value: "NoAdaptacionCliente", label: "No adaptación del cliente" },
  { value: "RoturaGarantia",      label: "Rotura en garantía" },
  { value: "Otro",                label: "Otro" },
]

const responsableRetrabajoOptions: { value: ResponsableRetrabajo; label: string }[] = [
  { value: "Laboratorio", label: "Laboratorio (lo rehace sin costo)" },
  { value: "Optica",      label: "Óptica (asume el costo)" },
]

const motivoRetrabajoLabel = (v: string) => motivoRetrabajoOptions.find((o) => o.value === v)?.label ?? v

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const estadoFiltro = ref<string[]>([])

const estadoOptions = [
  { value: "PendienteEnvio", label: "Pend. envío",         dot: "var(--color-on-info-container)" },
  { value: "Enviado",        label: "Enviado",             dot: "var(--color-on-warning-container)" },
  { value: "Recibido",       label: "Listos para retirar", dot: "var(--color-on-success-container)" },
  { value: "Entregado",      label: "Entregados",          dot: "var(--color-outline)" },
]

// Sin filtro se muestra el ciclo activo (los entregados son historial, se ven al filtrar).
const ESTADOS_ACTIVOS = ["PendienteEnvio", "Enviado", "Recibido"]

async function load() {
  isLoading.value = true
  try {
    const estados = estadoFiltro.value.length ? estadoFiltro.value : ESTADOS_ACTIVOS
    const results = await Promise.all(estados.map((e) => getPedidos(e)))
    items.value = results.flat()
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
const actionType    = ref<"enviar" | "recibir" | "entregar" | "retrabajo">("enviar")

// Datos del envío (solo para actionType === "enviar")
const fechaEstimada = ref("")
const medioEnvio    = ref<MedioEnvioLaboratorio | "">("")
// Dato del retiro (solo para actionType === "entregar")
const retiradoPor   = ref("")
// Datos del re-trabajo (solo para actionType === "retrabajo")
const motivoRetrabajo      = ref<MotivoRetrabajo | "">("")
const responsableRetrabajo = ref<ResponsableRetrabajo | "">("")
const obsRetrabajo         = ref("")

function openAction(item: TrabajoPedidoListDto, type: "enviar" | "recibir" | "entregar" | "retrabajo") {
  selectedItem.value       = item
  actionType.value         = type
  actionError.value        = ""
  fechaEstimada.value      = ""
  medioEnvio.value         = ""
  retiradoPor.value        = ""
  motivoRetrabajo.value      = ""
  responsableRetrabajo.value = ""
  obsRetrabajo.value         = ""
  showConfirm.value        = true
}

async function submitAction() {
  if (!selectedItem.value) return
  if (actionType.value === "retrabajo" && (!motivoRetrabajo.value || !responsableRetrabajo.value)) {
    actionError.value = "Indicá el motivo y quién asume el costo."
    return
  }
  isProcessing.value = true
  actionError.value  = ""
  try {
    if (actionType.value === "enviar")
      await registrarEnvio(selectedItem.value.id, {
        fechaEstimadaEntrega: fechaEstimada.value || undefined,
        medioEnvio:           medioEnvio.value || undefined,
      })
    else if (actionType.value === "recibir")
      await registrarRecepcion(selectedItem.value.id)
    else if (actionType.value === "entregar")
      await registrarEntrega(selectedItem.value.id, { retiradoPor: retiradoPor.value.trim() || undefined })
    else
      await registrarRetrabajo(selectedItem.value.id, {
        motivo:      motivoRetrabajo.value as MotivoRetrabajo,
        responsable: responsableRetrabajo.value as ResponsableRetrabajo,
        observacion: obsRetrabajo.value.trim() || undefined,
      })
    showConfirm.value = false
    await load()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Error al procesar"
  } finally {
    isProcessing.value = false
  }
}

const modalTitle = computed(() =>
  actionType.value === "enviar"    ? "Registrar Envío al Laboratorio"
  : actionType.value === "recibir"  ? "Registrar Recepción"
  : actionType.value === "entregar" ? "Registrar Entrega al Cliente"
  : "Registrar Re-trabajo (rehacer)")

const submitLabel = computed(() =>
  actionType.value === "enviar"    ? "Registrar envío"
  : actionType.value === "recibir"  ? "Registrar recepción"
  : actionType.value === "entregar" ? "Registrar entrega"
  : "Mandar a rehacer")

// Semáforo de la columna Entrega:
//  · Enviado   → contra la fecha estimada (o días en tránsito).
//  · Recibido  → cuánto lleva en el cajón esperando que el cliente lo retire.
//  · Entregado → fecha de entrega real.
function entregaBadge(item: TrabajoPedidoListDto): { label: string; style: string; title: string } | null {
  const verde  = "background:var(--color-success-container);color:var(--color-on-success-container)"
  const ambar  = "background:var(--color-warning-container);color:var(--color-on-warning-container)"
  const rojo   = "background:var(--color-error-container);color:var(--color-on-error-container)"
  const neutro = "background:var(--color-surface-container);color:var(--color-outline)"

  if (item.estado === "Entregado") {
    return { label: `entregado ${formatDate(item.fechaEntrega)}`, style: neutro,
             title: item.retiradoPor ? `Retiró: ${item.retiradoPor}` : "Entregado al cliente" }
  }

  if (item.estado === "Recibido" && item.fechaRecepcion) {
    const d = diasDesde(item.fechaRecepcion)
    const style = d > 10 ? rojo : d > 3 ? ambar : verde
    const title = `Listo desde ${formatDate(item.fechaRecepcion)} — esperando retiro`
    return { label: d === 0 ? "listo hoy" : `listo hace ${d}d`, style, title }
  }

  if (item.estado !== "Enviado") return null
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
  if (estado === "Recibido")       return { bg: "var(--color-success-container)", text: "var(--color-on-success-container)", label: "Listo para retirar" }
  if (estado === "Entregado")      return { bg: "var(--color-surface-container-high)", text: "var(--color-on-surface-variant)", label: "Entregado" }
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
    ...(item.estado === "Recibido"
      ? [{ type: "item" as const, label: "Registrar entrega (retiro)", icon: "how_to_reg", action: () => openAction(item, "entregar") }]
      : []),
    ...(item.estado === "Recibido" || item.estado === "Entregado"
      ? [{ type: "item" as const, label: "Registrar re-trabajo (rehacer)", icon: "build", action: () => openAction(item, "retrabajo") }]
      : []),
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Envíos y Recepciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }} en seguimiento
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" @update:model-value="load" />
          <SearchInput v-model="search" placeholder="Buscar por cliente o laboratorio…" class="w-full sm:w-72" />
        </div>

        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
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
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">
                  <div class="flex items-center gap-2">
                    <span>{{ item.clienteNombre }}</span>
                    <span v-if="item.retrabajos.length" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      style="background:var(--color-warning-container);color:var(--color-on-warning-container)"
                      :title="`Rehecho ${item.retrabajos.length} vez(ces). Último: ${motivoRetrabajoLabel(item.retrabajos[0]?.motivo ?? '')}`">
                      rehecho {{ item.retrabajos.length }}×
                    </span>
                  </div>
                </td>
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
      :title="modalTitle"
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

          <p v-else-if="actionType === 'recibir'" class="text-sm" style="color:var(--color-on-surface-variant)">
            Se registrará la recepción de los lentes terminados. El cobro de la venta es independiente y no se ve afectado.
          </p>

          <!-- Entrega: retiro por el cliente -->
          <template v-else-if="actionType === 'entregar'">
            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Retiró (opcional)</label>
              <input type="text" v-model="retiradoPor" maxlength="200" placeholder="Nombre de quien retira, si no es el cliente"
                class="mt-1 w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)" />
            </div>
            <p class="text-xs" style="color:var(--color-on-surface-variant)">
              Se marcará el pedido como <strong>entregado</strong>. Requiere que el comprobante de la venta ya esté emitido
              (no se entregan los lentes sin documento).
            </p>
          </template>

          <!-- Re-trabajo: mandar a rehacer (garantía, sin costo al cliente) -->
          <template v-else>
            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Motivo</label>
              <select v-model="motivoRetrabajo"
                class="mt-1 w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)">
                <option value="">Seleccionar…</option>
                <option v-for="m in motivoRetrabajoOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Asume el costo</label>
              <select v-model="responsableRetrabajo"
                class="mt-1 w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)">
                <option value="">Seleccionar…</option>
                <option v-for="r in responsableRetrabajoOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Observación (opcional)</label>
              <textarea v-model="obsRetrabajo" rows="2" maxlength="1000" placeholder="Detalle del problema"
                class="mt-1 w-full px-4 py-3 rounded-md text-sm outline-none appearance-none shadow-none transition-all resize-none"
                :style="inputStyle(false)"></textarea>
            </div>

            <p v-if="selectedItem && selectedItem.retrabajos.length" class="text-xs font-medium" style="color:var(--color-warning)">
              Este trabajo ya se rehízo {{ selectedItem.retrabajos.length }} vez(ces).
            </p>
            <p class="text-xs" style="color:var(--color-on-surface-variant)">
              El trabajo vuelve a <strong>Pendiente de envío</strong> para rehacerse. No genera ningún cobro al cliente
              (es garantía). Queda constancia del motivo y de quién asume el costo.
            </p>
          </template>

          <p v-if="actionError" class="text-xs font-medium" style="color:var(--color-error)">{{ actionError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showConfirm = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isProcessing" @click="submitAction">
          {{ isProcessing ? "Registrando…" : submitLabel }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
