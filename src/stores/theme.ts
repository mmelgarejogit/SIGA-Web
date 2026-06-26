import { defineStore } from "pinia"
import { ref, watch } from "vue"

const STORAGE_KEY = "siga_theme"

export type ThemeMode = "light" | "dark"

// Mismo criterio que el guard anti-flash de index.html: valor guardado o, si no hay,
// preferencia del sistema.
function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(getInitialMode())

  function applyClass() {
    document.documentElement.classList.toggle("dark", mode.value === "dark")
  }

  applyClass()

  watch(mode, (val) => {
    localStorage.setItem(STORAGE_KEY, val)
    applyClass()
  })

  function toggle() {
    mode.value = mode.value === "dark" ? "light" : "dark"
  }

  function setMode(value: ThemeMode) {
    mode.value = value
  }

  return { mode, toggle, setMode }
})
