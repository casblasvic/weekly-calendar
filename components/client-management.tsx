"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { SearchMenu } from "./search-menu"
import { useClinic } from "../contexts/clinic-context"

type ClientManagementProps = {}

export const ClientManagement: React.FC<ClientManagementProps> = (props) => {
  const { isHydrated } = useClinic()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSearch = (query: string) => {
    // Lógica de búsqueda existente
    console.log("Searching for:", query)
  }

  return (
    <div className="client-management-container">
      <div className="client-management-header">
        <h2 className="section-title">Gestión de Clientes</h2>
        <div className="actions-container">
          <button className="action-button primary">
            <span className="icon">+</span>
            <span>Nuevo Cliente</span>
          </button>
          <button className="action-button secondary">
            <span className="icon">↓</span>
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Componente de búsqueda con manejo adecuado de hidratación */}
      <SearchMenu placeholder="Buscar clientes..." onSearch={handleSearch} className="client-search" />

      {/* Contenido principal de gestión de clientes */}
      <div className="client-list-container">
        {isClient && isHydrated ? (
          <>
            {/* Tabla de clientes y otros elementos */}
            <table className="client-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Filas de clientes */}
                <tr>
                  <td>Juan Pérez</td>
                  <td>juan@ejemplo.com</td>
                  <td>+34 612 345 678</td>
                  <td>
                    <span className="status active">Activo</span>
                  </td>
                  <td className="actions">
                    <button className="action-icon edit">✏️</button>
                    <button className="action-icon delete">🗑️</button>
                  </td>
                </tr>
                {/* Más filas... */}
              </tbody>
            </table>

            <div className="pagination">
              <button className="pagination-button">Anterior</button>
              <span className="pagination-info">Página 1 de 5</span>
              <button className="pagination-button">Siguiente</button>
            </div>
          </>
        ) : (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando datos de clientes...</p>
          </div>
        )}
      </div>
    </div>
  )
}

