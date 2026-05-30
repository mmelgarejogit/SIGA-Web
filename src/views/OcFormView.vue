<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  getProveedores,
  getProductos,
  type Proveedor,
  type Producto,
} from "@/services/inventarioService"
import {
  crearPedido,
  editarPedido,
  getComprasPedidoById,
} from "@/services/comprasService"

const route = useRoute()
const router = useRouter()

const editId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})
const isEdit = computed(() => editId.value !== null)

const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])

const proveedorOptions = computed(() =>
  proveedores.value
    .filter(p => p.isActive)
    .map(p => ({ value: p.id, label: p.nombre, code: p.ruc })),
)

const productoOptions = computed(() =>
  productos.value
    .filter(p => p.isActive)
    .map(p => ({ value: p.id, label: p.nombre, code: p.sku ?? undefined })),
)
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref("")
const saveError = ref("")

interface FormItem {
  productoId: number
  cantidad: number
  precioUnitario: number
}

const form = reactive({
  proveedorId: null as number | null,
  observaciones: "",
})
const items = ref<FormItem[]>([])

const total = computed(() =>
  items.value.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0),
)

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

onMounted(async () => {
  isLoading.value = true
  loadError.value = ""
  try {
    const [provR, prodR] = await Promise.all([
      getProveedores({ pageSize: 200 }),
      getProductos({ pageSize: 500 }),
    ])
    proveedores.value = provR.items
    productos.value = prodR.items

    if (isEdit.value) {
      const pedido = await getComprasPedidoById(editId.value!)
      if (pedido.estado !== "Borrador") {
        loadError.value = "Solo se pueden editar órdenes en estado Borrador."
        return
      }
      form.proveedorId = pedido.proveedorId
      form.observaciones = pedido.observaciones ?? ""
      items.value = pedido.items.map(i => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      }))
    } else {
      form.proveedorId = null
    }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
})

function addItem() {
  const primer = productos.value.find(p => p.isActive)
  if (!primer) return
  items.value.push({
    productoId: primer.id,
    cantidad: 1,
    precioUnitario: primer.precioCosto,
  })
}

function removeItem(i: number) {
  items.value.splice(i, 1)
}

function onProductoChange(i: number, val: number | string | null) {
  const prod = productos.value.find(p => p.id === Number(val))
  if (prod) {
    items.value[i]!.productoId = prod.id
    items.value[i]!.precioUnitario = prod.precioCosto
  }
}

async function submit() {
  if (!form.proveedorId) { saveError.value = "Seleccioná un proveedor."; return }
  if (items.value.length === 0) { saveError.value = "Agregá al menos un ítem."; return }

  isSaving.value = true
  saveError.value = ""
  try {
    const payload = {
      proveedorId: form.proveedorId!,
      observaciones: form.observaciones.trim() || undefined,
      items: items.value.map(({ productoId, cantidad, precioUnitario }) => ({
        productoId, cantidad, precioUnitario,
      })),
    }
    const result = isEdit.value
      ? await editarPedido(editId.value!, payload)
      : await crearPedido(payload)

    router.push(`/compras/oc/${result.id}`)
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al guardar la orden."
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  if (isEdit.value) router.push(`/compras/oc/${editId.value}`)
  else router.push("/compras/oc")
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="rounded-2xl p-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <p class="font-semibold">{{ loadError }}</p>
          <BaseButton variant="secondary" size="default" class="mt-3" @click="cancel">Volver</BaseButton>
        </div>

        <template v-else>

          <!-- Breadcrumb + Header -->
          <div class="mb-8">
            <button
              @click="cancel"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              {{ isEdit ? `OC #${editId}` : "Órdenes de Compra" }}
            </button>

            <h1 class="text-4xl font-extrabold tracking-tight mb-2">
              {{ isEdit ? `Editar OC #${editId}` : "Nueva Orden de Compra" }}
            </h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ isEdit
                ? "Modificá el proveedor, observaciones o ítems de esta orden en Borrador."
                : "Completá los datos del proveedor y los productos a pedir." }}
            </p>
          </div>

          <!-- Error general -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Datos generales -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Proveedor *</label>
                <SearchableSelect
                  :model-value="form.proveedorId"
                  :options="proveedorOptions"
                  placeholder="Buscar proveedor..."
                  @update:model-value="form.proveedorId = $event as number | null"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
                <input v-model="form.observaciones" type="text" placeholder="Opcional"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
              </div>
            </div>
          </div>

          <!-- Ítems -->
          <div class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

            <div class="px-6 py-4 flex items-center justify-between"
              style="border-bottom: 1px solid rgba(196,197,213,0.12)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Productos a pedir</h3>
              <button @click="addItem"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style="background-color: #EEF2FF; color: var(--color-primary); border: 1px solid rgba(0, 40, 142, 0.15);">
                <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                Agregar producto
              </button>
            </div>

            <div v-if="items.length === 0" class="px-6 py-12 text-center"
              style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-4xl mb-2" style="color: var(--color-outline)">inventory_2</span>
              <p class="text-sm font-medium">Agregá al menos un producto a esta orden.</p>
            </div>

            <table v-else class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                  <th class="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 120px; color: var(--color-outline)">Cantidad</th>
                  <th class="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 160px; color: var(--color-outline)">Precio c/u</th>
                  <th class="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider" style="width: 160px; color: var(--color-outline)">Subtotal</th>
                  <th style="width: 56px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in items" :key="i" style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-6 py-3">
                    <SearchableSelect
                      :model-value="item.productoId"
                      :options="productoOptions"
                      @update:model-value="onProductoChange(i, $event)"
                    />
                  </td>
                  <td class="px-6 py-3">
                    <input v-model.number="item.cantidad" type="number" min="1"
                      class="w-full px-3 py-2 rounded-xl text-sm text-right outline-none"
                      style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  </td>
                  <td class="px-6 py-3">
                    <input v-model.number="item.precioUnitario" type="number" min="0" step="1"
                      class="w-full px-3 py-2 rounded-xl text-sm text-right outline-none"
                      style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                  </td>
                  <td class="px-6 py-3 text-right font-bold" style="color: var(--color-on-surface)">
                    {{ formatPrice(item.cantidad * item.precioUnitario) }}
                  </td>
                  <td class="px-6 py-3">
                    <button @click="removeItem(i)"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style="background-color: var(--color-error-container)"
                      title="Eliminar ítem">
                      <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-error)">close</span>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="items.length > 0">
                <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                  <td colspan="3" class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total estimado</td>
                  <td class="px-6 py-4 text-right font-extrabold" style="color: var(--color-primary); font-size: 1rem">{{ formatPrice(total) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Footer acciones -->
          <div class="flex items-center justify-end gap-3 sticky bottom-0 py-4"
            style="background-color: var(--color-background)">
            <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="cancel">
              Cancelar
            </BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="isSaving" @click="submit">
              <span class="material-symbols-outlined" style="font-size: 18px">{{ isEdit ? "save" : "send" }}</span>
              {{ isSaving ? "Guardando…" : (isEdit ? "Guardar Cambios" : "Crear Borrador") }}
            </BaseButton>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
