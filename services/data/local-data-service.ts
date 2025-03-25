/**
 * Implementación del servicio de datos que utiliza localStorage
 * Esta implementación se utiliza durante el desarrollo y para demostraciones
 * En producción, se reemplazará por una implementación que utilice una API real
 */

import { DataService } from './data-service';
import {
  BaseEntity,
  Clinica,
  EntityDocument,
  EntityImage,
  Equipo,
  FamiliaTarifa,
  ScheduleBlock,
  Servicio,
  Tarifa,
  TipoIVA
} from './models/interfaces';
import {
  Client
} from './data-service';

/**
 * Generador de IDs secuenciales para entidades
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Implementación del servicio de datos que utiliza localStorage
 */
export class LocalDataService implements DataService {
  private data: {
    clinicas: Clinica[];
    tarifas: Tarifa[];
    familiasTarifa: FamiliaTarifa[];
    servicios: Servicio[];
    tiposIVA: TipoIVA[];
    equipos: Equipo[];
    scheduleBlocks: ScheduleBlock[];
    entityImages: Record<string, Record<string, EntityImage[]>>;
    entityDocuments: Record<string, Record<string, Record<string, EntityDocument[]>>>;
    clients: Client[];
    scheduleTemplates: any[]; // Plantillas horarias
  };

  private initialized: boolean = false;

  constructor() {
    // Inicializar con datos vacíos
    this.data = {
      clinicas: [],
      tarifas: [],
      familiasTarifa: [],
      servicios: [],
      tiposIVA: [],
      equipos: [],
      scheduleBlocks: [],
      entityImages: {},
      entityDocuments: {},
      clients: [],
      scheduleTemplates: []
    };
  }

