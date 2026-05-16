<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Pedido,
  type Proveedor,
  type Producto,
  type CreatePedidoItemRequest,
  getPedidos,
  getProveedores,
  getProductos,
  createPedido,
  updatePedidoEstado,
  cancelPedido,
  createProveedor,
  updateProveedor,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_pedidos"))

// ── Estado ────────────────────────────────────────────────────────────────────

const pedidos = ref<Pedido[]>([])
const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref("")
const activeTab = ref<"pedidos" | "proveedores">("pedidos")

const estadoTabs = [
  { value: "", label: "Todos" },
  { value: "Pendiente", label: "Pendientes" },
  { value: "Enviado", label: "Enviados" },
  { value: "Recibido", label: "Recibidos" },
  { value: "Cancelado", label: "Cancelados" },
]

const pedidoColumns = [
  { key: "id", label: "# Pedido" },
  { key: "proveedor", label: "Proveedor" },
  { key: "fecha", label: "Fecha" },
  { key: "items", label: "Ítems" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

const proveedorColumns = [
  { key: "nombre", label: "Nombre" },
  { key: "contacto", label: "Contacto" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

function estadoStyle(estado: string) {
  switch (estado) {
    case "Pendiente": return { bg: "#fef3c7", text: "#92400e" }
    case "Enviado":   return { bg: "#dbeafe", text: "#1e40af" }
    case "Recibido":  return { bg: "#dcfce7", text: "#166534" }
    case "Cancelado": return { bg: "var(--color-surface-container-highest)", text: "var(--color-outline)" }
    default:          return { bg: "var(--color-surface-container-highest)", text: "var(--color-outline)" }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [ped, prov, prod] = await Promise.all([
      getPedidos({ estado: estadoFilter.value || undefined }),
      getProveedores(),
      getProductos({ pageSize: 500 }).then((r) => r.items),
    ])
    pedidos.value = ped
    proveedores.value = prov
    productos.value = prod
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Modal Nuevo Pedido ────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const pedidoForm = reactive({ proveedorId: null as number | null, observaciones: "" })
const pedidoItems = ref<(CreatePedidoItemRequest & { _productoNombre: string })[]>([])

function openCreatePedido() {
  pedidoForm.proveedorId = proveedores.value[0]?.id ?? null
  pedidoForm.observaciones = ""
  pedidoItems.value = []
  createError.value = ""
  showCreateModal.value = true
}

function addItem() {
  const primer = productos.value[0]
  if (!primer) return
  pedidoItems.value.push({
    productoId: primer.id,
    cantidad: 1,
    precioUnitario: primer.precioCosto,
    _productoNombre: primer.nombre,
  })
}

function removeItem(i: number) {
  pedidoItems.value.splice(i, 1)
}

function onItemProductoChange(i: number, e: Event) {
  const id = Number((e.target as HTMLSelectElement).value)
  const prod = productos.value.find((p) => p.id === id)
  if (prod) {
    pedidoItems.value[i]!.productoId = prod.id
    pedidoItems.value[i]!.precioUnitario = prod.precioCosto
    pedidoItems.value[i]!._productoNombre = prod.nombre
  }
}

async function submitCreatePedido() {
  if (!pedidoForm.proveedorId) {
    createError.value = "Seleccioná un proveedor."
    return
  }
  if (pedidoItems.value.length === 0) {
    createError.value = "Agregá al menos un ítem al pedido."
    return
  }
  isSaving.value = true
  createError.value = ""
  try {
    await createPedido({
      proveedorId: pedidoForm.proveedorId,
      observaciones: pedidoForm.observaciones.trim() || undefined,
      items: pedidoItems.value.map(({ productoId, cantidad, precioUnitario }) => ({
        productoId, cantidad, precioUnitario,
      })),
    })
    showCreateModal.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear pedido."
  } finally {
    isSaving.value = false
  }
}

// ── Cambiar estado pedido ─────────────────────────────────────────────────────

async function cambiarEstado(pedido: Pedido, estado: string) {
  try {
    await updatePedidoEstado(pedido.id, estado)
    await load()
  } catch {
    /* silent */
  }
}

async function onCancelPedido(pedido: Pedido) {
  try {
    await cancelPedido(pedido.id)
    await load()
  } catch {
    /* silent */
  }
}

// ── Modal Proveedor ───────────────────────────────────────────────────────────

const showProveedorModal = ref(false)
const isProvSaving = ref(false)
const provError = ref("")
const editingProveedor = ref<Proveedor | null>(null)
const provForm = reactive({ nombre: "", contacto: "", email: "", telefono: "" })

function openCreateProveedor() {
  editingProveedor.value = null
  Object.assign(provForm, { nombre: "", contacto: "", email: "", telefono: "" })
  provError.value = ""
  showProveedorModal.value = true
}

function openEditProveedor(p: Proveedor) {
  editingProveedor.value = p
  Object.assign(provForm, {
    nombre: p.nombre, contacto: p.contacto ?? "", email: p.email ?? "", telefono: p.telefono ?? "",
  })
  provError.value = ""
  showProveedorModal.value = true
}

async function submitProveedor() {
  isProvSaving.value = true
  provError.value = ""
  const payload = {
    nombre: provForm.nombre.trim(),
    contacto: provForm.contacto.trim() || undefined,
    email: provForm.email.trim() || undefined,
    telefono: provForm.telefono.trim() || undefined,
  }
  try {
    if (editingProveedor.value) {
      await updateProveedor(editingProveedor.value.id, payload)
    } else {
      await createProveedor(payload)
    }
    showProveedorModal.value = false
    await load()
  } catch (err: unknown) {
    provError.value = err instanceof Error ? err.message : "Error al guardar proveedor."
  } finally {
    isProvSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Pedidos a Proveedores</h1>
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              Gestioná órdenes de compra y proveedores.
            </p>
          </div>
          <div class="flex gap-2">
            <BaseButton v-if="canManage" variant="secondary" size="default" @click="openCreateProveedor">
              <span class="material-symbols-outlined" style="font-size: 18px">add_business</span>
              Nuevo Proveedor
            </BaseButton>
            <BaseButton v-if="canManage" variant="primary" size="default" @click="openCreatePedido">
              <span class="material-symbols-outlined" style="font-size: 18px">add</span>
              Nuevo Pedido
            </BaseButton>
          </div>
        </div>

        <!-- Tabs de sección -->
        <div class="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style="background-color: var(--color-surface-container-low)">
          <button
            @click="activeTab = 'pedidos'"
            class="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            :style="activeTab === 'pedidos'
              ? 'background-color: var(--color-primary); color: white;'
              : 'color: var(--color-on-surface-variant);'"
          >Pedidos</button>
          <button
            @click="activeTab = 'proveedores'"
            class="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            :style="activeTab === 'proveedores'
              ? 'background-color: var(--color-primary); color: white;'
              : 'color: var(--color-on-surface-variant);'"
          >Proveedores</button>
        </div>

        <!-- Error -->
        <div
          v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tab: Pedidos -->
        <template v-if="activeTab === 'pedidos'">
          <FilterTabs :model-value="estadoFilter" :tabs="estadoTabs" class="mb-4"
            @update:model-value="(v) => { estadoFilter = v; load() }" />

          <BaseTable :columns="pedidoColumns" :items="pedidos" :loading="isLoading" empty-text="No hay pedidos registrados.">
            <template #id="{ item }">
              <span class="text-sm font-bold" style="color: var(--color-primary)">#{{ item.id }}</span>
            </template>

            <template #proveedor="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.proveedorNombre }}</span>
            </template>

            <template #fecha="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</span>
            </template>

            <template #items="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                {{ item.items.length }} ítem{{ item.items.length !== 1 ? "s" : "" }}
                — {{ formatPrice(item.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)) }}
              </span>
            </template>

            <template #estado="{ item }">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="`background-color: ${estadoStyle(item.estado).bg}; color: ${estadoStyle(item.estado).text}`"
              >{{ item.estado }}</span>
            </template>

            <template #acciones="{ item }">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  v-if="canManage && item.estado === 'Pendiente'"
                  @click.stop="cambiarEstado(item, 'Enviado')"
                  class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                  style="background-color: #dbeafe" title="Marcar como enviado"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: #1e40af">local_shipping</span>
                </button>
                <button
                  v-if="canManage && item.estado === 'Enviado'"
                  @click.stop="cambiarEstado(item, 'Recibido')"
                  class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                  style="background-color: #dcfce7" title="Marcar como recibido (actualiza stock)"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: #16a34a">check_circle</span>
                </button>
                <button
                  v-if="canManage && item.estado !== 'Recibido' && item.estado !== 'Cancelado'"
                  @click.stop="onCancelPedido(item)"
                  class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                  style="background-color: var(--color-error-container)" title="Cancelar pedido"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-error)">close</span>
                </button>
              </div>
            </template>
          </BaseTable>
        </template>

        <!-- Tab: Proveedores -->
        <template v-if="activeTab === 'proveedores'">
          <BaseTable :columns="proveedorColumns" :items="proveedores.filter(p => p.isActive)" :loading="isLoading" empty-text="No hay proveedores registrados.">
            <template #nombre="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
            </template>
            <template #contacto="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.contacto ?? "—" }}</span>
            </template>
            <template #email="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.email ?? "—" }}</span>
            </template>
            <template #telefono="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.telefono ?? "—" }}</span>
            </template>
            <template #acciones="{ item }">
              <div class="flex items-center justify-end">
                <button
                  v-if="canManage"
                  @click.stop="openEditProveedor(item)"
                  class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                  style="background-color: var(--color-surface-container-low)"
                  title="Editar proveedor"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">edit</span>
                </button>
              </div>
            </template>
          </BaseTable>
        </template>
      </div>
    </main>

    <!-- MODAL NUEVO PEDIDO -->
    <BaseModal :show="showCreateModal" title="Nuevo Pedido" size="xl" @close="showCreateModal = false">
      <div
        v-if="createError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>

      <div class="space-y-5">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Proveedor *</label>
          <select v-model="pedidoForm.proveedorId" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="null" disabled>Seleccioná un proveedor</option>
            <option v-for="p in proveedores.filter(p => p.isActive)" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <input v-model="pedidoForm.observaciones" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>

        <!-- Ítems -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Productos *</label>
            <button @click="addItem" class="flex items-center gap-1 text-xs font-semibold transition-colors"
              style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 16px">add</span>
              Agregar producto
            </button>
          </div>

          <div v-if="pedidoItems.length === 0" class="text-sm py-3 text-center rounded-xl"
            style="color: var(--color-outline); background-color: var(--color-surface-container-low)">
            Agregá al menos un producto al pedido.
          </div>

          <div v-else class="space-y-2">
            <div v-for="(item, i) in pedidoItems" :key="i"
              class="grid grid-cols-12 gap-2 items-center p-3 rounded-xl"
              style="background-color: var(--color-surface-container-low)">
              <div class="col-span-5">
                <select :value="item.productoId" @change="onItemProductoChange(i, $event)"
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)">
                  <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="col-span-3">
                <input v-model.number="item.cantidad" type="number" min="1" placeholder="Cant."
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)" />
              </div>
              <div class="col-span-3">
                <input v-model.number="item.precioUnitario" type="number" min="0" step="0.01" placeholder="Precio"
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)" />
              </div>
              <div class="col-span-1 flex justify-center">
                <button @click="removeItem(i)" class="w-7 h-7 rounded-full flex items-center justify-center"
                  style="background-color: var(--color-error-container)">
                  <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-error)">close</span>
                </button>
              </div>
            </div>

            <div class="text-right text-sm font-bold pt-1" style="color: var(--color-on-surface)">
              Total: {{ formatPrice(pedidoItems.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)) }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSaving" @click="submitCreatePedido">
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSaving ? "Creando..." : "Crear Pedido" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL PROVEEDOR -->
    <BaseModal
      :show="showProveedorModal"
      :title="editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      size="md"
      @close="showProveedorModal = false"
    >
      <div
        v-if="provError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ provError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="provForm.nombre" type="text" required class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Persona de contacto</label>
          <input v-model="provForm.contacto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Email</label>
            <input v-model="provForm.email" type="email" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="provForm.telefono" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showProveedorModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isProvSaving" @click="submitProveedor">
          <svg v-if="isProvSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isProvSaving ? "Guardando..." : editingProveedor ? "Guardar Cambios" : "Crear Proveedor" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
