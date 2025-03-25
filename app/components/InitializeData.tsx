'use client'

import { useEffect } from 'react'
import { initializeDataService } from '@/services/data'

export function InitializeData() {
  useEffect(() => {
    initializeDataService().catch(error => {
      console.error('Error al inicializar el servicio de datos:', error);
    });
  }, []);

  return null;
} 