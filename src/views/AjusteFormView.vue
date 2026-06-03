<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { createAjuste, getTiposAjuste, type TipoAjuste } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { getProductos, getVariantes, type Producto, type ProductoVariante } from "@/services/inventarioService"

const router = useRouter()

const sucursales = ref<Sucursal[]>([])
const tipos = ref<TipoAjuste[]>([])
const productos = ref<Producto[]>([])
const variantes = ref<ProductoVariante[]>([])
const saving = ref(false)
const errorMsg = ref("")

const form = reactive({
  sucursalId: "",
  tipoAjusteId: "",
  productoId: null as number | null,
  productoVarianteId: "",
  cantidad: 1,
  observacion: "",
})

async function onProductoChange() {
  form.productoVarianteId = ""
  variantes.value = []
  if (form.productoId) {
    variantes.value = await getVariantes(form.productoId)
  }
}

async function handleSubmit() {
  if (!form.sucursalId || !form.tipoAjusteId || !form.productoVarianteId || !form.observacion.trim()) {
    errorMsg.value = "Todos los campos son obligatorios."; return
  }
  if (form.cantidad <= 0) { errorMsg.value = "La cantidad debe ser mayor a cero."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await createAjuste({
      sucursalId: form.sucursalId,
      tipoAjusteId: form.tipoAjusteId,
      productoVarianteId: form.productoVarianteId,
      cantidad: form.cantidad,
      observacion: form.observacion.trim(),
    })
    router.push("/stock/ajustes")
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al crear el ajuste." }
  finally { saving.value = false }
}

onMounted(async () => {
  const [s, t, p] = await Promise.all([getSucursales(true), getTiposAjuste({ activo: true }), getProductos({ pageSize: 200 })])
  sucursales.value = s
  tipos.value = t
  productos.value = p.items
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8 max-w-2xl">

        <!-- Encabezado -->
        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight">Nuevo Ajuste Manual</h1>
            <p class="font-medium mt-1" style="color:var(--color-on-surface-variant)">Registrar solicitud de ajuste de stock</p>
          </div>
        </div>

        <div class="rounded-2xl p-8 space-y-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal *</label>
            <select v-model="form.sucursalId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Seleccionar sucursal…</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Tipo de Ajuste *</label>
            <select v-model="form.tipoAjusteId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Seleccionar tipo…</option>
              <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.nombre }} ({{ t.impacto }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Producto *</label>
            <select v-model="form.productoId" @change="onProductoChange" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option :value="null">Seleccionar producto…</option>
              <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div v-if="variantes.length">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Variante *</label>
            <select v-model="form.productoVarianteId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Seleccionar variante…</option>
              <option v-for="v in variantes.filter(x => x.isActive)" :key="v.id" :value="v.id">
                {{ [v.sku, v.color, v.talle].filter(Boolean).join(' · ') || 'Variante única' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Cantidad *</label>
            <input v-model.number="form.cantidad" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación *</label>
            <textarea v-model="form.observacion" rows="3" placeholder="Describí el motivo del ajuste…" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="secondary" @click="router.back()">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleSubmit">
              {{ saving ? 'Enviando…' : 'Enviar Solicitud' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
