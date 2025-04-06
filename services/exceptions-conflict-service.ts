import { 
  Clinica, 
  ExcepcionHoraria, 
  HorarioDia, 
  TipoPropagacion,
  Usuario,
  ExcepcionHorariaUsuario
} from "./data/models/interfaces";

/**
 * Tipos de conflictos que pueden ocurrir entre excepciones de clínica y horarios de usuario
 */
export enum TipoConflicto {
  FUERA_DE_HORARIO = "FUERA_DE_HORARIO", // El horario del usuario está fuera del nuevo horario de clínica
  SOLAPAMIENTO_PARCIAL = "SOLAPAMIENTO_PARCIAL", // El horario del usuario solapa parcialmente con el nuevo horario
  DIA_INACTIVO = "DIA_INACTIVO", // El día está marcado como inactivo en la excepción de clínica
  SIN_FRANJAS = "SIN_FRANJAS" // No hay franjas horarias definidas en ese día en la excepción
}

/**
 * Interfaz que define un conflicto entre una excepción de clínica y el horario de un usuario
 */
export interface ConflictoHorario {
  id: string; // ID único del conflicto
  usuarioId: string; // ID del usuario afectado
  excepcionId: string; // ID de la excepción que causa el conflicto
  dia: string; // Día de la semana donde ocurre el conflicto
  tipo: TipoConflicto; // Tipo de conflicto
  mensaje: string; // Mensaje descriptivo del conflicto
  franjaUsuarioConflicto?: { inicio: string; fin: string }; // Franja del usuario que causa el conflicto
  franjaExcepcionConflicto?: { inicio: string; fin: string }; // Franja de la excepción relacionada con el conflicto
  resuelto: boolean; // Indica si el conflicto ha sido resuelto
  solucionAplicada?: string; // Descripción de la solución aplicada si fue resuelto
}

/**
 * Detecta conflictos entre una excepción de clínica y los horarios de los usuarios
 * @param excepcion Excepción de horario de la clínica
 * @param clinica Clínica
 * @param usuarios Lista de usuarios a comprobar
 * @returns Array de conflictos detectados
 */
