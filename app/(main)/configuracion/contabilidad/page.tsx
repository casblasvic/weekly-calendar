"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { ChartOfAccountTable } from './components/plan-contable/chart-of-account-table';
import { ChartOfAccountFormModal, AccountFormData } from './components/plan-contable/chart-of-account-form-modal';
import { ChartOfAccountRow } from './components/plan-contable/columns';
import { 
  createChartOfAccountEntry, 
  updateChartOfAccountEntry, 
  getChartOfAccounts,
  getLegalEntitiesBySystem,
  deleteChartOfAccountEntry // Nueva importación
} from './components/plan-contable/actions';
import { toast } from "sonner";
import { LegalEntity } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Calendar, 
  Link2, 
  Receipt, 
  BookOpen,
  Info,
  Sparkles,
  Settings
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// ID del sistema actual (derivado del usuario/tenant - para esta fase, usamos el ID sembrado)
const CURRENT_SYSTEM_ID = "cmbbggjpe0000y2w74mjoqsbo"; 

// Importar componentes dinámicamente para evitar problemas de SSR
const AccountingTemplateImporter = dynamic(
  () => import('@/components/accounting/template-importer/AccountingTemplateImporter'),
  { ssr: false }
);

const AccountingMappingConfigurator = dynamic(
  () => import('@/components/accounting/mapping-configurator/AccountingMappingConfigurator'),
  { ssr: false }
);

const DocumentSeriesConfigurator = dynamic(
  () => import('@/components/accounting/document-series/DocumentSeriesConfigurator'),
  { ssr: false }
);

const FiscalYearManager = dynamic(
  () => import('@/components/accounting/fiscal-years/FiscalYearManager'),
  { ssr: false }
);

const PaymentMethodAccountMapper = dynamic(
  () => import('@/components/accounting/payment-method-mapping/PaymentMethodAccountMapper'),
  { ssr: false }
);

const VATTypeAccountMapper = dynamic(
  () => import('@/components/accounting/vat-mapping/VATTypeAccountMapper'),
  { ssr: false }
);

const AccountingExporter = dynamic(
  () => import('@/components/accounting/reports/AccountingExporter'),
  { ssr: false }
);

