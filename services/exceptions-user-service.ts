import {
  Usuario,
  ExcepcionHoraria,
  ExcepcionHorariaUsuario,
  HorarioDia,
  TipoPropagacion
} from "./data/models/interfaces";
import { detectarConflictos, ConflictoHorario } from "./exceptions-conflict-service";

/**
 * Crea una excepción horaria para un usuario basada en una excepción de clínica
 * @param usuario Usuario al que aplicar la excepción
 * @param excepcionClinica Excepción de la clínica que origina la excepción de usuario
 * @param diasModificados Días específicos con horarios modificados (opcional)
 * @returns Nueva excepción horaria de usuario
 */
export function crearExcepcionUsuario(
  usuario: Usuario,
  excepcionClinica: ExcepcionHoraria,
  diasModificados?: HorarioDia[]
): ExcepcionHorariaUsuario {
  // Crear una excepción de usuario basada en la excepción de clínica
  const excepcionUsuario: ExcepcionHorariaUsuario = {
    id: `${usuario.id}-${excepcionClinica.id}`,
    userId: usuario.id.toString(),
    nombre: `[Auto] ${excepcionClinica.nombre}`,
    fechaInicio: excepcionClinica.fechaInicio,
    fechaFin: excepcionClinica.fechaFin,
    dias: diasModificados || excepcionClinica.dias.map(dia => ({
      ...dia,
      franjas: dia.franjas.map(franja => ({
        ...franja,
        id: `${usuario.id}-${franja.id}`
      }))
    })),
    origenExcepcionId: excepcionClinica.id,
    origenClinicaId: excepcionClinica.clinicaId,
    generadaAutomaticamente: true
  };

  return excepcionUsuario;
}

/**
 * Aplica las soluciones elegidas para los conflictos de un usuario
 * @param usuario Usuario afectado
 * @param excepcionClinica Excepción de clínica causante
 * @param conflictos Conflictos detectados para ese usuario
 * @param soluciones Soluciones elegidas para cada conflicto (por ID de conflicto)
 * @returns Excepción horaria de usuario ya resuelta
 */
export function aplicarSolucionesUsuario(
  usuario: Usuario,
  excepcionClinica: ExcepcionHoraria,
  conflictos: ConflictoHorario[],
  soluciones: Record<string, string>
): ExcepcionHorariaUsuario {
  // Crear estructura de días modificados
  const diasModificados: HorarioDia[] = [];
  
  // Verificar si hay conflictos
  if (conflictos.length > 0) {
    // Agrupar conflictos por día
    const conflictosPorDia = conflictos.reduce((grupos, conflicto) => {
      if (!grupos[conflicto.dia]) {
        grupos[conflicto.dia] = [];
      }
      grupos[conflicto.dia].push(conflicto);
      return grupos;
    }, {} as Record<string, ConflictoHorario[]>);
    
    // Para cada día con conflictos
    Object.entries(conflictosPorDia).forEach(([dia, conflictosDia]) => {
      // Buscar el día correspondiente en la excepción de clínica
      const diaExcepcion = excepcionClinica.dias.find(d => d.dia === dia);
      if (!diaExcepcion || !diaExcepcion.activo) return;
      
      // Crear un nuevo día para la excepción de usuario
      const nuevoDia: HorarioDia = {
        dia: dia as any,
        activo: true,
        franjas: []
      };
      
      // Aplicar cada solución según el tipo elegido
      conflictosDia.forEach(conflicto => {
        const solucion = soluciones[conflicto.id] || 'restrict'; // Por defecto, restrictivo
        
        if (solucion === 'ignore') {
          // Si se ignora, mantenemos la franja original del usuario
          if (conflicto.franjaUsuarioConflicto) {
            nuevoDia.franjas.push({
              id: `orig-${conflicto.id}`,
              inicio: conflicto.franjaUsuarioConflicto.inicio,
              fin: conflicto.franjaUsuarioConflicto.fin
            });
          }
        } else if (solucion === 'remove') {
          // Si se elimina, no añadimos nada (la franja desaparece)
        } else if (solucion === 'restrict' && conflicto.franjaUsuarioConflicto && conflicto.franjaExcepcionConflicto) {
          // Si es restrictivo, ajustamos la franja al horario de la excepción
          const inicioAjustado = conflicto.franjaUsuarioConflicto.inicio < conflicto.franjaExcepcionConflicto.inicio 
            ? conflicto.franjaExcepcionConflicto.inicio 
            : conflicto.franjaUsuarioConflicto.inicio;
            
          const finAjustado = conflicto.franjaUsuarioConflicto.fin > conflicto.franjaExcepcionConflicto.fin 
            ? conflicto.franjaExcepcionConflicto.fin 
            : conflicto.franjaUsuarioConflicto.fin;
          
          nuevoDia.franjas.push({
            id: `adj-${conflicto.id}`,
            inicio: inicioAjustado,
            fin: finAjustado
          });
        }
      });
      
      // Si no hay franjas configuradas, usar las franjas de la excepción de clínica
      if (nuevoDia.franjas.length === 0) {
        nuevoDia.franjas = diaExcepcion.franjas.map(franja => ({
          id: `${usuario.id}-${franja.id}`,
          inicio: franja.inicio,
          fin: franja.fin
        }));
      }
      
      diasModificados.push(nuevoDia);
    });
  } else {
    // *** CASO SIN CONFLICTOS: Copiar los días de la excepción de clínica ***
    // Este es el caso que faltaba manejar adecuadamente
    console.log(`[aplicarSolucionesUsuario] No hay conflictos para usuario ${usuario.id}. Copiando días de excepción clínica.`);
    
    // Iterar sobre cada día de la excepción de la clínica
    excepcionClinica.dias.forEach(diaExcepcion => {
      // Solo copiar días activos
      if (diaExcepcion.activo) {
        // Crear nuevo día para el usuario
        const nuevoDia: HorarioDia = {
          dia: diaExcepcion.dia,
          activo: true,
          franjas: diaExcepcion.franjas.map(franja => ({
            id: `${usuario.id}-${franja.id}`,
            inicio: franja.inicio,
            fin: franja.fin
          }))
        };
        
        // Añadir el día a la lista de días modificados
        diasModificados.push(nuevoDia);
      }
    });
  }
  
  // Crear y devolver la excepción de usuario
  return crearExcepcionUsuario(usuario, excepcionClinica, diasModificados);
}