  /**
   * Inicializa el servicio de datos cargando desde localStorage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Cargar datos desde localStorage
    try {
      const loadData = <T>(key: string, defaultValue: T): T => {
        const storedData = localStorage.getItem(key);
        return storedData ? JSON.parse(storedData) : defaultValue;
      };

      // Forzar recreación de datos básicos para desarrollo
      try {
        // Limpiar el localStorage para forzar la recreación
        localStorage.removeItem('clinicas');
        localStorage.removeItem('equipos');
      } catch (e) {
        console.error("Error al limpiar localStorage:", e);
      }

      this.data.clinicas = loadData<Clinica[]>('clinicas', []);
      this.data.tarifas = loadData<Tarifa[]>('tarifas', []);
      this.data.familiasTarifa = loadData<FamiliaTarifa[]>('familiasTarifa', []);
      this.data.servicios = loadData<Servicio[]>('servicios', []);
      this.data.tiposIVA = loadData<TipoIVA[]>('tiposIVA', []);
      this.data.equipos = loadData<Equipo[]>('equipos', []);
      this.data.scheduleBlocks = loadData<ScheduleBlock[]>('scheduleBlocks', []);
      this.data.entityImages = loadData<Record<string, Record<string, EntityImage[]>>>('entityImages', {});
      this.data.entityDocuments = loadData<Record<string, Record<string, Record<string, EntityDocument[]>>>>('entityDocuments', {});
      this.data.clients = loadData<Client[]>('clients', []);
      this.data.scheduleTemplates = loadData<any[]>('scheduleTemplates', []);
      
      // Si no hay datos, crear datos de ejemplo
      if (this.data.clinicas.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para clínicas');
        this.data.clinicas = [
          {
            id: 'clinic-1', // ID fijo para garantizar consistencia
            prefix: '000001',
            name: 'Californie Multilaser - Organicare',
            city: 'Casablanca',
            direccion: 'Av. Mohammed VI, 234',
            telefono: '+212 522 123 456',
            email: 'info@californie-multilaser.ma',
            isActive: true,
            config: {
              openTime: '09:00',
              closeTime: '19:00',
              weekendOpenTime: '10:00',
              weekendCloseTime: '14:00',
              saturdayOpen: true,
              sundayOpen: false,
              slotDuration: 15,
              cabins: [
                {
                  id: 1,
                  clinicId: 'clinic-1',
                  code: 'CAB1',
                  name: 'Cabina Láser 1',
                  color: '#4f46e5', // Indigo
                  isActive: true,
                  order: 1
                },
                {
                  id: 2,
                  clinicId: 'clinic-1',
                  code: 'CAB2',
                  name: 'Cabina Estética',
                  color: '#ef4444', // Rojo
                  isActive: true,
                  order: 2
                },
                {
                  id: 3,
                  clinicId: 'clinic-1',
                  code: 'CAB3',
                  name: 'Cabina Tratamientos',
                  color: '#22c55e', // Verde
                  isActive: true,
                  order: 3
                }
              ],
              // Nuevo formato de horario compatible con el componente de agenda
              schedule: {
                monday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '19:00' }]
                },
                tuesday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '19:00' }]
                },
                wednesday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '19:00' }]
                },
                thursday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '19:00' }]
                },
                friday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '19:00' }]
                },
                saturday: {
                  isOpen: true,
                  ranges: [{ start: '10:00', end: '14:00' }]
                },
                sunday: {
                  isOpen: false,
                  ranges: []
                }
              },
              initialCash: 1000,
              appearsInApp: true,
              ticketSize: '80mm',
              rate: 'tarifa-1',
              affectsStats: true,
              scheduleControl: true
            }
          },
          {
            id: 'clinic-2', // ID fijo para garantizar consistencia
            prefix: 'Cafc',
            name: 'Cafc Multilaser',
            city: 'Casablanca',
            direccion: 'Rue Moulay Youssef, 45',
            telefono: '+212 522 789 123',
            email: 'info@cafc-multilaser.ma',
            isActive: true,
            config: {
              openTime: '08:30',
              closeTime: '20:00',
              weekendOpenTime: '09:00',
              weekendCloseTime: '15:00',
              saturdayOpen: true,
              sundayOpen: false,
              slotDuration: 30,
              cabins: [
                {
                  id: 4,
                  clinicId: 'clinic-2',
                  code: 'C1',
                  name: 'Cabina Principal',
                  color: '#f97316', // Naranja
                  isActive: true,
                  order: 1
                },
                {
                  id: 5,
                  clinicId: 'clinic-2',
                  code: 'C2',
                  name: 'Sala de Espera',
                  color: '#8b5cf6', // Violeta
                  isActive: true,
                  order: 2
                }
              ],
              // Nuevo formato de horario compatible con el componente de agenda
              schedule: {
                monday: {
                  isOpen: true,
                  ranges: [{ start: '08:30', end: '20:00' }]
                },
                tuesday: {
                  isOpen: true,
                  ranges: [{ start: '08:30', end: '20:00' }]
                },
                wednesday: {
                  isOpen: true,
                  ranges: [{ start: '08:30', end: '20:00' }]
                },
                thursday: {
                  isOpen: true,
                  ranges: [{ start: '08:30', end: '20:00' }]
                },
                friday: {
                  isOpen: true,
                  ranges: [{ start: '08:30', end: '20:00' }]
                },
                saturday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '15:00' }]
                },
                sunday: {
                  isOpen: false,
                  ranges: []
                }
              },
              initialCash: 1500,
              appearsInApp: true,
              ticketSize: '58mm',
              affectsStats: true,
              scheduleControl: true
            }
          },
          {
            id: 'clinic-3', // ID fijo para garantizar consistencia
            prefix: 'TEST',
            name: 'CENTRO TEST',
            city: 'Casablanca',
            direccion: 'Bd. Anfa, 123',
            telefono: '+212 522 456 789',
            email: 'test@centro-test.ma',
            isActive: false,
            config: {
              openTime: '09:00',
              closeTime: '18:00',
              weekendOpenTime: '10:00',
              weekendCloseTime: '14:00',
              saturdayOpen: false,
              sundayOpen: false,
              slotDuration: 45,
              cabins: [
                {
                  id: 6,
                  clinicId: 'clinic-3',
                  code: 'TEST1',
                  name: 'Cabina de Pruebas',
                  color: '#0ea5e9', // Azul
                  isActive: true,
                  order: 1
                }
              ],
              // Nuevo formato de horario compatible con el componente de agenda
              schedule: {
                monday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '18:00' }]
                },
                tuesday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '18:00' }]
                },
                wednesday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '18:00' }]
                },
                thursday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '18:00' }]
                },
                friday: {
                  isOpen: true,
                  ranges: [{ start: '09:00', end: '18:00' }]
                },
                saturday: {
                  isOpen: false,
                  ranges: []
                },
                sunday: {
                  isOpen: false,
                  ranges: []
                }
              },
              initialCash: 0,
              appearsInApp: false,
              ticketSize: '80mm',
              affectsStats: false,
              scheduleControl: false
            }
          }
        ];
        localStorage.setItem('clinicas', JSON.stringify(this.data.clinicas));
      }
      
      // Si no hay equipos, crear datos de ejemplo
      if (this.data.equipos.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para equipamiento');
        this.data.equipos = [
          // Equipamiento específico de clínicas - Clínica Californie
          {
            id: 'equipo-1',
            name: 'Láser Alexandrita',
            code: 'LAS-001',
            description: 'Equipo láser para depilación permanente. Modelo Premium 2023 con sistema de refrigeración avanzado.',
            serialNumber: 'SN123456789',
            clinicId: 'clinic-1'
          },
          {
            id: 'equipo-2',
            name: 'Láser Diodo',
            code: 'LAS-002',
            description: 'Láser de diodo para tratamientos faciales y corporales. Ideal para pieles sensibles.',
            serialNumber: 'SN987654321',
            clinicId: 'clinic-1'
          },
          {
            id: 'equipo-6',
            name: 'Plataforma Vibratoria',
            code: 'VIB-001',
            description: 'Plataforma para ejercicios de tonificación muscular con diferentes intensidades.',
            serialNumber: 'SN654987321',
            clinicId: 'clinic-1'
          },
          {
            id: 'equipo-8',
            name: 'LPG',
            code: 'LPG-001',
            description: 'Sistema avanzado de LPG para tratamientos corporales no invasivos.',
            serialNumber: 'SN753159852',
            clinicId: 'clinic-1'
          },
          // Equipamiento específico de clínicas - Cafc Multilaser
          {
            id: 'equipo-3',
            name: 'Presoterapia',
            code: 'PRES-001',
            description: 'Equipo de presoterapia para tratamientos corporales y drenaje linfático.',
            serialNumber: 'SN456789123',
            clinicId: 'clinic-2'
          },
          {
            id: 'equipo-4',
            name: 'Ultrasonido',
            code: 'ULTRA-001',
            description: 'Equipo de ultrasonido para tratamientos reductores y modelación corporal.',
            serialNumber: 'SN789123456',
            clinicId: 'clinic-2'
          },
          {
            id: 'equipo-7',
            name: 'Máquina de Vacumterapia',
            code: 'VAC-001',
            description: 'Equipo de vacumterapia para tratamientos de modelación y reducción.',
            serialNumber: 'SN159753486',
            clinicId: 'clinic-2'
          },
          // Equipamiento específico de clínicas - Centro Test
          {
            id: 'equipo-5',
            name: 'Radiofrecuencia',
            code: 'RADIO-001',
            description: 'Equipo de radiofrecuencia para rejuvenecimiento facial y corporal.',
            serialNumber: 'SN321456789',
            clinicId: 'clinic-3'
          }
        ];
        localStorage.setItem('equipos', JSON.stringify(this.data.equipos));
      }

      // Si no hay tarifas, crear datos de ejemplo
      if (this.data.tarifas.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para tarifas');
        this.data.tarifas = [
          {
            id: 'tarifa-1',
            nombre: 'Tarifa Estándar Californie',
            clinicaId: 'clinic-1',
            clinicasIds: ['clinic-1'],
            isActive: true,
            deshabilitada: false
          },
          {
            id: 'tarifa-2',
            nombre: 'Tarifa Promocional Californie',
            clinicaId: 'clinic-1',
            clinicasIds: ['clinic-1'],
            isActive: true,
            deshabilitada: false
          },
          {
            id: 'tarifa-3',
            nombre: 'Tarifa Cafc Multilaser',
            clinicaId: 'clinic-2',
            clinicasIds: ['clinic-2'],
            isActive: true,
            deshabilitada: false
          },
          {
            id: 'tarifa-4',
            nombre: 'Tarifa Experimental',
            clinicaId: 'clinic-3',
            clinicasIds: ['clinic-3'],
            isActive: false,
            deshabilitada: true
          }
        ];
        localStorage.setItem('tarifas', JSON.stringify(this.data.tarifas));
      }
      
      // Si no hay familias de tarifas, crear datos de ejemplo
      if (this.data.familiasTarifa.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para familias de tarifas');
        this.data.familiasTarifa = [
          {
            id: 'familia-1',
            name: 'Depilación Láser',
            code: 'DEP',
            parentId: null,
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-2',
            name: 'Tratamientos Faciales',
            code: 'FACE',
            parentId: null,
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-3',
            name: 'Tratamientos Corporales',
            code: 'BODY',
            parentId: null,
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-4',
            name: 'Depilación Zona Pequeña',
            code: 'DEP-S',
            parentId: 'familia-1',
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-5',
            name: 'Depilación Zona Media',
            code: 'DEP-M',
            parentId: 'familia-1',
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-6',
            name: 'Depilación Zona Grande',
            code: 'DEP-L',
            parentId: 'familia-1',
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-7',
            name: 'Limpieza Facial',
            code: 'FACE-C',
            parentId: 'familia-2',
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-8',
            name: 'Tratamientos Hidratantes',
            code: 'FACE-H',
            parentId: 'familia-2',
            tarifaId: 'tarifa-1',
            isActive: true
          },
          {
            id: 'familia-9',
            name: 'Masajes',
            code: 'MAS',
            parentId: null,
            tarifaId: 'tarifa-2',
            isActive: true
          },
          {
            id: 'familia-10',
            name: 'Depilación',
            code: 'DEP',
            parentId: null,
            tarifaId: 'tarifa-3',
            isActive: true
          },
          {
            id: 'familia-11',
            name: 'Estética',
            code: 'EST',
            parentId: null,
            tarifaId: 'tarifa-3',
            isActive: true
          },
          {
            id: 'familia-12',
            name: 'Pruebas',
            code: 'TEST',
            parentId: null,
            tarifaId: 'tarifa-4',
            isActive: false
          }
        ];
        localStorage.setItem('familiasTarifa', JSON.stringify(this.data.familiasTarifa));
      }
      
      // Si no hay tipos de IVA, crear datos de ejemplo
      if (this.data.tiposIVA.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para tipos de IVA');
        this.data.tiposIVA = [
          {
            id: 'iva-1',
            descripcion: 'IVA General 20%',
            porcentaje: 20,
            tarifaId: 'tarifa-1'
          },
          {
            id: 'iva-2',
            descripcion: 'IVA Reducido 10%',
            porcentaje: 10,
            tarifaId: 'tarifa-1'
          },
          {
            id: 'iva-3',
            descripcion: 'Exento 0%',
            porcentaje: 0,
            tarifaId: 'tarifa-1'
          },
          {
            id: 'iva-4',
            descripcion: 'IVA General 20%',
            porcentaje: 20,
            tarifaId: 'tarifa-2'
          },
          {
            id: 'iva-5',
            descripcion: 'IVA General 20%',
            porcentaje: 20,
            tarifaId: 'tarifa-3'
          },
          {
            id: 'iva-6',
            descripcion: 'IVA Test 15%',
            porcentaje: 15,
            tarifaId: 'tarifa-4'
          }
        ];
        localStorage.setItem('tiposIVA', JSON.stringify(this.data.tiposIVA));
      }

      // Si no hay servicios, crear datos de ejemplo
      if (this.data.servicios.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para servicios');
        this.data.servicios = [
          {
            id: 'srv-1',
            nombre: 'Depilación Láser Axilas',
            codigo: 'DEP-AX',
            tarifaId: 'tarifa-1',
            tarifaBase: 'tarifa-1',
            familiaId: 'familia-4',
            precioConIVA: '40',
            ivaId: 'iva-1',
            colorAgenda: '#4f46e5',
            duracion: 15,
            equipoId: 'equipo-1',
            tipoComision: 'porcentaje',
            comision: '10',
            requiereParametros: true,
            visitaValoracion: true,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '20',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-2',
            nombre: 'Depilación Láser Piernas Completas',
            codigo: 'DEP-PL',
            tarifaId: 'tarifa-1',
            tarifaBase: 'tarifa-1',
            familiaId: 'familia-6',
            precioConIVA: '120',
            ivaId: 'iva-1',
            colorAgenda: '#4f46e5',
            duracion: 45,
            equipoId: 'equipo-1',
            tipoComision: 'porcentaje',
            comision: '15',
            requiereParametros: true,
            visitaValoracion: true,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '50',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-3',
            nombre: 'Limpieza Facial Profunda',
            codigo: 'LIM-FAC',
            tarifaId: 'tarifa-1',
            tarifaBase: 'tarifa-1',
            familiaId: 'familia-7',
            precioConIVA: '60',
            ivaId: 'iva-1',
            colorAgenda: '#22c55e',
            duracion: 60,
            equipoId: 'equipo-2',
            tipoComision: 'fijo',
            comision: '5',
            requiereParametros: false,
            visitaValoracion: false,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '25',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-4',
            nombre: 'Tratamiento Hidratante Premium',
            codigo: 'HID-PRM',
            tarifaId: 'tarifa-1',
            tarifaBase: 'tarifa-1',
            familiaId: 'familia-8',
            precioConIVA: '80',
            ivaId: 'iva-1',
            colorAgenda: '#22c55e',
            duracion: 45,
            equipoId: 'equipo-2',
            tipoComision: 'porcentaje',
            comision: '12',
            requiereParametros: false,
            visitaValoracion: false,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: true,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '30',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-5',
            nombre: 'Masaje Relajante 30min',
            codigo: 'MAS-REL-30',
            tarifaId: 'tarifa-2',
            tarifaBase: 'tarifa-2',
            familiaId: 'familia-9',
            precioConIVA: '35',
            ivaId: 'iva-4',
            colorAgenda: '#f97316',
            duracion: 30,
            equipoId: '',
            tipoComision: 'porcentaje',
            comision: '10',
            requiereParametros: false,
            visitaValoracion: false,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '15',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-6',
            nombre: 'Masaje Terapéutico 60min',
            codigo: 'MAS-TER-60',
            tarifaId: 'tarifa-2',
            tarifaBase: 'tarifa-2',
            familiaId: 'familia-9',
            precioConIVA: '60',
            ivaId: 'iva-4',
            colorAgenda: '#f97316',
            duracion: 60,
            equipoId: '',
            tipoComision: 'porcentaje',
            comision: '15',
            requiereParametros: false,
            visitaValoracion: false,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '25',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-7',
            nombre: 'Depilación Axilas',
            codigo: 'DEP-AX',
            tarifaId: 'tarifa-3',
            tarifaBase: 'tarifa-3',
            familiaId: 'familia-10',
            precioConIVA: '35',
            ivaId: 'iva-5',
            colorAgenda: '#0ea5e9',
            duracion: 15,
            equipoId: 'equipo-3',
            tipoComision: 'porcentaje',
            comision: '8',
            requiereParametros: true,
            visitaValoracion: false,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '15',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-8',
            nombre: 'Tratamiento Antiarrugas',
            codigo: 'EST-ANTI',
            tarifaId: 'tarifa-3',
            tarifaBase: 'tarifa-3',
            familiaId: 'familia-11',
            precioConIVA: '90',
            ivaId: 'iva-5',
            colorAgenda: '#8b5cf6',
            duracion: 45,
            equipoId: 'equipo-4',
            tipoComision: 'porcentaje',
            comision: '12',
            requiereParametros: false,
            visitaValoracion: true,
            apareceEnApp: true,
            descuentosAutomaticos: true,
            descuentosManuales: true,
            aceptaPromociones: true,
            aceptaEdicionPVP: false,
            afectaEstadisticas: true,
            deshabilitado: false,
            precioCoste: '40',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          },
          {
            id: 'srv-9',
            nombre: 'Servicio Test',
            codigo: 'TEST-SRV',
            tarifaId: 'tarifa-4',
            tarifaBase: 'tarifa-4',
            familiaId: 'familia-12',
            precioConIVA: '100',
            ivaId: 'iva-6',
            colorAgenda: '#a21caf',
            duracion: 30,
            equipoId: 'equipo-5',
            tipoComision: 'porcentaje',
            comision: '10',
            requiereParametros: true,
            visitaValoracion: true,
            apareceEnApp: false,
            descuentosAutomaticos: false,
            descuentosManuales: false,
            aceptaPromociones: false,
            aceptaEdicionPVP: true,
            afectaEstadisticas: false,
            deshabilitado: true,
            precioCoste: '50',
            tarifaPlanaId: '',
            archivoAyuda: null,
            consumos: []
          }
        ];
        localStorage.setItem('servicios', JSON.stringify(this.data.servicios));
      }

      // Si no hay bloques de agenda, crear datos de ejemplo
      if (this.data.scheduleBlocks.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para bloques de agenda');
        
        // Obtener fecha actual y calcular fechas para la semana actual
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        
        // Crear fechas para los próximos 7 días (formato ISO sin hora: YYYY-MM-DD)
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(currentYear, currentMonth, currentDate + i);
          return date.toISOString().split('T')[0];
        });
        
        this.data.scheduleBlocks = [
          // Bloque de descanso para almuerzo - Clínica 1
          {
            id: 'block-1',
            clinicId: 'clinic-1',
            date: dates[0], // Hoy
            startTime: '13:00',
            endTime: '14:00',
            roomIds: ['1', '2', '3'], // Todas las cabinas
            description: 'Pausa para almuerzo',
            recurring: true,
            recurrencePattern: {
              frequency: 'daily',
              endDate: new Date(currentYear, currentMonth + 1, currentDate).toISOString().split('T')[0], // Un mes después
              daysOfWeek: [1, 2, 3, 4, 5] // Lunes a viernes
            },
            createdAt: new Date().toISOString()
          },
          // Bloque para mantenimiento - Clínica 1, Cabina 1
          {
            id: 'block-2',
            clinicId: 'clinic-1',
            date: dates[1], // Mañana
            startTime: '17:00',
            endTime: '19:00',
            roomIds: ['1'], // Solo cabina 1
            description: 'Mantenimiento del equipo láser',
            recurring: false,
            createdAt: new Date().toISOString()
          },
          // Bloque de formación - Clínica 2
          {
            id: 'block-3',
            clinicId: 'clinic-2',
            date: dates[2], // Pasado mañana
            startTime: '09:00',
            endTime: '11:00',
            roomIds: ['4', '5'], // Todas las cabinas de clínica 2
            description: 'Formación para personal',
            recurring: false,
            createdAt: new Date().toISOString()
          },
          // Bloque para evento especial - Clínica 1
          {
            id: 'block-4',
            clinicId: 'clinic-1',
            date: dates[4], // Dentro de 4 días
            startTime: '16:00',
            endTime: '19:00',
            roomIds: ['1', '2', '3'], // Todas las cabinas
            description: 'Evento especial: Jornada de puertas abiertas',
            recurring: false,
            createdAt: new Date().toISOString()
          },
          // Bloque para limpieza semanal - Clínica 2
          {
            id: 'block-5',
            clinicId: 'clinic-2',
            date: dates[5], // Dentro de 5 días
            startTime: '18:00',
            endTime: '20:00',
            roomIds: ['4', '5'], // Todas las cabinas
            description: 'Limpieza profunda semanal',
            recurring: true,
            recurrencePattern: {
              frequency: 'weekly',
              endDate: new Date(currentYear, currentMonth + 3, currentDate).toISOString().split('T')[0], // Tres meses
              daysOfWeek: [5] // Viernes
            },
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('scheduleBlocks', JSON.stringify(this.data.scheduleBlocks));
      }

      // Si no hay clientes, crear datos de ejemplo
      if (this.data.clients.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para clientes');
        
        // Obtener fecha actual para los datos de ejemplo
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        
        this.data.clients = [
          {
            id: 'client-1',
            name: 'Amina Benali',
            clientNumber: 'CL-0001',
            phone: '+212 661 234 567',
            email: 'amina.benali@example.com',
            clinic: 'Californie Multilaser - Organicare',
            clinicId: 'clinic-1',
            address: 'Avenue Mohammed VI, 123, Casablanca',
            birthDate: '1988-05-12',
            notes: 'Cliente habitual, viene cada mes para tratamientos faciales.',
            avatar: '',
            visits: [
              {
                date: new Date(currentYear, currentMonth, currentDate - 30).toISOString(),
                service: 'Limpieza Facial Profunda',
                serviceId: 'srv-3',
                price: 60
              },
              {
                date: new Date(currentYear, currentMonth, currentDate - 15).toISOString(),
                service: 'Tratamiento Hidratante Premium',
                serviceId: 'srv-4',
                price: 80
              }
            ]
          },
          {
            id: 'client-2',
            name: 'Karim Alaoui',
            clientNumber: 'CL-0002',
            phone: '+212 662 345 678',
            email: 'karim.alaoui@example.com',
            clinic: 'Californie Multilaser - Organicare',
            clinicId: 'clinic-1',
            address: 'Rue Moulay Youssef, 45, Casablanca',
            birthDate: '1990-03-22',
            notes: 'Alérgico a algunos productos. Ver historial médico para detalles.',
            avatar: '',
            visits: [
              {
                date: new Date(currentYear, currentMonth, currentDate - 20).toISOString(),
                service: 'Depilación Láser Axilas',
                serviceId: 'srv-1',
                price: 40
              }
            ]
          },
          {
            id: 'client-3',
            name: 'Fatima Zahra',
            clientNumber: 'CL-0003',
            phone: '+212 663 456 789',
            email: 'fatima.zahra@example.com',
            clinic: 'Cafc Multilaser',
            clinicId: 'clinic-2',
            address: 'Boulevard Anfa, 78, Casablanca',
            birthDate: '1995-11-07',
            notes: 'Primera visita realizada el 15 de enero de 2023.',
            avatar: '',
            visits: [
              {
                date: new Date(currentYear, currentMonth, currentDate - 25).toISOString(),
                service: 'Depilación Axilas',
                serviceId: 'srv-7',
                price: 35
              },
              {
                date: new Date(currentYear, currentMonth, currentDate - 10).toISOString(),
                service: 'Tratamiento Antiarrugas',
                serviceId: 'srv-8',
                price: 90
              }
            ]
          },
          {
            id: 'client-4',
            name: 'Hassan Mansouri',
            clientNumber: 'CL-0004',
            phone: '+212 664 567 890',
            email: 'hassan.mansouri@example.com',
            clinic: 'Californie Multilaser - Organicare',
            clinicId: 'clinic-1',
            address: 'Rue Ibn Sina, 34, Casablanca',
            birthDate: '1982-07-18',
            notes: 'Prefiere citas por la tarde después de las 17:00.',
            avatar: '',
            visits: [
              {
                date: new Date(currentYear, currentMonth, currentDate - 40).toISOString(),
                service: 'Depilación Láser Piernas Completas',
                serviceId: 'srv-2',
                price: 120
              }
            ]
          },
          {
            id: 'client-5',
            name: 'Nadia El Fassi',
            clientNumber: 'CL-0005',
            phone: '+212 665 678 901',
            email: 'nadia.elfassi@example.com',
            clinic: 'Cafc Multilaser',
            clinicId: 'clinic-2',
            address: 'Avenue Hassan II, 56, Casablanca',
            birthDate: '1992-09-03',
            notes: 'Sensibilidad en la piel, usar productos suaves.',
            avatar: '',
            visits: []
          },
          {
            id: 'client-6',
            name: 'Younes Benjelloun',
            clientNumber: 'CL-0006',
            phone: '+212 666 789 012',
            email: 'younes.benjelloun@example.com',
            clinic: 'CENTRO TEST',
            clinicId: 'clinic-3',
            address: 'Rue Al Moutanabbi, 12, Casablanca',
            birthDate: '1985-12-15',
            notes: 'Cliente para pruebas. No enviar comunicaciones reales.',
            avatar: '',
            visits: [
              {
                date: new Date(currentYear, currentMonth, currentDate - 5).toISOString(),
                service: 'Servicio Test',
                serviceId: 'srv-9',
                price: 100
              }
            ]
          }
        ];
        localStorage.setItem('clients', JSON.stringify(this.data.clients));
      }

      // Si no hay plantillas de horario, crear datos de ejemplo
      if (this.data.scheduleTemplates.length === 0) {
        console.log('LocalDataService: Creando datos de ejemplo para plantillas de horario');
        
        const now = new Date().toISOString();
        
        this.data.scheduleTemplates = [
          {
            id: 'template-1',
            description: 'Horario Estándar',
            schedule: {
              0: { // Domingo
                isOpen: false,
                slots: []
              },
              1: { // Lunes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '14:00' },
                  { start: '16:00', end: '20:00' }
                ]
              },
              2: { // Martes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '14:00' },
                  { start: '16:00', end: '20:00' }
                ]
              },
              3: { // Miércoles
                isOpen: true,
                slots: [
                  { start: '09:00', end: '14:00' },
                  { start: '16:00', end: '20:00' }
                ]
              },
              4: { // Jueves
                isOpen: true,
                slots: [
                  { start: '09:00', end: '14:00' },
                  { start: '16:00', end: '20:00' }
                ]
              },
              5: { // Viernes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '14:00' },
                  { start: '16:00', end: '20:00' }
                ]
              },
              6: { // Sábado
                isOpen: true,
                slots: [
                  { start: '10:00', end: '14:00' }
                ]
              }
            },
            clinicId: null, // Aplicable a todas las clínicas
            isDefault: true,
            createdAt: now,
            updatedAt: null
          },
          {
            id: 'template-2',
            description: 'Horario Intensivo Californie',
            schedule: {
              0: { // Domingo
                isOpen: false,
                slots: []
              },
              1: { // Lunes
                isOpen: true,
                slots: [
                  { start: '08:00', end: '20:00' }
                ]
              },
              2: { // Martes
                isOpen: true,
                slots: [
                  { start: '08:00', end: '20:00' }
                ]
              },
              3: { // Miércoles
                isOpen: true,
                slots: [
                  { start: '08:00', end: '20:00' }
                ]
              },
              4: { // Jueves
                isOpen: true,
                slots: [
                  { start: '08:00', end: '20:00' }
                ]
              },
              5: { // Viernes
                isOpen: true,
                slots: [
                  { start: '08:00', end: '20:00' }
                ]
              },
              6: { // Sábado
                isOpen: true,
                slots: [
                  { start: '10:00', end: '18:00' }
                ]
              }
            },
            clinicId: 'clinic-1',
            isDefault: false,
            createdAt: now,
            updatedAt: null
          },
          {
            id: 'template-3',
            description: 'Horario Media Jornada Cafc',
            schedule: {
              0: { // Domingo
                isOpen: false,
                slots: []
              },
              1: { // Lunes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '15:00' }
                ]
              },
              2: { // Martes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '15:00' }
                ]
              },
              3: { // Miércoles
                isOpen: true,
                slots: [
                  { start: '09:00', end: '15:00' }
                ]
              },
              4: { // Jueves
                isOpen: true,
                slots: [
                  { start: '09:00', end: '15:00' }
                ]
              },
              5: { // Viernes
                isOpen: true,
                slots: [
                  { start: '09:00', end: '15:00' }
                ]
              },
              6: { // Sábado
                isOpen: false,
                slots: []
              }
            },
            clinicId: 'clinic-2',
            isDefault: false,
            createdAt: now,
            updatedAt: null
          }
        ];
        
        localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
      }

      this.initialized = true;
      console.log('LocalDataService: Datos cargados desde localStorage');
    } catch (error) {
      console.error('Error al inicializar LocalDataService:', error);
      throw error;
    }
  }

  /**
   * Guarda todos los datos en localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('clinicas', JSON.stringify(this.data.clinicas));
      localStorage.setItem('tarifas', JSON.stringify(this.data.tarifas));
      localStorage.setItem('familiasTarifa', JSON.stringify(this.data.familiasTarifa));
      localStorage.setItem('servicios', JSON.stringify(this.data.servicios));
      localStorage.setItem('tiposIVA', JSON.stringify(this.data.tiposIVA));
      localStorage.setItem('equipos', JSON.stringify(this.data.equipos));
      localStorage.setItem('scheduleBlocks', JSON.stringify(this.data.scheduleBlocks));
      localStorage.setItem('entityImages', JSON.stringify(this.data.entityImages));
      localStorage.setItem('entityDocuments', JSON.stringify(this.data.entityDocuments));
      localStorage.setItem('clients', JSON.stringify(this.data.clients));
      localStorage.setItem('scheduleTemplates', JSON.stringify(this.data.scheduleTemplates));
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
      throw error;
    }
  }

  /**
   * Limpia todos los datos y fuerza la regeneración de datos de ejemplo
   */
  async clearStorageAndReloadData(): Promise<void> {
    // Limpiar localStorage
    try {
      localStorage.clear();
      console.log("LocalStorage limpiado completamente");
      
      // Reinicializar el servicio
      this.initialized = false;
      
      // Vaciar datos en memoria
      this.data = {
        clinicas: [],
        tarifas: [],
        familiasTarifa: [],
        servicios: [],
        tiposIVA: [],
        equipos: [],
        scheduleBlocks: [],
        entityImages: {},
        entityDocuments: {},
        clients: [],
        scheduleTemplates: []
      };
      
      // Inicializar de nuevo para regenerar datos de ejemplo
      await this.initialize();
      
      console.log("Datos regenerados con éxito");
    } catch (error) {
      console.error("Error al limpiar localStorage:", error);
    }
  }

