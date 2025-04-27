import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
// Importar el componente cliente que contendrá la DataTable
import { BonoDefinitionsClient } from "./_components/client"; 
// Importar el tipo BonoDefinition incluyendo relaciones (o crear uno específico)
// Asumiendo que podemos obtener el tipo inferido o importarlo
import { prisma } from "@/lib/db";
import { getServerAuthSession } from "@/lib/auth";
import type { BonoDefinition, Service, Product, VATType } from "@prisma/client"; // Importar tipos necesarios

// Definir un tipo extendido para incluir las relaciones parciales
export type BonoDefinitionWithRelations = BonoDefinition & {
  service: Pick<Service, 'id' | 'name'> | null;
  product: Pick<Product, 'id' | 'name'> | null;
  vatType: Pick<VATType, 'id' | 'name' | 'rate'> | null;
};

// Función para obtener los datos en el servidor
async function getBonoDefinitions(systemId: string): Promise<BonoDefinitionWithRelations[]> {
  try {
    const bonoDefinitions = await prisma.bonoDefinition.findMany({
      where: { systemId },
      orderBy: { name: 'asc' },
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });
    return bonoDefinitions;
  } catch (error) {
    console.error("[BONO_DEFINITIONS_PAGE] Error fetching data:", error);
    return []; // Devolver array vacío en caso de error
  }
}

// Componente de Página (Server Component)
const BonoDefinitionsPage = async () => {
  const session = await getServerAuthSession();
  const systemId = session?.user?.systemId;

  if (!systemId) {
    // Manejar caso sin sesión o systemId (quizás redirigir o mostrar mensaje)
    // Por ahora, obtenemos un array vacío
    console.warn("[BONO_DEFINITIONS_PAGE] No systemId found in session.");
  }

  const data = systemId ? await getBonoDefinitions(systemId) : [];

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bonos</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona las definiciones de bonos de servicios o productos.
            </p>
          </div>
          <Link href="/configuracion/bonos/nuevo">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo
            </Button>
          </Link>
        </div>
        {/* Pasar los datos al componente cliente para la tabla */}
        <BonoDefinitionsClient data={data} />
      </div>
    </div>
  );
};

export default BonoDefinitionsPage; 