<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import {
  getComprasPedidos,
  confirmarPedido,
  cancelarPedido,
  type PedidoCompras,
} from "@/services/comprasService"

const router = useRouter()

const pedidos   = ref<PedidoCompras[]>([])
const isLoading = ref(true)
const loadError = ref("")

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const r = await getComprasPedidos({ estado: "Borrador", pageSize: 100 })
    pedidos.value = r.items
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar las órdenes."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency", currency: "PYG", maximumFractionDigits: 0,
  }).format(n)
}

function pedidoTotal(p: PedidoCompras) {
  return p.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
}

// ── Confirmar ──────────────────────────────────────────────────────────────────

const confirmandoId = ref<number | null>(null)

const showConfirmarModal  = ref(false)
const confirmarTarget     = ref<PedidoCompras | null>(null)
const confirmarError      = ref("")

function openConfirmar(p: PedidoCompras) {
  confirmarTarget.value = p
  confirmarError.value  = ""
  showConfirmarModal.value = true
}

async function submitConfirmar() {
  if (!confirmarTarget.value) return
  confirmandoId.value  = confirmarTarget.value.id
  confirmarError.value = ""
  try {
    await confirmarPedido(confirmarTarget.value.id)
    showConfirmarModal.value = false
    pedidos.value = pedidos.value.filter(p => p.id !== confirmarTarget.value!.id)
  } catch (err: unknown) {
    confirmarError.value = err instanceof Error ? err.message : "Error al confirmar."
  } finally {
    confirmandoId.value = null
  }
}

// ── Rechazar (Cancelar) ────────────────────────────────────────────────────────

const rechazandoId   = ref<number | null>(null)

const showRechazarModal  = ref(false)
const rechazarTarget     = ref<PedidoCompras | null>(null)
const rechazarError      = ref("")
const motivoRechazo      = ref("")

function openRechazar(p: PedidoCompras) {
  rechazarTarget.value    = p
  rechazarError.value     = ""
  motivoRechazo.value     = ""
  showRechazarModal.value = true
}

async function submitRechazar() {
  if (!rechazarTarget.value) return
  rechazandoId.value  = rechazarTarget.value.id
  rechazarError.value = ""
  try {
    await cancelarPedido(rechazarTarget.value.id)
    showRechazarModal.value = false
    pedidos.value = pedidos.value.filter(p => p.id !== rechazarTarget.value!.id)
  } catch (err: unknown) {
    rechazarError.value = err instanceof Error ? err.message : "Error al rechazar."
  } finally {
    rechazandoId.value = null
  }
}

