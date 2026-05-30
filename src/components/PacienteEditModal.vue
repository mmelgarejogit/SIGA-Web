<script setup lang="ts">
import { ref, reactive, watch } from "vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  type Patient,
  type UpdatePatientRequest,
  updatePatient,
} from "@/services/patientService"

const props = defineProps<{
  show: boolean
  patient: Patient | null
}>()

const emit = defineEmits<{
  close: []
  saved: [patient: Patient]
}>()

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino",  label: "Femenino"  },
  { value: "Otro",      label: "Otro"      },
]
const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isSaving = ref(false)
const error = ref("")

const form = reactive({
  firstName: "",
  lastName: "",
  birthDate: "",
  sexo: "",
  phoneNumber: "",
  email: "",
})

type FormErrors = { firstName?: string; lastName?: string; birthDate?: string; email?: string }
const errors = ref<FormErrors>({})

watch(
  () => props.patient,
  (p) => {
    if (!p) return
    form.firstName = p.firstName
    form.lastName = p.lastName
    form.birthDate = p.birthDate
    form.sexo = p.sexo ?? ""
    form.phoneNumber = p.phoneNumber ?? ""
    form.email = p.email ?? ""
    errors.value = {}
    error.value = ""
  },
  { immediate: true },
)

watch(
  () => props.show,
  (v) => { if (v) { errors.value = {}; error.value = "" } },
)

function validate(): boolean {
  const e: FormErrors = {}
  if (!form.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(form.firstName.trim())) e.firstName = "Solo letras y espacios."
  if (!form.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(form.lastName.trim())) e.lastName = "Solo letras y espacios."
  if (!form.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."
  if (form.email?.trim() && !EMAIL_RE.test(form.email.trim()))
    e.email = "El formato del email no es válido."
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (isSaving.value || !props.patient) return
  if (!validate()) return
  error.value = ""
  isSaving.value = true
  try {
    const payload: UpdatePatientRequest = {
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      birthDate:   form.birthDate,
      sexo:        form.sexo || undefined,
      phoneNumber: form.phoneNumber || undefined,
      email:       form.email || undefined,
      isActive:    props.patient.isActive,
    }
    const updated = await updatePatient(props.patient.id, payload)
    emit("saved", updated)
    emit("close")
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Error al actualizar paciente."
  } finally {
    isSaving.value = false
  }
}

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}
</script>

<template>
  <BaseModal :show="show" title="Editar Paciente" size="lg" @close="emit('close')">
    <form @submit.prevent="submit" class="space-y-5">

      <div v-if="error" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ error }}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="form.firstName" type="text"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(!!errors.firstName)" />
          <p v-if="errors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.firstName }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
          <input v-model="form.lastName" type="text"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(!!errors.lastName)" />
          <p v-if="errors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.lastName }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nro. de Cédula</label>
        <input
          :value="patient?.ci"
          type="text"
          readonly
          class="px-4 h-12 text-sm outline-none appearance-none shadow-none cursor-not-allowed"
          style="border-radius: 12px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low);"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Nacimiento *</label>
          <DateInput v-model="form.birthDate" :has-error="!!errors.birthDate" />
          <p v-if="errors.birthDate" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.birthDate }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sexo</label>
          <SearchableSelect
            :model-value="form.sexo || null"
            :options="SEXO_OPTIONS"
            :searchable="false"
            null-label="Sin especificar"
            @update:model-value="form.sexo = ($event as string) ?? ''"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
        <input v-model="form.phoneNumber" type="tel" placeholder="0972123456"
          class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
          :style="inputStyle(false)" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</label>
        <input v-model="form.email" type="email" placeholder="paciente@email.com"
          class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
          :style="inputStyle(!!errors.email)" />
        <p v-if="errors.email" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.email }}</p>
      </div>

    </form>

    <template #footer>
      <div class="flex justify-between w-full">
        <BaseButton variant="secondary" @click="emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submit">
          <span v-if="isSaving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
          {{ isSaving ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
:deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  background-color: var(--color-surface);
  border-color: var(--color-outline-variant);
}
</style>
