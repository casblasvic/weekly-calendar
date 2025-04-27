import { z } from 'zod';

// Schema para la pestaña "Datos Personales" del formulario de edición de usuario
export const userPersonalDataSchema = z.object({
  firstName: z.string().min(1, { message: "El nombre es obligatorio." }),
  lastName: z.string().nullish().transform(val => val === '' ? null : val), // Permitir string vacío y convertir a null
  email: z.string().min(1, { message: "El email es obligatorio." }).email({ message: "Debe ser un email válido." }),
  confirmEmail: z.string().min(1, { message: "La confirmación del email es obligatoria." }).email(),
  login: z.string().nullish().transform(val => val === '' ? null : val),
  password: z.string().optional(), // Contraseña es opcional (solo se valida si se introduce)
  // TODO: Añadir confirmPassword y refinar si se añade campo de confirmación
  isActive: z.boolean(),
  phone: z.string().nullish().transform(val => val === '' ? null : val),
  phone2: z.string().nullish().transform(val => val === '' ? null : val),
  countryIsoCode: z.string().nullish().transform(val => val === '' ? null : val), // Código ISO del país general
  phone1CountryIsoCode: z.string().nullish().transform(val => val === '' ? null : val), // Código ISO para teléfono 1
  phone2CountryIsoCode: z.string().nullish().transform(val => val === '' ? null : val), // Código ISO para teléfono 2
  languageIsoCode: z.string().nullish().transform(val => val === '' ? null : val), // Código ISO del idioma
  profileImageUrl: z.string().url({ message: "Debe ser una URL válida." }).nullish().transform(val => val === '' ? null : val),
  // Omitir campos que no están en el modelo User o se manejan en otras pestañas:
  // dni, fechaNacimiento, sexo, colegio, numeroColegiado, especialidad, universidad,
  // direccion, provincia, localidad, cp, exportCsv, indiceControl, numeroPIN, notas,
  // mostrarDesplazados, mostrarCitasPropias, restringirIP, deshabilitado
}).refine(data => data.email === data.confirmEmail, {
  message: "Los emails no coinciden.",
  path: ["confirmEmail"], // Indica qué campo mostrará el error
});

// Tipo inferido del schema para usar en el formulario
export type UserPersonalDataFormValues = z.infer<typeof userPersonalDataSchema>; 