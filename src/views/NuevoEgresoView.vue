<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import MontoInput from "@/components/MontoInput.vue"
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import MonthPicker from "@/components/MonthPicker.vue"
import {
  type CategoriaGasto,
  crearHonorario,
  crearGastoGeneral,
  crearSalario,
  getCategorias,
  crearCategoria,
} from "@/services/egresosService"
import { getProfessionals, type Professional } from "@/services/professionalService"
import { getEmpleados, type Empleado } from "@/services/empleadosService"

const router = useRouter()

type TipoNuevo = "PagoPersonal" | "GastoGeneral"
type SubTipoPersonal = "Profesional" | "Empleado"

const tiposNuevo: { key: TipoNuevo; label: string; icon: string; desc: string }[] = [
  { key: "GastoGeneral",  label: "Gasto General",    icon: "payments",      desc: "Gastos operativos categorizados" },
  { key: "PagoPersonal",  label: "Pago de Personal", icon: "person_check",  desc: "Honorarios a profesionales o salarios a empleados" },
]

// ── Catálogos ──────────────────────────────────────────────────────────────────

const categorias = ref<CategoriaGasto[]>([])
const profesionales = ref<Professional[]>([])
const empleados = ref<Empleado[]>([])

const categoriaOptions = computed(() => categorias.value.filter(c => c.activo).map(c => ({ value: c.id, label: c.nombre })))

onMounted(async () => {
  const [cats, profs, emps] = await Promise.allSettled([getCategorias(), getProfessionals(), getEmpleados(true)])
  if (cats.status === "fulfilled") categorias.value = cats.value
  if (profs.status === "fulfilled") {
    const data = profs.value as unknown
    if (Array.isArray(data)) profesionales.value = data as Professional[]
    else if (data && typeof data === "object" && "items" in data)
      profesionales.value = (data as { items: Professional[] }).items
  }
  if (emps.status === "fulfilled") empleados.value = emps.value
})

// ── Formulario ─────────────────────────────────────────────────────────────────

const selectedTipo = ref<TipoNuevo | null>(null)
const subTipoPersonal = ref<SubTipoPersonal>("Profesional")
const isSaving = ref(false)
const formError = ref("")

const form = reactive({
  monto: 0,
  concepto: "",
  observaciones: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
  professionalId: 0,
  periodo: null as string | null,
  categoriaGastoId: 0,
  empleadoId: 0,
})

function selectTipo(t: TipoNuevo) {
  selectedTipo.value = t
  subTipoPersonal.value = "Profesional"
  formError.value = ""
  Object.assign(form, {
    monto: 0, concepto: "", observaciones: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    professionalId: 0, periodo: null,
    categoriaGastoId: 0,
    empleadoId: 0,
  })
}

function selectSubTipo(s: SubTipoPersonal) {
  subTipoPersonal.value = s
  form.professionalId = 0
  form.empleadoId = 0
  form.periodo = null
  formError.value = ""
}

