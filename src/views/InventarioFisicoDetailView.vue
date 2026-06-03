<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type InventarioFisico,
  getInventarioFisicoById,
  iniciarConteo,
  aprobarInventario,
  cancelarInventario,
} from "@/services/inventarioFisicoService"
import { useAuthStore } from "@/stores/auth"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

const inv = ref<InventarioFisico | null>(null)
const isLoading = ref(true)
const saving = ref(false)
const errorMsg = ref("")
const search = ref("")
const showOnlyDiff = ref(false)

const formatDate = (d: string) =>
  new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

const estadoStyle = (e: string) => ({
  Borrador: "bg-slate-100 text-slate-600",
  EnConteo: "bg-amber-100 text-amber-700",
  Cerrado: "bg-violet-100 text-violet-700",
  Aprobado: "bg-green-100 text-green-700",
  Cancelado: "bg-red-100 text-red-600",
})[e] ?? "bg-slate-100 text-slate-600"

const filteredLineas = computed(() => {
  if (!inv.value) return []
  let result = inv.value.lineas
  if (showOnlyDiff.value)
    result = result.filter(l => l.diferencia != null && l.diferencia !== 0)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(l =>
      l.productoNombre.toLowerCase().includes(q) ||
      (l.varianteSku ?? "").toLowerCase().includes(q),
    )
  }
  return result
})

function varianteLabel(l: InventarioFisico["lineas"][0]) {
  return [l.varianteSku, l.varianteColor, l.varianteTalle].filter(Boolean).join(" · ") || "Variante única"
}

function diferenciaStyle(d: number | null) {
  if (d == null || d === 0) return "text-sm font-bold text-slate-400"
  return d > 0 ? "text-sm font-bold text-green-700" : "text-sm font-bold text-red-600"
}

function diferenciaLabel(d: number | null) {
  if (d == null) return "—"
  if (d === 0) return "0"
  return d > 0 ? `+${d}` : String(d)
}

async function load() {
  isLoading.value = true
  try { inv.value = await getInventarioFisicoById(route.params.id as string) }
  finally { isLoading.value = false }
}

async function handleIniciar() {
  saving.value = true; errorMsg.value = ""
  try { inv.value = await iniciarConteo(inv.value!.id) }
  catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al iniciar." }
  finally { saving.value = false }
}

async function handleAprobar() {
  saving.value = true; errorMsg.value = ""
  try { inv.value = await aprobarInventario(inv.value!.id) }
  catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al aprobar." }
  finally { saving.value = false }
}

