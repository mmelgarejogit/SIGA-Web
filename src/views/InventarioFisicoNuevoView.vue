<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { createInventarioFisico } from "@/services/inventarioFisicoService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { getCategorias, type CategoriaProducto } from "@/services/inventarioService"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()
const auth = useAuthStore()

const sucursales = ref<Sucursal[]>([])
const categorias = ref<CategoriaProducto[]>([])
const saving = ref(false)
const errorMsg = ref("")

const form = reactive({
  sucursalId: auth.user?.sucursalId ?? "",
  alcance: "Total" as "Total" | "Parcial",
  filtroCategoriaId: null as number | null,
  observacion: "",
})

const showCategoria = computed(() => form.alcance === "Parcial")

async function handleSubmit() {
  if (!form.sucursalId) { errorMsg.value = "Seleccioná una sucursal."; return }
  if (form.alcance === "Parcial" && !form.filtroCategoriaId) {
    errorMsg.value = "Para alcance parcial seleccioná una categoría."; return
  }
  saving.value = true; errorMsg.value = ""
  try {
    const inv = await createInventarioFisico({
      sucursalId: form.sucursalId,
      alcance: form.alcance,
      filtroCategoriaId: form.alcance === "Parcial" ? form.filtroCategoriaId : undefined,
      observacion: form.observacion.trim() || undefined,
    })
    router.push(`/stock/fisico/${inv.id}`)
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al crear la sesión." }
  finally { saving.value = false }
}

onMounted(async () => {
  const [s, c] = await Promise.all([getSucursales(true), getCategorias()])
  sucursales.value = s
  categorias.value = c.filter(c => c.isActive)
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8 max-w-2xl">

        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight">Nueva Sesión de Inventario</h1>
            <p class="font-medium mt-1" style="color:var(--color-on-surface-variant)">Configurá el alcance del conteo físico</p>
          </div>
        </div>

        <div class="rounded-2xl p-8 space-y-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal *</label>
            <select v-model="form.sucursalId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Seleccionar sucursal…</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }} ({{ s.codigo }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--color-outline)">Alcance *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="opt in [{ value: 'Total', icon: 'inventory_2', desc: 'Todas las variantes activas de la sucursal' }, { value: 'Parcial', icon: 'filter_alt', desc: 'Solo variantes de una categoría específica' }]"
                :key="opt.value"
                @click="form.alcance = opt.value as 'Total' | 'Parcial'; form.filtroCategoriaId = null"
                class="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all"
                :style="form.alcance === opt.value ? 'border:2px solid var(--color-primary);background-color:rgba(0,40,142,0.04)' : 'border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low)'"
              >
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:20px" :style="form.alcance === opt.value ? 'color:var(--color-primary)' : 'color:var(--color-outline)'">{{ opt.icon }}</span>
                  <span class="font-bold text-sm" :style="form.alcance === opt.value ? 'color:var(--color-primary)' : 'color:var(--color-on-surface)'">{{ opt.value }}</span>
                </div>
                <p class="text-xs" style="color:var(--color-on-surface-variant)">{{ opt.desc }}</p>
              </button>
            </div>
          </div>

          <Transition name="fade">
            <div v-if="showCategoria">
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Categoría *</label>
              <select v-model="form.filtroCategoriaId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option :value="null">Seleccionar categoría…</option>
                <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
            </div>
          </Transition>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación</label>
            <textarea v-model="form.observacion" rows="2" placeholder="Opcional — motivo de la sesión" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>

          <!-- Info -->
          <div class="flex items-start gap-3 px-4 py-3 rounded-xl" style="background-color:var(--color-surface-container-low);border:1px solid var(--color-outline-variant)">
            <span class="material-symbols-outlined mt-0.5" style="font-size:18px;color:var(--color-outline)">info</span>
            <p class="text-sm" style="color:var(--color-on-surface-variant)">
              La sesión se crea en estado <strong>Borrador</strong>. El snapshot del stock se toma al iniciar el conteo.
              Mientras la sesión esté <strong>En Conteo</strong>, los ajustes y transferencias de esta sucursal quedan bloqueados.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="secondary" @click="router.back()">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleSubmit">
              {{ saving ? 'Creando…' : 'Crear Sesión' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