function tipoColor(key: TipoNuevo) {
  if (key === "PagoPersonal") return { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-on-tertiary-fixed-variant)" }
  return { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" }
}

async function submit() {
  formError.value = ""
  if (!selectedTipo.value) return

  if (!form.concepto.trim()) { formError.value = "El concepto es obligatorio."; return }
  if (!form.monto || form.monto <= 0) { formError.value = "El monto debe ser mayor a 0."; return }
  if (!form.fechaEmision) { formError.value = "La fecha es obligatoria."; return }
  if (selectedTipo.value === "PagoPersonal" && subTipoPersonal.value === "Profesional" && !form.professionalId) { formError.value = "Seleccioná un profesional."; return }
  if (selectedTipo.value === "PagoPersonal" && subTipoPersonal.value === "Profesional" && !form.periodo) { formError.value = "El período es obligatorio."; return }
  if (selectedTipo.value === "PagoPersonal" && subTipoPersonal.value === "Empleado" && !form.empleadoId) { formError.value = "Seleccioná un empleado."; return }
  if (selectedTipo.value === "GastoGeneral" && !form.categoriaGastoId) { formError.value = "Seleccioná una categoría."; return }

  isSaving.value = true
  try {
    const base = {
      concepto: form.concepto.trim(),
      monto: form.monto,
      observaciones: form.observaciones.trim() || undefined,
      fechaEmision: form.fechaEmision,
      fechaVencimiento: form.fechaVencimiento || undefined,
    }
    if (selectedTipo.value === "PagoPersonal" && subTipoPersonal.value === "Profesional") {
      await crearHonorario({
        ...base,
        professionalId: form.professionalId,
        periodo: form.periodo ?? "",
      })
    } else if (selectedTipo.value === "PagoPersonal" && subTipoPersonal.value === "Empleado") {
      await crearSalario({
        ...base,
        empleadoId: form.empleadoId,
        periodo: form.periodo || undefined,
      })
    } else {
      await crearGastoGeneral({
        ...base,
        categoriaGastoId: form.categoriaGastoId,
      })
    }
    router.push("/egresos")
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : "Error al crear egreso."
  } finally {
    isSaving.value = false
  }
}

// ── Modal nueva categoría rápida ───────────────────────────────────────────────

const showCatModal = ref(false)
const isCatSaving = ref(false)
const catError = ref("")
const catForm = reactive({ nombre: "", descripcion: "" })

function openCreateCategoria() {
  Object.assign(catForm, { nombre: "", descripcion: "" })
  catError.value = ""
  showCatModal.value = true
}

async function submitCategoria() {
  if (!catForm.nombre.trim()) { catError.value = "El nombre es obligatorio."; return }
  isCatSaving.value = true
  catError.value = ""
  try {
    const nueva = await crearCategoria({ nombre: catForm.nombre.trim(), descripcion: catForm.descripcion.trim() || undefined })
    categorias.value = [...categorias.value, nueva]
    form.categoriaGastoId = nueva.id
    showCatModal.value = false
  } catch (err: unknown) {
    catError.value = err instanceof Error ? err.message : "Error al crear categoría."
  } finally {
    isCatSaving.value = false
  }
}

const profesionalOptions = computed(() =>
  profesionales.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))
)

