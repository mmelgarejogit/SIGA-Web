import { defineStore } from "pinia"
import { ref, watch } from "vue"

const STORAGE_KEY = "siga_sidebar_collapsed"
const WIDTH_EXPANDED = "280px"
const WIDTH_COLLAPSED = "72px"

export const useSidebarStore = defineStore("sidebar", () => {
  const collapsed = ref(localStorage.getItem(STORAGE_KEY) === "true")

  function applyWidth() {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed.value ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
    )
  }

  applyWidth()

  watch(collapsed, (val) => {
    localStorage.setItem(STORAGE_KEY, String(val))
    applyWidth()
  })

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
})
