"use client"

import { useEffect, useState } from "react"
import { runAutoMigration, isMigrationNeeded, checkStorageSize } from "@/utils/storage-migration"

interface StorageMigratorProps {
  onComplete?: (result: { successful: string[]; failed: string[] } | null) => void
  showDebug?: boolean
}

/**
 * Componente que ejecuta la migración de localStorage a cookies automáticamente
 * Se debe colocar en el layout principal de la aplicación
 */
export function StorageMigrator({ onComplete, showDebug = false }: StorageMigratorProps) {
  const [migrationStatus, setMigrationStatus] = useState<"pending" | "completed" | "not-needed">("pending")
  const [migrationResult, setMigrationResult] = useState<{ successful: string[]; failed: string[] } | null>(null)

  useEffect(() => {
    // Verificar si la migración es necesaria
    if (!isMigrationNeeded()) {
      setMigrationStatus("not-needed")
      if (onComplete) onComplete(null)
      return
    }

    // Verificar el tamaño de los datos
    const sizeInfo = checkStorageSize()
    console.log("Información de tamaño de localStorage:", sizeInfo)

    // Ejecutar la migración
    const result = runAutoMigration()
    setMigrationResult(result)
    setMigrationStatus("completed")

    if (onComplete) onComplete(result)
  }, [onComplete])

  // No renderizar nada en producción a menos que showDebug sea true
  if (!showDebug) return null

  // Renderizar información de depuración si showDebug es true
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-100 border rounded shadow-lg z-50 max-w-md text-xs">
      <h3 className="font-bold mb-2">Estado de migración de almacenamiento</h3>
      <p>Estado: {migrationStatus}</p>

      {migrationResult && (
        <>
          <p>Migrados con éxito: {migrationResult.successful.length}</p>
          <p>Fallidos: {migrationResult.failed.length}</p>

          {migrationResult.successful.length > 0 && (
            <details>
              <summary>Claves migradas con éxito</summary>
              <ul className="ml-4 mt-1">
                {migrationResult.successful.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </details>
          )}

          {migrationResult.failed.length > 0 && (
            <details>
              <summary>Claves que fallaron</summary>
              <ul className="ml-4 mt-1">
                {migrationResult.failed.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Recargar página
      </button>
    </div>
  )
}

