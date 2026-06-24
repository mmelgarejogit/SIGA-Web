<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type ConfiguracionNegocio,
  getConfiguracion,
  updateConfiguracion,
} from "@/services/configService"

const auth = useAuthStore()
const canEdit = auth.hasPermission("gestionar_configuracion")

const isLoading = ref(false)
const isSaving = ref(false)
const saveError = ref("")
const saveSuccess = ref(false)

const form = reactive({
  nombreFantasia: "",
  razonSocial: "",
  cuit: "",
  direccion: "",
  telefono: "",
  email: "",
  sitioWeb: "",
})

function fill(data: ConfiguracionNegocio) {
  form.nombreFantasia = data.nombreFantasia ?? ""
  form.razonSocial    = data.razonSocial ?? ""
  form.cuit           = data.cuit ?? ""
  form.direccion      = data.direccion ?? ""
  form.telefono       = data.telefono ?? ""
  form.email          = data.email ?? ""
  form.sitioWeb       = data.sitioWeb ?? ""
}

async function load() {
  isLoading.value = true
  try {
    fill(await getConfiguracion())
  } catch {
    /* silencioso */
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (isSaving.value) return
  isSaving.value = true
  saveError.value = ""
  saveSuccess.value = false
  try {
    await updateConfiguracion({
      nombreFantasia: form.nombreFantasia.trim(),
      razonSocial:    form.razonSocial.trim() || undefined,
      cuit:           form.cuit.trim() || undefined,
      direccion:      form.direccion.trim() || undefined,
      telefono:       form.telefono.trim() || undefined,
      email:          form.email.trim() || undefined,
      sitioWeb:       form.sitioWeb.trim() || undefined,
    })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al guardar."
  } finally {
    isSaving.value = false
  }
}

function inputStyle() {
  return "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Configuración</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">Parámetros generales del sistema</p>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else class="rounded-2xl p-8"
          style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">

          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-5 text-sm font-medium"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <div v-if="saveSuccess" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-5 text-sm font-medium"
            style="background-color: #dcfce7; color: #166534">
            <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
            Configuración guardada correctamente.
          </div>

          <form @submit.prevent="save" class="space-y-5">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre Fantasía *</label>
              <input v-model="form.nombreFantasia" type="text" placeholder="Óptica San Martín" :disabled="!canEdit"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Razón Social</label>
                <input v-model="form.razonSocial" type="text" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">CUIT / RUT</label>
                <input v-model="form.cuit" type="text" placeholder="20-12345678-9" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección</label>
              <input v-model="form.direccion" type="text" placeholder="Av. Corrientes 1234, CABA" :disabled="!canEdit"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
                <input v-model="form.telefono" type="text" placeholder="+54 11 1234-5678" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email de contacto</label>
                <input v-model="form.email" type="email" placeholder="info@optica.com" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sitio Web</label>
              <input v-model="form.sitioWeb" type="text" placeholder="https://optica.com" :disabled="!canEdit"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
            </div>

            <div v-if="canEdit" class="flex justify-end pt-2">
              <button type="submit" :disabled="isSaving"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-60"
                style="background-color: var(--color-primary); color: white;">
                <svg v-if="isSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">save</span>
                {{ isSaving ? "Guardando..." : "Guardar" }}
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  </div>
</template>
