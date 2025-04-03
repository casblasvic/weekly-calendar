import BonosPageClient from './BonosPageClient'

// Componente del servidor que extrae los parámetros
export default async function BonosPage({ params }: { params: Promise<{ id: string, servicioId: string }> }) {
  // Extraer los parámetros aquí, en el componente del servidor
  const { id, servicioId } = await params;
  
  return (
    <BonosPageClient 
      tarifaId={id} 
      servicioId={servicioId} 
    />
  )
} 