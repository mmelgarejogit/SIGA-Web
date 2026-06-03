<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { createTransferencia } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { getProductos, getVariantes, type Producto, type ProductoVariante } from "@/services/inventarioService"

const router = useRouter()
const sucursales = ref<Sucursal[]>([])
const productos = ref<Producto[]>([])
const variantesDisponibles = ref<ProductoVariante[]>([])
const saving = ref(false)
const errorMsg = ref("")

const form = reactive({
  sucursalOrigenId: "",
  sucursalDestinoId: "",
  observacion: "",
  lineas: [] as { productoId: number | null; productoVarianteId: string; cantidad: number; _variantes: ProductoVariante[] }[],
})

function addLinea() {
  form.lineas.push({ productoId: null, productoVarianteId: "", cantidad: 1, _variantes: [] })
}

function removeLinea(i: number) {
  form.lineas.splice(i, 1)
}

async function onProductoChange(i: number) {
  const linea = form.lineas[i]
  linea.productoVarianteId = ""
  linea._variantes = []
  if (linea.productoId) {
    linea._variantes = (await getVariantes(linea.productoId)).filter(v => v.isActive)
  }
}

async function handleSubmit() {
  if (!form.sucursalOrigenId || !form.sucursalDestinoId) { errorMsg.value = "Seleccioná origen y destino."; return }
  if (form.sucursalOrigenId === form.sucursalDestinoId) { errorMsg.value = "El origen y destino no pueden ser la misma sucursal."; return }
  if (!form.lineas.length) { errorMsg.value = "Agregá al menos una línea."; return }
  if (form.lineas.some(l => !l.productoVarianteId || l.cantidad <= 0)) { errorMsg.value = "Completá todas las líneas con variante y cantidad."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await createTransferencia({
      sucursalOrigenId: form.sucursalOrigenId,
      sucursalDestinoId: form.sucursalDestinoId,
      observacion: form.observacion.trim() || undefined,
      lineas: form.lineas.map(l => ({ productoVarianteId: l.productoVarianteId, cantidad: l.cantidad })),
    })
    router.push("/stock/transferencias")
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al crear la transferencia." }
  finally { saving.value = false }
}

onMounted(async () => {
  const [s, p] = await Promise.all([getSucursales(true), getProductos({ pageSize: 200 })])
  sucursales.value = s
  productos.value = p.items
  addLinea()
})
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
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight">Nueva Transferencia</h1>
            <p class="font-medium mt-1" style="color:var(--color-on-surface-variant)">Solicitar traslado de stock entre sucursales</p>
          </div>
        </div>

        <div class="rounded-2xl p-8 space-y-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">
          <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal Origen *</label>
              <select v-model="form.sucursalOrigenId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option value="">Seleccionar…</option>
                <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal Destino *</label>
              <select v-model="form.sucursalDestinoId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option value="">Seleccionar…</option>
                <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Observación</label>
            <input v-model="form.observacion" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
          </div>

          <!-- Líneas -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-xs font-bold uppercase tracking-wider" style="color:var(--color-outline)">Productos a transferir *</label>
              <BaseButton variant="secondary" size="sm" @click="addLinea">
                <span class="material-symbols-outlined" style="font-size:16px">add</span>
                Agregar
              </BaseButton>
            </div>

            <div v-for="(linea, i) in form.lineas" :key="i" class="flex items-end gap-3 p-4 rounded-xl mb-2" style="background-color:var(--color-surface-container-low);border:1px solid var(--color-outline-variant)">
              <div class="flex-1">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Producto</label>
                <select v-model="linea.productoId" @change="onProductoChange(i)" class="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-lowest);color:var(--color-on-surface)">
                  <option :value="null">Seleccionar…</option>
                  <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Variante</label>
                <select v-model="linea.productoVarianteId" :disabled="!linea._variantes.length" class="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-lowest);color:var(--color-on-surface)">
                  <option value="">Seleccionar…</option>
                  <option v-for="v in linea._variantes" :key="v.id" :value="v.id">{{ [v.sku, v.color, v.talle].filter(Boolean).join(' · ') || 'Variante única' }}</option>
                </select>
              </div>
              <div class="w-24">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Cant.</label>
                <input v-model.number="linea.cantidad" type="number" min="1" class="w-full px-3 py-2 rounded-lg text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-lowest);color:var(--color-on-surface)" />
              </div>
              <button @click="removeLinea(i)" class="w-9 h-9 rounded-full flex items-center justify-center mb-0.5" style="background-color:var(--color-error-container)">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-error)">delete</span>
              </button>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="secondary" @click="router.back()">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleSubmit">
              {{ saving ? 'Enviando…' : 'Solicitar Transferencia' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