  // #region Operaciones con imágenes
  
  async getEntityImages(entityType: string, entityId: string): Promise<EntityImage[]> {
    if (!this.data.entityImages[entityType] || !this.data.entityImages[entityType][entityId]) {
      return [];
    }
    return this.data.entityImages[entityType][entityId];
  }

  async saveEntityImages(entityType: string, entityId: string, images: EntityImage[]): Promise<boolean> {
    try {
      if (!this.data.entityImages[entityType]) {
        this.data.entityImages[entityType] = {};
      }
      this.data.entityImages[entityType][entityId] = images;
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error al guardar imágenes:', error);
      return false;
    }
  }

  async deleteEntityImages(entityType: string, entityId: string): Promise<boolean> {
    try {
      if (this.data.entityImages[entityType] && this.data.entityImages[entityType][entityId]) {
        delete this.data.entityImages[entityType][entityId];
        this.saveToLocalStorage();
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar imágenes:', error);
      return false;
    }
  }
  
  // #endregion

  // #region Operaciones con documentos
  
  async getEntityDocuments(entityType: string, entityId: string, category: string = 'default'): Promise<EntityDocument[]> {
    if (!this.data.entityDocuments[entityType] || 
        !this.data.entityDocuments[entityType][entityId] ||
        !this.data.entityDocuments[entityType][entityId][category]) {
      return [];
    }
    return this.data.entityDocuments[entityType][entityId][category];
  }

  async saveEntityDocuments(entityType: string, entityId: string, documents: EntityDocument[], category: string = 'default'): Promise<boolean> {
    try {
      if (!this.data.entityDocuments[entityType]) {
        this.data.entityDocuments[entityType] = {};
      }
      if (!this.data.entityDocuments[entityType][entityId]) {
        this.data.entityDocuments[entityType][entityId] = {};
      }
      this.data.entityDocuments[entityType][entityId][category] = documents;
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error al guardar documentos:', error);
      return false;
    }
  }

  async deleteEntityDocuments(entityType: string, entityId: string, category?: string): Promise<boolean> {
    try {
      if (!this.data.entityDocuments[entityType] || !this.data.entityDocuments[entityType][entityId]) {
        return true;
      }
      
      if (category) {
        if (this.data.entityDocuments[entityType][entityId][category]) {
          delete this.data.entityDocuments[entityType][entityId][category];
        }
      } else {
        delete this.data.entityDocuments[entityType][entityId];
      }
      
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error al eliminar documentos:', error);
      return false;
    }
  }
  
  // #endregion

  // #region Operaciones de Clínicas
  
  async getAllClinicas(): Promise<Clinica[]> {
    return this.data.clinicas;
  }

  async getClinicaById(id: string): Promise<Clinica | null> {
    const clinica = this.data.clinicas.find(c => c.id === id);
    return clinica || null;
  }

  async createClinica(clinica: Omit<Clinica, 'id'>): Promise<Clinica> {
    const newClinica = { ...clinica, id: generateId('clinic') } as Clinica;
    this.data.clinicas.push(newClinica);
    this.saveToLocalStorage();
    return newClinica;
  }

  async updateClinica(id: string, clinica: Partial<Clinica>): Promise<Clinica | null> {
    const index = this.data.clinicas.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    this.data.clinicas[index] = { ...this.data.clinicas[index], ...clinica };
    this.saveToLocalStorage();
    return this.data.clinicas[index];
  }

  async deleteClinica(id: string): Promise<boolean> {
    const initialLength = this.data.clinicas.length;
    this.data.clinicas = this.data.clinicas.filter(c => c.id !== id);
    const deleted = initialLength > this.data.clinicas.length;
    
    if (deleted) {
      this.saveToLocalStorage();
    }
    
    return deleted;
  }

  async getActiveClinicas(): Promise<Clinica[]> {
    return this.data.clinicas.filter(c => c.isActive);
  }
  
  // #endregion

  // #region Operaciones de Tarifas
  
  async getAllTarifas(): Promise<Tarifa[]> {
    return this.data.tarifas;
  }

  async getTarifaById(id: string): Promise<Tarifa | null> {
    const tarifa = this.data.tarifas.find(t => t.id === id);
    return tarifa || null;
  }

  async createTarifa(tarifa: Omit<Tarifa, 'id'>): Promise<Tarifa> {
    const newTarifa = { ...tarifa, id: generateId('tarifa') } as Tarifa;
    
    // Asegurar que clinicasIds sea un array
    if (!newTarifa.clinicasIds) {
      newTarifa.clinicasIds = [];
    }
    
    // Si hay clinicaId pero no está en clinicasIds, añadirla
    if (newTarifa.clinicaId && !newTarifa.clinicasIds.includes(newTarifa.clinicaId)) {
      newTarifa.clinicasIds.push(newTarifa.clinicaId);
    }
    
    this.data.tarifas.push(newTarifa);
    this.saveToLocalStorage();
    return newTarifa;
  }

  async updateTarifa(id: string, tarifa: Partial<Tarifa>): Promise<Tarifa | null> {
    const index = this.data.tarifas.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Actualizar tarifa existente
    const updatedTarifa = { ...this.data.tarifas[index], ...tarifa };
    
    // Asegurar coherencia entre clinicaId y clinicasIds
    if (updatedTarifa.clinicaId && updatedTarifa.clinicasIds && 
        !updatedTarifa.clinicasIds.includes(updatedTarifa.clinicaId)) {
      updatedTarifa.clinicasIds.push(updatedTarifa.clinicaId);
    }
    
    this.data.tarifas[index] = updatedTarifa;
    this.saveToLocalStorage();
    return updatedTarifa;
  }

  async deleteTarifa(id: string): Promise<boolean> {
    const initialLength = this.data.tarifas.length;
    this.data.tarifas = this.data.tarifas.filter(t => t.id !== id);
    const deleted = initialLength > this.data.tarifas.length;
    
    if (deleted) {
      this.saveToLocalStorage();
    }
    
    return deleted;
  }

  async getTarifasByClinicaId(clinicaId: string): Promise<Tarifa[]> {
    return this.data.tarifas.filter(t => 
      t.clinicaId === clinicaId || 
      (t.clinicasIds && t.clinicasIds.includes(clinicaId))
    );
  }

  async addClinicaToTarifa(tarifaId: string, clinicaId: string, isPrimary: boolean = false): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Añadir clínica si no existe ya
    if (!clinicasIds.includes(clinicaId)) {
      clinicasIds.push(clinicaId);
    }
    
    // Actualizar datos
    const updateData: Partial<Tarifa> = { clinicasIds };
    
    // Si es primaria o no hay clínica primaria, establecerla como primaria
    if (isPrimary || !tarifa.clinicaId) {
      updateData.clinicaId = clinicaId;
    }
    
    await this.updateTarifa(tarifaId, updateData);
    return true;
  }

