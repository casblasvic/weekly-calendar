import { BonoForm } from '@/components/bono/bono-form'
import { Card, CardContent } from '@/components/ui/card'

// Componente del servidor que extrae los parámetros
export default async function NuevoBonoPage({ params }: { params: Promise<{ id: string, servicioId: string }> }) {
  // Esperar a los parámetros antes de usarlos
  const { id, servicioId } = await params;
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardContent className="p-6">
          <BonoForm
            servicioId={servicioId}
            tarifaId={id}
          />
        </CardContent>
      </Card>
    </div>
  )
} 