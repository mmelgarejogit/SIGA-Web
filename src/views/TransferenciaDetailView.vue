<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { type Transferencia, getTransferenciaById, resolverTransferencia } from "@/services/stockService"
import { useAuthStore } from "@/stores/auth"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canApprove = auth.hasPermission("gestionar_inventario")

const transferencia = ref<Transferencia | null>(null)
const isLoading = ref(true)
const saving = ref(false)
const errorMsg = ref("")
const motivoRechazo = ref("")
const showRejectModal = ref(false)

const formatDate = (d: string) => new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

const estadoStyle = (e: string) =>
  e === "Solicitada" ? "bg-amber-100 text-amber-700" :
  e === "Aprobada"   ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"

async function load() {
  isLoading.value = true
  try { transferencia.value = await getTransferenciaById(route.params.id as string) }
  finally { isLoading.value = false }
}

async function aprobar() {
  saving.value = true; errorMsg.value = ""
  try { transferencia.value = await resolverTransferencia(transferencia.value!.id, "Aprobar") }
  catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al aprobar." }
  finally { saving.value = false }
}

async function rechazar() {
  if (!motivoRechazo.value.trim()) { errorMsg.value = "El motivo de rechazo es obligatorio."; return }
  saving.value = true; errorMsg.value = ""
  try {
    transferencia.value = await resolverTransferencia(transferencia.value!.id, "Rechazar", motivoRechazo.value.trim())
    showRejectModal.value = false
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al rechazar." }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8 max-w-3xl">

        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <h1 class="text-4xl font-extrabold tracking-tight">Detalle de Transferencia</h1>
        </div>

        <div v-if="isLoading" class="text-center py-16" style="color:var(--color-outline)">Cargando…</div>

        <template v-else-if="transferencia">
          <div class="flex items-center gap-3 mb-6">
            <span class="px-4 py-2 rounded-full text-sm font-bold" :class="estadoStyle(transferencia.estado)">{{ transferencia.estado }}</span>
            <span class="text-sm" style="color:var(--color-outline)">{{ formatDate(transferencia.fechaCreacion) }}</span>
          </div>

          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm mb-4" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <!-- Encabezado transferencia -->
          <div class="rounded-2xl p-8 mb-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
            <div class="flex items-center gap-4 mb-6">
              <div class="text-center flex-1">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Origen</p>
                <p class="font-bold text-lg">{{ transferencia.sucursalOrigenNombre }}</p>
              </div>
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-3xl" style="color:var(--color-primary)">arrow_forward</span>
              </div>
              <div class="text-center flex-1">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Destino</p>
                <p class="font-bold text-lg">{{ transferencia.sucursalDestinoNombre }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Solicitado por</p>
                <p class="text-sm">{{ transferencia.solicitadoPorNombre }}</p>
              </div>
              <div v-if="transferencia.aprobadoPorNombre">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Resuelto por</p>
                <p class="text-sm">{{ transferencia.aprobadoPorNombre }}</p>
              </div>
              <div v-if="transferencia.observacion" class="col-span-2">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación</p>
                <p class="text-sm">{{ transferencia.observacion }}</p>
              </div>
              <div v-if="transferencia.motivoRechazo" class="col-span-2">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-error)">Motivo de rechazo</p>
                <p class="text-sm">{{ transferencia.motivoRechazo }}</p>
              </div>
            </div>
          </div>

          <!-- Líneas -->
          <div class="rounded-2xl overflow-hidden mb-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
            <div class="px-6 py-4" style="border-bottom:1px solid rgba(196,197,213,0.2)">
              <h3 class="font-bold" style="color:var(--color-primary)">Productos</h3>
            </div>
            <table class="w-full">
              <thead style="background-color:var(--color-surface-container-low)">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto</th>
                  <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Variante</th>
                  <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in transferencia.lineas" :key="l.id" class="border-t" style="border-color:rgba(196,197,213,0.12)">
                  <td class="px-6 py-4 font-semibold text-sm">{{ l.productoNombre }}</td>
                  <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">
                    {{ [l.sku, l.color, l.talle].filter(Boolean).join(' · ') || '—' }}
                  </td>
                  <td class="px-6 py-4 text-right font-bold">{{ l.cantidad }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Acciones -->
          <template v-if="canApprove && transferencia.estado === 'Solicitada'">
            <div class="rounded-2xl p-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
              <p class="text-sm font-bold mb-4" style="color:var(--color-outline)">Al aprobar se validará el stock disponible en origen y se generarán los movimientos automáticamente.</p>
              <div class="flex gap-3">
                <BaseButton variant="primary" :disabled="saving" @click="aprobar">
                  <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                  {{ saving ? 'Procesando…' : 'Aprobar Transferencia' }}
                </BaseButton>
                <BaseButton variant="danger" :disabled="saving" @click="showRejectModal = true">
                  <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                  Rechazar
                </BaseButton>
              </div>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>

  <!-- Modal Rechazar -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showRejectModal = false" />
        <div class="relative w-full max-w-sm rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="px-8 pt-8 pb-6">
            <h3 class="text-xl font-extrabold mb-3" style="color:var(--color-error)">Rechazar transferencia</h3>
            <textarea v-model="motivoRechazo" rows="3" placeholder="Motivo del rechazo (obligatorio)…" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            <p v-if="errorMsg" class="mt-2 text-xs" style="color:var(--color-error)">{{ errorMsg }}</p>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showRejectModal = false">Cancelar</BaseButton>
            <BaseButton variant="danger" :disabled="saving" @click="rechazar">{{ saving ? 'Procesando…' : 'Rechazar' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
