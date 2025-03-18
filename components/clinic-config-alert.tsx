"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Settings, PlusCircle, ListChecks } from "lucide-react"

interface ClinicConfigAlertProps {
  type: "no-hours" | "no-clinic" | "multiple-clinics"
  clinicId?: string
}

export function ClinicConfigAlert({ type, clinicId }: ClinicConfigAlertProps) {
  const router = useRouter()

  const handleAction = () => {
    switch (type) {
      case "no-hours":
        // Navegar a la configuración de la clínica actual
        router.push(`/clinics/${clinicId}/settings`)
        break
      case "no-clinic":
        // Navegar a la página de creación de clínica
        router.push("/clinics/new")
        break
      case "multiple-clinics":
        // Navegar a la lista de clínicas
        router.push("/clinics")
        break
    }
  }

  const getContent = () => {
    switch (type) {
      case "no-hours":
        return {
          title: "Configuración de horarios pendiente",
          message:
            "Esta clínica no tiene configurados correctamente los horarios de apertura y cierre. Por favor, configure estos valores en la sección de configuración de la clínica.",
          buttonText: "Ir a configuración",
          icon: <Settings className="h-8 w-8 text-amber-500" />,
        }
      case "no-clinic":
        return {
          title: "No hay clínicas configuradas",
          message:
            "No se ha encontrado ninguna clínica en el sistema. Por favor, cree una clínica para comenzar a utilizar la agenda.",
          buttonText: "Crear clínica",
          icon: <PlusCircle className="h-8 w-8 text-blue-500" />,
        }
      case "multiple-clinics":
        return {
          title: "Seleccione una clínica",
          message: "Hay varias clínicas disponibles. Por favor, seleccione una clínica para ver su agenda.",
          buttonText: "Ver clínicas",
          icon: <ListChecks className="h-8 w-8 text-green-500" />,
        }
    }
  }

  const content = getContent()

  return (
    <div className="flex justify-center items-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-amber-500">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {content.icon}
            <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
            <div className="flex items-start space-x-2 text-left">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-600">{content.message}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button onClick={handleAction} className="px-6">
            {content.buttonText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