export default function AccountingConfigPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('plan');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<ChartOfAccountRow> | null>(null);
  
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [selectedLegalEntityId, setSelectedLegalEntityId] = useState<string>("");
  const [isLoadingLegalEntities, setIsLoadingLegalEntities] = useState(true);

  const [chartData, setChartData] = useState<ChartOfAccountRow[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccountRow | null>(null);

  // Cargar LegalEntities para el sistema actual
  useEffect(() => {
    const fetchLegalEntities = async () => {
      if (!CURRENT_SYSTEM_ID) {
        setIsLoadingLegalEntities(false);
        toast.error("ID de Sistema no configurado.");
        return;
      }
      setIsLoadingLegalEntities(true);
      try {
        const response = await getLegalEntitiesBySystem(CURRENT_SYSTEM_ID);
        if (response.success && response.data) {
          setLegalEntities(response.data);
          if (response.data.length > 0) {
            setSelectedLegalEntityId(response.data[0].id); 
          } else {
            setSelectedLegalEntityId("");
            setChartData([]); 
            toast.info("No hay entidades legales configuradas para este sistema.");
          }
        } else {
          toast.error(response.error || "Error al cargar entidades legales.");
          setLegalEntities([]);
          setSelectedLegalEntityId("");
          setChartData([]);
        }
      } catch (error) {
        console.error("Error fetching legal entities:", error);
        toast.error("Error crítico al cargar entidades legales.");
      } finally {
        setIsLoadingLegalEntities(false);
      }
    };
    fetchLegalEntities();
  }, []); 

  // Función para cargar/recargar datos del plan contable
  const fetchChartData = async () => {
    if (!selectedLegalEntityId || !CURRENT_SYSTEM_ID) {
      setChartData([]);
      return;
    }
    setIsLoadingChart(true);
    try {
      const response = await getChartOfAccounts(selectedLegalEntityId, CURRENT_SYSTEM_ID);
      if (response.success && response.data) {
        setChartData(response.data);
      } else {
        toast.error(response.error || "Error al cargar datos del plan contable.");
        setChartData([]);
      }
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      toast.error("Error al cargar el plan contable.");
      setChartData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  useEffect(() => {
    if (selectedLegalEntityId) {
        fetchChartData();
    } else if (!isLoadingLegalEntities) {
        setChartData([]); 
    }
  }, [selectedLegalEntityId, isLoadingLegalEntities]);


  const handleOpenModal = (accountData?: Partial<ChartOfAccountRow> | null) => {
    setEditingAccount(accountData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };
  
  const handleEditAccount = (account: ChartOfAccountRow) => {
    handleOpenModal(account);
  };

  const handleAddSubAccount = (parentId: string | null, newAccountBase?: Partial<ChartOfAccountRow>) => {
    const baseData = { ...newAccountBase, parentAccountId: parentId };
    handleOpenModal(baseData);
  };

  const handleSubmitModal = async (formDataFromModal: AccountFormData) => {
    if (!selectedLegalEntityId || !CURRENT_SYSTEM_ID) {
      toast.error("Error: No hay una entidad legal o sistema seleccionado.");
      return;
    }

    const payload = {
      ...formDataFromModal,
      legalEntityId: selectedLegalEntityId,
      systemId: CURRENT_SYSTEM_ID,
    };

    try {
      let response;
      if (editingAccount && editingAccount.id) {
        response = await updateChartOfAccountEntry({ ...payload, id: editingAccount.id });
      } else {
        response = await createChartOfAccountEntry(payload);
      }

      if (response.success) {
        toast.success(editingAccount ? "Cuenta actualizada con éxito." : "Cuenta creada con éxito.");
        handleCloseModal();
        await fetchChartData(); 
      } else {
        toast.error(response.error || "Ocurrió un error al guardar la cuenta.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    }
  };

  const handleOpenDeleteDialog = (account: ChartOfAccountRow) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete || !selectedLegalEntityId || !CURRENT_SYSTEM_ID) {
      toast.error("Error: No se puede determinar la cuenta a eliminar o falta información de la entidad/sistema.");
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
      return;
    }

    try {
      const response = await deleteChartOfAccountEntry(accountToDelete.id, selectedLegalEntityId, CURRENT_SYSTEM_ID);
      if (response.success) {
        toast.success(response.message || "Cuenta eliminada con éxito.");
        await fetchChartData();
      } else {
        toast.error(response.error || "Error al eliminar la cuenta.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Error crítico al intentar eliminar la cuenta.");
    } finally {
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleImportComplete = () => {
    // Refrescar el estado y cambiar a la pestaña de mapeo
    fetchChartData();
    setActiveTab('mapping');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Configuración Contable
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona el plan contable, ejercicios fiscales y configuraciones de tu sistema contable
        </p>
      </div>

      {/* Selector de Entidad Legal */}
      <div className="mb-6">
        <Label htmlFor="legalEntitySelect">Entidad Legal</Label>
        <Select
          value={selectedLegalEntityId}
          onValueChange={(value) => setSelectedLegalEntityId(value)}
          disabled={isLoadingLegalEntities || legalEntities.length === 0}
        >
          <SelectTrigger id="legalEntitySelect" className="w-full md:w-1/2">
            <SelectValue placeholder={isLoadingLegalEntities ? "Cargando..." : (legalEntities.length === 0 ? "No hay entidades" : "Seleccione Entidad Legal")} />
          </SelectTrigger>
          <SelectContent>
            {isLoadingLegalEntities ? (
              <SelectItem value="loading" disabled>Cargando...</SelectItem>
            ) : legalEntities.length === 0 ? (
              <SelectItem value="no-entities" disabled>No hay entidades legales para este sistema</SelectItem>
            ) : (
              legalEntities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plan Contable
          </TabsTrigger>
          <TabsTrigger value="fiscal-years" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ejercicios
          </TabsTrigger>
          <TabsTrigger 
            value="mapping" 
            className="flex items-center gap-2"
          >
            <Link2 className="h-4 w-4" />
            Mapeo
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Series
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Informes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          {/* Sub-tabs dentro de Plan Contable */}
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Plan Manual</TabsTrigger>
              <TabsTrigger value="import">Importar Plantilla</TabsTrigger>
              <TabsTrigger value="templates">Gestión de Plantillas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Plan Contable</CardTitle>
                  <CardDescription>Gestiona tu plan de cuentas manualmente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoadingLegalEntities ? (
                    <p>Cargando entidades legales...</p>
                  ) : !selectedLegalEntityId ? (
                    <p className="text-center text-gray-500">Por favor, seleccione una entidad legal.</p>
                  ) : isLoadingChart ? (
                    <p>Cargando plan contable...</p>
                  ) : (
                    <ChartOfAccountTable
                      data={chartData}
                      isLoading={isLoadingChart} 
                      onEditAccount={handleEditAccount} 
                      onAddSubAccount={handleAddSubAccount}
                      onDeleteAccount={handleOpenDeleteDialog} 
                      onRefresh={fetchChartData}
                      legalEntityId={selectedLegalEntityId}
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleOpenModal(null)} 
                    disabled={!selectedLegalEntityId || isLoadingChart || isLoadingLegalEntities}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Nueva Cuenta Raíz
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="import" className="space-y-4">
              {chartData.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Ya tienes un plan contable configurado. Puedes importar una nueva plantilla 
                    para reemplazarlo o combinarlo con el existente.
                  </AlertDescription>
                </Alert>
              )}
              <AccountingTemplateImporter
                systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
                legalEntityId={selectedLegalEntityId}
                currentLanguage="es"
                onImportComplete={handleImportComplete}
              />
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Gestión de Plantillas
                  </CardTitle>
                  <CardDescription>
                    Crea y gestiona plantillas personalizadas de planes contables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Esta funcionalidad te permitirá crear plantillas personalizadas basadas 
                      en tu plan contable actual para reutilizarlas en otras sociedades.
                      Próximamente disponible.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="fiscal-years" className="space-y-4">
          {!selectedLegalEntityId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Selecciona una Entidad Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Por favor, selecciona una entidad legal para gestionar los ejercicios fiscales.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <FiscalYearManager
              systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
              legalEntityId={selectedLegalEntityId}
            />
          )}
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          {chartData.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Mapeo de Cuentas No Disponible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Primero debes crear o importar un plan contable antes de poder configurar 
                    los mapeos de cuentas. Ve a la pestaña "Plan Contable" para comenzar.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="categories">Categorías</TabsTrigger>
                <TabsTrigger value="payment-methods">Métodos de Pago</TabsTrigger>
                <TabsTrigger value="vat-types">Tipos de IVA</TabsTrigger>
              </TabsList>
              
              <TabsContent value="categories" className="mt-4">
                <AccountingMappingConfigurator
                  systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
                  legalEntityId={selectedLegalEntityId}
                  onComplete={() => {
                    toast.success('Mapeos de categorías configurados correctamente');
                  }}
                />
              </TabsContent>
              
              <TabsContent value="payment-methods" className="mt-4">
                <PaymentMethodAccountMapper
                  systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
                  legalEntityId={selectedLegalEntityId}
                />
              </TabsContent>
              
              <TabsContent value="vat-types" className="mt-4">
                <VATTypeAccountMapper
                  systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
                  legalEntityId={selectedLegalEntityId}
                  currentLanguage="es"
                />
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {!selectedLegalEntityId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Selecciona una Entidad Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Por favor, selecciona una entidad legal para configurar las series documentales.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <DocumentSeriesConfigurator
              systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
              legalEntityId={selectedLegalEntityId}
            />
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {!selectedLegalEntityId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Selecciona una Entidad Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Por favor, selecciona una entidad legal para generar informes contables.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <AccountingExporter
              systemId={session?.user?.systemId || CURRENT_SYSTEM_ID}
              legalEntityId={selectedLegalEntityId}
              currentLanguage="es"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de Confirmación de Eliminación */}
      {accountToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro de que desea eliminar esta cuenta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta:
                <br />
                <strong>Número:</strong> {accountToDelete.accountNumber}
                <br />
                <strong>Nombre:</strong> {accountToDelete.name}
                <br />
                Asegúrese de que no tenga subcuentas asociadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isModalOpen && (
        <ChartOfAccountFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitModal}
          initialData={editingAccount}
        />
      )}
    </div>
  );
}
