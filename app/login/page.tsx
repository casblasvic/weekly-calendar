'use client';

import { useState, type FormEvent, useEffect } from 'react';
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
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorParam = searchParams.get('error'); // Leer el parámetro 'error' de la URL

  // useEffect para manejar errores pasados por NextAuth.js en la URL
  useEffect(() => {
    if (errorParam) {
      let friendlyErrorMessage = "Ocurrió un error inesperado durante el inicio de sesión.";
      switch (errorParam) {
        case 'CredentialsSignin':
          friendlyErrorMessage = 'Usuario o contraseña incorrectos. Por favor, inténtalo de nuevo.';
          break;
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
        case 'EmailCreateAccount':
        case 'Callback':
        case 'SessionRequired':
        // Puedes añadir más casos específicos basados en los códigos de error de NextAuth.js
        // https://next-auth.js.org/configuration/pages#error-codes
          friendlyErrorMessage = 'Ha ocurrido un error con el proveedor de autenticación. Por favor, inténtalo más tarde.';
          break;
        case 'AccessDenied':
            friendlyErrorMessage = 'Acceso denegado. No tienes permiso para realizar esta acción.';
            break;
        case 'Configuration':
            friendlyErrorMessage = 'Hay un problema con la configuración del servidor de autenticación.';
            break;
        default:
          // Para errores desconocidos o no manejados específicamente
          friendlyErrorMessage = `Error de autenticación: ${errorParam}. Inténtalo de nuevo.`;
          break;
      }
      setError(friendlyErrorMessage);
      toast.error("Error de autenticación", {
        description: friendlyErrorMessage,
      });
    }
  }, [errorParam]);

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
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          {/* TODO: Añadir Logo aquí si existe */}
          {/* <img src="/path/to/logo.png" alt="Logo" className="mx-auto mb-4 w-20 h-20" /> */}
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
              <div className="flex justify-between items-center">
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
            {/* <p className="text-sm text-center text-gray-600 dark:text-gray-400">
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