export function detectarConflictos(
  excepcion: ExcepcionHoraria,
  clinica: Clinica,
  usuarios: Usuario[]
): ConflictoHorario[] {
  // Si la excepción no tiene propagación, no hay conflictos
  if (!excepcion.propagacion || excepcion.propagacion === TipoPropagacion.NONE) {
    return [];
  }
  
  const conflictos: ConflictoHorario[] = [];
  
  // Filtramos usuarios que pertenecen a esta clínica
  const usuariosClinica = usuarios.filter(usuario => 
    usuario.clinicasIds && usuario.clinicasIds.includes(clinica.id.toString())
  );
  
  // Para cada usuario de la clínica
  usuariosClinica.forEach(usuario => {
    // Para cada día de la excepción
    excepcion.dias.forEach(diaExcepcion => {
      // Si el día no está activo o no tiene franjas, no comprobamos
      if (!diaExcepcion.activo || diaExcepcion.franjas.length === 0) {
        return;
      }
      
      // Obtenemos el horario del usuario para ese día (en una implementación real)
      // Aquí deberíamos acceder al horario real del usuario para ese día
      // Por ahora, usamos un horario de ejemplo
      const horariosUsuarioEjemplo: HorarioDia[] = [
        {
          dia: 'lunes',
          activo: true,
          franjas: [{ id: '1', inicio: '09:00', fin: '14:00' }, { id: '2', inicio: '16:00', fin: '20:00' }]
        },
        {
          dia: 'martes',
          activo: true,
          franjas: [{ id: '3', inicio: '09:00', fin: '14:00' }, { id: '4', inicio: '16:00', fin: '20:00' }]
        },
        {
          dia: 'miercoles',
          activo: true,
          franjas: [{ id: '5', inicio: '09:00', fin: '14:00' }, { id: '6', inicio: '16:00', fin: '20:00' }]
        },
        {
          dia: 'jueves',
          activo: true,
          franjas: [{ id: '7', inicio: '09:00', fin: '14:00' }, { id: '8', inicio: '16:00', fin: '20:00' }]
        },
        {
          dia: 'viernes',
          activo: true,
          franjas: [{ id: '9', inicio: '09:00', fin: '14:00' }, { id: '10', inicio: '16:00', fin: '20:00' }]
        },
        {
          dia: 'sabado',
          activo: false,
          franjas: []
        },
        {
          dia: 'domingo',
          activo: false,
          franjas: []
        }
      ];
      
      // Buscamos el horario del usuario para el día que estamos comprobando
      const horarioUsuarioDia = horariosUsuarioEjemplo.find(d => d.dia === diaExcepcion.dia);
      
      // Si el usuario no tiene configurado ese día o no está activo, no hay conflicto
      if (!horarioUsuarioDia || !horarioUsuarioDia.activo) {
        return;
      }
      
      // Comparamos las franjas horarias del usuario con las de la excepción
      horarioUsuarioDia.franjas.forEach(franjaUsuario => {
        let fueraDeHorario = true;
        let solapamientoParcial = false;
        
        // Comprobamos contra cada franja de la excepción
        diaExcepcion.franjas.forEach(franjaExcepcion => {
          // Convertimos los tiempos a minutos para facilitar comparación
          const usuarioInicio = convertirHoraAMinutos(franjaUsuario.inicio);
          const usuarioFin = convertirHoraAMinutos(franjaUsuario.fin);
          const excepcionInicio = convertirHoraAMinutos(franjaExcepcion.inicio);
          const excepcionFin = convertirHoraAMinutos(franjaExcepcion.fin);
          
          // Verificamos si hay solapamiento
          if (!(usuarioFin <= excepcionInicio || usuarioInicio >= excepcionFin)) {
            fueraDeHorario = false;
            
            // Verificamos si es solapamiento parcial
            if (usuarioInicio < excepcionInicio || usuarioFin > excepcionFin) {
              solapamientoParcial = true;
              
              // Creamos un conflicto por solapamiento parcial
              conflictos.push({
                id: `${usuario.id}-${diaExcepcion.dia}-${franjaUsuario.id}-${franjaExcepcion.id}`,
                usuarioId: usuario.id.toString(),
                excepcionId: excepcion.id,
                dia: diaExcepcion.dia,
                tipo: TipoConflicto.SOLAPAMIENTO_PARCIAL,
                mensaje: `El horario del usuario de ${franjaUsuario.inicio} a ${franjaUsuario.fin} solapa parcialmente con el horario de excepción de ${franjaExcepcion.inicio} a ${franjaExcepcion.fin}`,
                franjaUsuarioConflicto: { inicio: franjaUsuario.inicio, fin: franjaUsuario.fin },
                franjaExcepcionConflicto: { inicio: franjaExcepcion.inicio, fin: franjaExcepcion.fin },
                resuelto: false
              });
            }
          }
        });
        
        // Si la franja está completamente fuera del horario, creamos un conflicto
        if (fueraDeHorario) {
          conflictos.push({
            id: `${usuario.id}-${diaExcepcion.dia}-${franjaUsuario.id}-fuera`,
            usuarioId: usuario.id.toString(),
            excepcionId: excepcion.id,
            dia: diaExcepcion.dia,
            tipo: TipoConflicto.FUERA_DE_HORARIO,
            mensaje: `El horario del usuario de ${franjaUsuario.inicio} a ${franjaUsuario.fin} está fuera de los horarios definidos en la excepción`,
            franjaUsuarioConflicto: { inicio: franjaUsuario.inicio, fin: franjaUsuario.fin },
            resuelto: false
          });
        }
      });
    });
  });
  
  return conflictos;
}

