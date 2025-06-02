"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Download, FileUp, Info, Loader2, Upload, X, Sparkles, FileText } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AccountType, LegalEntity } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Importar el nuevo componente de plantillas
import dynamic from 'next/dynamic';
const AccountingTemplateImporter = dynamic(
  () => import('@/components/accounting/template-importer/AccountingTemplateImporter'),
  { ssr: false }
);

// Esquema de validación del formulario
const importFormSchema = z.object({
  legalEntityId: z.string().min(1, "Debes seleccionar una entidad legal"),
  updateExisting: z.boolean().default(false),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

// Importamos directamente la función de importación
import { importChartOfAccountsFromCSV } from "@/app/(main)/configuracion/contabilidad/components/plan-contable/actions";

// ID del sistema actual (puedes obtenerlo del contexto de autenticación o de la configuración)
const CURRENT_SYSTEM_ID = "cmbbggjpe0000y2w74mjoqsbo";

// Mapa de tipos de cuenta en español a los valores del enum de Prisma
const accountTypeMap: Record<string, AccountType> = {
  'ACTIVO': 'ASSET',
  'PASIVO': 'LIABILITY',
  'PATRIMONIO_NETO': 'EQUITY',
  'INGRESO': 'REVENUE',
  'GASTO': 'EXPENSE',
  'COSTO_VENTAS': 'COST_OF_GOODS_SOLD'
};

interface ImportResult {
  success: boolean;
  error?: string;
  created: number;
  updated: number;
  skipped: number;
  errors?: Array<{
    row: number;
    accountNumber?: string;
    message: string;
  }>;
  message?: string;
}

interface ChartOfAccountCSVRow {
  NumeroCuenta: string;
  NombreCuenta: string;
  TipoCuenta: string; // Debe coincidir con los valores de accountTypeMap
  Descripcion?: string;
  EsMonetaria?: string | boolean; 
  EstaActiva?: string | boolean;
  PermiteAsientoDirecto?: string | boolean;
  NumeroCuentaPadre?: string;
}

export default function ImportarPlanContablePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [legalEntities, setLegalEntities] = useState<Array<{id: string, name: string}>>([]);
  const [importResults, setImportResults] = useState<ImportResult>({
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  });
  const [selectedLegalEntity, setSelectedLegalEntity] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"template" | "csv">("template");

  // Inicializar el formulario
  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      legalEntityId: "",
      updateExisting: false,
    },
  });

  // Cargar las entidades legales al montar el componente
  React.useEffect(() => {
    const loadLegalEntities = async () => {
      try {
        const response = await fetch('/api/legal-entities');
        if (!response.ok) throw new Error('Error al cargar las entidades legales');
        const data = await response.json();
        setLegalEntities(data);
        
        // Seleccionar la primera entidad por defecto si existe
        if (data.length > 0) {
          form.setValue('legalEntityId', data[0].id);
          setSelectedLegalEntity(data[0].id);
        }
      } catch (error) {
        console.error('Error cargando entidades legales:', error);
        toast.error('No se pudieron cargar las entidades legales');
      }
    };
    
    loadLegalEntities();
  }, [form]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setImportResults({
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      }); 
    } else {
      setSelectedFile(null);
    }
  };

  const handleDownloadExampleCSV = () => {
    const exampleData = [
      {
        NumeroCuenta: "100",
        NombreCuenta: "CAJA GENERAL",
        TipoCuenta: "ACTIVO",
        Descripcion: "Cuenta principal de caja",
        EsMonetaria: "true",
        EstaActiva: "true",
        PermiteAsientoDirecto: "true",
        NumeroCuentaPadre: "",
      },
      {
        NumeroCuenta: "1001",
        NombreCuenta: "CAJA CHICA OFICINA A",
        TipoCuenta: "ACTIVO",
        Descripcion: "Fondo fijo para gastos menores oficina A",
        EsMonetaria: "true",
        EstaActiva: "true",
        PermiteAsientoDirecto: "true",
        NumeroCuentaPadre: "100",
      },
      {
        NumeroCuenta: "400",
        NombreCuenta: "PROVEEDORES NACIONALES",
        TipoCuenta: "PASIVO",
        Descripcion: "Deudas con proveedores del país",
        EsMonetaria: "true",
        EstaActiva: "true",
        PermiteAsientoDirecto: "true",
        NumeroCuentaPadre: "",
      },
      {
        NumeroCuenta: "500",
        NombreCuenta: "VENTA DE MERCADERIAS",
        TipoCuenta: "INGRESO",
        Descripcion: "Ingresos por venta de mercaderías",
        EsMonetaria: "true",
        EstaActiva: "true",
        PermiteAsientoDirecto: "true",
        NumeroCuentaPadre: "",
      }
    ];

    const csv = Papa.unparse(exampleData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "ejemplo_plan_contable.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
        toast.error("La descarga directa no es compatible con tu navegador.");
    }
  };


  // Función para validar y convertir los datos del CSV
  const validateAndConvertCSVData = (data: ChartOfAccountCSVRow[]) => {
    const errors: { row: number; accountNumber?: string; message: string }[] = [];
    const validData = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque la fila 0 es el encabezado y el índice empieza en 0
      
      // Validar campos requeridos
      if (!row.NumeroCuenta) {
        errors.push({ row: rowNumber, message: "El campo 'NumeroCuenta' es requerido" });
        return;
      }
      
      if (!row.NombreCuenta) {
        errors.push({ 
          row: rowNumber, 
          accountNumber: row.NumeroCuenta,
          message: "El campo 'NombreCuenta' es requerido" 
        });
        return;
      }

      // Validar y convertir el tipo de cuenta
      if (!row.TipoCuenta) {
        errors.push({ 
          row: rowNumber, 
          accountNumber: row.NumeroCuenta,
          message: "El campo 'TipoCuenta' es requerido" 
        });
        return;
      }

      const tipoCuenta = row.TipoCuenta.toUpperCase().trim();
      if (!accountTypeMap[tipoCuenta]) {
        errors.push({ 
          row: rowNumber, 
          accountNumber: row.NumeroCuenta,
          message: `Tipo de cuenta '${row.TipoCuenta}' no válido. Valores aceptados: ${Object.keys(accountTypeMap).join(', ')}`
        });
        return;
      }

      // Convertir tipos booleanos
      const esMonetaria = row.EsMonetaria?.toString().toLowerCase() === 'true';
      const estaActiva = row.EstaActiva === undefined ? true : row.EstaActiva.toString().toLowerCase() === 'true';
      const permiteAsientoDirecto = row.PermiteAsientoDirecto === undefined ? true : row.PermiteAsientoDirecto.toString().toLowerCase() === 'true';

      validData.push({
        ...row,
        TipoCuenta: accountTypeMap[tipoCuenta], // Convertir al tipo de cuenta correcto
        EsMonetaria: esMonetaria,
        EstaActiva: estaActiva,
        PermiteAsientoDirecto: permiteAsientoDirecto,
        // Si NumeroCuentaPadre está vacío, lo establecemos como null
        NumeroCuentaPadre: row.NumeroCuentaPadre?.trim() || null
      });
    });

    return { validData, errors };
  };

  const handleImport = async () => {
    const values = form.getValues();
    
    if (!selectedFile) {
      toast.error("Por favor, selecciona un archivo CSV");
      return;
    }

    if (!values.legalEntityId) {
      toast.error("Por favor, selecciona una entidad legal");
      return;
    }

    setIsImporting(true);
    setImportResults({
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    });

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data as ChartOfAccountCSVRow[];
        const papaErrors = results.errors;

        // Mostrar error general si hay un error en la importación
        if (papaErrors.length > 0) {
          setImportResults({
            success: false,
            error: "Error al parsear el archivo CSV. Verifica el formato.",
            created: 0,
            updated: 0,
            skipped: 0,
            errors: papaErrors.map((err) => ({
              row: err.row || 0,
              message: err.message,
            })),
          });
          setIsImporting(false);
          return;
        }
        
        if (parsedData.length === 0) {
          setImportResults({ 
            success: false,
            error: "El archivo CSV está vacío o no tiene datos válidos con las cabeceras esperadas.",
            created: 0,
            updated: 0,
            skipped: 0,
            errors: []
          });
          setIsImporting(false);
          return;
        }

        // Validar datos
        const errors: Array<{ row: number; message: string }> = [];
        const validData: ChartOfAccountCSVRow[] = [];

        parsedData.forEach((row, index) => {
          const rowNumber = index + 2; // +2 porque la fila 1 es el encabezado
          
          // Validar campos requeridos
          if (!row.NumeroCuenta || !row.NombreCuenta || !row.TipoCuenta) {
            errors.push({
              row: rowNumber,
              message: `Faltan campos requeridos en la fila ${rowNumber}: NumeroCuenta, NombreCuenta y TipoCuenta son obligatorios`,
            });
            return;
          }

          // Validar tipo de cuenta
          const validTypes = Object.values(AccountType);
          if (!validTypes.includes(row.TipoCuenta as AccountType)) {
            errors.push({
              row: rowNumber,
              message: `Tipo de cuenta no válido en la fila ${rowNumber}. Valores permitidos: ${validTypes.join(", ")}`,
            });
            return;
          }

          // Validar cuenta padre (si existe)
          if (row.NumeroCuentaPadre && !/^\d+$/.test(row.NumeroCuentaPadre)) {
            errors.push({
              row: rowNumber,
              message: `El número de cuenta padre en la fila ${rowNumber} debe ser un número`,
            });
            return;
          }

          // Convertir valores booleanos si es necesario
          const processedRow: ChartOfAccountCSVRow = {
            ...row,
            EsMonetaria: row.EsMonetaria !== undefined ? (row.EsMonetaria === "true" || row.EsMonetaria === true) : true,
            EstaActiva: row.EstaActiva !== undefined ? (row.EstaActiva === "true" || row.EstaActiva === true) : true,
            PermiteAsientoDirecto: row.PermiteAsientoDirecto !== undefined ? (row.PermiteAsientoDirecto === "true" || row.PermiteAsientoDirecto === true) : true,
          };

          validData.push(processedRow);
        });

        if (errors.length > 0) {
          setImportResults({
            success: false,
            error: "Se encontraron errores de validación en el archivo CSV.",
            created: 0,
            updated: 0,
            skipped: 0,
            errors
          });
          setIsImporting(false);
          return;
        }

        try {
          const response = await importChartOfAccountsFromCSV(
            validData,
            values.legalEntityId,
            CURRENT_SYSTEM_ID,
            values.updateExisting
          );
          
          setImportResults(response);
          
          if (response.success) {
            if (response.created > 0 || response.updated > 0) {
              toast.success(`Importación completada: ${response.created} creadas, ${response.updated} actualizadas, ${response.skipped} omitidas.`);
            } else if (response.skipped > 0) {
              toast.info("No se realizaron cambios. Todas las cuentas ya existen.");
            } else {
              toast.info("No se realizaron cambios. Verifica los datos e intenta nuevamente.");
            }
          } else if (response.error) {
            toast.error(response.error);
          }

        } catch (error) {
          console.error("Error durante la importación:", error);
          const errorMessage = error instanceof Error ? error.message : "Error inesperado durante el proceso de importación.";
          toast.error(errorMessage);
          setImportResults({
            success: false,
            error: errorMessage,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: []
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        console.error("Error al parsear CSV con PapaParse:", error);
        const errorMessage = `Error al leer el archivo CSV: ${error.message}`;
        toast.error(errorMessage);
        setImportResults({
          success: false,
          error: errorMessage,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: []
        });
        setIsImporting(false);
      },
    });
  };

  // Obtener el valor de legalEntityId del formulario
  const legalEntityId = form.watch('legalEntityId');

  // Función para descargar la plantilla de ejemplo
  const downloadTemplate = () => {
    // Datos de ejemplo con encabezados traducidos
    const csvData = [
      // Encabezados traducidos
      'Número de Cuenta,Nombre de la Cuenta,Tipo de Cuenta,Descripción,Es Monetaria,Está Activa,Permite Asiento Directo,Número de Cuenta Padre',
      // Datos de ejemplo
      '1000,Caja,ACTIVO,Efectivo en caja,true,true,true,',
      '1100,Bancos,ACTIVO,Cuentas bancarias,true,true,true,',
      '1101,Banco Principal,ACTIVO,Cuenta corriente en Banco Principal,true,true,true,1100',
      '2000,Proveedores,PASIVO,Cuentas por pagar a proveedores,true,true,true,',
      '3000,Capital,PATRIMONIO_NETO,Capital social,false,true,false,',
      '4000,Ventas,INGRESO,Ventas de productos/servicios,false,true,false,',
      '5000,Compras,GASTO,Compras de mercaderías,false,true,false,',
      '6000,Gastos Administrativos,GASTO,Gastos generales de administración,false,true,false,'
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_plan_contable.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!legalEntityId || legalEntities.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-lg text-muted-foreground">
          Cargando entidades legales...
        </p>
      </div>
    );
  }

  const handleImportComplete = () => {
    // Actualizar la página o redirigir después de una importación exitosa
    toast.success("Plan contable importado correctamente");
    // Opcionalmente, redirigir a la página del plan contable
    // router.push('/configuracion/contabilidad');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importar Plan Contable</h2>
        <p className="text-muted-foreground">
          Importa un plan de cuentas predefinido o desde un archivo CSV personalizado.
        </p>
      </div>

      {/* Selector de entidad legal global */}
      <Card>
        <CardHeader>
          <CardTitle>Entidad Legal</CardTitle>
          <CardDescription>
            Selecciona la entidad legal para la cual importarás el plan contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="global-legal-entity">Entidad Legal</Label>
            <Select
              value={selectedLegalEntity}
              onValueChange={(value) => {
                setSelectedLegalEntity(value);
                form.setValue('legalEntityId', value);
              }}
            >
              <SelectTrigger id="global-legal-entity">
                <SelectValue placeholder="Selecciona una entidad legal" />
              </SelectTrigger>
              <SelectContent>
                {legalEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para las opciones de importación */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "template" | "csv")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Plantillas Predefinidas
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Importar CSV
          </TabsTrigger>
        </TabsList>

        {/* Contenido para plantillas predefinidas */}
        <TabsContent value="template" className="mt-4">
          <AccountingTemplateImporter
            systemId={CURRENT_SYSTEM_ID}
            legalEntityId={selectedLegalEntity}
            currentLanguage="es"
            onImportComplete={handleImportComplete}
          />
        </TabsContent>

        {/* Contenido para importación CSV */}
        <TabsContent value="csv" className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleImport)}>
              <Card>
                <CardHeader>
                  <CardTitle>Importar desde CSV</CardTitle>
                  <CardDescription>
                    Sube un archivo CSV con el plan de cuentas. Asegúrate de que el archivo siga el formato esperado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="legalEntityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entidad Legal</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isImporting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una entidad legal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {legalEntities.map((entity) => (
                                <SelectItem key={entity.id} value={entity.id}>
                                  {entity.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-2">
                      <Label htmlFor="csvFile">Archivo CSV</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          disabled={isImporting}
                        />
                        {selectedFile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            disabled={isImporting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="updateExisting"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isImporting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Actualizar cuentas existentes</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Si está marcado, se actualizarán las cuentas que ya existan con el mismo número de cuenta.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Importando...</span>
                        <span className="text-sm text-muted-foreground">
                          Por favor, espera
                        </span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  )}

                  {importResults.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{importResults.error}</AlertDescription>
                    </Alert>
                  )}

                  {importResults.success && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>¡Importación completada!</AlertTitle>
                      <AlertDescription>
                        Se importaron {importResults.created} cuentas nuevas, se actualizaron {importResults.updated} y se omitieron {importResults.skipped}.
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResults?.errors && importResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Errores de validación:</h4>
                      <div className="max-h-60 overflow-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted">
                            <tr>
                              <th className="border-b px-4 py-2 text-left">Fila</th>
                              <th className="border-b px-4 py-2 text-left">Mensaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResults.errors.map((error, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-4 py-2">{error.row}</td>
                                <td className="px-4 py-2">{error.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    disabled={isImporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar plantilla
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedFile || !form.watch('legalEntityId') || isImporting}
                    className="ml-auto"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
