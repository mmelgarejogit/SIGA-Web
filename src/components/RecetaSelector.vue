<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue"
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  type Receta,
  type CreateRecetaManualRequest,
  getRecetasByCliente,
  crearRecetaManual,
} from "@/services/clinicaService"

const props = defineProps<{ clienteId: number | null; modelValue: number | null }>()
const emit = defineEmits<{ (e: "update:modelValue", value: number | null): void }>()

const recetas = ref<Receta[]>([])
const isLoading = ref(false)
const showManual = ref(false)
const isSaving = ref(false)
const error = ref("")

const selected = computed(() => recetas.value.find(r => r.id === props.modelValue) ?? null)

const fmtFecha = (s: string) => {
  const d = new Date(s.includes("T") ? s : s + "T00:00:00")
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}
const num = (n?: number | null) => (n == null ? "—" : n > 0 ? `+${n}` : `${n}`)

const recetaOptions = computed(() => recetas.value.map(r => ({ value: r.id, label: `Receta ${fmtFecha(r.fechaEmision)} · ${r.esExterna ? "externa" : "clínica"}` })))

const recetaNullLabel = computed(() => isLoading.value ? "Cargando…" : recetas.value.length ? "Sin receta (elegir)…" : "El cliente no tiene recetas")

watch(() => props.clienteId, async (id) => {
  recetas.value = []
  showManual.value = false
  error.value = ""
  if (!id) return
  isLoading.value = true
  try {
    recetas.value = await getRecetasByCliente(id)
  } catch { recetas.value = [] }
  finally { isLoading.value = false }
}, { immediate: true })

function clear() {
  emit("update:modelValue", null)
}

// ── Carga manual ────────────────────────────────────────────────────────────────
const manual = reactive<CreateRecetaManualRequest>({
  clienteId: 0,
  fechaEmision: new Date().toISOString().slice(0, 10),
  odEsferico: null, odCilindro: null, odEje: null, odAdicion: null,
  oiEsferico: null, oiCilindro: null, oiEje: null, oiAdicion: null,
  distanciaInterpupilar: null, avSinCorreccion: "", avConCorreccion: "", observaciones: "",
})

function openManual() {
  Object.assign(manual, {
    clienteId: props.clienteId ?? 0,
    fechaEmision: new Date().toISOString().slice(0, 10),
    odEsferico: null, odCilindro: null, odEje: null, odAdicion: null,
    oiEsferico: null, oiCilindro: null, oiEje: null, oiAdicion: null,
    distanciaInterpupilar: null, avSinCorreccion: "", avConCorreccion: "", observaciones: "",
  })
  error.value = ""
  showManual.value = true
}

async function guardarManual() {
  if (!props.clienteId) { error.value = "Seleccioná un cliente primero."; return }
  isSaving.value = true
  error.value = ""
  try {
    const r = await crearRecetaManual({ ...manual, clienteId: props.clienteId })
    recetas.value.unshift(r)
    emit("update:modelValue", r.id)
    showManual.value = false
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Error al guardar la receta."
  } finally {
    isSaving.value = false
  }
}

const inputCls = "w-full px-2 py-1.5 text-sm outline-none text-center"
const inputStl = "border-radius: 8px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)"
</script>