const empleadoOptions = computed(() =>
  empleados.value.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName} — ${e.cargoNombre}` }))
)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex items-center gap-3 mb-8">
          <button @click="router.push('/egresos')"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style="background-color: var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Nuevo Egreso</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">El egreso quedará pendiente de pago</p>
          </div>
        </div>

        <!-- Selector de tipo -->
        <div class="mb-8">
          <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Tipo de egreso</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <button
              v-for="t in tiposNuevo" :key="t.key"
              @click="selectTipo(t.key)"
              class="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left"
              :style="selectedTipo === t.key
                ? `background-color: ${tipoColor(t.key).bg}; border: 2px solid ${tipoColor(t.key).color}`
                : 'background-color: var(--color-surface-container-lowest); border: 2px solid var(--color-hairline-strong)'"
            >
              <span class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                :style="`background-color: ${selectedTipo === t.key ? tipoColor(t.key).color : 'var(--color-surface-container-high)'}`">
                <span class="material-symbols-outlined"
                  :style="`font-size: 22px; color: ${selectedTipo === t.key ? '#fff' : 'var(--color-on-surface-variant)'}`">{{ t.icon }}</span>
              </span>
              <div>
                <p class="font-bold text-sm leading-tight"
                  :style="`color: ${selectedTipo === t.key ? tipoColor(t.key).color : 'var(--color-on-surface)'}`">{{ t.label }}</p>
                <p class="text-xs mt-0.5" style="color: var(--color-outline)">{{ t.desc }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Formulario (solo si hay tipo seleccionado) -->
        <template v-if="selectedTipo">
          <div class="rounded-3xl p-6 space-y-5"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">

            <!-- Error -->
            <div v-if="formError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
              <span class="material-symbols-outlined" style="font-size: 18px">error</span>
              {{ formError }}
            </div>

            <!-- Toggle Profesional / Empleado (PagoPersonal) -->
            <div v-if="selectedTipo === 'PagoPersonal'">
              <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Tipo de pago</label>
              <div class="inline-flex p-1 rounded-2xl" style="background-color: var(--color-surface-container-high)">
                <button
                  type="button"
                  @click="selectSubTipo('Profesional')"
                  class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  :style="subTipoPersonal === 'Profesional'
                    ? 'background: var(--color-tertiary); color: var(--color-on-tertiary);'
                    : 'color: var(--color-on-surface-variant);'"
                >Profesional</button>
                <button
                  type="button"
                  @click="selectSubTipo('Empleado')"
                  class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  :style="subTipoPersonal === 'Empleado'
                    ? 'background: var(--color-tertiary); color: var(--color-on-tertiary);'
                    : 'color: var(--color-on-surface-variant);'"
                >Empleado</button>
              </div>
            </div>

            <!-- Selector persona -->
            <div v-if="selectedTipo === 'PagoPersonal' && subTipoPersonal === 'Profesional'">
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Profesional *</label>
              <SearchableSelect v-model="form.professionalId" :options="profesionalOptions" placeholder="Seleccionar profesional" null-label="Seleccionar profesional" />
            </div>
            <div v-if="selectedTipo === 'PagoPersonal' && subTipoPersonal === 'Empleado'">
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Empleado *</label>
              <SearchableSelect v-model="form.empleadoId" :options="empleadoOptions" placeholder="Seleccionar empleado" null-label="Seleccionar empleado" />
            </div>

            <!-- Período -->
            <div v-if="selectedTipo === 'PagoPersonal'" class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                Período <span v-if="subTipoPersonal === 'Profesional'" style="color: var(--color-error)">*</span>
                <span v-else class="font-normal normal-case" style="color: var(--color-outline)"> (opcional)</span>
              </label>
              <MonthPicker v-model="form.periodo" :placeholder="subTipoPersonal === 'Profesional' ? 'Seleccionar período' : 'Opcional'" />
            </div>

            <!-- Categoría (GastoGeneral) -->
            <div v-if="selectedTipo === 'GastoGeneral'">
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría *</label>
              <div class="flex gap-2">
                <SearchableSelect v-model="form.categoriaGastoId" :options="categoriaOptions" placeholder="Seleccionar categoría" class="flex-1" />
                <button type="button" @click="openCreateCategoria"
                  class="flex-shrink-0 w-12 rounded-2xl flex items-center justify-center transition-colors hover:opacity-80"
                  style="background-color: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant)"
                  title="Nueva categoría">
                  <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary)">add</span>
                </button>
              </div>
            </div>

            <!-- Concepto -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Concepto *</label>
              <input v-model="form.concepto" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(false)" />
            </div>

            <!-- Monto: la cifra que sale de la óptica, con el peso visual de un comprobante -->
            <div class="monto-voucher rounded-2xl p-5"
              :style="`background-color: color-mix(in srgb, ${tipoColor(selectedTipo).color} 7%, var(--color-surface-container-lowest)); border: 1px solid color-mix(in srgb, ${tipoColor(selectedTipo).color} 20%, transparent);`">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Monto a pagar (Gs.) *</label>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                  :style="`background-color: ${tipoColor(selectedTipo).color}; color: var(--color-surface-container-lowest);`">
                  {{ tiposNuevo.find(t => t.key === selectedTipo)?.label }}
                </span>
              </div>
              <MontoInput
                class="monto-voucher-input"
                :model-value="form.monto ?? null"
                @update:model-value="form.monto = $event ?? 0"
                placeholder="0"
              />
            </div>

            <!-- Fecha y Vencimiento -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha *</label>
                <DateInput v-model="form.fechaEmision" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento</label>
                <DateInput v-model="form.fechaVencimiento" placeholder="Opcional" />
              </div>
            </div>

            <!-- Observaciones -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
              <textarea v-model="form.observaciones" rows="2" class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle(false)" />
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center justify-end gap-3 mt-6">
            <BaseButton variant="secondary" size="default" @click="router.push('/egresos')">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="isSaving" @click="submit">
              <span v-if="isSaving" class="material-symbols-outlined animate-spin">progress_activity</span>
              {{ isSaving ? "Enviando..." : "Enviar Solicitud" }}
            </BaseButton>
          </div>
        </template>

      </div>
    </main>

    <!-- Modal nueva categoría -->
    <BaseModal :show="showCatModal" title="Nueva Categoría" size="sm" @close="showCatModal = false">
      <div v-if="catError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ catError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="catForm.nombre" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="catForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(false)" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCatModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isCatSaving" @click="submitCategoria">
            <span v-if="isCatSaving" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isCatSaving ? "Creando..." : "Crear Categoría" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
:deep(.ss-trigger) { height: 48px; border-radius: 12px; }

.monto-voucher-input :deep(input) {
  height: 3.75rem;
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
