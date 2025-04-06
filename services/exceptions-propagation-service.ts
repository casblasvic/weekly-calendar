import { 
  Clinica, 
  ExcepcionHoraria, 
  ExcepcionHorariaUsuario, 
  HorarioDia, 
  TipoPropagacion,
  Usuario
} from "./data/models/interfaces";
import { v4 as uuidv4 } from 'uuid';

/**
 * Calcula los usuarios afectados por una excepción de horario en una clínica
 * @param excepcion Excepción de horario
 * @param clinica Clínica
 * @param usuarios Lista de todos los usuarios
 * @returns Número de usuarios afectados y lista de usuarios
 */
export function calcularUsuariosAfectados(
  excepcion: ExcepcionHoraria,
  clinica: Clinica,
  usuarios: Usuario[]
): { count: number; usuarios: Usuario[] } {
  // Filtramos usuarios que pertenecen a esta clínica
  const usuariosClinica = usuarios.filter(usuario => 
    usuario.clinicasIds && usuario.clinicasIds.includes(clinica.id.toString())
  );
  
  return {
    count: usuariosClinica.length,
    usuarios: usuariosClinica
  };
}

/**
 * Genera excepciones de horario para usuarios basadas en una excepción de clínica
 * @param excepcion Excepción de horario de la clínica
 * @param clinica Clínica
 * @param usuarios Lista de usuarios a los que propagar
 * @param tipo Tipo de propagación
 * @returns Array de excepciones de usuario generadas
 */
export function generarExcepcionesUsuario(
  excepcion: ExcepcionHoraria,
  clinica: Clinica,
  usuarios: Usuario[],
  tipo: TipoPropagacion
): ExcepcionHorariaUsuario[] {
  // Si no hay propagación, retornar array vacío
  if (tipo === TipoPropagacion.NONE) {
    return [];
  }
  
  return usuarios.map(usuario => {
    // Obtenemos los días adaptados según el tipo de propagación
    const diasAdaptados = adaptarDiasSegunTipo(excepcion.dias, tipo, usuario);
    
    // Creamos la excepción para el usuario
    const excepcionUsuario: ExcepcionHorariaUsuario = {
      id: uuidv4(),
      userId: usuario.id.toString(),
      nombre: `[Auto] ${excepcion.nombre}`,
      fechaInicio: excepcion.fechaInicio,
      fechaFin: excepcion.fechaFin,
      dias: diasAdaptados,
      origenExcepcionId: excepcion.id,
      origenClinicaId: clinica.id.toString(),
      generadaAutomaticamente: true
    };
    
    return excepcionUsuario;
  });
}

/**
 * Adapta los días de una excepción según el tipo de propagación y el usuario
 * @param dias Días de la excepción de clínica
 * @param tipo Tipo de propagación
 * @param usuario Usuario al que adaptar
 * @returns Días adaptados
 */
function adaptarDiasSegunTipo(
  dias: HorarioDia[],
  tipo: TipoPropagacion,
  usuario: Usuario
): HorarioDia[] {
  // Clonamos los días para no modificar los originales
  const diasAdaptados = JSON.parse(JSON.stringify(dias)) as HorarioDia[];
  
  // Para la versión inicial, simplemente copiamos los días tal cual
  // En fases posteriores, implementaremos lógica más compleja de adaptación
  
  if (tipo === TipoPropagacion.RESTRICTIVE) {
    // Para propagación restrictiva, simplemente usamos los mismos días
    // En el futuro, implementaremos lógica para restringir horarios que excedan
    return diasAdaptados;
  } 
  else if (tipo === TipoPropagacion.ADAPTIVE) {
    // Para propagación adaptativa, por ahora usamos los mismos días
    // En el futuro, implementaremos ajuste proporcional según el horario del usuario
    return diasAdaptados;
  }
  
  return diasAdaptados;
}

/**
 * Actualiza el estado de propagación de una excepción de clínica
 * @param excepcion Excepción a actualizar
 * @param propagado Estado de propagación
 * @param usuariosAfectados Número de usuarios afectados
 * @returns Excepción actualizada
 */
export function actualizarEstadoPropagacion(
  excepcion: ExcepcionHoraria,
  propagado: boolean,
  usuariosAfectados: number
): ExcepcionHoraria {
  return {
    ...excepcion,
    propagado,
    usuariosAfectados
  };
}

/**
 * Propaga una excepción de clínica a usuarios
 * @param excepcion Excepción a propagar
 * @param clinica Clínica
 * @param usuarios Todos los usuarios
 * @returns Resultado de la propagación
 */
export async function propagarExcepcion(
  excepcion: ExcepcionHoraria,
  clinica: Clinica,
  usuarios: Usuario[]
): Promise<{
  excepcionActualizada: ExcepcionHoraria;
  excepcionesUsuario: ExcepcionHorariaUsuario[];
}> {
  // Verificar si la excepción tiene tipo de propagación
  const tipoPropagacion = excepcion.propagacion || TipoPropagacion.NONE;
  
  // Calcular usuarios afectados
  const { usuarios: usuariosAfectados } = calcularUsuariosAfectados(excepcion, clinica, usuarios);
  
  // Generar excepciones para usuarios
  const excepcionesUsuario = generarExcepcionesUsuario(
    excepcion,
    clinica,
    usuariosAfectados,
    tipoPropagacion
  );
  
  // Actualizar estado de propagación
  const excepcionActualizada = actualizarEstadoPropagacion(
    excepcion,
    true,
    usuariosAfectados.length
  );
  
  // En una implementación real, aquí guardaríamos las excepciones en la base de datos
  // y actualizaríamos la excepción de clínica
  
  return {
    excepcionActualizada,
    excepcionesUsuario
  };
} 