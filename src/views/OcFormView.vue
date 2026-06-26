<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import DateInput from "@/components/DateInput.vue"
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

const route  = useRoute()
const router = useRouter()

const editId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})
const isEdit = computed(() => editId.value !== null)

const proveedores = ref<Proveedor[]>([])
const productos   = ref<Producto[]>([])

const productoOptions = computed(() =>
  productos.value
    .filter(p => p.isActive)
    .map(p => ({ value: p.id, label: p.nombre, code: p.sku ?? undefined })),
)

const isLoading = ref(true)
const isSaving  = ref(false)
const loadError = ref("")
const saveError = ref("")

interface FormItem {
  productoId: number
  cantidad: number
  precioUnitario: number
}

const form = reactive({
  proveedorId:   null as number | null,
  observaciones: "",
  fechaOrden:    "" as string,
})
const items = ref<FormItem[]>([])

const total = computed(() =>
  items.value.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0),
)

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

// ── Proveedor seleccionado ─────────────────────────────────────────────────────

const proveedorSeleccionado = computed(() =>
  proveedores.value.find(p => p.id === form.proveedorId) ?? null,
)

// ── Modal de búsqueda de proveedor ─────────────────────────────────────────────

const showProveedorModal = ref(false)
const proveedorSearch = reactive({ nombre: "", ruc: "", ciudad: "" })

const proveedoresResultados = computed(() => {
  const n = proveedorSearch.nombre.toLowerCase().trim()
  const r = proveedorSearch.ruc.toLowerCase().trim()
  const c = proveedorSearch.ciudad.toLowerCase().trim()

  if (!n && !r && !c) return []

  return proveedores.value.filter(p => {
    if (!p.isActive) return false
    if (n && !p.nombre.toLowerCase().includes(n)) return false
    if (r && !p.ruc.toLowerCase().includes(r)) return false
    if (c && !(p.ciudadNombre ?? "").toLowerCase().includes(c)) return false
    return true
  })
})

function openProveedorModal() {
  proveedorSearch.nombre = ""
  proveedorSearch.ruc    = ""
  proveedorSearch.ciudad = ""
  showProveedorModal.value = true
}

function selectProveedor(p: Proveedor) {
  form.proveedorId = p.id
  showProveedorModal.value = false
}

function clearProveedor() {
  form.proveedorId = null
}

// ── Carga inicial ──────────────────────────────────────────────────────────────

