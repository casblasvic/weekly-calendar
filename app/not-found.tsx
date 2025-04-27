"use client"; // Necesario para usar hooks como useRouter o componentes interactivos

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react'; // Icono adecuado para "no encontrado"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      {/* Podríamos añadir una animación SVG sutil aquí si encontramos una adecuada */}
      <Frown className="w-24 h-24 text-primary mb-6" />
      
      <h1 className="text-4xl font-bold mb-2">Página No Encontrada</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Oops! Parece que la página que buscas no existe o ha sido movida.
      </p>
      
      <div className="flex space-x-4">
        <Link href="/">
          <Button variant="default" size="lg">
             Ir a Inicio
           </Button>
        </Link>
        {/* Podríamos añadir un botón de "Volver atrás" si quisiéramos, 
            pero "Ir a Inicio" suele ser más útil en un 404 global. */}
        {/* 
        <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            Volver Atrás
        </Button> 
        */}
      </div>
    </div>
  );
} 