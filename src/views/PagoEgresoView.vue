<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import {
  type Egreso,
  type MetodoPago,
  getEgresoById,
  registrarPago,
} from "@/services/egresosService"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()
const route = useRoute()
const id = Number(route.params.id)
const auth = useAuthStore()
const canMarkExternal = auth.hasPermission("aprobar_egresos")

// ── Estado ─────────────────────────────────────────────────────────────────────

const egreso = ref<Egreso | null>(null)
const isLoading = ref(true)
const loadError = ref("")
const isSaving = ref(false)
const saveError = ref("")

const form = reactive({
  fechaPago: new Date().toISOString().slice(0, 10),
  metodoPago: "" as MetodoPago | "",
  nroComprobante: "",
  observaciones: "",
  esExterno: false,
  motivoExterno: "",
})

type FormErrors = { fechaPago?: string; metodoPago?: string; motivoExterno?: string }
const errors = ref<FormErrors>({})

onMounted(async () => {
  try {
    egreso.value = await getEgresoById(id)
    // Pagable = Pendiente (flujo actual) o Aprobado (egresos del flujo anterior).
    const pagable = egreso.value?.estado === "Pendiente" || egreso.value?.estado === "Aprobado"
    if (!pagable) {
      router.replace("/egresos/pagos")
    }
  } catch {
    loadError.value = "No se pudo cargar el egreso."
  } finally {
    isLoading.value = false
  }
})

// ── Opciones ───────────────────────────────────────────────────────────────────

const metodoPagoOptions = [
  { value: "Efectivo",       label: "Efectivo" },
  { value: "Tarjeta",        label: "Tarjeta" },
  { value: "Transferencia",  label: "Transferencia" },
  { value: "Cheque",         label: "Cheque" },
]

// ── Helpers de formato ────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

function tipoLabel(tipo: string) {
  return { FacturaCompra: "Factura de compra", Honorario: "Honorario", GastoGeneral: "Gasto General", Salario: "Salario" }[tipo] ?? tipo
}

function tipoIcon(tipo: string) {
  return { FacturaCompra: "receipt", Honorario: "person_check", GastoGeneral: "payments", Salario: "badge" }[tipo] ?? "attach_money"
}

