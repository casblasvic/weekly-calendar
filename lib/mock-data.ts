// Archivo para simular datos de la aplicación

export interface Clinica {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  openTime?: string
  closeTime?: string
  deshabilitada?: boolean
}

export interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
  isActive: boolean
}

export interface Servicio {
  id: string
  nombre: string
  familia: string
  precio: number
  iva: string
}

// Objeto global para almacenar datos mock
export const MockData: {
  clinicas?: Clinica[]
  tarifas?: Tarifa[]
  servicios?: Servicio[]
  clientes?: any[]
  [key: string]: any
} = {
  // Las clínicas se cargarán desde el sistema
  clinicas: [],

  // No incluimos datos de ejemplo para tarifas
  tarifas: [],

  // No incluimos datos de ejemplo para servicios
  servicios: [],

  // Asegúrate de que el objeto MockData tenga una propiedad clientes
  clientes: [],
}

// Añadir o corregir la función getMockClient
export const getMockClient = (id: string) => {
  // Buscar en la lista de clientes o devolver un cliente de ejemplo
  const clienteEncontrado = MockData.clientes?.find(cliente => cliente.id === id);
  
  if (clienteEncontrado) {
    return clienteEncontrado;
  }
  
  // Cliente por defecto si no se encuentra
  return {
    id,
    name: "Cliente de ejemplo",
    clientNumber: "CL-" + id,
    phone: "555-123-4567",
    email: "ejemplo@mail.com",
    clinic: "Clínica Principal",
    clinicId: "1", // Asignar una clínica por defecto
    address: "Dirección de ejemplo",
    birthDate: "1990-01-01",
    notes: "Notas de ejemplo",
    visits: []
  };
};