/**
 * Guarda una excepción de usuario en la lista de excepciones del usuario
 * @param usuario Usuario a modificar
 * @param excepcion Excepción a añadir
 * @returns Usuario actualizado con la nueva excepción
 */
export function guardarExcepcionUsuario(
  usuario: Usuario,
  excepcion: ExcepcionHorariaUsuario
): Usuario {
  // Crear una copia del usuario
  const usuarioActualizado = { ...usuario };
  
  // Inicializar el array de excepciones si no existe
  if (!usuarioActualizado.excepciones) {
    usuarioActualizado.excepciones = [];
  }
  
  // Comprobar si ya existe una excepción con el mismo ID
  const indiceExcepcion = usuarioActualizado.excepciones.findIndex(e => e.id === excepcion.id);
  
  if (indiceExcepcion >= 0) {
    // Actualizar una excepción existente
    usuarioActualizado.excepciones[indiceExcepcion] = excepcion;
  } else {
    // Añadir una nueva excepción
    usuarioActualizado.excepciones.push(excepcion);
  }
  
  return usuarioActualizado;
}

/**
 * Aplica excepciones de usuario a múltiples usuarios
 * @param usuarios Lista original de usuarios
 * @param excepciones Lista de excepciones a aplicar
 * @returns Lista actualizada de usuarios con excepciones aplicadas
 */
export function aplicarExcepcionesUsuarios(
  usuarios: Usuario[],
  excepciones: ExcepcionHorariaUsuario[]
): Usuario[] {
  // Crear una copia de los usuarios
  const usuariosActualizados = [...usuarios];
  
  // Agrupar excepciones por usuario
  const excepcionesPorUsuario = excepciones.reduce((grupos, excepcion) => {
    if (!grupos[excepcion.userId]) {
      grupos[excepcion.userId] = [];
    }
    grupos[excepcion.userId].push(excepcion);
    return grupos;
  }, {} as Record<string, ExcepcionHorariaUsuario[]>);
  
  // Aplicar las excepciones a cada usuario
  Object.entries(excepcionesPorUsuario).forEach(([userId, excepcionesUsuario]) => {
    const indiceUsuario = usuariosActualizados.findIndex(u => u.id.toString() === userId);
    if (indiceUsuario < 0) return;
    
    // Actualizar excepciones del usuario
    let usuarioActualizado = { ...usuariosActualizados[indiceUsuario] };
    
    excepcionesUsuario.forEach(excepcion => {
      usuarioActualizado = guardarExcepcionUsuario(usuarioActualizado, excepcion);
    });
    
    // Actualizar el usuario en la lista
    usuariosActualizados[indiceUsuario] = usuarioActualizado;
  });
  
  return usuariosActualizados;
}

/**
 * Verifica si un usuario tiene excepciones activas en una fecha determinada
 * @param usuario Usuario a verificar
 * @param fecha Fecha a verificar (opcional, por defecto fecha actual)
 * @returns true si el usuario tiene excepciones activas en esa fecha
 */
export function tieneExcepcionesActivas(
  usuario: Usuario,
  fecha: Date = new Date()
): boolean {
  if (!usuario.excepciones || usuario.excepciones.length === 0) {
    return false;
  }
  
  // Verificar si alguna excepción está activa en la fecha indicada
  return usuario.excepciones.some(excepcion => {
    const fechaInicio = new Date(excepcion.fechaInicio);
    const fechaFin = new Date(excepcion.fechaFin);
    
    return fechaInicio <= fecha && fecha <= fechaFin;
  });
}

/**
 * Cuenta el número de excepciones activas en una fecha determinada
 * @param usuario Usuario a verificar
 * @param fecha Fecha a verificar (opcional, por defecto fecha actual)
 * @returns Número de excepciones activas
 */
export function contarExcepcionesActivas(
  usuario: Usuario,
  fecha: Date = new Date()
): number {
  if (!usuario.excepciones || usuario.excepciones.length === 0) {
    return 0;
  }
  
  // Contar excepciones activas en la fecha indicada
  return usuario.excepciones.filter(excepcion => {
    const fechaInicio = new Date(excepcion.fechaInicio);
    const fechaFin = new Date(excepcion.fechaFin);
    
    return fechaInicio <= fecha && fecha <= fechaFin;
  }).length;
} 