function tipoColor(tipo: string): { bg: string; color: string } {
  return {
    FacturaCompra: { bg: "var(--color-info-container)", color: "var(--color-on-info-container)" },
    Honorario:     { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-on-tertiary-fixed-variant)" },
    GastoGeneral:  { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" },
    Salario:       { bg: "var(--color-success-container)", color: "var(--color-on-success-container)" },
  }[tipo] ?? { bg: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
}

const referencia = computed(() => {
  const e = egreso.value
  if (!e) return ""
  if (e.tipo === "FacturaCompra") return e.proveedorNombre ?? ""
  if (e.tipo === "Honorario") return [e.professionalNombre, e.periodo].filter(Boolean).join(" · ")
  if (e.tipo === "GastoGeneral") return e.categoriaGastoNombre ?? ""
  if (e.tipo === "Salario") return [e.empleadoNombre, e.periodo].filter(Boolean).join(" · ")
  return ""
})

// ── Submit ─────────────────────────────────────────────────────────────────────

function validate() {
  const e: FormErrors = {}
  if (!form.fechaPago) e.fechaPago = "La fecha de pago es obligatoria."
  if (!form.metodoPago) e.metodoPago = "El método de pago es obligatorio."
  if (form.esExterno && !form.motivoExterno.trim()) e.motivoExterno = "El motivo es obligatorio para un pago externo."
  errors.value = e
  return Object.keys(e).length === 0
}

// Paso de confirmación antes de mover la plata
const showConfirm = ref(false)

function abrirConfirmacion() {
  saveError.value = ""
  if (!validate()) return
  showConfirm.value = true
}

async function confirmarPago() {
  isSaving.value = true
  saveError.value = ""
  try {
    await registrarPago(id, {
      metodoPago: form.metodoPago as MetodoPago,
      fechaPago: form.fechaPago,
      nroComprobante: form.nroComprobante.trim() || undefined,
      observaciones: form.observaciones.trim() || undefined,
      esExterno: form.esExterno || undefined,
      motivoExterno: form.esExterno ? form.motivoExterno.trim() : undefined,
    })
    showConfirm.value = false
    router.push("/egresos/pagos")
  } catch (err: unknown) {
    showConfirm.value = false
    saveError.value = err instanceof Error ? err.message : "Error al registrar el pago."
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex items-center gap-3 mb-8">
          <button @click="router.push('/egresos')"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style="background-color: var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Registrar Pago</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Confirmá el pago del egreso pendiente
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center gap-2 text-sm" style="color: var(--color-on-surface-variant)">
          <span class="material-symbols-outlined animate-spin">progress_activity</span>
          Cargando...
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else-if="egreso">

          <!-- Detalle del egreso (solo lectura) -->
          <div class="rounded-2xl p-6 mb-6"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">
            <p class="text-xs font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Egreso pendiente de pago</p>

            <div class="flex items-center gap-3 mb-5 pb-4" style="border-bottom: 1px solid var(--color-hairline)">
              <span class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                :style="`background-color: ${tipoColor(egreso.tipo).bg}`">
                <span class="material-symbols-outlined" :style="`font-size: 20px; color: ${tipoColor(egreso.tipo).color}`">
                  {{ tipoIcon(egreso.tipo) }}
                </span>
              </span>
              <div class="flex-1 min-w-0">
                <p class="font-extrabold text-base" style="color: var(--color-on-surface)">{{ egreso.concepto }}</p>
                <p class="text-sm" style="color: var(--color-outline)">{{ tipoLabel(egreso.tipo) }}
                  <span v-if="referencia"> · {{ referencia }}</span>
                </p>
              </div>
              <p class="text-2xl font-extrabold flex-shrink-0" style="color: var(--color-primary)">
                {{ formatPrice(egreso.monto) }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de emisión</p>
                <p style="color: var(--color-on-surface)">{{ formatDate(egreso.fechaEmision) }}</p>
              </div>
              <div v-if="egreso.fechaVencimiento">
                <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Vencimiento</p>
                <p style="color: var(--color-on-surface)">{{ formatDate(egreso.fechaVencimiento) }}</p>
              </div>
              <div v-if="egreso.nroFactura">
                <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Factura</p>
                <p class="font-mono" style="color: var(--color-on-surface)">{{ egreso.nroFactura }}</p>
              </div>
              <div v-if="egreso.observaciones">
                <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Observaciones</p>
                <p style="color: var(--color-on-surface)">{{ egreso.observaciones }}</p>
              </div>
            </div>
          </div>

          <!-- Formulario de pago -->
          <div class="rounded-2xl p-6 space-y-5"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">
            <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Datos del pago</p>

            <!-- Error de guardado -->
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
              <span class="material-symbols-outlined" style="font-size: 18px">error</span>
              {{ saveError }}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Fecha de pago -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Fecha de pago *
                </label>
                <DateInput v-model="form.fechaPago" :has-error="!!errors.fechaPago" />
                <p v-if="errors.fechaPago" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.fechaPago }}</p>
              </div>

              <!-- Método de pago -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Método de pago *
                </label>
                <SearchableSelect
                  v-model="form.metodoPago"
                  :options="metodoPagoOptions"
                  :searchable="false"
                  placeholder="Seleccionar"
                  null-label="Seleccionar"
                />
                <p v-if="errors.metodoPago" class="text-xs font-medium" style="color: var(--color-error)">{{ errors.metodoPago }}</p>
              </div>
            </div>

            <!-- N° Comprobante -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                N° Comprobante
              </label>
              <input v-model="form.nroComprobante" type="text" placeholder="Opcional"
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
                :style="inputStyle(false)" />
            </div>

            <!-- Observaciones -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                Observaciones
              </label>
              <textarea v-model="form.observaciones" rows="2" placeholder="Opcional"
                class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
                :style="inputStyle(false)" />
            </div>

            <!-- Pago externo (solo visible para aprobar_egresos) -->
            <template v-if="canMarkExternal">
              <div class="pt-1" style="border-top: 1px solid var(--color-hairline)">
                <button
                  type="button"
                  @click="form.esExterno = !form.esExterno"
                  class="flex items-center gap-3 w-full text-left rounded-xl px-4 py-3 transition-all"
                  :style="form.esExterno
                    ? 'background-color: var(--color-warning-container); border: 1px solid var(--color-warning-container);'
                    : 'background-color: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant);'"
                >
                  <div
                    class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    :style="form.esExterno
                      ? 'background-color: var(--color-warning); border: 1.5px solid var(--color-warning);'
                      : 'background-color: transparent; border: 1.5px solid var(--color-outline);'"
                  >
                    <span v-if="form.esExterno" class="material-symbols-outlined text-on-primary" style="font-size:14px">check</span>
                  </div>
                  <div>
                    <p class="text-sm font-bold" :style="form.esExterno ? 'color: var(--color-on-warning-container)' : 'color: var(--color-on-surface)'">
                      Pago externo (no afecta la caja)
                    </p>
                    <p class="text-xs" :style="form.esExterno ? 'color: var(--color-on-warning-container)' : 'color: var(--color-outline)'">
                      El pago fue realizado desde fuera de la caja (ej: transferencia directa, pago del jefe)
                    </p>
                  </div>
                </button>
              </div>

              <div v-if="form.esExterno" class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Motivo del pago externo *
                </label>
                <textarea
                  v-model="form.motivoExterno"
                  rows="2"
                  placeholder="Ej: Pagado por transferencia bancaria directa del gerente"
                  class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
                  :style="inputStyle(!!errors.motivoExterno)"
                />
                <p v-if="errors.motivoExterno" class="text-xs font-medium" style="color: var(--color-error)">
                  {{ errors.motivoExterno }}
                </p>
              </div>

              <div v-if="form.esExterno"
                class="flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-medium"
                style="background-color: var(--color-warning-container); color: var(--color-on-warning-container);">
                <span class="material-symbols-outlined flex-shrink-0" style="font-size:16px">warning</span>
                Este pago quedará registrado bajo tu nombre. No se creará movimiento en la caja actual.
              </div>
            </template>
          </div>

          <!-- Acciones -->
          <div class="flex items-center justify-between mt-6">
            <BaseButton variant="secondary" size="default" @click="router.push('/egresos')">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" :disabled="isSaving" @click="abrirConfirmacion">
              <span class="material-symbols-outlined" style="font-size: 18px">payments</span>
              Registrar Pago
            </BaseButton>
          </div>

        </template>
      </div>
    </main>

    <!-- Modal: confirmar pago -->
    <BaseModal :show="showConfirm" title="Confirmar pago" size="sm" @close="showConfirm = false">
      <template #body>
        <div v-if="egreso" class="space-y-4">
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            Vas a registrar el pago de este egreso. Esta acción no se puede deshacer.
          </p>

          <div class="rounded-xl p-4 space-y-2.5" style="background-color: var(--color-surface-container-low)">
            <div class="flex items-start justify-between gap-3">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ egreso.concepto }}</span>
              <span class="text-lg font-extrabold flex-shrink-0" style="color: var(--color-primary)">{{ formatPrice(egreso.monto) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span style="color: var(--color-outline)">Método</span>
              <span class="font-semibold" style="color: var(--color-on-surface)">{{ form.metodoPago || "—" }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span style="color: var(--color-outline)">Fecha</span>
              <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatDate(form.fechaPago) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span style="color: var(--color-outline)">Origen</span>
              <span class="font-semibold" :style="form.esExterno ? 'color: var(--color-on-warning-container)' : 'color: var(--color-on-surface)'">
                {{ form.esExterno ? "Pago externo (no afecta caja)" : "Sale de la caja abierta" }}
              </span>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" @click="showConfirm = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="confirmarPago">
          <span v-if="isSaving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
          {{ isSaving ? "Registrando…" : "Confirmar pago" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
:deep(.ss-trigger) { height: 48px; border-radius: 12px; }
</style>
