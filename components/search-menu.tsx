"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useClinic } from "../contexts/clinic-context"

interface SearchMenuProps {
  // Propiedades existentes
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export const SearchMenu: React.FC<SearchMenuProps> = ({ placeholder = "Buscar...", onSearch, className = "" }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const { isHydrated } = useClinic()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Solo renderizar el contenido completo cuando estamos en el cliente y los datos están hidratados
  if (!isClient) {
    return (
      <div className={`search-menu-container ${className}`}>
        <div className="search-input-wrapper">
          <input type="text" placeholder={placeholder} className="search-input" disabled />
        </div>
      </div>
    )
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  return (
    <div className={`search-menu-container ${className}`}>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder={placeholder}
          className="search-input"
          value={searchQuery}
          onChange={handleSearch}
        />
        <button className="search-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
      {/* Resto del contenido del menú de búsqueda */}
      <div className="search-results">
        {/* Aquí va el contenido que ha desaparecido */}
        {isHydrated ? (
          <>
            {/* Contenido original del menú de búsqueda */}
            <div className="search-filters">
              <div className="filter-group">
                <span className="filter-label">Filtrar por:</span>
                <div className="filter-options">
                  <button className="filter-option active">Todos</button>
                  <button className="filter-option">Activos</button>
                  <button className="filter-option">Inactivos</button>
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Ordenar por:</span>
                <select className="filter-select">
                  <option value="name">Nombre</option>
                  <option value="date">Fecha</option>
                  <option value="status">Estado</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">Cargando opciones de búsqueda...</div>
        )}
      </div>
    </div>
  )
}

