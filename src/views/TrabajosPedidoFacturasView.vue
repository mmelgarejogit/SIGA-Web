<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type TrabajoPedidoListDto, type EmitirFacturaLaboratorioRequest } from "@/services/ventasService"
import { getPedidos, emitirFactura } from "@/services/laboratorioService"

const router = useRouter()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")
const filtroFactura = ref<string[]>([])

const filtroOptions = [
  { value: "con",    label: "Con factura",    dot: "#166534" },
  { value: "sin",    label: "Sin factura",    dot: "#92400E" },
]

async function load() {
  isLoading.value = true
  try { items.value = await getPedidos("Recibido") }
  catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  let list = items.value
  if (filtroFactura.value.includes("con") && !filtroFactura.value.includes("sin"))
    list = list.filter(i => !!i.factura)
  else if (filtroFactura.value.includes("sin") && !filtroFactura.value.includes("con"))
    list = list.filter(i => !i.factura)

  if (!search.value.trim()) return list
  const q = search.value.toLowerCase()
  return list.filter(i =>
    i.clienteNombre.toLowerCase().includes(q) ||
    i.laboratorioNombre.toLowerCase().includes(q) ||
    i.factura?.numeroFactura.toLowerCase().includes(q),
  )
})

const totalFacturado = computed(() => filtered.value.filter(i => i.factura).reduce((s, i) => s + (i.factura?.monto ?? 0), 0))

// ── Modal emitir factura ───────────────────────────────────────────────────────

const showModal    = ref(false)
const isEmitiendo  = ref(false)
const emitError    = ref("")
const selectedItem = ref<TrabajoPedidoListDto | null>(null)
const factForm = reactive<EmitirFacturaLaboratorioRequest>({
  numeroFactura: "",
  timbrado:      "",
  fechaEmision:  new Date().toISOString().slice(0, 10),
  monto:         0,
  observaciones: "",
})

function openModal(item: TrabajoPedidoListDto) {
  selectedItem.value   = item
  factForm.numeroFactura = ""
  factForm.timbrado      = ""
  factForm.fechaEmision  = new Date().toISOString().slice(0, 10)
  factForm.monto         = 0
  factForm.observaciones = ""
  emitError.value        = ""
  showModal.value        = true
}

async function submitFactura() {
  if (!selectedItem.value) return
  if (!factForm.numeroFactura.trim() || factForm.monto <= 0) {
    emitError.value = "Número de factura y monto son obligatorios."; return
  }
  isEmitiendo.value = true
  emitError.value   = ""
  try {
    await emitirFactura(selectedItem.value.id, {
      numeroFactura: factForm.numeroFactura.trim(),
      timbrado:      factForm.timbrado?.trim() || undefined,
      fechaEmision:  factForm.fechaEmision,
      monto:         factForm.monto,
      observaciones: factForm.observaciones?.trim() || undefined,
    })
    showModal.value = false
    await load()
  } catch (e: any) {
    emitError.value = e?.response?.data?.message ?? "Error al registrar factura"
  } finally {
    isEmitiendo.value = false
  }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
    ...(!item.factura ? [
      { type: "separator" as const },
      { type: "item" as const, label: "Registrar factura", icon: "receipt_long", action: () => openModal(item) },
    ] : []),
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.filter(i => i.factura).length }} factura{{ filtered.filter(i => i.factura).length !== 1 ? "s" : "" }} registrada{{ filtered.filter(i => i.factura).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <div v-if="totalFacturado > 0" class="rounded-2xl px-6 py-4 text-right" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Total facturado</p>
            <p class="text-2xl font-extrabold" style="color: var(--color-primary)">{{ formatPrice(totalFacturado) }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips v-model="filtroFactura" :options="filtroOptions" placeholder="Factura" />
          <SearchInput v-model="search" placeholder="Buscar por cliente, lab o n° factura…" class="w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos recibidos">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Recepción</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">N° Factura</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Monto</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr v-for="item in filtered" :key="item.id"
                class="hover:bg-surface-container-low"
                style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ item.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.laboratorioNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaRecepcion) }}</td>
                <td class="px-6 py-4">
                  <span v-if="item.factura" class="text-sm font-mono font-semibold" style="color: #166534">{{ item.factura.numeroFactura }}</span>
                  <button v-else class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:scale-105"
                    style="background:#FEF3C7;color:#92400E" @click="openModal(item)">
                    <span class="material-symbols-outlined" style="font-size:13px">add</span>
                    Registrar
                  </button>
                </td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">
                  {{ item.factura ? formatPrice(item.factura.monto) : "—" }}
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

    <!-- Modal registrar factura -->
    <BaseModal :open="showModal" size="lg" title="Registrar Factura del Laboratorio" @close="showModal = false">
      <template #body>
        <div class="space-y-4">
          <div class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ selectedItem?.clienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">{{ selectedItem?.tipoLenteNombre }} · {{ selectedItem?.laboratorioNombre }}</p>
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">N° Factura *</label>
            <input v-model="factForm.numeroFactura" type="text" placeholder="001-001-0000001"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Timbrado</label>
              <input v-model="factForm.timbrado" type="text"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Fecha Emisión *</label>
              <input v-model="factForm.fechaEmision" type="date"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Monto *</label>
            <input v-model.number="factForm.monto" type="number" min="0"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observaciones</label>
            <textarea v-model="factForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
          </div>
          <p v-if="emitError" class="text-xs font-medium" style="color:var(--color-error)">{{ emitError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isEmitiendo" @click="submitFactura">
          {{ isEmitiendo ? "Guardando…" : "Registrar factura" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
