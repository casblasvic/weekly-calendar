import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useAuthErrorHandler() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleAuthError = useCallback((response: Response) => {
    if (response.status === 401 || response.status === 403) {
      console.error('❌ Sesión expirada, redirigiendo al login...')
      window.location.href = '/login'
      return true
    }
    return false
  }, [])

  const fetchWithAuthCheck = useCallback(async (url: string, options?: RequestInit) => {
    try {
      const response = await fetch(url, options)
      
      // Verificar errores de autenticación
      if (handleAuthError(response)) {
        throw new Error('Sesión expirada')
      }
      
      return response
    } catch (error) {
      // Re-throw para que el componente pueda manejar otros errores
      throw error
    }
  }, [handleAuthError])

  const isAuthenticated = status === 'authenticated' && !!session

  return {
    handleAuthError,
    fetchWithAuthCheck,
    isAuthenticated,
    session,
    status
  }
} 