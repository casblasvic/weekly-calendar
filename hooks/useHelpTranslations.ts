import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface HelpTranslations {
  [key: string]: any;
}

// Importar dinámicamente los archivos de ayuda
const helpModules: { [key: string]: any } = {
  'contabilidad/mapeo_help': () => import('../locales/ayuda/contabilidad/mapeo_help.json')
};

export function useHelpTranslations(helpPath: string) {
  const { data: session } = useSession();
  const [translations, setTranslations] = useState<HelpTranslations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setLoading(true);
        
        // Verificar si existe el módulo
        const moduleLoader = helpModules[helpPath];
        if (!moduleLoader) {
          console.error(`No se encontró el módulo de ayuda: ${helpPath}`);
          setTranslations({});
          return;
        }
        
        const module = await moduleLoader();
        const data = module.default || module;
        
        // Usar español por defecto ya que no tenemos campo language en el usuario
        // En el futuro se podría detectar del navegador o de un campo de configuración
        const langCode = 'es';
        
        // Usar las traducciones del idioma detectado o español por defecto
        setTranslations(data[langCode] || data['es'] || {});
      } catch (error) {
        console.error('Error cargando traducciones de ayuda:', error);
        setTranslations({});
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [helpPath, session]);

  return { translations, loading };
}
