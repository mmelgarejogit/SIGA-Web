import { createApp } from "vue"
import { createPinia } from "pinia"

import App from "./App.vue"
import router from "./router"
import "./assets/main.css"
import { useThemeStore } from "./stores/theme"

const app = createApp(App)

app.use(createPinia())

// Sincroniza el store de tema con el DOM antes del montaje (el guard de index.html
// ya aplicó la clase; esto deja el estado reactivo consistente sin flash).
useThemeStore()

app.use(router)

app.mount("#app")
