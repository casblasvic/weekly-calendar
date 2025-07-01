"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Label } from '@/app/components/ui/label'
import { Input } from '@/app/components/ui/input'
import { toast } from '@/app/components/ui/use-toast'
import { ColorPicker } from '@/components/ui/color-picker'
import { LogoUploader } from '@/app/components/ui/logo-uploader'
import { ThemeTemplate } from '@/app/components/ui/theme-template'
import { useTheme, ThemeConfig, ThemeProvider } from '@/app/contexts/theme-context'
import { useSystem, SystemProvider } from '@/app/contexts/system-context'
import { Separator } from '@/app/components/ui/separator'
import { ActionButtons } from '@/app/components/ui/action-buttons'
import { ColorPatterns } from '@/app/components/ui/color-patterns'

export default function SistemaPage() {
  // Estado local para prevenir error de hidratación
  const [mounted, setMounted] = useState(false);

  // Solo ejecutar código del cliente después de montarse
  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, muestra un placeholder
  if (!mounted) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <h1 className="mb-2 text-2xl font-semibold">Configuración del Sistema</h1>
        <p className="mb-6 text-gray-600">Cargando opciones...</p>
        <div className="flex justify-center items-center h-96">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-purple-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  // Componente real que solo se renderiza en el cliente
  return (
    <ThemeProvider>
      <SystemProvider>
        <SistemaPageContent />
      </SystemProvider>
    </ThemeProvider>
  );
}