/**
 * Convierte una hora en formato "HH:MM" a minutos desde medianoche
 * @param hora Hora en formato "HH:MM"
 * @returns Minutos desde medianoche
 */
function convertirHoraAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Genera un resumen de conflictos por usuario
 * @param conflictos Lista de conflictos
 * @returns Mapa de usuario a número de conflictos
 */
export function generarResumenConflictosPorUsuario(
  conflictos: ConflictoHorario[]
): Map<string, number> {
  const resumen = new Map<string, number>();
  
  conflictos.forEach(conflicto => {
    const count = resumen.get(conflicto.usuarioId) || 0;
    resumen.set(conflicto.usuarioId, count + 1);
  });
  
  return resumen;
}

/**
 * Aplica una resolución automática a los conflictos según el tipo de propagación
 * @param conflictos Lista de conflictos a resolver
 * @param tipoPropagacion Tipo de propagación a aplicar
 * @returns Conflictos resueltos y excepciones de usuario generadas
 */
export function resolverConflictosAutomaticamente(
  conflictos: ConflictoHorario[],
  excepcion: ExcepcionHoraria,
  tipoPropagacion: TipoPropagacion
): {
  conflictosResueltos: ConflictoHorario[];
  excepcionesUsuario: ExcepcionHorariaUsuario[];
} {
  const conflictosResueltos: ConflictoHorario[] = [];
  const excepcionesUsuario: ExcepcionHorariaUsuario[] = [];
  
  // Agrupar conflictos por usuario para generar una excepción por usuario
  const conflictosPorUsuario = new Map<string, ConflictoHorario[]>();
  
  conflictos.forEach(conflicto => {
    const userConflicts = conflictosPorUsuario.get(conflicto.usuarioId) || [];
    userConflicts.push(conflicto);
    conflictosPorUsuario.set(conflicto.usuarioId, userConflicts);
  });
  
  // Ahora, para cada usuario, generamos una excepción
  conflictosPorUsuario.forEach((userConflicts, userId) => {
    // Agrupar conflictos por día
    const diasConflicto = new Map<string, ConflictoHorario[]>();
    
    userConflicts.forEach(conflicto => {
      const dayConflicts = diasConflicto.get(conflicto.dia) || [];
      dayConflicts.push(conflicto);
      diasConflicto.set(conflicto.dia, dayConflicts);
    });
    
    // Crear la excepción para el usuario
    const diasExcepcion: HorarioDia[] = [];
    
    // Para cada día con conflictos
    diasConflicto.forEach((dayConflicts, dia) => {
      // Obtenemos el día correspondiente de la excepción de clínica
      const diaExcepcion = excepcion.dias.find(d => d.dia === dia);
      
      if (diaExcepcion && diaExcepcion.activo) {
        // Creamos un día para la excepción del usuario
        const diaNuevo: HorarioDia = {
          dia: dia as any, // Casting necesario por el tipo estricto
          activo: true,
          franjas: []
        };
        
        // Según el tipo de propagación, ajustamos las franjas
        if (tipoPropagacion === TipoPropagacion.RESTRICTIVE) {
          // En modo restrictivo, copiamos exactamente las franjas de la excepción de clínica
          diaNuevo.franjas = diaExcepcion.franjas.map(franja => ({
            id: `${userId}-${franja.id}`,
            inicio: franja.inicio,
            fin: franja.fin
          }));
        } else if (tipoPropagacion === TipoPropagacion.ADAPTIVE) {
          // En modo adaptativo, ajustamos las franjas para que queden dentro del horario de la excepción
          // Este es un ejemplo simplificado, en la realidad sería más complejo
          
          // Para cada conflicto del día
          dayConflicts.forEach(conflicto => {
            if (conflicto.tipo === TipoConflicto.SOLAPAMIENTO_PARCIAL && conflicto.franjaUsuarioConflicto && conflicto.franjaExcepcionConflicto) {
              // Creamos una franja ajustada
              const inicioAjustado = conflicto.franjaUsuarioConflicto.inicio < conflicto.franjaExcepcionConflicto.inicio 
                ? conflicto.franjaExcepcionConflicto.inicio 
                : conflicto.franjaUsuarioConflicto.inicio;
                
              const finAjustado = conflicto.franjaUsuarioConflicto.fin > conflicto.franjaExcepcionConflicto.fin 
                ? conflicto.franjaExcepcionConflicto.fin 
                : conflicto.franjaUsuarioConflicto.fin;
              
              diaNuevo.franjas.push({
                id: `adapted-${conflicto.id}`,
                inicio: inicioAjustado,
                fin: finAjustado
              });
              
              // Marcar el conflicto como resuelto
              conflicto.resuelto = true;
              conflicto.solucionAplicada = `Ajustado horario a ${inicioAjustado}-${finAjustado}`;
              conflictosResueltos.push(conflicto);
            }
          });
        }
        
        // Si no se añadieron franjas en modo adaptativo, usar las franjas de la excepción
        if (tipoPropagacion === TipoPropagacion.ADAPTIVE && diaNuevo.franjas.length === 0) {
          diaNuevo.franjas = diaExcepcion.franjas.map(franja => ({
            id: `${userId}-${franja.id}`,
            inicio: franja.inicio,
            fin: franja.fin
          }));
        }
        
        diasExcepcion.push(diaNuevo);
      }
    });
    
    // Crear la excepción para el usuario
    const excepcionUsuario: ExcepcionHorariaUsuario = {
      id: `${userId}-${excepcion.id}`,
      userId: userId,
      nombre: `[Auto] ${excepcion.nombre}`,
      fechaInicio: excepcion.fechaInicio,
      fechaFin: excepcion.fechaFin,
      dias: diasExcepcion,
      origenExcepcionId: excepcion.id,
      origenClinicaId: excepcion.clinicaId,
      generadaAutomaticamente: true
    };
    
    excepcionesUsuario.push(excepcionUsuario);
  });
  
  return {
    conflictosResueltos,
    excepcionesUsuario
  };
}