onMounted(async () => {
  isLoading.value = true
  loadError.value = ""
  try {
    const [provR, prodR] = await Promise.all([
      getProveedores({ pageSize: 200 }),
      getProductos({ pageSize: 500 }),
    ])
    proveedores.value = provR.items
    productos.value   = prodR.items

    if (isEdit.value) {
      const pedido = await getComprasPedidoById(editId.value!)
      if (pedido.estado !== "Borrador") {
        loadError.value = "Solo se pueden editar órdenes en estado Borrador."
        return
      }
      form.proveedorId   = pedido.proveedorId
      form.observaciones = pedido.observaciones ?? ""
      form.fechaOrden    = pedido.fechaOrden ?? ""
      items.value = pedido.items.map(i => ({
        productoId:    i.productoId,
        cantidad:      i.cantidad,
        precioUnitario: i.precioUnitario,
      }))
    }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
})

// ── Ítems ──────────────────────────────────────────────────────────────────────

function addItem() {
  const primer = productos.value.find(p => p.isActive)
  if (!primer) return
  items.value.push({
    productoId:    primer.id,
    cantidad:      1,
    precioUnitario: primer.precioCosto,
  })
}

function removeItem(i: number) {
  items.value.splice(i, 1)
}

function onProductoChange(i: number, val: number | string | null) {
  const prod = productos.value.find(p => p.id === Number(val))
  if (prod) {
    items.value[i]!.productoId     = prod.id
    items.value[i]!.precioUnitario = prod.precioCosto
  }
}

// ── Guardar ────────────────────────────────────────────────────────────────────

async function submit() {
  if (!form.proveedorId)      { saveError.value = "Seleccioná un proveedor."; return }
  if (items.value.length === 0) { saveError.value = "Agregá al menos un ítem."; return }

  isSaving.value = true
  saveError.value = ""
  try {
    const payload = {
      proveedorId:   form.proveedorId!,
      observaciones: form.observaciones.trim() || undefined,
      fechaOrden:    form.fechaOrden || undefined,
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

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
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
          <div v-if="saveError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Datos generales -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
            <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Datos generales</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- Campo proveedor (ocupa ambas columnas) -->
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Proveedor *</label>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="openProveedorModal"
                    class="flex-1 flex items-center justify-between px-4 h-12 text-sm text-left transition-all"
                    :style="inputStyle(false)"
                  >
                    <span v-if="proveedorSeleccionado" class="font-medium truncate" style="color: var(--color-on-surface)">
                      {{ proveedorSeleccionado.nombre }}
                    </span>
                    <span v-else style="color: var(--color-outline)">Seleccionar proveedor…</span>
                    <span class="material-symbols-outlined flex-shrink-0 ml-2" style="font-size: 18px; color: var(--color-outline)">
                      {{ proveedorSeleccionado ? 'swap_horiz' : 'search' }}
                    </span>
                  </button>
                  <button
                    v-if="proveedorSeleccionado"
                    type="button"
                    @click="clearProveedor"
                    class="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                    style="background-color: var(--color-surface-container-high); color: var(--color-outline)"
                    title="Quitar proveedor"
                  >
                    <span class="material-symbols-outlined" style="font-size: 18px">close</span>
                  </button>
                </div>
                <!-- Info del proveedor seleccionado -->
                <div v-if="proveedorSeleccionado" class="flex items-center gap-3 text-xs" style="color: var(--color-on-surface-variant)">
                  <span v-if="proveedorSeleccionado.ruc" class="font-mono">RUC: {{ proveedorSeleccionado.ruc }}</span>
                  <span v-if="proveedorSeleccionado.ciudadNombre">· {{ proveedorSeleccionado.ciudadNombre }}</span>
                </div>
              </div>

              <!-- Fecha de la orden -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de la orden</label>
                <DateInput v-model="form.fechaOrden" placeholder="dd/mm/aaaa" />
              </div>

              <!-- Observaciones -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Observaciones</label>
                <input v-model="form.observaciones" type="text" placeholder="Opcional"
                  class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                  :style="inputStyle(false)" />
              </div>
            </div>
          </div>

          <!-- Ítems -->
          <div class="rounded-2xl mb-6"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">

            <div class="px-6 py-4 flex items-center justify-between"
              style="border-bottom: 1px solid var(--color-hairline-soft)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Productos a pedir</h3>
              <button @click="addItem"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style="background-color: #EEF2FF; color: var(--color-primary); border: 1px solid rgba(0, 40, 142, 0.15);">
                <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                Agregar producto
              </button>
            </div>

            <div v-if="items.length === 0" class="px-6 py-12 text-center" style="color: var(--color-outline)">
              <span class="material-symbols-outlined text-4xl mb-2" style="color: var(--color-outline)">inventory_2</span>
              <p class="text-sm font-medium">Agregá al menos un producto a esta orden.</p>
            </div>

            <div v-else class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
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
                <tr v-for="(item, i) in items" :key="i" style="border-top: 1px solid var(--color-hairline-soft)">
                  <td class="px-6 py-3">
                    <SearchableSelect
                      :model-value="item.productoId"
                      :options="productoOptions"
                      @update:model-value="onProductoChange(i, $event)"
                    />
                  </td>
                  <td class="px-6 py-3">
                    <input v-model.number="item.cantidad" type="number" min="1"
                      class="w-full px-3 py-2 appearance-none shadow-none text-sm text-right outline-none"
                      :style="inputStyle(false)" />
                  </td>
                  <td class="px-6 py-3">
                    <input v-model.number="item.precioUnitario" type="number" min="0" step="1"
                      class="w-full px-3 py-2 appearance-none shadow-none text-sm text-right outline-none"
                      :style="inputStyle(false)" />
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
            </table></div>
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

    <!-- ── MODAL BUSCAR PROVEEDOR ─────────────────────────────────────────────── -->
    <BaseModal :show="showProveedorModal" title="Buscar Proveedor" size="lg" @close="showProveedorModal = false">
      <div class="space-y-5">

        <!-- Filtros -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre</label>
            <input
              v-model="proveedorSearch.nombre"
              type="text"
              placeholder="Buscar por nombre…"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">RUC</label>
            <input
              v-model="proveedorSearch.ruc"
              type="text"
              placeholder="Ej: 80012345-6"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all font-mono"
              :style="inputStyle(false)"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Ciudad</label>
            <input
              v-model="proveedorSearch.ciudad"
              type="text"
              placeholder="Filtrar por ciudad…"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)"
            />
          </div>
        </div>

        <!-- Resultados -->
        <div class="rounded-2xl overflow-hidden"
             style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline); max-height: 320px; overflow-y: auto;">

          <!-- Estado vacío -->
          <div v-if="proveedoresResultados.length === 0"
            class="py-10 text-center text-sm"
            style="color: var(--color-outline)">
            <template v-if="!proveedorSearch.nombre.trim() && !proveedorSearch.ruc.trim() && !proveedorSearch.ciudad.trim()">
              <span class="material-symbols-outlined text-3xl mb-2 block" style="color: var(--color-outline)">manage_search</span>
              Ingresá nombre, RUC o ciudad para buscar.
            </template>
            <template v-else>
              <span class="material-symbols-outlined text-3xl mb-2 block" style="color: var(--color-outline)">search_off</span>
              No se encontraron proveedores con esos criterios.
            </template>
          </div>

          <!-- Lista -->
          <button
            v-for="p in proveedoresResultados"
            :key="p.id"
            type="button"
            @click="selectProveedor(p)"
            class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
            :class="p.id === form.proveedorId ? 'bg-surface-container-low' : ''"
            style="border-bottom: 1px solid rgba(196,197,213,0.1);"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                   style="background-color: rgba(0,40,142,0.06); color: var(--color-primary)">
                <span class="material-symbols-outlined" style="font-size: 16px">local_shipping</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                <p class="text-xs truncate" style="color: var(--color-on-surface-variant)">
                  <span v-if="p.ruc" class="font-mono">{{ p.ruc }}</span>
                  <span v-if="p.ruc && p.ciudadNombre"> · </span>
                  <span v-if="p.ciudadNombre">{{ p.ciudadNombre }}</span>
                </p>
              </div>
            </div>
            <span
              v-if="p.id === form.proveedorId"
              class="material-symbols-outlined flex-shrink-0 ml-3"
              style="font-size: 18px; color: var(--color-primary)"
            >check_circle</span>
          </button>
        </div>

        <!-- Conteo -->
        <p v-if="proveedoresResultados.length > 0" class="text-xs" style="color: var(--color-outline)">
          {{ proveedoresResultados.length }}
          proveedor{{ proveedoresResultados.length !== 1 ? "es" : "" }} encontrado{{ proveedoresResultados.length !== 1 ? "s" : "" }}
        </p>

      </div>

      <template #footer>
        <div class="flex justify-end w-full">
          <BaseButton variant="secondary" @click="showProveedorModal = false">Cerrar</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
