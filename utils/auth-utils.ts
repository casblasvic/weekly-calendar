import { setCookie, getCookie, removeCookie } from "./cookie-utils"
import { isBrowser } from "./client-utils"

// Tipos para la autenticación
export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  clinicId: number
}

// Clave para la cookie de autenticación
const AUTH_COOKIE_KEY = "auth_user"

/**
 * Establece la cookie de autenticación con los datos del usuario
 */
export function setAuthCookie(user: AuthUser) {
  return setCookie(AUTH_COOKIE_KEY, user, {
    expires: 7, // 7 días
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  })
}

/**
 * Obtiene los datos de autenticación desde la cookie
 */
export function getAuthFromCookie(): AuthUser | null {
  return getCookie<AuthUser | null>(AUTH_COOKIE_KEY, null)
}

/**
 * Elimina la cookie de autenticación (logout)
 */
export function clearAuthCookie() {
  return removeCookie(AUTH_COOKIE_KEY)
}

/**
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated(): boolean {
  return getAuthFromCookie() !== null
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(role: string): boolean {
  const user = getAuthFromCookie()
  return user !== null && user.role === role
}

/**
 * Hook para proteger rutas en el cliente
 */
export function useAuthProtection() {
  if (isBrowser) {
    const user = getAuthFromCookie()
    if (!user) {
      // Redirigir a la página de login
      window.location.href = "/login"
      return false
    }
    return true
  }
  return false
}

