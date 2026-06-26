<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import BirthDateInput from "@/components/BirthDateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  type Cliente,
  type PersonLookup,
  type TipoFacturacion,
  buscarPersonaPorCi,
  createCliente,
} from "@/services/clienteService"
import { getPatients, type Patient } from "@/services/patientService"

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: "close"): void
  (e: "created", cliente: Cliente): void
}>()

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
]
const TIPO_OPTIONS = [
  { value: "Fisica", label: "Persona Física" },
  { value: "Juridica", label: "Persona Jurídica" },
]

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function inputStyle(hasError: boolean) {
  const base = "border-radius: var(--radius-md); "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

// ── Modo ────────────────────────────────────────────────────────────────────
type Modo = "paciente" | "nueva"
const modo = ref<Modo>("paciente")

// ── Formulario ──────────────────────────────────────────────────────────────
interface Form {
  personId?: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  sexo: string
  phoneNumber: string
  personEmail: string
  tipoFacturacion: TipoFacturacion
  razonSocial: string
  rucCiFiscal: string
  direccion: string
  email: string
  telefono: string
}

function emptyForm(): Form {
  return {
    personId: undefined,
    ci: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    sexo: "",
    phoneNumber: "",
    personEmail: "",
    tipoFacturacion: "Fisica",
    razonSocial: "",
    rucCiFiscal: "",
    direccion: "",
    email: "",
    telefono: "",
  }
}

const form = reactive<Form>(emptyForm())
type FormErrors = Partial<Record<keyof Form | "contact", string>>
const errors = ref<FormErrors>({})
const formError = ref("")
const isSaving = ref(false)

// ── Picker de paciente activo ────────────────────────────────────────────────
const allPacientes = ref<Patient[]>([])
const pacienteSearch = ref("")
const selectedPaciente = ref<Patient | null>(null)
const showPacienteDrop = ref(false)
const isResolving = ref(false)
// Persona ya registrada como cliente (bloquea el alta)
const yaEsCliente = ref(false)

const filteredPacientes = computed(() => {
  const q = pacienteSearch.value.trim().toLowerCase()
  const base = q
    ? allPacientes.value.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.ci.toLowerCase().includes(q),
      )
    : allPacientes.value
  return base.slice(0, 8)
})

async function selectPaciente(p: Patient) {
  selectedPaciente.value = p
  pacienteSearch.value = `${p.firstName} ${p.lastName}`
  showPacienteDrop.value = false
  formError.value = ""
  yaEsCliente.value = false
  form.personId = undefined
  isResolving.value = true
  try {
    const res: PersonLookup | null = await buscarPersonaPorCi(p.ci)
    if (res === null) {
      // El paciente no tiene Person resoluble por CI — no debería pasar.
      formError.value = "No se pudo resolver la persona de este paciente."
    } else if (res.yaEsCliente) {
      yaEsCliente.value = true
      formError.value = `${res.firstName} ${res.lastName} ya está registrado como cliente.`
    } else {
      form.personId = res.personId
      form.ci = res.ci
      form.firstName = res.firstName
      form.lastName = res.lastName
    }
  } catch (e: any) {
    formError.value = e?.response?.data?.message ?? "Error al resolver el paciente."
  } finally {
    isResolving.value = false
  }
}

function clearPaciente() {
  selectedPaciente.value = null
  pacienteSearch.value = ""
  yaEsCliente.value = false
  form.personId = undefined
}

function onPacienteBlur() {
  setTimeout(() => { showPacienteDrop.value = false }, 150)
}

// ── Reset al abrir / cambiar de modo ──────────────────────────────────────────
function reset() {
  Object.assign(form, emptyForm())
  errors.value = {}
  formError.value = ""
  selectedPaciente.value = null
  pacienteSearch.value = ""
  showPacienteDrop.value = false
  yaEsCliente.value = false
  modo.value = "paciente"
}

watch(() => props.show, (open) => { if (open) reset() })

watch(modo, () => {
  errors.value = {}
  formError.value = ""
  selectedPaciente.value = null
  pacienteSearch.value = ""
  yaEsCliente.value = false
  form.personId = undefined
  form.ci = ""
  form.firstName = ""
  form.lastName = ""
  form.birthDate = ""
  form.sexo = ""
  form.phoneNumber = ""
  form.personEmail = ""
})

onMounted(async () => {
  try {
    const res = await getPatients({ pageSize: 500, status: "active" })
    allPacientes.value = res.items
  } catch {}
})

