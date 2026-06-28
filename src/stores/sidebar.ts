import { defineStore } from "pinia"
import { ref, watch } from "vue"

const STORAGE_KEY = "siga_sidebar_collapsed"
const WIDTH_EXPANDED = "280px"
const WIDTH_COLLAPSED = "72px"
const MOBILE_QUERY = "(max-width: 1023px)" // < lg → sidebar como drawer

export const useSidebarStore = defineStore("sidebar", () => {
  // Colapso a iconos (solo desktop)
  const collapsed = ref(localStorage.getItem(STORAGE_KEY) === "true")

  // Drawer en mobile
  const mql = window.matchMedia(MOBILE_QUERY)
  const isMobile = ref(mql.matches)
  const mobileOpen = ref(false)

  function applyWidth() {
    // En mobile el sidebar flota por encima (drawer) → el contenido ocupa todo el ancho.
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isMobile.value ? "0px" : collapsed.value ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
    )
  }

  applyWidth()

  mql.addEventListener("change", (e) => {
    isMobile.value = e.matches
    if (!e.matches) mobileOpen.value = false // al pasar a desktop, cerrar el drawer
    applyWidth()
  })

  watch(collapsed, (val) => {
    localStorage.setItem(STORAGE_KEY, String(val))
    applyWidth()
  })

  // Bloquear el scroll del body mientras el drawer está abierto en mobile.
  watch([mobileOpen, isMobile], ([open, mobile]) => {
    document.body.classList.toggle("drawer-open", open && mobile)
  })

  function toggle() {
    collapsed.value = !collapsed.value
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  return { collapsed, isMobile, mobileOpen, toggle, toggleMobile, closeMobile }
})