<template>
  <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Receta</h3>
      <button
        v-if="clienteId && !showManual"
        type="button"
        @click="openManual"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
        style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
      >
        <span class="material-symbols-outlined" style="font-size: 16px">edit_note</span>
        Cargar a mano
      </button>
    </div>

    <p v-if="!clienteId" class="text-sm" style="color: var(--color-outline)">
      Seleccioná un cliente para ver o cargar su receta.
    </p>

    <template v-else>
      <p v-if="error" class="mb-3 text-xs font-medium" style="color: var(--color-error)">{{ error }}</p>

      <!-- Selección de receta existente -->
      <div v-if="!showManual">
        <SearchableSelect
          :model-value="modelValue"
          :options="recetaOptions"
          :null-label="recetaNullLabel"
          @update:model-value="emit('update:modelValue', $event !== null ? Number($event) : null)"
        />

        <!-- Graduación de la receta seleccionada -->
        <div v-if="selected" class="mt-3 rounded-xl p-3" style="background: var(--color-surface-container-low); border: 1px solid rgba(196,197,213,0.2)">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Graduación</span>
            <button type="button" @click="clear" class="text-xs font-semibold hover:underline" style="color: var(--color-on-surface-variant)">Quitar</button>
          </div>
          <table class="w-full text-sm" style="color: var(--color-on-surface)">
            <thead>
              <tr style="color: var(--color-outline)">
                <th class="text-left font-semibold"></th>
                <th class="font-semibold">ESF</th><th class="font-semibold">CIL</th>
                <th class="font-semibold">EJE</th><th class="font-semibold">ADD</th>
              </tr>
            </thead>
            <tbody class="text-center">
              <tr><td class="text-left font-bold">OD</td><td>{{ num(selected.odEsferico) }}</td><td>{{ num(selected.odCilindro) }}</td><td>{{ selected.odEje ?? "—" }}</td><td>{{ num(selected.odAdicion) }}</td></tr>
              <tr><td class="text-left font-bold">OI</td><td>{{ num(selected.oiEsferico) }}</td><td>{{ num(selected.oiCilindro) }}</td><td>{{ selected.oiEje ?? "—" }}</td><td>{{ num(selected.oiAdicion) }}</td></tr>
            </tbody>
          </table>
          <p class="text-xs mt-2" style="color: var(--color-on-surface-variant)">
            DNP: {{ selected.distanciaInterpupilar ?? "—" }} · AV s/c {{ selected.avSinCorreccion || "—" }} · c/c {{ selected.avConCorreccion || "—" }}
          </p>
        </div>
      </div>

      <!-- Carga manual de receta externa -->
      <div v-else class="space-y-3">
        <div class="flex items-center gap-3">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha</label>
          <DateInput v-model="manual.fechaEmision" />
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr style="color: var(--color-outline)" class="text-xs">
              <th></th><th>ESF</th><th>CIL</th><th>EJE</th><th>ADD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold pr-2" style="color: var(--color-on-surface)">OD</td>
              <td class="px-1"><input v-model.number="manual.odEsferico" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.odCilindro" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.odEje" type="number" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.odAdicion" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
            </tr>
            <tr>
              <td class="font-bold pr-2" style="color: var(--color-on-surface)">OI</td>
              <td class="px-1"><input v-model.number="manual.oiEsferico" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.oiCilindro" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.oiEje" type="number" :class="inputCls" :style="inputStl" /></td>
              <td class="px-1"><input v-model.number="manual.oiAdicion" type="number" step="0.25" :class="inputCls" :style="inputStl" /></td>
            </tr>
          </tbody>
        </table>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1" style="color: var(--color-outline)">DNP</label>
            <input v-model.number="manual.distanciaInterpupilar" type="number" step="0.5" :class="inputCls" :style="inputStl" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1" style="color: var(--color-outline)">AV s/c</label>
            <input v-model="manual.avSinCorreccion" type="text" :class="inputCls" :style="inputStl" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1" style="color: var(--color-outline)">AV c/c</label>
            <input v-model="manual.avConCorreccion" type="text" :class="inputCls" :style="inputStl" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" @click="showManual = false" class="px-4 py-2 rounded-xl text-sm font-semibold" style="background: var(--color-surface-container-high); color: var(--color-on-surface-variant)">Cancelar</button>
          <button type="button" :disabled="isSaving" @click="guardarManual" class="px-4 py-2 rounded-xl text-sm font-semibold" style="background: var(--color-primary); color: var(--color-on-primary)">
            {{ isSaving ? "Guardando…" : "Guardar receta" }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
