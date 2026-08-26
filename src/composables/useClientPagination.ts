import { computed, reactive, ref, watch } from "vue"

/**
 * Paginación client-side para listas que ya vienen completas del backend.
 * Devuelve exactamente las props que espera `PaginationFooter` (§14 del design-system).
 */
export function useClientPagination<T>(source: () => T[], pageSize = 10) {
  const currentPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(source().length / pageSize)))
  const pageItems = computed(() =>
    source().slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize),
  )
  const rangeStart = computed(() => (source().length === 0 ? 0 : (currentPage.value - 1) * pageSize + 1))
  const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, source().length))

  // Si el origen se achica tras una recarga, no dejar la página fuera de rango.
  watch(totalPages, (tp) => {
    if (currentPage.value > tp) currentPage.value = tp
  })

  return reactive({ currentPage, totalPages, pageItems, rangeStart, rangeEnd })
}
