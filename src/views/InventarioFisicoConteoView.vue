<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type InventarioFisico,
  type InventarioFisicoLinea,
  getHojaConteo,
  guardarConteos,
  cerrarInventario,
} from "@/services/inventarioFisicoService"

const route = useRoute()
const router = useRouter()

const inv = ref<InventarioFisico | null>(null)
const isLoading = ref(true)
const saving = ref(false)
const cerrando = ref(false)
const errorMsg = ref("")
const search = ref("")

// Local map of counts — keyed by lineaId
const conteos = ref<Record<string, number | null>>({})

const filtered = computed(() => {
  if (!inv.value) return []
  const q = search.value.toLowerCase()
  return inv.value.lineas.filter(l =>
    !q ||
    l.productoNombre.toLowerCase().includes(q) ||
    (l.varianteSku ?? "").toLowerCase().includes(q) ||
    (l.varianteColor ?? "").toLowerCase().includes(q),
  )
})

const progreso = computed(() => {
  if (!inv.value) return 0
  const total = inv.value.lineas.length
  if (total === 0) return 0
  const contadas = inv.value.lineas.filter(l => conteos.value[l.id] != null).length
  return Math.round((contadas / total) * 100)
})

const totalContadas = computed(() =>
  inv.value?.lineas.filter(l => conteos.value[l.id] != null).length ?? 0,
)

function varianteLabel(l: InventarioFisicoLinea) {
  return [l.varianteSku, l.varianteColor, l.varianteTalle].filter(Boolean).join(" · ") || "Variante única"
}

async function load() {
  isLoading.value = true
  try {
    inv.value = await getHojaConteo(route.params.id as string)
    // Inicializar conteos desde lo que ya viene guardado
    for (const l of inv.value.lineas) {
      conteos.value[l.id] = l.cantidadContada
    }
  } finally { isLoading.value = false }
}

async function handleGuardar() {
  saving.value = true; errorMsg.value = ""
  try {
    await guardarConteos(route.params.id as string, {
      lineas: Object.entries(conteos.value).map(([lineaId, cantidadContada]) => ({ lineaId, cantidadContada })),
    })
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al guardar." }
  finally { saving.value = false }
}

async function handleCerrar() {
  cerrando.value = true; errorMsg.value = ""
  try {
    // Guardar primero, luego cerrar
    await guardarConteos(route.params.id as string, {
      lineas: Object.entries(conteos.value).map(([lineaId, cantidadContada]) => ({ lineaId, cantidadContada })),
    })
    await cerrarInventario(route.params.id as string)
    router.push("/stock/fisico")
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al cerrar." }
  finally { cerrando.value = false }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">

        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div class="flex-1">
            <h1 class="text-4xl font-extrabold tracking-tight">Hoja de Conteo</h1>
            <p class="font-medium mt-1" style="color:var(--color-on-surface-variant)">
              {{ inv?.sucursalNombre }} · Ingresá las cantidades físicas contadas
            </p>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-16" style="color:var(--color-outline)">Cargando…</div>

        <template v-else-if="inv">

          <!-- Alerta conteo ciego -->
          <div class="flex items-start gap-3 px-4 py-3 rounded-xl mb-6" style="background-color:#FEF3C7;border:1px solid #FDE68A">
            <span class="material-symbols-outlined mt-0.5" style="font-size:18px;color:#92400E">visibility_off</span>
            <p class="text-sm font-medium" style="color:#92400E">
              <strong>Conteo ciego.</strong> Las cantidades del sistema están ocultas para evitar sesgo. Ingresá lo que ves físicamente.
            </p>
          </div>

          <!-- Progreso -->
          <div class="rounded-2xl p-5 mb-6 flex items-center gap-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 12px rgba(0,40,142,0.08)">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold" style="color:var(--color-on-surface-variant)">Progreso del conteo</span>
                <span class="text-sm font-bold" style="color:var(--color-primary)">{{ totalContadas }} / {{ inv.totalLineas }}</span>
              </div>
              <div class="h-2.5 rounded-full overflow-hidden" style="background-color:var(--color-surface-container-high)">
                <div class="h-full rounded-full transition-all" :style="`width:${progreso}%;background-color:var(--color-primary)`" />
              </div>
            </div>
            <div class="text-3xl font-extrabold" style="color:var(--color-primary)">{{ progreso }}%</div>
          </div>

          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm mb-4" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <!-- Búsqueda -->
          <div class="mb-4">
            <input v-model="search" type="text" placeholder="Buscar producto, SKU, color…" class="w-72 px-4 py-2.5 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>

          <!-- Tabla de conteo -->
          <div class="rounded-2xl overflow-hidden mb-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 1px 3px rgba(196,197,213,0.25)">
            <table class="w-full">
              <thead style="background-color:var(--color-surface-container-low)">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
                  <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Cantidad contada</th>
                  <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="linea in filtered"
                  :key="linea.id"
                  class="border-t"
                  style="border-color:rgba(196,197,213,0.12)"
                >
                  <td class="px-6 py-4">
                    <p class="font-semibold text-sm">{{ linea.productoNombre }}</p>
                    <p class="text-xs mt-0.5" style="color:var(--color-outline)">{{ varianteLabel(linea) }}</p>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <input
                      v-model.number="conteos[linea.id]"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-24 text-center px-3 py-2 rounded-xl text-sm font-bold outline-none transition-all"
                      :style="conteos[linea.id] != null ? 'border:1.5px solid var(--color-primary);background-color:rgba(0,40,142,0.04);color:var(--color-primary)' : 'border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)'"
                    />
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="conteos[linea.id] != null" class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <span class="material-symbols-outlined text-green-700" style="font-size:14px">check</span>
                    </span>
                    <span v-else class="w-6 h-6 rounded-full flex items-center justify-center mx-auto" style="background-color:var(--color-surface-container-high)">
                      <span class="material-symbols-outlined" style="font-size:14px;color:var(--color-outline)">pending</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Acciones -->
          <div class="flex items-center justify-between">
            <p class="text-sm" style="color:var(--color-outline)">
              Podés guardar el progreso y continuar después.
            </p>
            <div class="flex gap-3">
              <BaseButton variant="secondary" :disabled="saving || cerrando" @click="handleGuardar">
                <span class="material-symbols-outlined" style="font-size:18px">save</span>
                {{ saving ? "Guardando…" : "Guardar progreso" }}
              </BaseButton>
              <BaseButton variant="primary" :disabled="saving || cerrando" @click="handleCerrar">
                <span class="material-symbols-outlined" style="font-size:18px">lock</span>
                {{ cerrando ? "Cerrando…" : "Finalizar conteo" }}
              </BaseButton>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
