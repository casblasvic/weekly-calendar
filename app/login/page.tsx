'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Para mostrar notificaciones
import Link from 'next/link'; // Para enlaces

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: callbackUrl,
      });

      if (result?.error) {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
        toast.error("Error al iniciar sesión", {
          description: "Credenciales inválidas. Por favor, inténtalo de nuevo.",
        });
        console.error("SignIn Error:", result.error);
      } else if (result?.ok && result.url) {
        toast.success("Inicio de sesión exitoso");
        router.push(result.url);
      } else {
        setError("Ocurrió un error inesperado durante el inicio de sesión.");
        toast.error("Error inesperado", {
            description: "Ocurrió un error inesperado durante el inicio de sesión.",
        });
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setError("Ocurrió un error al intentar iniciar sesión.");
      toast.error("Error de conexión", {
          description: "Ocurrió un error al intentar iniciar sesión.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          {/* TODO: Añadir Logo aquí si existe */}
          {/* <img src="/path/to/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-4" /> */}
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu email y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                {/* TODO: Enlazar a la página de recuperación si existe */}
                {/* <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                  ¿Olvidaste tu contraseña?
                </Link> */}
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-500">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
            </Button>
             {/* TODO: Añadir enlace a registro si existe */}
            {/* <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                Regístrate
              </Link>
            </p> */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 