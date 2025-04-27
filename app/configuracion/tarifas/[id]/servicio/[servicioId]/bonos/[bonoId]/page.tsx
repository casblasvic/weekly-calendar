import { BonoForm } from '@/components/bono/bono-form'
import { Card, CardContent } from '@/components/ui/card'

// Componente del servidor que extrae los parámetros
export default async function EditarBonoPage({ params }: { params: Promise<{ id: string, servicioId: string, bonoId: string }> }) {
  // Esperar a los parámetros antes de usarlos
  const { id, servicioId, bonoId } = await params;
  
  return (
    <div className="container py-6 mx-auto">
      <Card>
        <CardContent className="p-6">
          <BonoForm 
            servicioId={servicioId} 
            tarifaId={id} 
            bonoId={bonoId} 
          />
        </CardContent>
      </Card>
    </div>
  )
} 