import { createRouter, createWebHistory } from 'vue-router'
import type { RouteMeta } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import PacientesView from '@/views/PacientesView.vue'
import PacienteDetailView from '@/views/PacienteDetailView.vue'
import UsuariosView from '@/views/UsuariosView.vue'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    permission?: string
    label?: string
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
      path: '/registro',
      name: 'registro',
      component: RegisterView,
      meta: { requiresGuest: true },
    },
    {
      path: '/verificar-email',
      name: 'verificar-email',
      component: () => import('@/views/VerifyEmailView.vue'),
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
      path: '/pacientes/:id',
      name: 'paciente-detail',
      component: PacienteDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: { requiresAuth: true, permission: 'ver_usuarios' },
    },
    {
      path: '/profesionales',
      name: 'profesionales',
      component: () => import('@/views/ProfesionalesView.vue'),
      meta: { requiresAuth: true, permission: 'ver_profesionales' },
    },
    {
      path: '/agenda',
      name: 'agenda',
      component: () => import('@/views/AgendaView.vue'),
      meta: { requiresAuth: true, permission: 'ver_agenda' },
    },
    {
      path: '/clinica',
      name: 'clinica',
      component: () => import('@/views/ClinicaView.vue'),
      meta: { requiresAuth: true, permission: 'ver_historia_clinica' },
    },
    {
      path: '/inventario',
      name: 'inventario',
      component: () => import('@/views/ComingSoonView.vue'),
      meta: { requiresAuth: true, permission: 'ver_inventario', label: 'Inventario' },
    },
    {
      path: '/ventas',
      name: 'ventas',
      component: () => import('@/views/ComingSoonView.vue'),
      meta: { requiresAuth: true, permission: 'ver_ventas', label: 'Ventas' },
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: () => import('@/views/ComingSoonView.vue'),
      meta: { requiresAuth: true, permission: 'ver_reportes', label: 'Reportes' },
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
