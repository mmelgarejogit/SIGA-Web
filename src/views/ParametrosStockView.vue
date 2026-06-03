<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import {
  type ParametroStock,
  getParametrosStock,
  upsertParametroStock,
  deleteParametroStock,
} from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { getProductos, getVariantes, type Producto, type ProductoVariante } from "@/services/inventarioService"

const parametros = ref<ParametroStock[]>([])
const sucursales = ref<Sucursal[]>([])
const productos  = ref<Producto[]>([])
const variantesDisp = ref<ProductoVariante[]>([])
const isLoading  = ref(false)
const search     = ref("")
const sucursalFilter = ref("")
const showModal  = ref(false)
const editTarget = ref<ParametroStock | null>(null)
const saving     = ref(false)
const errorMsg   = ref("")

const form = reactive({
  sucursalId: "",
  productoId: null as number | null,
  productoVarianteId: "",
  stockMinimo: 0,
  stockMaximo: 0,
})

const filtered = () => {
  let r = parametros.value
  if (sucursalFilter.value) r = r.filter(p => p.sucursalId === sucursalFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    r = r.filter(p =>
      p.productoNombre.toLowerCase().includes(q) ||
      (p.varianteSku ?? "").toLowerCase().includes(q) ||
      p.sucursalNombre.toLowerCase().includes(q),
    )
  }
  return r
}

async function load() {
  isLoading.value = true
  try { parametros.value = await getParametrosStock() }
  finally { isLoading.value = false }
}

async function onProductoChange() {
  form.productoVarianteId = ""
  variantesDisp.value = []
  if (form.productoId) {
    variantesDisp.value = (await getVariantes(form.productoId)).filter(v => v.isActive)
  }
}

function openCreate() {
  editTarget.value = null
  Object.assign(form, { sucursalId: "", productoId: null, productoVarianteId: "", stockMinimo: 0, stockMaximo: 0 })
  variantesDisp.value = []
  errorMsg.value = ""
  showModal.value = true
}

function openEdit(p: ParametroStock) {
  editTarget.value = p
  Object.assign(form, {
    sucursalId: p.sucursalId,
    productoVarianteId: p.productoVarianteId,
    stockMinimo: p.stockMinimo,
    stockMaximo: p.stockMaximo,
    productoId: null,
  })
  errorMsg.value = ""
  showModal.value = true
}