// ── Validación ────────────────────────────────────────────────────────────────
function validate(): boolean {
  const e: FormErrors = {}

  if (modo.value === "nueva") {
    if (!form.ci.trim()) e.ci = "El nro. de cédula es obligatorio."
    if (!form.firstName.trim()) e.firstName = "El nombre es obligatorio."
    else if (!ONLY_LETTERS.test(form.firstName.trim())) e.firstName = "Solo se permiten letras y espacios."
    if (!form.lastName.trim()) e.lastName = "El apellido es obligatorio."
    else if (!ONLY_LETTERS.test(form.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."
    if (!form.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."
    const hasPhone = !!form.phoneNumber.trim()
    const hasEmail = !!form.personEmail.trim()
    if (!hasPhone && !hasEmail) e.contact = "Debe ingresar al menos un dato de contacto: email o teléfono."
    else if (hasEmail && !EMAIL_RE.test(form.personEmail.trim())) e.personEmail = "El formato del email no es válido."
  }

  if (form.tipoFacturacion === "Juridica") {
    if (!form.razonSocial.trim()) e.razonSocial = "La razón social es obligatoria para facturación jurídica."
    if (!form.rucCiFiscal.trim()) e.rucCiFiscal = "El RUC es obligatorio para facturación jurídica."
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
    e.email = "El formato del email de facturación no es válido."

  errors.value = e
  return Object.keys(e).length === 0
}

const canSubmit = computed(() => {
  if (isSaving.value || isResolving.value) return false
  if (modo.value === "paciente") return !!selectedPaciente.value && !yaEsCliente.value && form.personId != null
  return true
})

async function submit() {
  if (!canSubmit.value) return
  if (!validate()) return
  formError.value = ""
  isSaving.value = true
  try {
    const esPaciente = modo.value === "paciente"
    const cliente = await createCliente({
      personId: esPaciente ? form.personId : undefined,
      ci: esPaciente ? undefined : form.ci || undefined,
      firstName: esPaciente ? undefined : form.firstName || undefined,
      lastName: esPaciente ? undefined : form.lastName || undefined,
      birthDate: esPaciente ? undefined : form.birthDate || undefined,
      sexo: esPaciente ? undefined : form.sexo || undefined,
      phoneNumber: esPaciente ? undefined : form.phoneNumber || undefined,
      personEmail: esPaciente ? undefined : form.personEmail || undefined,
      tipoFacturacion: form.tipoFacturacion,
      razonSocial: form.razonSocial || undefined,
      rucCiFiscal: form.rucCiFiscal || undefined,
      direccion: form.direccion || undefined,
      email: form.email || undefined,
      telefono: form.telefono || undefined,
    })
    emit("created", cliente)
    emit("close")
  } catch (e: any) {
    formError.value = e?.response?.data?.message ?? "Error al crear cliente."
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <BaseModal :show="show" title="Nuevo Cliente" size="lg" @close="emit('close')">
    <template #body>
      <div class="space-y-5">
        <div
          v-if="formError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ formError }}
        </div>

        <!-- Selector de modo -->
        <div class="flex gap-2">
          <button
            type="button"
            @click="modo = 'paciente'"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            :style="modo === 'paciente'
              ? 'background: var(--color-primary); color: var(--color-on-primary)'
              : 'background: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
          >Desde paciente activo</button>
          <button
            type="button"
            @click="modo = 'nueva'"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            :style="modo === 'nueva'
              ? 'background: var(--color-primary); color: var(--color-on-primary)'
              : 'background: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
          >Persona nueva</button>
        </div>

        <!-- ── Modo: paciente activo ──────────────────────────────────────── -->
        <template v-if="modo === 'paciente'">
          <div class="relative">
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Paciente</label>
            <input
              v-model="pacienteSearch"
              type="text"
              :disabled="!!selectedPaciente"
              placeholder="Buscar por nombre o CI…"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none disabled:opacity-60"
              :style="inputStyle(false)"
              @focus="showPacienteDrop = true"
              @blur="onPacienteBlur"
            />
            <div
              v-if="showPacienteDrop && filteredPacientes.length > 0 && !selectedPaciente"
              class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden"
              style="border-radius: 12px; background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); max-height: 200px; overflow-y: auto;"
            >
              <button
                v-for="p in filteredPacientes"
                :key="p.id"
                type="button"
                class="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
                style="border-bottom: 1px solid rgba(196,197,213,0.1)"
                @mousedown.prevent="selectPaciente(p)"
              >
                <span class="font-medium" style="color: var(--color-on-surface)">{{ p.firstName }} {{ p.lastName }}</span>
                <span class="ml-2 text-xs" style="color: var(--color-outline)">CI: {{ p.ci }}</span>
              </button>
            </div>

            <div v-if="selectedPaciente" class="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl" style="background: #EFF6FF; border: 1px solid #BFDBFE">
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style="background: #DBEAFE; color: #1D4ED8">
                {{ selectedPaciente.firstName[0] }}{{ selectedPaciente.lastName[0] }}
              </div>
              <div class="flex-1">
                <p class="font-semibold text-sm" style="color: #1D4ED8">{{ selectedPaciente.firstName }} {{ selectedPaciente.lastName }}</p>
                <p class="text-xs" style="color: #3B82F6">CI: {{ selectedPaciente.ci }}</p>
              </div>
              <span v-if="isResolving" class="material-symbols-outlined animate-spin" style="font-size: 18px; color: #3B82F6">progress_activity</span>
              <button v-else type="button" @click="clearPaciente" class="p-1 rounded-full transition-colors hover:bg-blue-100" title="Cambiar paciente">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #3B82F6">close</span>
              </button>
            </div>
            <p class="mt-1.5 text-xs" style="color: var(--color-outline)">Se reutilizan los datos personales del paciente. Solo definís la facturación.</p>
          </div>
        </template>

        <!-- ── Modo: persona nueva ────────────────────────────────────────── -->
        <template v-else>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nro. de Cédula *</label>
            <input
              v-model="form.ci"
              type="text"
              placeholder="12345678"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
              :style="inputStyle(!!errors.ci)"
            />
            <p v-if="errors.ci" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.ci }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
              <input v-model="form.firstName" type="text" placeholder="Ana" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.firstName)" />
              <p v-if="errors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.firstName }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
              <input v-model="form.lastName" type="text" placeholder="García" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.lastName)" />
              <p v-if="errors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.lastName }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Nacimiento *</label>
              <BirthDateInput v-model="form.birthDate" :has-error="!!errors.birthDate" />
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

          <div v-if="errors.contact" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #fff0c2; color: #7a5000">
            <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
            {{ errors.contact }}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
              <input v-model="form.phoneNumber" type="tel" placeholder="0972123456" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.contact)" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</label>
              <input v-model="form.personEmail" type="email" placeholder="cliente@email.com" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.personEmail || !!errors.contact)" />
              <p v-if="errors.personEmail" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.personEmail }}</p>
            </div>
          </div>
        </template>

        <!-- ── Datos de facturación ───────────────────────────────────────── -->
        <div class="flex items-center gap-2 pt-1">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px">receipt_long</span>
          <h3 class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Datos de facturación</h3>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Tipo de Facturación *</label>
          <SearchableSelect
            :model-value="form.tipoFacturacion"
            :options="TIPO_OPTIONS"
            :searchable="false"
            @update:model-value="form.tipoFacturacion = ($event as TipoFacturacion)"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
              Razón Social <span v-if="form.tipoFacturacion === 'Juridica'">*</span>
            </label>
            <input v-model="form.razonSocial" type="text" placeholder="Empresa S.A." class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.razonSocial)" />
            <p v-if="errors.razonSocial" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.razonSocial }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
              RUC / CI Fiscal <span v-if="form.tipoFacturacion === 'Juridica'">*</span>
            </label>
            <input v-model="form.rucCiFiscal" type="text" placeholder="80012345-6" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.rucCiFiscal)" />
            <p v-if="errors.rucCiFiscal" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.rucCiFiscal }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección de Facturación</label>
          <input v-model="form.direccion" type="text" placeholder="Av. Mariscal López 1234, Asunción" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(false)" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email de Facturación</label>
            <input v-model="form.email" type="email" placeholder="facturacion@empresa.com" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(!!errors.email)" />
            <p v-if="errors.email" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.email }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono de Facturación</label>
            <input v-model="form.telefono" type="tel" placeholder="0981234567" class="px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle(false)" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <BaseButton variant="secondary" @click="emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="!canSubmit" @click="submit">
          <span v-if="isSaving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
          {{ isSaving ? "Guardando…" : "Guardar Cliente" }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