  async removeClinicaFromTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Verificar si la clínica está asociada
    if (!clinicasIds.includes(clinicaId)) {
      return true; // No hay cambios necesarios
    }
    
    // Eliminar la clínica de la lista
    const newClinicasIds = clinicasIds.filter(id => id !== clinicaId);
    
    // Preparar datos para actualizar
    const updateData: Partial<Tarifa> = { clinicasIds: newClinicasIds };
    
    // Si era la clínica primaria, establecer otra como primaria
    if (tarifa.clinicaId === clinicaId) {
      if (newClinicasIds.length > 0) {
        // Usar la primera clínica disponible como principal
        updateData.clinicaId = newClinicasIds[0];
      } else {
        // Si no hay más clínicas, limpiar clinicaId
        updateData.clinicaId = "";
      }
    }
    
    await this.updateTarifa(tarifaId, updateData);
    return true;
  }

  async setPrimaryClinicaForTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Verificar si la clínica está asociada
    if (!clinicasIds.includes(clinicaId)) {
      // Si la clínica no está asociada, añadirla primero
      clinicasIds.push(clinicaId);
    }
    
    // Actualizar con nueva clínica primaria
    await this.updateTarifa(tarifaId, { 
      clinicaId,
      clinicasIds
    });
    
    return true;
  }
  
  // #endregion

  // #region Operaciones de Familias de Tarifas
  
  async getAllFamiliasTarifa(): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa;
  }

  async getFamiliaTarifaById(id: string): Promise<FamiliaTarifa | null> {
    const familia = this.data.familiasTarifa.find(f => f.id === id);
    return familia || null;
  }

  async createFamiliaTarifa(familia: Omit<FamiliaTarifa, 'id'>): Promise<FamiliaTarifa> {
    const newFamilia = { ...familia, id: generateId('familia') } as FamiliaTarifa;
    this.data.familiasTarifa.push(newFamilia);
    this.saveToLocalStorage();
    return newFamilia;
  }

  async updateFamiliaTarifa(id: string, familia: Partial<FamiliaTarifa>): Promise<FamiliaTarifa | null> {
    const index = this.data.familiasTarifa.findIndex(f => f.id === id);
    if (index === -1) return null;
    
    this.data.familiasTarifa[index] = { ...this.data.familiasTarifa[index], ...familia };
    this.saveToLocalStorage();
    return this.data.familiasTarifa[index];
  }

  async deleteFamiliaTarifa(id: string): Promise<boolean> {
    const initialLength = this.data.familiasTarifa.length;
    this.data.familiasTarifa = this.data.familiasTarifa.filter(f => f.id !== id);
    const deleted = initialLength > this.data.familiasTarifa.length;
    
    if (deleted) {
      this.saveToLocalStorage();
    }
    
    return deleted;
  }

  async getFamiliasByTarifaId(tarifaId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => f.tarifaId === tarifaId);
  }

  async getRootFamilias(tarifaId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => 
      f.parentId === null && f.tarifaId === tarifaId
    );
  }

  async getSubfamilias(parentId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => f.parentId === parentId);
  }

  async toggleFamiliaStatus(id: string): Promise<boolean> {
    const familia = await this.getFamiliaTarifaById(id);
    if (!familia) return false;
    
    await this.updateFamiliaTarifa(id, { isActive: !familia.isActive });
    return true;
  }
  
  // #endregion

  // #region Operaciones de Servicios
  
  async getAllServicios(): Promise<Servicio[]> {
    return this.data.servicios;
  }

  async getServicioById(id: string): Promise<Servicio | null> {
    const servicio = this.data.servicios.find(s => s.id === id);
    return servicio || null;
  }

  async createServicio(servicio: Omit<Servicio, 'id'>): Promise<Servicio> {
    const newServicio = { ...servicio, id: generateId('srv') } as Servicio;
    
    // Asegurar que consumos sea un array
    if (!newServicio.consumos) {
      newServicio.consumos = [];
    }
    
    this.data.servicios.push(newServicio);
    this.saveToLocalStorage();
    return newServicio;
  }

  async updateServicio(id: string, servicio: Partial<Servicio>): Promise<Servicio | null> {
    const index = this.data.servicios.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.data.servicios[index] = { ...this.data.servicios[index], ...servicio };
    this.saveToLocalStorage();
    return this.data.servicios[index];
  }

  async deleteServicio(id: string): Promise<boolean> {
    const initialLength = this.data.servicios.length;
    this.data.servicios = this.data.servicios.filter(s => s.id !== id);
    const deleted = initialLength > this.data.servicios.length;
    
    if (deleted) {
      this.saveToLocalStorage();
      
      // Eliminar imágenes y documentos asociados
      await this.deleteEntityImages('servicio', id);
      await this.deleteEntityDocuments('servicio', id);
    }
    
    return deleted;
  }

  async getServiciosByTarifaId(tarifaId: string): Promise<Servicio[]> {
    return this.data.servicios.filter(s => s.tarifaId === tarifaId);
  }
  
  // #endregion

  // #region Operaciones de Tipos de IVA
  
  async getAllTiposIVA(): Promise<TipoIVA[]> {
    return this.data.tiposIVA;
  }

  async getTipoIVAById(id: string): Promise<TipoIVA | null> {
    const tipoIVA = this.data.tiposIVA.find(t => t.id === id);
    return tipoIVA || null;
  }

  async createTipoIVA(tipoIVA: Omit<TipoIVA, 'id'>): Promise<TipoIVA> {
    const newTipoIVA = { ...tipoIVA, id: generateId('iva') } as TipoIVA;
    this.data.tiposIVA.push(newTipoIVA);
    this.saveToLocalStorage();
    return newTipoIVA;
  }

  async updateTipoIVA(id: string, tipoIVA: Partial<TipoIVA>): Promise<TipoIVA | null> {
    const index = this.data.tiposIVA.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.data.tiposIVA[index] = { ...this.data.tiposIVA[index], ...tipoIVA };
    this.saveToLocalStorage();
    return this.data.tiposIVA[index];
  }

  async deleteTipoIVA(id: string): Promise<boolean> {
    const initialLength = this.data.tiposIVA.length;
    this.data.tiposIVA = this.data.tiposIVA.filter(t => t.id !== id);
    const deleted = initialLength > this.data.tiposIVA.length;
    
    if (deleted) {
      this.saveToLocalStorage();
    }
    
    return deleted;
  }

  async getTiposIVAByTarifaId(tarifaId: string): Promise<TipoIVA[]> {
    return this.data.tiposIVA.filter(t => t.tarifaId === tarifaId);
  }
  
  // #endregion

  // #region Operaciones de Equipos
  
  async getAllEquipos(): Promise<Equipo[]> {
    return this.data.equipos;
  }

  async getEquipoById(id: string): Promise<Equipo | null> {
    const equipo = this.data.equipos.find(e => e.id === id);
    return equipo || null;
  }

  async createEquipo(equipo: Omit<Equipo, 'id'>): Promise<Equipo> {
    const newEquipo = { ...equipo, id: generateId('equipo') } as Equipo;
    this.data.equipos.push(newEquipo);
    this.saveToLocalStorage();
    return newEquipo;
  }

  async updateEquipo(id: string, equipo: Partial<Equipo>): Promise<Equipo | null> {
    const index = this.data.equipos.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    this.data.equipos[index] = { ...this.data.equipos[index], ...equipo };
    this.saveToLocalStorage();
    return this.data.equipos[index];
  }

  async deleteEquipo(id: string): Promise<boolean> {
    const initialLength = this.data.equipos.length;
    this.data.equipos = this.data.equipos.filter(e => e.id !== id);
    const deleted = initialLength > this.data.equipos.length;
    
    if (deleted) {
      this.saveToLocalStorage();
      
      // Eliminar imágenes asociadas
      await this.deleteEntityImages('equipo', id);
    }
    
    return deleted;
  }

  async getEquiposByClinicaId(clinicaId: string): Promise<Equipo[]> {
    try {
      // Ahora trabajamos directamente con string para el ID de la clínica
      const allEquipos = await this.getAllEquipos();
      return allEquipos.filter(equipo => equipo.clinicId === clinicaId);
    } catch (error) {
      console.error("Error en getEquiposByClinicaId:", error);
      return [];
    }
  }
  
  // #endregion

  // #region Operaciones de Bloques de Agenda
  
  async getAllScheduleBlocks(): Promise<ScheduleBlock[]> {
    return this.data.scheduleBlocks;
  }

  async getScheduleBlockById(id: string): Promise<ScheduleBlock | null> {
    const block = this.data.scheduleBlocks.find(b => b.id === id);
    return block || null;
  }

  async createScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const newBlock = { 
      ...block, 
      id: generateId('block'),
      createdAt: new Date().toISOString()
    } as ScheduleBlock;
    
    this.data.scheduleBlocks.push(newBlock);
    this.saveToLocalStorage();
    return newBlock;
  }

  async updateScheduleBlock(id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> {
    const index = this.data.scheduleBlocks.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    this.data.scheduleBlocks[index] = { ...this.data.scheduleBlocks[index], ...block };
    this.saveToLocalStorage();
    return this.data.scheduleBlocks[index];
  }

  async deleteScheduleBlock(id: string): Promise<boolean> {
    const initialLength = this.data.scheduleBlocks.length;
    this.data.scheduleBlocks = this.data.scheduleBlocks.filter(b => b.id !== id);
    const deleted = initialLength > this.data.scheduleBlocks.length;
    
    if (deleted) {
      this.saveToLocalStorage();
    }
    
    return deleted;
  }

  async getBlocksByDateRange(clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlock[]> {
    return this.data.scheduleBlocks.filter(block => {
      // Filtrar por clínica comparando como string
      if (block.clinicId.toString() !== clinicId) return false;
      
      // Filtrar por rango de fechas
      const blockDate = new Date(block.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return blockDate >= start && blockDate <= end;
    });
  }
  
  // #endregion

  // Implementación de métodos para clientes
  async getAllClients(): Promise<Client[]> {
    try {
      // Intentar cargar clientes desde localStorage
      const storedData = localStorage.getItem('clients');
      if (storedData) {
        return JSON.parse(storedData);
      }
      return [];
    } catch (error) {
      console.error("Error en getAllClients:", error);
      return [];
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    try {
      const clients = await this.getAllClients();
      const client = clients.find(c => c.id === id);
      if (!client) {
        // Si no se encuentra el cliente, crear uno de ejemplo para desarrollo
        return {
          id,
          name: "Cliente de ejemplo",
          clientNumber: "CL-" + id,
          phone: "555-123-4567",
          email: "ejemplo@mail.com",
          clinic: "Clínica Principal",
          clinicId: "1",
          address: "Dirección de ejemplo",
          birthDate: "1990-01-01",
          notes: "Notas de ejemplo",
          visits: []
        };
      }
      return client;
    } catch (error) {
      console.error(`Error en getClientById(${id}):`, error);
      return null;
    }
  }

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    try {
      const clients = await this.getAllClients();
      const newId = Date.now().toString();
      const newClient: Client = {
        ...client,
        id: newId
      };
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        const updatedClients = [...clients, newClient];
        localStorage.setItem('clients', JSON.stringify(updatedClients));
        this.data.clients = updatedClients;
        this.saveToLocalStorage(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error("Error al guardar cliente:", error);
        throw error;
      }
      
      return newClient;
    } catch (error) {
      console.error("Error en createClient:", error);
      throw new Error("No se pudo crear el cliente");
    }
  }

  async updateClient(id: string, client: Partial<Client>): Promise<Client | null> {
    try {
      const clients = await this.getAllClients();
      const index = clients.findIndex(c => c.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedClient = {
        ...clients[index],
        ...client
      };
      
      clients[index] = updatedClient;
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        localStorage.setItem('clients', JSON.stringify(clients));
        this.data.clients = clients;
        this.saveToLocalStorage(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error(`Error al actualizar cliente ${id}:`, error);
        throw error;
      }
      
      return updatedClient;
    } catch (error) {
      console.error(`Error en updateClient(${id}):`, error);
      return null;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const clients = await this.getAllClients();
      const filteredClients = clients.filter(c => c.id !== id);
      
      if (filteredClients.length === clients.length) {
        return false; // No se encontró el cliente
      }
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        localStorage.setItem('clients', JSON.stringify(filteredClients));
        this.data.clients = filteredClients;
        this.saveToLocalStorage(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error(`Error al eliminar cliente ${id}:`, error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Error en deleteClient(${id}):`, error);
      return false;
    }
  }

  async getClientsByClinicId(clinicId: string): Promise<Client[]> {
    if (!this.initialized) await this.initialize();
    return this.data.clients.filter(client => client.clinicId === clinicId);
  }

  // Implementación de métodos para plantillas horarias
  
  async getAllScheduleTemplates(): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    
    // Verificar si hay plantillas almacenadas en localStorage
    const localTemplates = localStorage.getItem('schedule-templates');
    if (localTemplates) {
      // Si hay plantillas en localStorage, las utilizamos y actualizamos el estado interno
      const parsedTemplates = JSON.parse(localTemplates);
      this.data.scheduleTemplates = parsedTemplates;
      return parsedTemplates;
    }
    
    return this.data.scheduleTemplates;
  }
  
  async getScheduleTemplateById(id: string): Promise<any | null> {
    if (!this.initialized) await this.initialize();
    
    // Primero verificar si hay plantillas en localStorage
    await this.getAllScheduleTemplates();
    
    // Buscar la plantilla
    return this.data.scheduleTemplates.find(template => template.id === id) || null;
  }
  
  async createScheduleTemplate(template: any): Promise<any> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Crear nueva plantilla con ID y timestamp
    const now = new Date().toISOString();
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: now,
      updatedAt: null
    };
    
    // Agregar a la colección
    this.data.scheduleTemplates.push(newTemplate);
    
    // Guardar en localStorage
    localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    
    return newTemplate;
  }
  
  async updateScheduleTemplate(id: string, template: any): Promise<any | null> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Buscar índice de la plantilla
    const index = this.data.scheduleTemplates.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Actualizar la plantilla
    const now = new Date().toISOString();
    const updatedTemplate = {
      ...this.data.scheduleTemplates[index],
      ...template,
      updatedAt: now
    };
    
    // Actualizar en la colección
    this.data.scheduleTemplates[index] = updatedTemplate;
    
    // Guardar en localStorage
    localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    
    return updatedTemplate;
  }
  
  async deleteScheduleTemplate(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Filtrar la plantilla a eliminar
    const initialLength = this.data.scheduleTemplates.length;
    this.data.scheduleTemplates = this.data.scheduleTemplates.filter(t => t.id !== id);
    
    // Verificar si se eliminó alguna plantilla
    const deleted = this.data.scheduleTemplates.length < initialLength;
    
    if (deleted) {
      // Guardar en localStorage
      localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    }
    
    return deleted;
  }
  
  async getScheduleTemplatesByClinic(clinicId: string | null): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    
    // Obtener todas las plantillas
    await this.getAllScheduleTemplates();
    
    // Filtrar por clínica
    return this.data.scheduleTemplates.filter(t => 
      t.clinicId === clinicId || 
      t.clinicId === null || 
      t.clinicId === undefined
    );
  }

  // #region Operaciones de archivos
  
  async getAllFiles(): Promise<EntityDocument[]> {
    // Obtener todos los documentos de todas las entidades y categorías
    const allDocuments: EntityDocument[] = [];
    
    // Recorrer todas las entidades
    Object.keys(this.data.entityDocuments).forEach(entityType => {
      // Recorrer todas las entidades de este tipo
      Object.keys(this.data.entityDocuments[entityType]).forEach(entityId => {
        // Recorrer todas las categorías de esta entidad
        Object.keys(this.data.entityDocuments[entityType][entityId]).forEach(category => {
          // Añadir todos los documentos de esta categoría
          allDocuments.push(...this.data.entityDocuments[entityType][entityId][category]);
        });
      });
    });
    
    return allDocuments;
  }
  
  async getFileById(id: string): Promise<EntityDocument | null> {
    const allFiles = await this.getAllFiles();
    return allFiles.find(file => file.id === id) || null;
  }
  
  async saveFile(file: Omit<EntityDocument, 'id'>): Promise<EntityDocument> {
    // Crear un nuevo documento con ID generado
    const newFile: EntityDocument = {
      ...file,
      id: generateId('file')
    };
    
    // Asegurar que existe la estructura para guardar el documento
    if (!this.data.entityDocuments[newFile.entityType]) {
      this.data.entityDocuments[newFile.entityType] = {};
    }
    
    if (!this.data.entityDocuments[newFile.entityType][newFile.entityId]) {
      this.data.entityDocuments[newFile.entityType][newFile.entityId] = {};
    }
    
    const category = file.category || 'default';
    
    if (!this.data.entityDocuments[newFile.entityType][newFile.entityId][category]) {
      this.data.entityDocuments[newFile.entityType][newFile.entityId][category] = [];
    }
    
    // Añadir el documento
    this.data.entityDocuments[newFile.entityType][newFile.entityId][category].push(newFile);
    
    // Guardar en localStorage
    this.saveToLocalStorage();
    
    return newFile;
  }
  
  async deleteFile(id: string): Promise<boolean> {
    const file = await this.getFileById(id);
    if (!file) return false;
    
    try {
      // Eliminar el archivo de su ubicación
      if (this.data.entityDocuments[file.entityType] && 
          this.data.entityDocuments[file.entityType][file.entityId] && 
          this.data.entityDocuments[file.entityType][file.entityId][file.category || 'default']) {
        
        const category = file.category || 'default';
        const files = this.data.entityDocuments[file.entityType][file.entityId][category];
        const index = files.findIndex(f => f.id === id);
        
        if (index !== -1) {
          files.splice(index, 1);
          this.saveToLocalStorage();
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error al eliminar archivo ${id}:`, error);
      return false;
    }
  }
  
  async updateFileMetadata(id: string, metadata: Partial<EntityDocument>): Promise<EntityDocument | null> {
    const file = await this.getFileById(id);
    if (!file) return null;
    
    try {
      // Actualizar el archivo en su ubicación
      if (this.data.entityDocuments[file.entityType] && 
          this.data.entityDocuments[file.entityType][file.entityId] && 
          this.data.entityDocuments[file.entityType][file.entityId][file.category || 'default']) {
        
        const category = file.category || 'default';
        const files = this.data.entityDocuments[file.entityType][file.entityId][category];
        const index = files.findIndex(f => f.id === id);
        
        if (index !== -1) {
          // Actualizar el archivo
          const updatedFile = { ...files[index], ...metadata };
          files[index] = updatedFile;
          this.saveToLocalStorage();
          return updatedFile;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar metadatos de archivo ${id}:`, error);
      return null;
    }
  }
  
  async restoreFile(id: string): Promise<boolean> {
    // En la implementación actual, los archivos no se marcan como "eliminados" sino que se eliminan realmente
    // Esta función es un placeholder para implementaciones futuras que soporten eliminación lógica
    return false;
  }
  
  async getFilesByFilter(filter: {entityType?: string, entityId?: string, category?: string}): Promise<EntityDocument[]> {
    let files = await this.getAllFiles();
    
    // Aplicar filtros
    if (filter.entityType) {
      files = files.filter(file => file.entityType === filter.entityType);
    }
    
    if (filter.entityId) {
      files = files.filter(file => file.entityId === filter.entityId);
    }
    
    if (filter.category) {
      files = files.filter(file => file.category === filter.category);
    }
    
    return files;
  }
  
  async getStorageStats(clinicId?: string): Promise<{used: number, byType: Record<string, number>}> {
    const allFiles = await this.getAllFiles();
    
    // Filtrar por clínica si se especifica
    const relevantFiles = clinicId 
      ? allFiles.filter(file => {
          // Asumimos que clinicId podría estar en metadata o como parte de la ruta
          return file.path?.includes(`/${clinicId}/`) || 
                 file.entityId === clinicId ||
                 file.entityType === 'clinic' && file.entityId === clinicId;
        }) 
      : allFiles;
    
    // Calcular estadísticas
    let totalSize = 0;
    const sizeByType: Record<string, number> = {};
    
    relevantFiles.forEach(file => {
      totalSize += file.fileSize;
      
      // Agrupar por tipo de archivo (extensión)
      const extension = file.fileName.split('.').pop()?.toLowerCase() || 'unknown';
      if (!sizeByType[extension]) {
        sizeByType[extension] = 0;
      }
      sizeByType[extension] += file.fileSize;
    });
    
    return {
      used: totalSize,
      byType: sizeByType
    };
  }
  
  // #endregion
} 