async function handleSave() {
  if (!form.sucursalId || !form.productoVarianteId) {
    errorMsg.value = "Sucursal y variante son obligatorias."
    return
  }
  if (form.stockMinimo < 0 || form.stockMaximo < 0) {
    errorMsg.value = "Los valores no pueden ser negativos."
    return
  }
  if (form.stockMaximo > 0 && form.stockMaximo < form.stockMinimo) {
    errorMsg.value = "El máximo debe ser mayor o igual al mínimo."
    return
  }
  saving.value = true; errorMsg.value = ""
  try {
    await upsertParametroStock({
      sucursalId: form.sucursalId,
      productoVarianteId: form.productoVarianteId,
      stockMinimo: form.stockMinimo,
      stockMaximo: form.stockMaximo,
    })
    showModal.value = false
    await load()
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al guardar." }
  finally { saving.value = false }
}

async function handleDelete(p: ParametroStock) {
  await deleteParametroStock(p.productoVarianteId, p.sucursalId)
  await load()
}

onMounted(async () => {
  const [s, p] = await Promise.all([getSucursales(true), getProductos({ pageSize: 200 })])
  sucursales.value = s
  productos.value = p.items
  await load()
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Parámetros de Stock</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Stock mínimo y máximo por variante y sucursal
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nuevo Parámetro
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6">
          <select v-if="sucursales.length > 1" v-model="sucursalFilter" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
            <option value="">Todas las sucursales</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
          <SearchInput :model-value="search" placeholder="Buscar producto o SKU…" class="w-72" @update:model-value="search = $event" />
        </div>

        <!-- Tabla -->
        <BaseTable :loading="isLoading" empty-text="No hay parámetros configurados.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sucursal</th>
            <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Stock mínimo</th>
            <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Stock máximo</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr
              v-for="p in filtered()"
              :key="`${p.productoVarianteId}-${p.sucursalId}`"
              class="hover:bg-surface-container-low border-b"
              style="border-color:rgba(196,197,213,0.12)"
            >
              <td class="px-6 py-4">
                <p class="font-semibold text-sm">{{ p.productoNombre }}</p>
                <p class="text-xs mt-0.5" style="color:var(--color-outline)">
                  {{ [p.varianteSku, p.varianteColor, p.varianteTalle].filter(Boolean).join(' · ') || 'Variante única' }}
                </p>
              </td>
              <td class="px-6 py-4 text-sm">{{ p.sucursalNombre }}</td>
              <td class="px-6 py-4 text-center">
                <span class="px-3 py-1 rounded-lg font-bold text-sm" style="background-color:var(--color-surface-container-high);color:var(--color-on-surface)">{{ p.stockMinimo }}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="px-3 py-1 rounded-lg font-bold text-sm" style="background-color:var(--color-surface-container-high);color:var(--color-on-surface)">{{ p.stockMaximo }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 justify-end">
                  <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-surface-container-high)" @click="openEdit(p)" title="Editar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-on-surface-variant)">edit</span>
                  </button>
                  <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-error-container)" @click="handleDelete(p)" title="Eliminar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-error)">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </BaseTable>

        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ filtered().length }} configuración{{ filtered().length !== 1 ? 'es' : '' }}</p>
      </div>
    </main>
  </div>

  <!-- Modal Crear / Editar -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showModal = false" />
        <div class="relative w-full max-w-lg rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom:1px solid rgba(196,197,213,0.2)">
            <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">{{ editTarget ? 'Editar Parámetro' : 'Nuevo Parámetro' }}</h3>
            <button class="p-1 rounded-full" style="color:var(--color-outline)" @click="showModal = false">
              <span class="material-symbols-outlined" style="font-size:22px">close</span>
            </button>
          </div>

          <div class="px-8 py-6 space-y-4">
            <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>

            <!-- Sucursal -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Sucursal *</label>
              <select v-model="form.sucursalId" :disabled="!!editTarget" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option value="">Seleccionar sucursal…</option>
                <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
              </select>
            </div>

            <!-- Producto + Variante (solo en creación) -->
            <template v-if="!editTarget">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Producto *</label>
                <select v-model="form.productoId" @change="onProductoChange" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                  <option :value="null">Seleccionar producto…</option>
                  <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>
              <div v-if="variantesDisp.length">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Variante *</label>
                <select v-model="form.productoVarianteId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                  <option value="">Seleccionar variante…</option>
                  <option v-for="v in variantesDisp" :key="v.id" :value="v.id">
                    {{ [v.sku, v.color, v.talle].filter(Boolean).join(' · ') || 'Variante única' }}
                  </option>
                </select>
              </div>
            </template>

            <!-- Si es edición, mostrar el producto/variante como read-only -->
            <template v-else>
              <div class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-surface-container-low);border:1px solid var(--color-outline-variant)">
                <p class="font-semibold">{{ editTarget.productoNombre }}</p>
                <p class="text-xs mt-0.5" style="color:var(--color-outline)">
                  {{ [editTarget.varianteSku, editTarget.varianteColor, editTarget.varianteTalle].filter(Boolean).join(' · ') || 'Variante única' }}
                </p>
              </div>
            </template>

            <!-- Mínimo / Máximo -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Stock Mínimo</label>
                <input v-model.number="form.stockMinimo" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
                <p class="text-xs mt-1" style="color:var(--color-outline)">Alerta cuando stock ≤ este valor</p>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Stock Máximo</label>
                <input v-model.number="form.stockMaximo" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
                <p class="text-xs mt-1" style="color:var(--color-outline)">0 = sin límite máximo</p>
              </div>
            </div>
          </div>

          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleSave">{{ saving ? 'Guardando…' : 'Guardar' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