// Componente cliente interno
function SistemaPageContent() {
  const { theme, setTheme } = useTheme();
  const { systemConfig, updateTheme, resetSystemConfig, saveSystemConfig } = useSystem();
  const [tempTheme, setTempTheme] = useState<ThemeConfig>(theme);
  const [activeTab, setActiveTab] = useState('apariencia');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar con el tema global
  useEffect(() => {
    if (theme) {
      setTempTheme(theme);
    }
  }, [theme]);

  // Gestionar cambios en las propiedades del tema
  const handleThemeChange = (property: keyof ThemeConfig, value: string) => {
    setTempTheme(prev => ({
      ...prev,
      [property]: value
    }));
  };

  // Guardar cambios en el tema
  const handleSaveTheme = async () => {
    setIsSaving(true);
    
    try {
      // Actualizar los temas tanto en el contexto de tema como en el de sistema
      if (typeof setTheme === 'function') {
        setTheme(tempTheme);
      } else {
        console.warn('setTheme no está disponible como función');
      }
      
      // Siempre actualizar usando updateTheme del contexto de sistema
      updateTheme(tempTheme);
      
      // Guardar en la persistencia del sistema
      await saveSystemConfig();
      
      toast({
        title: "Configuración guardada",
        description: "Los cambios en la apariencia se han guardado correctamente.",
      });
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Restablecer valores predeterminados
  const handleResetTheme = () => {
    resetSystemConfig();
    
    toast({
      title: "Configuración restablecida",
      description: "Se han restaurado los valores predeterminados de apariencia.",
    });
  };

  // Volver a la página anterior
  const handleBack = () => {
    window.history.back();
  };

  // Contenido de ayuda para el botón de ayuda
  const helpContent = (
    <div className="space-y-4">
      <p>Esta sección te permite personalizar la apariencia visual del sistema:</p>
      
      <ul className="pl-5 space-y-2 list-disc">
        <li><strong>Logo del sistema:</strong> Cambia el logo que aparece en la barra superior y los informes.</li>
        <li><strong>Colores principales:</strong> Personaliza los colores primarios, secundarios y de acento del sistema.</li>
        <li><strong>Colores de texto y fondo:</strong> Ajusta los colores del texto y fondo de la aplicación.</li>
      </ul>
      
      <p>Los cambios se aplicarán inmediatamente al guardar y se mantendrán entre sesiones.</p>
      
      <div className="p-4 text-amber-700 bg-amber-50 border-l-4 border-amber-400">
        <h4 className="font-semibold">Recomendaciones:</h4>
        <ul className="pl-5 mt-2 list-disc">
          <li>Usa colores con buen contraste para mejorar la legibilidad.</li>
          <li>El logo debe tener un formato PNG, JPEG, GIF o SVG y no superar los 2MB.</li>
          <li>Puedes ver una vista previa de tus cambios antes de guardarlos.</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="container pb-24 mx-auto" style={{ marginLeft: 'var(--sidebar-width, 0px)' }}>
      <div className="px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Configuración del Sistema</h1>
        <p className="mb-6 text-gray-600">
          Personaliza la apariencia y configuración general del sistema
        </p>
        
        <Tabs 
          defaultValue="apariencia" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
            <TabsTrigger value="almacenamiento">Almacenamiento</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          
          {/* Pestaña de apariencia */}
          <TabsContent value="apariencia" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Columna de formulario */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Logo del sistema</CardTitle>
                    <CardDescription>
                      Personaliza el logo que aparece en la barra superior y los informes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LogoUploader 
                      currentLogo={tempTheme.logoUrl}
                      onLogoChange={(url) => handleThemeChange('logoUrl', url)}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Colores principales</CardTitle>
                    <CardDescription>
                      Personaliza los colores del sistema para adaptarlo a tu imagen corporativa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="colorPrimario">Color principal</Label>
                      <ColorPicker 
                        color={tempTheme.primaryColor}
                        onChange={(color) => handleThemeChange('primaryColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se usa en botones principales, encabezados y elementos destacados.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorSecundario">Color secundario</Label>
                      <ColorPicker 
                        color={tempTheme.secondaryColor}
                        onChange={(color) => handleThemeChange('secondaryColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se usa en elementos secundarios y complementarios.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorAccent">Color de acento</Label>
                      <ColorPicker 
                        color={tempTheme.accentColor}
                        onChange={(color) => handleThemeChange('accentColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se usa para destacar elementos seleccionados.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Colores de texto y fondo</CardTitle>
                    <CardDescription>
                      Personaliza los colores del texto y fondo de la aplicación
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="colorTexto">Color de texto</Label>
                      <ColorPicker 
                        color={tempTheme.textColor}
                        onChange={(color) => handleThemeChange('textColor', color)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorFondo">Color de fondo</Label>
                      <ColorPicker 
                        color={tempTheme.backgroundColor}
                        onChange={(color) => handleThemeChange('backgroundColor', color)}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Colores de interfaz</CardTitle>
                    <CardDescription>
                      Personaliza los elementos de la interfaz para mejorar la visualización
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="colorContenedor">Color de fondo del contenedor</Label>
                      <ColorPicker 
                        color={tempTheme.containerBackgroundColor}
                        onChange={(color) => handleThemeChange('containerBackgroundColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este es el color de fondo general de las páginas, sobre el que se colocan las tarjetas.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorCabecera">Color de cabeceras de tablas</Label>
                      <ColorPicker 
                        color={tempTheme.tableHeaderColor}
                        onChange={(color) => handleThemeChange('tableHeaderColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se utiliza en las cabeceras de las tablas para destacarlas.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tableRowHover">Color de hover en tablas</Label>
                      <ColorPicker 
                        color={tempTheme.tableRowHoverColor}
                        onChange={(color) => handleThemeChange('tableRowHoverColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al pasar el cursor sobre las filas de las tablas.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorPestana">Color de pestañas activas</Label>
                      <ColorPicker 
                        color={tempTheme.tabActiveColor}
                        onChange={(color) => handleThemeChange('tabActiveColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica a las pestañas cuando están seleccionadas.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorTarjeta">Color de fondo de tarjetas</Label>
                      <ColorPicker 
                        color={tempTheme.cardBackgroundColor}
                        onChange={(color) => handleThemeChange('cardBackgroundColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este es el color de fondo de las tarjetas y paneles que contienen información.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración de botones</CardTitle>
                    <CardDescription>
                      Personaliza el aspecto de los botones del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="colorBotonPrimario">Color de botones primarios</Label>
                      <ColorPicker 
                        color={tempTheme.buttonPrimaryColor}
                        onChange={(color) => handleThemeChange('buttonPrimaryColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Se usa en botones de acción principal como guardar o crear.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="colorBotonSecundario">Color de botones secundarios</Label>
                      <ColorPicker 
                        color={tempTheme.buttonSecondaryColor}
                        onChange={(color) => handleThemeChange('buttonSecondaryColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Se usa en botones de acción secundaria como cancelar o volver.
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <div className="flex flex-col items-center p-2 space-y-2 rounded-md border">
                        <span className="text-xs font-medium">Botón Primario</span>
                        <button 
                          className="px-3 h-8 text-sm rounded-md btn-primary"
                          style={{backgroundColor: tempTheme.buttonPrimaryColor}}
                        >
                          Guardar
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center p-2 space-y-2 rounded-md border">
                        <span className="text-xs font-medium">Botón Secundario</span>
                        <button 
                          className="px-3 h-8 text-sm rounded-md btn-secondary"
                          style={{backgroundColor: tempTheme.buttonSecondaryColor}}
                        >
                          Cancelar
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center p-2 space-y-2 rounded-md border">
                        <span className="text-xs font-medium">Botón Volver</span>
                        <button className="flex gap-1 items-center px-3 h-8 text-sm rounded-md btn-back btn-secondary" style={{backgroundColor: tempTheme.buttonSecondaryColor}}>
                          <span className="w-4 h-4">←</span>
                          <span>Volver</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Elementos estructurales</CardTitle>
                    <CardDescription>
                      Personaliza el aspecto de los elementos principales de la interfaz
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="headerBackground">Color de encabezado</Label>
                      <ColorPicker 
                        color={tempTheme.headerBackgroundColor}
                        onChange={(color) => handleThemeChange('headerBackgroundColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al fondo del encabezado principal de la aplicación.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sidebarBackground">Color de barra lateral</Label>
                      <ColorPicker 
                        color={tempTheme.sidebarBackgroundColor}
                        onChange={(color) => handleThemeChange('sidebarBackgroundColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al fondo de la barra lateral de navegación.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sidebarText">Color de texto en barra lateral</Label>
                      <ColorPicker 
                        color={tempTheme.sidebarTextColor}
                        onChange={(color) => handleThemeChange('sidebarTextColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al texto de los elementos de la barra lateral.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sidebarHover">Color de hover en menús</Label>
                      <ColorPicker 
                        color={tempTheme.sidebarHoverColor}
                        onChange={(color) => handleThemeChange('sidebarHoverColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica cuando se pasa el cursor sobre elementos de menú.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="footerBackground">Color de pie de página</Label>
                      <ColorPicker 
                        color={tempTheme.footerBackgroundColor}
                        onChange={(color) => handleThemeChange('footerBackgroundColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al fondo del pie de página.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="inputFocusBorder">Color de borde en campos con foco</Label>
                      <ColorPicker 
                        color={tempTheme.inputFocusBorderColor}
                        onChange={(color) => handleThemeChange('inputFocusBorderColor', color)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este color se aplica al borde de los campos de texto cuando tienen el foco.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Columna de vista previa */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="mb-2 text-sm font-medium">Vista previa</h3>
                  <ThemeTemplate 
                    theme={tempTheme} 
                    className="w-full"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Esta es una simulación de cómo se verá el sistema con los colores seleccionados.
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <ColorPatterns
                    onSelect={(colors) => {
                      // Mantener el logo actual al cambiar el patrón de colores
                      const currentLogo = tempTheme.logoUrl || '';
                      setTempTheme({
                        ...colors,
                        logoUrl: currentLogo
                      });
                    }}
                  />
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración de colores actual</CardTitle>
                    <CardDescription>
                      Valores actuales definidos para la apariencia del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Color principal:</div>
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: tempTheme.primaryColor }}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tempTheme.primaryColor}
                          </code>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Color secundario:</div>
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: tempTheme.secondaryColor }}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tempTheme.secondaryColor}
                          </code>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Color de acento:</div>
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: tempTheme.accentColor }}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tempTheme.accentColor}
                          </code>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Color de texto:</div>
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: tempTheme.textColor }}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tempTheme.textColor}
                          </code>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Color de fondo:</div>
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: tempTheme.backgroundColor }}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tempTheme.backgroundColor}
                          </code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Acciones disponibles</CardTitle>
                    <CardDescription>
                      Opciones para gestionar la configuración de apariencia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                        <span><strong>Personaliza</strong> los colores y el logo según tus preferencias</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                        <span><strong>Previsualiza</strong> los cambios en tiempo real antes de aplicarlos</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                        <span><strong>Guarda</strong> los cambios para aplicarlos en todo el sistema</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                        <span><strong>Restablece</strong> los valores predeterminados si lo necesitas</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Pestaña de almacenamiento */}
          <TabsContent value="almacenamiento" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de almacenamiento</CardTitle>
                <CardDescription>
                  Gestiona las opciones de almacenamiento del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Esta sección permite configurar las opciones relacionadas con el almacenamiento de archivos
                  y la gestión de documentos del sistema.
                </p>
                <div className="py-8 mt-4 text-center text-gray-500 rounded-md border border-dashed">
                  Funcionalidad en desarrollo
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de configuración general */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración general</CardTitle>
                <CardDescription>
                  Ajustes generales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Esta sección permite configurar opciones generales del sistema como idioma, zona horaria, etc.
                </p>
                <div className="py-8 mt-4 text-center text-gray-500 rounded-md border border-dashed">
                  Funcionalidad en desarrollo
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Botones de acción fijos en la parte inferior */}
      <ActionButtons
        fixed={true}
        onBack={handleBack}
        onSave={handleSaveTheme}
        isSaving={isSaving}
        helpContent={helpContent}
        helpTitle="Ayuda para la configuración de apariencia"
      />
    </div>
  )
}

