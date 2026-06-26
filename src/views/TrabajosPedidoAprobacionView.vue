<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import { type TrabajoPedidoListDto } from "@/services/ventasService"
import { getPedidos, gestionarAprobacion } from "@/services/laboratorioService"

const router = useRouter()
const auth   = useAuthStore()
const canManage = auth.hasPermission("gestionar_laboratorio")

const formatDate = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const items     = ref<TrabajoPedidoListDto[]>([])
const isLoading = ref(false)
const search    = ref("")

async function load() {
  isLoading.value = true
  try { items.value = await getPedidos("PendienteAprobacion") }
  catch { items.value = [] }
  finally { isLoading.value = false }
}

onMounted(load)

const filtered = computed(() => {
  if (!search.value.trim()) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    i.clienteNombre.toLowerCase().includes(q) || i.numeroComprobante.toLowerCase().includes(q),
  )
})

// ── Modal gestión ──────────────────────────────────────────────────────────────

const showModal   = ref(false)
const isGestion   = ref(false)
const gestionError = ref("")
const selectedItem = ref<TrabajoPedidoListDto | null>(null)
const accion       = ref<"Aprobar" | "Rechazar">("Aprobar")
const observacion  = ref("")

function openModal(item: TrabajoPedidoListDto, a: "Aprobar" | "Rechazar") {
  selectedItem.value = item
  accion.value       = a
  observacion.value  = ""
  gestionError.value = ""
  showModal.value    = true
}

async function submitGestion() {
  if (!selectedItem.value) return
  isGestion.value    = true
  gestionError.value = ""
  try {
    await gestionarAprobacion(selectedItem.value.id, { accion: accion.value, observacion: observacion.value || undefined })
    showModal.value = false
    await load()
  } catch (e: any) {
    gestionError.value = e?.response?.data?.message ?? "Error al procesar"
  } finally {
    isGestion.value = false
  }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: TrabajoPedidoListDto): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${item.ventaId}`) },
    ...(canManage ? [
      { type: "separator" as const },
      { type: "item" as const, label: "Aprobar", icon: "check_circle", action: () => openModal(item, "Aprobar") },
      { type: "item" as const, label: "Rechazar", icon: "cancel", action: () => openModal(item, "Rechazar"), danger: true },
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobaciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} pedido{{ filtered.length !== 1 ? "s" : "" }} pendiente{{ filtered.length !== 1 ? "s" : "" }} de aprobación
            </p>
          </div>
        </div>

        <div class="flex justify-end mb-6">
          <SearchInput v-model="search" placeholder="Buscar por cliente o comprobante…" class="w-72" />
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay pedidos pendientes de aprobación">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo de lente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tratamientos</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Laboratorio</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Solicitado</th>
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
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="t in item.tratamientos" :key="t" class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest));color:var(--color-tertiary)">{{ t }}</span>
                    <span v-if="!item.tratamientos.length" class="text-xs" style="color:var(--color-outline)">—</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ item.laboratorioNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <div v-if="canManage" class="flex items-center justify-end gap-2">
                    <button class="w-9 h-9 rounded-full flex items-center justify-center bg-green-100 hover:scale-105 transition-all" title="Aprobar" @click="openModal(item, 'Aprobar')">
                      <span class="material-symbols-outlined text-green-700" style="font-size:18px">check_circle</span>
                    </button>
                    <button class="w-9 h-9 rounded-full flex items-center justify-center bg-red-100 hover:scale-105 transition-all" title="Rechazar" @click="openModal(item, 'Rechazar')">
                      <span class="material-symbols-outlined text-red-600" style="font-size:18px">cancel</span>
                    </button>
                  </div>
                  <RowContextMenu v-else :items="menuItems(item)" />
                </td>
              </tr>
            </template>
          </BaseTable>
        </div>

      </div>
    </main>

    <!-- Modal gestión -->
    <BaseModal :open="showModal" size="sm" :title="accion === 'Aprobar' ? 'Aprobar Pedido' : 'Rechazar Pedido'" @close="showModal = false">
      <template #body>
        <div class="space-y-4">
          <div class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ selectedItem?.clienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">{{ selectedItem?.tipoLenteNombre }} · {{ selectedItem?.laboratorioNombre }}</p>
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observaciones</label>
            <textarea v-model="observacion" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
          </div>
          <p v-if="gestionError" class="text-xs font-medium" style="color:var(--color-error)">{{ gestionError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showModal = false">Cancelar</BaseButton>
        <BaseButton :variant="accion === 'Aprobar' ? 'primary' : 'danger'" class="flex-1" :disabled="isGestion" @click="submitGestion">
          {{ isGestion ? "Procesando…" : accion }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