const pendientesCount = computed(() => pedidos.value.length)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobaciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Revisá y aprobá o rechazá las órdenes de compra pendientes
            </p>
          </div>
          <BaseButton variant="secondary" size="sm" @click="load">
            <span class="material-symbols-outlined" style="font-size: 18px">refresh</span>
            Actualizar
          </BaseButton>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Sin pendientes -->
        <div v-else-if="pedidos.length === 0"
          class="rounded-2xl py-20 flex flex-col items-center text-center gap-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center"
            style="background-color: var(--color-success-container)">
            <span class="material-symbols-outlined text-4xl" style="color: var(--color-on-success-container)">check_circle</span>
          </div>
          <div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin órdenes pendientes</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay órdenes de compra en estado Borrador esperando aprobación.
            </p>
          </div>
        </div>

        <!-- Lista de OCs pendientes -->
        <div v-else class="space-y-4">

          <!-- Contador -->
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
              style="background-color: var(--color-primary); color: var(--color-on-primary)">
              {{ pendientesCount }}
            </span>
            <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
              orden{{ pendientesCount !== 1 ? 'es' : '' }} pendiente{{ pendientesCount !== 1 ? 's' : '' }} de aprobación
            </span>
          </div>

          <!-- Card por OC -->
          <div v-for="p in pedidos" :key="p.id"
            class="rounded-lg overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">

            <!-- Header de card -->
            <div class="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
              style="border-bottom: 1px solid var(--color-hairline-soft)">
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                  style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant)">
                  OC #{{ p.id }}
                </span>
                <div>
                  <p class="font-bold" style="color: var(--color-on-surface)">{{ p.proveedorNombre }}</p>
                  <p class="text-xs" style="color: var(--color-on-surface-variant)">
                    Creada el {{ formatDate(p.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 text-sm font-semibold transition-all hover:opacity-75"
                  style="color: var(--color-primary)"
                  @click="router.push(`/compras/oc/${p.id}?from=aprobacion`)">
                  <span class="material-symbols-outlined" style="font-size: 16px">open_in_new</span>
                  Ver detalle
                </button>
              </div>
            </div>

            <!-- Ítems de la OC -->
            <div class="px-6 py-4">
              <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm mb-4">
                <thead>
                  <tr style="border-bottom: 1px solid var(--color-hairline-soft)">
                    <th class="text-left pb-2 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                    <th class="text-center pb-2 text-xs font-bold uppercase tracking-wider" style="width: 80px; color: var(--color-outline)">Cant.</th>
                    <th class="text-right pb-2 text-xs font-bold uppercase tracking-wider" style="width: 160px; color: var(--color-outline)">Precio c/u</th>
                    <th class="text-right pb-2 text-xs font-bold uppercase tracking-wider" style="width: 160px; color: var(--color-outline)">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in p.items" :key="item.id"
                    style="border-bottom: 1px solid rgba(196,197,213,0.07)">
                    <td class="py-2 font-medium" style="color: var(--color-on-surface)">{{ item.productoNombre }}</td>
                    <td class="py-2 text-center" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                    <td class="py-2 text-right" style="color: var(--color-on-surface-variant)">{{ formatPrice(item.precioUnitario) }}</td>
                    <td class="py-2 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(item.cantidad * item.precioUnitario) }}</td>
                  </tr>
                </tbody>
              </table></div>

              <!-- Observaciones -->
              <p v-if="p.observaciones" class="text-sm italic mb-4" style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined align-middle mr-1" style="font-size: 15px">notes</span>
                {{ p.observaciones }}
              </p>

              <!-- Footer de card: total + acciones -->
              <div class="flex items-center justify-between pt-3"
                style="border-top: 1px solid var(--color-hairline-soft)">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider mr-2" style="color: var(--color-outline)">Total estimado</span>
                  <span class="text-xl font-extrabold" style="color: var(--color-primary)">
                    {{ formatPrice(pedidoTotal(p)) }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <BaseButton variant="secondary" size="default" :disabled="rechazandoId === p.id || confirmandoId === p.id"
                    @click="openRechazar(p)">
                    <span class="material-symbols-outlined" style="font-size: 18px">cancel</span>
                    Rechazar
                  </BaseButton>
                  <BaseButton variant="primary" size="default" :disabled="confirmandoId === p.id || rechazandoId === p.id"
                    @click="openConfirmar(p)">
                    <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
                    Aprobar
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Modal Confirmar -->
    <BaseModal :show="showConfirmarModal" title="Aprobar Orden de Compra" size="sm" @close="showConfirmarModal = false">
      <div class="flex flex-col items-center text-center gap-4 py-2">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background-color: var(--color-success-container)">
          <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-on-success-container)">check_circle</span>
        </div>
        <div>
          <p class="text-sm font-semibold mb-1" style="color: var(--color-on-surface)">
            ¿Aprobar la OC <strong>#{{ confirmarTarget?.id }}</strong>?
          </p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            La orden pasará a estado <strong>Confirmada</strong> y quedará lista para ser facturada.
          </p>
        </div>
        <div v-if="confirmarError" class="w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
          {{ confirmarError }}
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" :disabled="confirmandoId !== null" @click="showConfirmarModal = false">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" :disabled="confirmandoId !== null" @click="submitConfirmar">
            <span v-if="confirmandoId !== null" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ confirmandoId !== null ? "Aprobando…" : "Sí, aprobar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Rechazar -->
    <BaseModal :show="showRechazarModal" title="Rechazar Orden de Compra" size="sm" @close="showRechazarModal = false">
      <div class="flex flex-col items-center text-center gap-4 py-2 mb-4">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-error)">cancel</span>
        </div>
        <div>
          <p class="text-sm font-semibold mb-1" style="color: var(--color-on-surface)">
            ¿Rechazar la OC <strong>#{{ rechazarTarget?.id }}</strong>?
          </p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            La orden pasará a estado <strong>Cancelada</strong>.
          </p>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
          Motivo del rechazo <span style="color: var(--color-outline)">(opcional)</span>
        </label>
        <textarea v-model="motivoRechazo" rows="3"
          placeholder="Indicá el motivo del rechazo…"
          class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none transition-all resize-none"
          :style="inputStyle(false)"
          maxlength="500" />
        <p v-if="rechazarError" class="mt-2 text-xs font-medium" style="color: var(--color-error)">{{ rechazarError }}</p>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" :disabled="rechazandoId !== null" @click="showRechazarModal = false">
            Cancelar
          </BaseButton>
          <BaseButton variant="danger" :disabled="rechazandoId !== null" @click="submitRechazar">
            <span v-if="rechazandoId !== null" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ rechazandoId !== null ? "Rechazando…" : "Sí, rechazar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

  </div>
</template>
