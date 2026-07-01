<script setup lang="ts">
import { initials, inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted } from "vue"
import ClienteQuickCreateModal from "@/components/ClienteQuickCreateModal.vue"
import { type Cliente, getClientes } from "@/services/clienteService"
import { useAuthStore } from "@/stores/auth"

const props = defineProps<{ modelValue: Cliente | null }>()
const emit = defineEmits<{ (e: "update:modelValue", value: Cliente | null): void }>()

const auth = useAuthStore()
const canCreate = auth.hasPermission("crear_cliente")

const allClientes = ref<Cliente[]>([])
const search = ref("")
const showDrop = ref(false)
const consumidorFinal = ref(false)
const showCreate = ref(false)

onMounted(async () => {
  try {
    const res = await getClientes({ pageSize: 500, status: "active" })
    allClientes.value = res.items
  } catch {}
})

function nombre(c: Cliente) {
  if (c.tipoFacturacion === "Juridica" && c.razonSocial) return c.razonSocial
  return `${c.firstName} ${c.lastName}`.trim()
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = q
    ? allClientes.value.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.ci.toLowerCase().includes(q) ||
        (c.razonSocial?.toLowerCase().includes(q) ?? false),
      )
    : allClientes.value
  return base.slice(0, 8)
})

function selectCliente(c: Cliente) {
  consumidorFinal.value = false
  showDrop.value = false
  search.value = ""
  emit("update:modelValue", c)
}

function elegirConsumidorFinal() {
  consumidorFinal.value = true
  showDrop.value = false
  search.value = ""
  emit("update:modelValue", null)
}

function clear() {
  consumidorFinal.value = false
  search.value = ""
  emit("update:modelValue", null)
}

function onBlur() {
  setTimeout(() => { showDrop.value = false }, 150)
}

function onCreated(c: Cliente) {
  // Lo agrega a la lista local y lo deja seleccionado
  if (!allClientes.value.some(x => x.id === c.id)) allClientes.value.unshift(c)
  selectCliente(c)
}
</script>

<template>
  <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Cliente</h3>
      <button
        v-if="canCreate"
        type="button"
        @click="showCreate = true"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
        style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
      >
        <span class="material-symbols-outlined" style="font-size: 16px">person_add</span>
        Nuevo cliente
      </button>
    </div>

    <!-- Cliente seleccionado -->
    <div v-if="modelValue" class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background: var(--color-info-container); border: 1px solid var(--color-info-container)">
      <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style="background: var(--color-info-container); color: var(--color-on-info-container)">
        {{ initials(modelValue.firstName, modelValue.lastName) }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate" style="color: var(--color-on-info-container)">{{ nombre(modelValue) }}</p>
        <p class="text-xs" style="color: var(--color-info)">
          CI: {{ modelValue.ci }}
          <span v-if="modelValue.tipoFacturacion === 'Juridica'"> · Jurídica</span>
        </p>
      </div>
      <button type="button" @click="clear" class="p-1 rounded-full transition-colors hover:bg-blue-100" title="Cambiar cliente">
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-info)">close</span>
      </button>
    </div>

    <!-- Consumidor final -->
    <div v-else-if="consumidorFinal" class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant)">
      <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--color-surface-container-high)">
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">person</span>
      </div>
      <div class="flex-1">
        <p class="font-semibold text-sm" style="color: var(--color-on-surface)">Consumidor Final</p>
        <p class="text-xs" style="color: var(--color-outline)">Sin cliente asociado</p>
      </div>
      <button type="button" @click="clear" class="p-1 rounded-full transition-colors hover:bg-surface-container-high" title="Cambiar">
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-outline)">close</span>
      </button>
    </div>

    <!-- Buscador -->
    <div v-else class="relative">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar por nombre, CI o razón social…"
        class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
        :style="inputStyle()"
        @focus="showDrop = true"
        @blur="onBlur"
      />
      <div
        v-if="showDrop && filtered.length > 0"
        class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden"
        style="border-radius: 12px; background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); max-height: 200px; overflow-y: auto;"
      >
        <button
          v-for="c in filtered"
          :key="c.id"
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
          style="border-bottom: 1px solid rgba(196,197,213,0.1)"
          @mousedown.prevent="selectCliente(c)"
        >
          <span class="font-medium" style="color: var(--color-on-surface)">{{ nombre(c) }}</span>
          <span class="ml-2 text-xs" style="color: var(--color-outline)">CI: {{ c.ci }}</span>
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <button
          type="button"
          @click="elegirConsumidorFinal"
          class="text-xs font-semibold transition-colors hover:underline"
          style="color: var(--color-on-surface-variant)"
        >
          Vender a Consumidor Final
        </button>
        <span class="text-xs" style="color: var(--color-outline)">o registrá un cliente nuevo</span>
      </div>
    </div>

    <ClienteQuickCreateModal :show="showCreate" @close="showCreate = false" @created="onCreated" />
  </div>
</template>
