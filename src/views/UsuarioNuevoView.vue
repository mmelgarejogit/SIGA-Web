<script setup lang="ts">
import { ref, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import { createUser } from "@/services/userService"

const router = useRouter()

const saving   = ref(false)
const errorMsg = ref("")
const success  = ref(false)

const form = reactive({
  firstName:    "",
  lastName:     "",
  ci:           "",
  email:        "",
  password:     "",
  confirmPassword: "",
  birthDate:    "",
  phoneNumber:  "",
})

const errors = reactive({
  firstName: "",
  lastName: "",
  ci: "",
  email: "",
  password: "",
  confirmPassword: "",
  birthDate: "",
})

function validate(): boolean {
  let ok = true
  errors.firstName = ""
  errors.lastName  = ""
  errors.ci        = ""
  errors.email     = ""
  errors.password  = ""
  errors.confirmPassword = ""
  errors.birthDate = ""

  if (!form.firstName.trim()) { errors.firstName = "Obligatorio."; ok = false }
  if (!form.lastName.trim())  { errors.lastName  = "Obligatorio."; ok = false }
  if (!form.ci.trim())        { errors.ci        = "Obligatorio."; ok = false }
  if (!form.email.trim())     { errors.email     = "Obligatorio."; ok = false }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { errors.email = "Email inválido."; ok = false }
  if (!form.password)         { errors.password  = "Obligatorio."; ok = false }
  else if (form.password.length < 6) { errors.password = "Mínimo 6 caracteres."; ok = false }
  if (form.confirmPassword !== form.password) { errors.confirmPassword = "Las contraseñas no coinciden."; ok = false }
  if (!form.birthDate)        { errors.birthDate = "Obligatorio."; ok = false }

  return ok
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  errorMsg.value = ""
  try {
    await createUser({
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      ci:          form.ci.trim(),
      email:       form.email.trim().toLowerCase(),
      password:    form.password,
      birthDate:   form.birthDate,
      phoneNumber: form.phoneNumber.trim() || undefined,
    })
    success.value = true
    setTimeout(() => router.push("/usuarios"), 1500)
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? e?.response?.data ?? "Error al crear el usuario."
  } finally {
    saving.value = false
  }
}

const inputStyle = (hasError: boolean) =>
  hasError
    ? "border:1.5px solid var(--color-error);background-color:#FFF8F7;color:var(--color-on-surface)"
    : "border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)"
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8 max-w-2xl">

        <!-- Encabezado -->
        <div class="flex items-center gap-4 mb-8">
          <button @click="router.back()" class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight">Nuevo Usuario</h1>
            <p class="font-medium mt-1" style="color:var(--color-on-surface-variant)">Crear una cuenta de acceso al sistema</p>
          </div>
        </div>

        <!-- Éxito -->
        <Transition name="fade">
          <div v-if="success" class="flex items-center gap-3 px-5 py-4 rounded-2xl mb-6" style="background-color:#D1FAE5;color:#065F46">
            <span class="material-symbols-outlined">check_circle</span>
            <p class="font-semibold">Usuario creado exitosamente. Redirigiendo…</p>
          </div>
        </Transition>

        <!-- Error global -->
        <div v-if="errorMsg" class="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-medium" style="background-color:var(--color-error-container);color:var(--color-error)">
          <span class="material-symbols-outlined" style="font-size:18px">error</span>
          {{ errorMsg }}
        </div>

        <div class="rounded-2xl p-8 space-y-6" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 16px rgba(0,40,142,0.08)">

          <!-- Datos personales -->
          <div>
            <h3 class="text-xl font-extrabold mb-4" style="color:var(--color-primary)">Datos personales</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nombre *</label>
                <input v-model="form.firstName" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.firstName)" />
                <p v-if="errors.firstName" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.firstName }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Apellido *</label>
                <input v-model="form.lastName" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.lastName)" />
                <p v-if="errors.lastName" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.lastName }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">C.I. *</label>
                <input v-model="form.ci" type="text" placeholder="Ej: 4.567.890" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.ci)" />
                <p v-if="errors.ci" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.ci }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Fecha de nacimiento *</label>
                <input v-model="form.birthDate" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.birthDate)" />
                <p v-if="errors.birthDate" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.birthDate }}</p>
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Teléfono</label>
                <input v-model="form.phoneNumber" type="tel" placeholder="Ej: 0981 123 456" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
              </div>
            </div>
          </div>

          <!-- Credenciales -->
          <div>
            <h3 class="text-xl font-extrabold mb-4" style="color:var(--color-primary)">Credenciales de acceso</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Email *</label>
                <input v-model="form.email" type="email" placeholder="usuario@ejemplo.com" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.email)" />
                <p v-if="errors.email" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.email }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Contraseña *</label>
                  <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.password)" />
                  <p v-if="errors.password" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.password }}</p>
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Confirmar contraseña *</label>
                  <input v-model="form.confirmPassword" type="password" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!errors.confirmPassword)" />
                  <p v-if="errors.confirmPassword" class="text-xs font-medium mt-1" style="color:var(--color-error)">{{ errors.confirmPassword }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Nota informativa -->
          <div class="flex items-start gap-3 px-4 py-3 rounded-xl" style="background-color:var(--color-surface-container-low);border:1px solid var(--color-outline-variant)">
            <span class="material-symbols-outlined mt-0.5" style="font-size:18px;color:var(--color-outline)">info</span>
            <p class="text-sm" style="color:var(--color-on-surface-variant)">
              El usuario se crea sin roles. Luego podés asignarle roles y sucursal desde la lista de usuarios.
            </p>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="secondary" @click="router.back()">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving || success" @click="handleSubmit">
              <span v-if="saving" class="material-symbols-outlined animate-spin" style="font-size:18px">progress_activity</span>
              <span v-else class="material-symbols-outlined" style="font-size:18px">person_add</span>
              {{ saving ? "Creando…" : "Crear Usuario" }}
            </BaseButton>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>
