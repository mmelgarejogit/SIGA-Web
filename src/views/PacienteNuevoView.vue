<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BirthDateInput from "@/components/BirthDateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { createPatient, type CreatePatientRequest } from "@/services/patientService"

const router = useRouter()

type FormErrors = {
  firstName?: string
  lastName?: string
  ci?: string
  birthDate?: string
  contact?: string
  email?: string
}

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino",  label: "Femenino"  },
  { value: "Otro",      label: "Otro"      },
]

const form = ref<CreatePatientRequest>({
  ci: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  sexo: "",
  phoneNumber: "",
  email: "",
})

const errors = ref<FormErrors>({})
const error = ref("")
const saving = ref(false)

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

function validate(): boolean {
  const e: FormErrors = {}
  const f = form.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = "Solo se permiten letras y espacios."
  else if (f.firstName.trim().length > 120) e.firstName = "Máximo 120 caracteres."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."
  else if (f.lastName.trim().length > 120) e.lastName = "Máximo 120 caracteres."

  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."
  else if (f.ci.trim().length > 30) e.ci = "Máximo 30 caracteres."

  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."

  const hasPhone = !!f.phoneNumber?.trim()
  const hasEmail = !!f.email?.trim()

  if (!hasPhone && !hasEmail)
    e.contact = "Debe ingresar al menos un dato de contacto: email o teléfono."
  else if (hasEmail && !EMAIL_RE.test(f.email!.trim()))
    e.email = "El formato del email no es válido."

  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (saving.value) return
  if (!validate()) return
  error.value = ""
  saving.value = true
  try {
    const created = await createPatient({
      ...form.value,
      sexo: form.value.sexo || undefined,
      email: form.value.email || undefined,
      phoneNumber: form.value.phoneNumber || undefined,
    })
    router.push(`/pacientes/${created.id}`)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Error al registrar paciente."
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push("/pacientes")
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="px-8 pt-10 pb-16 max-w-2xl mx-auto">
        <!-- Breadcrumb -->
        <BaseButton variant="ghost" size="sm" class="mb-8" @click="cancel">
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Gestión de Pacientes
        </BaseButton>

        <!-- Card -->
        <div
          class="rounded-3xl overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <!-- Header -->
          <div
            class="flex items-center gap-4 px-8 py-6"
            style="border-bottom: 1px solid var(--color-hairline)"
          >
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent)"
            >
              <span
                class="material-symbols-outlined"
                style="color: var(--color-primary); font-size: 24px"
                >person_add</span
              >
            </div>
            <div>
              <h1 class="text-2xl font-extrabold" style="color: var(--color-on-surface)">
                Registrar Paciente
              </h1>
              <p class="text-sm font-medium mt-0.5" style="color: var(--color-outline)">
                Complete los datos del nuevo paciente
              </p>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="submit" class="px-8 py-6 flex flex-col gap-5">
            <!-- Error global -->
            <Transition name="fade">
              <div
                v-if="error"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="
                  background-color: var(--color-error-container);
                  color: var(--color-on-error-container);
                "
              >
                <span class="material-symbols-outlined" style="font-size: 18px">error</span>
                {{ error }}
              </div>
            </Transition>

            <!-- Nombre + Apellido -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                >
                  Nombre <span style="color: var(--color-error)">*</span>
                </label>
                <input
                  v-model="form.firstName"
                  type="text"
                  placeholder="Juan"
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                  :style="inputStyle(!!errors.firstName)"
                />
                <p
                  v-if="errors.firstName"
                  class="text-xs font-medium"
                  style="color: var(--color-error)"
                >
                  {{ errors.firstName }}
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                >
                  Apellido <span style="color: var(--color-error)">*</span>
                </label>
                <input
                  v-model="form.lastName"
                  type="text"
                  placeholder="Pérez"
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                  :style="inputStyle(!!errors.lastName)"
                />
                <p
                  v-if="errors.lastName"
                  class="text-xs font-medium"
                  style="color: var(--color-error)"
                >
                  {{ errors.lastName }}
                </p>
              </div>
            </div>

            <!-- Cédula -->
            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
              >
                Nro. de Cédula <span style="color: var(--color-error)">*</span>
              </label>
              <input
                v-model="form.ci"
                type="text"
                placeholder="1.234.567"
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(!!errors.ci)"
              />
              <p v-if="errors.ci" class="text-xs font-medium" style="color: var(--color-error)">
                {{ errors.ci }}
              </p>
            </div>

            <!-- Fecha de nacimiento -->
            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
              >
                Fecha de Nacimiento <span style="color: var(--color-error)">*</span>
              </label>
              <BirthDateInput v-model="form.birthDate" :has-error="!!errors.birthDate" />
              <p
                v-if="errors.birthDate"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ errors.birthDate }}
              </p>
            </div>

            <!-- Sexo -->
            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
              >
                Sexo
              </label>
              <SearchableSelect
                :model-value="form.sexo || null"
                :options="SEXO_OPTIONS"
                :searchable="false"
                null-label="Sin especificar"
                @update:model-value="form.sexo = ($event as string) ?? ''"
              />
            </div>

            <!-- Teléfono -->
            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
              >
                Teléfono
              </label>
              <input
                v-model="form.phoneNumber"
                type="tel"
                placeholder="0972123456"
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(false)"
              />
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
              >
                Email
              </label>
              <input
                v-model="form.email"
                type="email"
                placeholder="juan.perez@email.com"
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
                :style="inputStyle(!!errors.email)"
              />
              <p
                v-if="errors.contact"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ errors.contact }}
              </p>
              <p
                v-else-if="errors.email"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ errors.email }}
              </p>
            </div>

            <!-- Aviso contacto -->
            <p class="text-xs" style="color: var(--color-outline)">
              <span style="color: var(--color-error)">*</span> Al menos un dato de contacto
              (teléfono o email) es obligatorio.
            </p>

            <!-- Botones -->
            <div class="flex gap-3 pt-2">
              <BaseButton variant="secondary" size="default" class="flex-1 h-12" @click="cancel"
                >Cancelar</BaseButton
              >
              <BaseButton
                variant="primary"
                type="submit"
                size="default"
                :disabled="saving"
                class="flex-1 h-12"
              >
                <span v-if="saving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
                {{ saving ? "Registrando..." : "Registrar Paciente" }}
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

:deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  background-color: var(--color-surface);
  border-color: var(--color-outline-variant);
}
</style>
