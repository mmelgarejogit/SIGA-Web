<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { type AjusteManual, getAjusteById, resolverAjuste } from "@/services/stockService"
import { useAuthStore } from "@/stores/auth"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canApprove = auth.hasPermission("gestionar_inventario")

const ajuste = ref<AjusteManual | null>(null)
const isLoading = ref(true)
const saving = ref(false)
const errorMsg = ref("")
const observacionResolucion = ref("")
const showRejectModal = ref(false)

const formatDate = (d: string) => new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

const impactoColor = (imp: string) =>
  imp === "Positivo" ? "bg-green-100 text-green-700" :
  imp === "Negativo" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"

const estadoStyle = (e: string) =>
  e === "Pendiente" ? "bg-amber-100 text-amber-700" :
  e === "Aprobado"  ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"

async function load() {
  isLoading.value = true
  try { ajuste.value = await getAjusteById(route.params.id as string) }
  finally { isLoading.value = false }
}

async function aprobar() {
  saving.value = true; errorMsg.value = ""
  try {
    ajuste.value = await resolverAjuste(ajuste.value!.id, "Aprobar", observacionResolucion.value || undefined)
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al aprobar." }
  finally { saving.value = false }
}

async function rechazar() {
  saving.value = true; errorMsg.value = ""
  try {
    ajuste.value = await resolverAjuste(ajuste.value!.id, "Rechazar", observacionResolucion.value || undefined)
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
          <h1 class="text-4xl font-extrabold tracking-tight">Detalle de Ajuste</h1>
        </div>

        <div v-if="isLoading" class="text-center py-16" style="color:var(--color-outline)">Cargando…</div>

        <template v-else-if="ajuste">
          <!-- Estado -->
          <div class="flex items-center gap-3 mb-6">
            <span class="px-4 py-2 rounded-full text-sm font-bold" :class="estadoStyle(ajuste.estado)">{{ ajuste.estado }}</span>
            <span class="text-sm" style="color:var(--color-outline)">Creado {{ formatDate(ajuste.fechaCreacion) }}</span>
          </div>

          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm mb-4" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <!-- Card principal -->
          <div class="rounded-2xl p-8 mb-6 space-y-5" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal</p>
                <p class="font-semibold">{{ ajuste.sucursalNombre }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Tipo de Ajuste</p>
                <div class="flex items-center gap-2">
                  <p class="font-semibold">{{ ajuste.tipoAjusteNombre }}</p>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="impactoColor(ajuste.tipoAjusteImpacto)">{{ ajuste.tipoAjusteImpacto }}</span>
                </div>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Producto</p>
                <p class="font-semibold">{{ ajuste.productoNombre }}</p>
                <p class="text-sm mt-0.5" style="color:var(--color-outline)">
                  {{ [ajuste.varianteSku, ajuste.varianteColor, ajuste.varianteTalle].filter(Boolean).join(' · ') || '—' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Cantidad</p>
                <p class="font-bold text-2xl" style="color:var(--color-primary)">{{ ajuste.cantidad }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación</p>
                <p class="text-sm" style="color:var(--color-on-surface)">{{ ajuste.observacion }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Solicitado por</p>
                <p class="text-sm">{{ ajuste.creadoPorNombre }}</p>
              </div>
              <div v-if="ajuste.aprobadoPorNombre">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Resuelto por</p>
                <p class="text-sm">{{ ajuste.aprobadoPorNombre }} — {{ formatDate(ajuste.fechaResolucion!) }}</p>
              </div>
              <div v-if="ajuste.observacionResolucion" class="col-span-2">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nota de resolución</p>
                <p class="text-sm">{{ ajuste.observacionResolucion }}</p>
              </div>
            </div>
          </div>

          <!-- Acciones (solo Admin, solo Pendiente) -->
          <template v-if="canApprove && ajuste.estado === 'Pendiente'">
            <div class="rounded-2xl p-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
              <p class="text-sm font-bold mb-3" style="color:var(--color-outline)">Observación (opcional)</p>
              <textarea v-model="observacionResolucion" rows="2" placeholder="Nota para el solicitante…" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
              <div class="flex gap-3">
                <BaseButton variant="primary" :disabled="saving" @click="aprobar">
                  <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                  {{ saving ? 'Procesando…' : 'Aprobar' }}
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

  <!-- Modal confirmar rechazo -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showRejectModal = false" />
        <div class="relative w-full max-w-sm rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="px-8 pt-8 pb-6">
            <h3 class="text-xl font-extrabold mb-2" style="color:var(--color-error)">Rechazar ajuste</h3>
            <p class="text-sm mb-4" style="color:var(--color-on-surface-variant)">¿Estás seguro? Esta acción es irreversible.</p>
            <textarea v-model="observacionResolucion" rows="2" placeholder="Motivo del rechazo…" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
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
