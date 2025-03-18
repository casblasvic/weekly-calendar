"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAuthFromCookie, setAuthCookie, clearAuthCookie, type AuthUser } from "@/utils/auth-utils"
import { isBrowser } from "@/utils/client-utils"

interface AuthContextType {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar usuario desde la cookie al iniciar
  useEffect(() => {
    if (isBrowser) {
      const authUser = getAuthFromCookie()
      setUser(authUser)
      setIsLoading(false)
    }
  }, [])

  const login = (userData: AuthUser) => {
    setUser(userData)
    setAuthCookie(userData)
  }

  const logout = () => {
    setUser(null)
    clearAuthCookie()
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}

