<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type TipoAjuste, getTiposAjuste, createTipoAjuste, updateTipoAjuste, deactivateTipoAjuste } from "@/services/stockService"

const items = ref<TipoAjuste[]>([])
const isLoading = ref(false)
const search = ref("")
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selected = ref<TipoAjuste | null>(null)
const saving = ref(false)
const errorMsg = ref("")

const form = reactive({ nombre: "", impacto: "Ambos" as string })
const editForm = reactive({ nombre: "", impacto: "Ambos" as string, activo: true })

const IMPACTOS = ["Positivo", "Negativo", "Ambos"]

const impactoStyle = (imp: string) => {
  if (imp === "Positivo") return "bg-green-100 text-green-700"
  if (imp === "Negativo") return "bg-red-100 text-red-600"
  return "bg-blue-100 text-blue-700"
}

const filtered = () =>
  items.value.filter(t => !search.value || t.nombre.toLowerCase().includes(search.value.toLowerCase()))

async function load() {
  isLoading.value = true
  try { items.value = await getTiposAjuste() }
  finally { isLoading.value = false }
}

function openCreate() {
  form.nombre = ""; form.impacto = "Ambos"; errorMsg.value = ""
  showCreateModal.value = true
}

function openEdit(t: TipoAjuste) {
  selected.value = t
  editForm.nombre = t.nombre; editForm.impacto = t.impacto; editForm.activo = t.activo
  errorMsg.value = ""
  showEditModal.value = true
}

async function handleCreate() {
  if (!form.nombre.trim()) { errorMsg.value = "El nombre es obligatorio."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await createTipoAjuste({ nombre: form.nombre.trim(), impacto: form.impacto })
    showCreateModal.value = false; await load()
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al crear." }
  finally { saving.value = false }
}

async function handleEdit() {
  if (!editForm.nombre.trim()) { errorMsg.value = "El nombre es obligatorio."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await updateTipoAjuste(selected.value!.id, { nombre: editForm.nombre.trim(), impacto: editForm.impacto, activo: editForm.activo })
    showEditModal.value = false; await load()
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al actualizar." }
  finally { saving.value = false }
}

async function handleDeactivate(t: TipoAjuste) {
  await deactivateTipoAjuste(t.id)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Tipos de Ajuste</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">Catálogo de motivos para ajustes de inventario</p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nuevo Tipo
          </BaseButton>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6">
          <div />
          <SearchInput :model-value="search" placeholder="Buscar tipo de ajuste…" class="w-72" @update:model-value="search = $event" />
        </div>

        <BaseTable :loading="isLoading" empty-text="No hay tipos de ajuste registrados.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Nombre</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Impacto</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr v-for="t in filtered()" :key="t.id" class="hover:bg-surface-container-low border-b" style="border-color:rgba(196,197,213,0.12)">
              <td class="px-6 py-4 font-semibold">{{ t.nombre }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="impactoStyle(t.impacto)">{{ t.impacto }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                  {{ t.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 justify-end">
                  <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-surface-container-high)" @click="openEdit(t)" title="Editar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-on-surface-variant)">edit</span>
                  </button>
                  <button v-if="t.activo" class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-error-container)" @click="handleDeactivate(t)" title="Desactivar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-error)">block</span>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </BaseTable>
      </div>
    </main>
  </div>

  <!-- Modal Crear -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showCreateModal = false" />
        <div class="relative w-full max-w-md rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom:1px solid rgba(196,197,213,0.2)">
            <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">Nuevo Tipo de Ajuste</h3>
            <button class="p-1 rounded-full" style="color:var(--color-outline)" @click="showCreateModal = false">
              <span class="material-symbols-outlined" style="font-size:22px">close</span>
            </button>
          </div>
          <div class="px-8 py-6 space-y-4">
            <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nombre *</label>
              <input v-model="form.nombre" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Impacto</label>
              <select v-model="form.impacto" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option v-for="imp in IMPACTOS" :key="imp" :value="imp">{{ imp }}</option>
              </select>
            </div>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleCreate">{{ saving ? 'Guardando…' : 'Crear' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Modal Editar -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showEditModal = false" />
        <div class="relative w-full max-w-md rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom:1px solid rgba(196,197,213,0.2)">
            <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">Editar Tipo de Ajuste</h3>
            <button class="p-1 rounded-full" style="color:var(--color-outline)" @click="showEditModal = false">
              <span class="material-symbols-outlined" style="font-size:22px">close</span>
            </button>
          </div>
          <div class="px-8 py-6 space-y-4">
            <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nombre *</label>
              <input v-model="editForm.nombre" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Impacto</label>
              <select v-model="editForm.impacto" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option v-for="imp in IMPACTOS" :key="imp" :value="imp">{{ imp }}</option>
              </select>
            </div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="editForm.activo" class="w-4 h-4 rounded" />
              <span class="text-sm font-medium">Activo</span>
            </label>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleEdit">{{ saving ? 'Guardando…' : 'Guardar' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
