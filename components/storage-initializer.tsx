"use client";

import { useEffect, useState } from "react";
import { loadClinicData, loadThemeData, hasClinics } from "@/utils/storage-utils";

/**
 * Componente que inicializa los datos de almacenamiento en el cliente
 * Este componente no renderiza nada visible
 */
export function StorageInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return;

    try {
      // Inicializar datos
      loadClinicData();
      loadThemeData();
      
      // Verificar si hay datos de clínicas disponibles
      if (!hasClinics()) {
        console.warn("No se encontraron datos de clínicas en el almacenamiento, usando valores predeterminados");
      }
      
      // Marcar como inicializado
      setIsInitialized(true);
      console.log("🏥 Datos de almacenamiento inicializados correctamente");
    } catch (error) {
      console.error("Error al inicializar los datos de almacenamiento:", error);
    }
  }, []);

  // Registro del estado de inicialización
  useEffect(() => {
    if (isInitialized) {
      window.dispatchEvent(new Event('storage-initialized'));
    }
  }, [isInitialized]);

  return null;
} 