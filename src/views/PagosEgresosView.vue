<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Egreso, getEgresos } from "@/services/egresosService"

const router = useRouter()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Estado ─────────────────────────────────────────────────────────────────────

const egresos = ref<Egreso[]>([])
const totalCount = ref(0)
const isLoading = ref(false)
const loadError = ref("")
const currentPage = ref(1)
const pageSize = 10

const tipoFiltros = ref<string[]>([])
const tipoOptions = [
  { value: "FacturaCompra", label: "Factura" },
  { value: "Honorario",     label: "Honorario" },
  { value: "GastoGeneral",  label: "Gasto General" },
  { value: "Salario",       label: "Salario" },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const params: Record<string, unknown> = { estado: "Aprobado", page: currentPage.value, pageSize }
    if (tipoFiltros.value.length === 1) params.tipo = tipoFiltros.value[0]
    const res = await getEgresos(params as Parameters<typeof getEgresos>[0])
    egresos.value = res.items.filter(e => e.estado === "Aprobado")
    totalCount.value = egresos.value.length
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar egresos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function setTipoFiltro(val: string[]) {
  const added = val.find(v => !tipoFiltros.value.includes(v))
  tipoFiltros.value = added ? [added] : val
  currentPage.value = 1
  load()
}

const columns = [
  { key: "tipo",         label: "Tipo" },
  { key: "concepto",     label: "Concepto" },
  { key: "monto",        label: "Monto", align: "right" as const },
  { key: "fechaEmision", label: "Emisión" },
  { key: "vencimiento",  label: "Vencimiento" },
  { key: "acciones",     label: "", align: "right" as const },
]

// ── Helpers de UI ──────────────────────────────────────────────────────────────

function tipoLabel(tipo: string) {
  return { FacturaCompra: "Factura", Honorario: "Honorario", GastoGeneral: "Gasto", Salario: "Salario" }[tipo] ?? tipo
}

function tipoIcon(tipo: string) {
  return { FacturaCompra: "receipt", Honorario: "person_check", GastoGeneral: "payments", Salario: "badge" }[tipo] ?? "attach_money"
}

function tipoColor(tipo: string) {
  return ({
    FacturaCompra: { bg: "var(--color-info-container)", color: "var(--color-on-info-container)" },
    Honorario:     { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "#6D28D9" },
    GastoGeneral:  { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" },
    Salario:       { bg: "var(--color-success-container)", color: "var(--color-on-success-container)" },
  } as Record<string, { bg: string; color: string }>)[tipo] ?? { bg: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
}

function menuItems(e: Egreso): ContextMenuItem[] {
  return [
    {
      type: "item", label: "Registrar pago", icon: "payments",
      action: () => router.push(`/egresos/pagos/${e.id}`),
    },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Pagos Pendientes</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} egreso{{ totalCount !== 1 ? "s" : "" }} aprobado{{ totalCount !== 1 ? "s" : "" }} esperando pago
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6">
          <FilterChips :options="tipoOptions" :modelValue="tipoFiltros" placeholder="Tipo" @update:modelValue="setTipoFiltro" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden"
          style="background-color: var(--color-surface-container-lowest);
                 box-shadow: var(--shadow-sm);
                 outline: 1px solid var(--color-hairline)">
          <BaseTable :columns="columns" :items="egresos" :loading="isLoading"
            empty-text="No hay egresos aprobados pendientes de pago.">

            <template #tipo="{ item }">
              <div class="flex items-center gap-2">
                <span class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                  :style="`background-color: ${tipoColor(item.tipo).bg}`">
                  <span class="material-symbols-outlined" :style="`font-size: 18px; color: ${tipoColor(item.tipo).color}`">
                    {{ tipoIcon(item.tipo) }}
                  </span>
                </span>
                <span class="text-xs font-bold" :style="`color: ${tipoColor(item.tipo).color}`">
                  {{ tipoLabel(item.tipo) }}
                </span>
              </div>
            </template>

            <template #concepto="{ item }">
              <div>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.concepto }}</p>
                <p class="text-xs" style="color: var(--color-outline)">
                  <span v-if="item.tipo === 'FacturaCompra'">{{ item.proveedorNombre ?? '—' }}</span>
                  <span v-else-if="item.tipo === 'Honorario'">
                    {{ item.professionalNombre ?? '—' }}{{ item.periodo ? ` · ${item.periodo}` : '' }}
                  </span>
                  <span v-else-if="item.tipo === 'Salario'">
                    {{ item.empleadoNombre ?? '—' }}{{ item.periodo ? ` · ${item.periodo}` : '' }}
                  </span>
                  <span v-else>{{ item.categoriaGastoNombre ?? '—' }}</span>
                </p>
              </div>
            </template>

            <template #monto="{ item }">
              <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{ formatPrice(item.monto) }}</span>
            </template>

            <template #fechaEmision="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaEmision) }}</span>
            </template>

            <template #vencimiento="{ item }">
              <span v-if="item.fechaVencimiento" class="text-sm"
                :style="item.estaVencido ? 'color: var(--color-error); font-weight: 600' : 'color: var(--color-on-surface-variant)'">
                {{ formatDate(item.fechaVencimiento) }}
              </span>
              <span v-else class="text-sm" style="color: var(--color-outline)">—</span>
            </template>

            <template #acciones="{ item }">
              <div class="flex items-center justify-end">
                <RowContextMenu :items="menuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer paginación -->
          <div v-if="totalCount > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              egreso{{ totalCount !== 1 ? "s" : "" }} pendiente{{ totalCount !== 1 ? "s" : "" }} de pago
            </span>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
