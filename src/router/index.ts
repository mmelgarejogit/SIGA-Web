import { createRouter, createWebHistory } from 'vue-router'
import type { RouteMeta } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import PacientesView from '@/views/PacientesView.vue'
import UsuariosView from '@/views/UsuariosView.vue'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    permission?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/pacientes',
      name: 'pacientes',
      component: PacientesView,
      meta: { requiresAuth: true, permission: 'ver_pacientes' },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: { requiresAuth: true, permission: 'ver_usuarios' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated)
    return { name: 'login' }

  if (to.meta.requiresGuest && auth.isAuthenticated)
    return { name: 'dashboard' }

  if (to.meta.permission && !auth.hasPermission(to.meta.permission))
    return { name: 'dashboard' }
})

export default router