async function handleCancelar() {
  saving.value = true; errorMsg.value = ""
  try {
    inv.value = await cancelarInventario(inv.value!.id)
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al cancelar." }
  finally { saving.value = false }
}

function irAConteo() {
  router.push(`/stock/fisico/${inv.value!.id}/conteo`)
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8 max-w-5xl">

        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <h1 class="text-4xl font-extrabold tracking-tight">Inventario Físico</h1>
        </div>

        <div v-if="isLoading" class="text-center py-16" style="color:var(--color-outline)">Cargando…</div>

        <template v-else-if="inv">

          <!-- Estado + metadata -->
          <div class="flex items-center gap-3 mb-6 flex-wrap">
            <span class="px-4 py-2 rounded-full text-sm font-bold" :class="estadoStyle(inv.estado)">
              {{ inv.estado === "EnConteo" ? "En Conteo" : inv.estado }}
            </span>
            <span class="text-sm" style="color:var(--color-outline)">{{ inv.sucursalNombre }} · {{ inv.alcance === "Total" ? "Total" : `Parcial — ${inv.filtroCategoriaNombre}` }}</span>
            <span class="text-sm" style="color:var(--color-outline)">Creado {{ formatDate(inv.createdAt) }}</span>
          </div>

          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm mb-4" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <!-- Info card -->
          <div class="rounded-2xl p-6 mb-6 grid grid-cols-2 gap-4" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 12px rgba(0,40,142,0.08)">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Iniciado por</p>
              <p class="font-semibold text-sm">{{ inv.iniciadoPorNombre }}</p>
            </div>
            <div v-if="inv.ejecutadoPorNombre">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Ejecutado por</p>
              <p class="font-semibold text-sm">{{ inv.ejecutadoPorNombre }}</p>
            </div>
            <div v-if="inv.fechaInicioConteo">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Inicio de conteo</p>
              <p class="text-sm">{{ formatDate(inv.fechaInicioConteo) }}</p>
            </div>
            <div v-if="inv.observacion" class="col-span-2">
              <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación</p>
              <p class="text-sm">{{ inv.observacion }}</p>
            </div>
            <!-- KPIs de resultado (solo cuando Cerrado/Aprobado) -->
            <template v-if="inv.estado === 'Cerrado' || inv.estado === 'Aprobado'">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Líneas contadas</p>
                <p class="font-bold text-lg">{{ inv.lineasContadas }} / {{ inv.totalLineas }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Con diferencia</p>
                <p class="font-bold text-lg" :style="inv.lineasConDiferencia > 0 ? 'color:#dc2626' : 'color:#16a34a'">{{ inv.lineasConDiferencia }}</p>
              </div>
            </template>
          </div>

          <!-- Acciones Admin -->
          <template v-if="canManage">
            <div v-if="inv.estado === 'Borrador'" class="flex gap-3 mb-6">
              <BaseButton variant="primary" :disabled="saving" @click="handleIniciar">
                <span class="material-symbols-outlined" style="font-size:18px">play_arrow</span>
                {{ saving ? 'Iniciando…' : 'Iniciar Conteo' }}
              </BaseButton>
              <BaseButton variant="danger" :disabled="saving" @click="handleCancelar">
                <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                Cancelar
              </BaseButton>
            </div>

            <div v-if="inv.estado === 'EnConteo'" class="flex gap-3 mb-6">
              <BaseButton variant="secondary" @click="irAConteo">
                <span class="material-symbols-outlined" style="font-size:18px">edit_note</span>
                Ver hoja de conteo
              </BaseButton>
              <BaseButton variant="danger" :disabled="saving" @click="handleCancelar">
                <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                Cancelar
              </BaseButton>
            </div>

            <div v-if="inv.estado === 'Cerrado'" class="flex gap-3 mb-6">
              <BaseButton variant="primary" :disabled="saving" @click="handleAprobar">
                <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                {{ saving ? 'Aprobando…' : `Aprobar y generar ${inv.lineasConDiferencia} movimiento${inv.lineasConDiferencia !== 1 ? 's' : ''}` }}
              </BaseButton>
              <BaseButton variant="danger" :disabled="saving" @click="handleCancelar">
                <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                Cancelar sesión
              </BaseButton>
            </div>
          </template>

          <!-- Tabla de lineas (solo cuando hay snapshot) -->
          <template v-if="inv.lineas.length > 0">
            <div class="flex items-center justify-between gap-4 mb-4">
              <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">Líneas de conteo</h3>
              <div class="flex items-center gap-3">
                <button
                  v-if="inv.estado === 'Cerrado' || inv.estado === 'Aprobado'"
                  @click="showOnlyDiff = !showOnlyDiff"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  :style="showOnlyDiff ? 'background-color:#FEF3C7;color:#92400E;border:1px solid #FDE68A' : 'background-color:var(--color-surface-container-high);border:1px solid var(--color-outline-variant);color:var(--color-on-surface)'"
                >
                  <span class="material-symbols-outlined" style="font-size:16px">filter_alt</span>
                  Solo diferencias
                </button>
                <input v-model="search" type="text" placeholder="Buscar…" class="w-56 px-3 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
              </div>
            </div>

            <div class="rounded-2xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 1px 3px rgba(196,197,213,0.2)">
              <table class="w-full">
                <thead style="background-color:var(--color-surface-container-low)">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
                    <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sistema</th>
                    <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Contado</th>
                    <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="linea in filteredLineas"
                    :key="linea.id"
                    class="border-t"
                    :style="`border-color:rgba(196,197,213,0.12);${linea.diferencia !== 0 && linea.diferencia != null ? 'background-color:rgba(220,38,38,0.02)' : ''}`"
                  >
                    <td class="px-6 py-3">
                      <p class="font-semibold text-sm">{{ linea.productoNombre }}</p>
                      <p class="text-xs mt-0.5" style="color:var(--color-outline)">{{ varianteLabel(linea) }}</p>
                    </td>
                    <td class="px-6 py-3 text-center font-semibold text-sm">{{ linea.cantidadSistema ?? '—' }}</td>
                    <td class="px-6 py-3 text-center font-semibold text-sm">{{ linea.cantidadContada ?? '—' }}</td>
                    <td class="px-6 py-3 text-center">
                      <span :class="diferenciaStyle(linea.diferencia)">{{ diferenciaLabel(linea.diferencia) }}</span>
                    </td>
                  </tr>
                  <tr v-if="filteredLineas.length === 0">
                    <td colspan="4" class="px-6 py-8 text-center text-sm" style="color:var(--color-outline)">Sin líneas que mostrar.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

        </template>
      </div>
    </main>
  </div>
</template>