/**
 * Estadísticas sobre conflictos
 */
export interface EstadisticasConflictos {
  total: number;
  porTipo: Record<TipoConflicto, number>;
  porDia: Record<string, number>;
  porUsuario: Record<string, number>;
  resueltos: number;
  pendientes: number;
}

/**
 * Genera estadísticas a partir de una lista de conflictos
 * @param conflictos Lista de conflictos
 * @returns Estadísticas de conflictos
 */
export function generarEstadisticasConflictos(conflictos: ConflictoHorario[]): EstadisticasConflictos {
  const estadisticas: EstadisticasConflictos = {
    total: conflictos.length,
    porTipo: {
      [TipoConflicto.FUERA_DE_HORARIO]: 0,
      [TipoConflicto.SOLAPAMIENTO_PARCIAL]: 0,
      [TipoConflicto.DIA_INACTIVO]: 0,
      [TipoConflicto.SIN_FRANJAS]: 0
    },
    porDia: {},
    porUsuario: {},
    resueltos: 0,
    pendientes: 0
  };
  
  // Procesar cada conflicto
  conflictos.forEach(conflicto => {
    // Contar por tipo
    estadisticas.porTipo[conflicto.tipo]++;
    
    // Contar por día
    estadisticas.porDia[conflicto.dia] = (estadisticas.porDia[conflicto.dia] || 0) + 1;
    
    // Contar por usuario
    estadisticas.porUsuario[conflicto.usuarioId] = (estadisticas.porUsuario[conflicto.usuarioId] || 0) + 1;
    
    // Contar resueltos/pendientes
    if (conflicto.resuelto) {
      estadisticas.resueltos++;
    } else {
      estadisticas.pendientes++;
    }
  });
  
  return estadisticas;
} 