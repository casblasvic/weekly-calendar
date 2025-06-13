"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Users, 
  Target, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  DollarSign,
  UserCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react"

interface PersonTabsProps {
  person: any // TODO: Crear tipo específico
  onEdit?: () => void
}

export function PersonTabs({ person, onEdit }: PersonTabsProps) {
  const [activeTab, setActiveTab] = useState("info")
  
  const hasClientRole = person.activeRoles?.includes('CLIENT')
  const hasContactRoles = person.contactRoles && person.contactRoles.length > 0
  const hasLeadRoles = person.leadRoles && person.leadRoles.length > 0

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 gap-2 h-auto p-1">
        <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Users className="mr-2 h-4 w-4" />
          Información Personal
        </TabsTrigger>
        
        <TabsTrigger 
          value="client" 
          disabled={!hasClientRole}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          Datos Cliente
          {!hasClientRole && (
            <AlertCircle className="ml-2 h-3 w-3" />
          )}
        </TabsTrigger>
        
        <TabsTrigger 
          value="companies" 
          disabled={!hasContactRoles}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Empresas
          {hasContactRoles ? (
            <Badge variant="secondary" className="ml-2">
              {person.contactRoles.length}
            </Badge>
          ) : (
            <AlertCircle className="ml-2 h-3 w-3" />
          )}
        </TabsTrigger>
        
        <TabsTrigger 
          value="crm" 
          disabled={!hasLeadRoles}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50"
        >
          <Target className="mr-2 h-4 w-4" />
          CRM
          {hasLeadRoles && person.leadRoles?.some((role: any) => role.opportunities?.length > 0) ? (
            <Badge variant="secondary" className="ml-2">
              {person.leadRoles.reduce((acc: number, role: any) => acc + (role.opportunities?.length || 0), 0)}
            </Badge>
          ) : (
            <AlertCircle className="ml-2 h-3 w-3" />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Datos personales y de contacto</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre completo</label>
                <p className="text-lg font-medium">{person.firstName} {person.lastName}</p>
              </div>
              
              {person.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{person.email}</p>
                  </div>
                </div>
              )}
              
              {person.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{person.phone}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {person.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p>{person.address}</p>
                      {(person.city || person.postalCode) && (
                        <p className="text-sm text-muted-foreground">
                          {person.city}{person.postalCode && `, ${person.postalCode}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {person.birthDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{new Date(person.birthDate).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              )}
              
              {person.nationalId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">DNI/NIE</label>
                  <p>{person.nationalId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="client" className="mt-6 space-y-4">
        {hasClientRole ? (
          <Card>
            <CardHeader>
              <CardTitle>Información de Cliente</CardTitle>
              <CardDescription>Datos específicos como cliente de la clínica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {person.clientData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <Badge variant={person.clientData.isActive ? "default" : "secondary"}>
                        {person.clientData.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Consentimiento Marketing</label>
                      <Badge variant={person.clientData.marketingConsent ? "default" : "secondary"}>
                        {person.clientData.marketingConsent ? "Aceptado" : "No aceptado"}
                      </Badge>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Protección de datos</label>
                      <Badge variant={person.clientData.dataProcessingConsent ? "default" : "secondary"}>
                        {person.clientData.dataProcessingConsent ? "Aceptado" : "No aceptado"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {person.clientData.source && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Origen</label>
                        <p>{person.clientData.source}</p>
                      </div>
                    )}
                    
                    {person.clientData.referredById && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Referido por</label>
                        <p>Cliente #{person.clientData.referredById}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin rol de cliente</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Esta persona no tiene un rol de cliente activo. Para agregar información de cliente, 
                es necesario asignar el rol correspondiente.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="companies" className="mt-6 space-y-4">
        {hasContactRoles ? (
          person.contactRoles.map((contact: any, index: number) => (
            <Card key={contact.roleId || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {contact.company?.fiscalName || "Empresa sin nombre"}
                    </CardTitle>
                    <CardDescription>
                      {contact.position || "Sin cargo especificado"}
                      {contact.department && ` - ${contact.department}`}
                    </CardDescription>
                  </div>
                  <Badge variant={contact.isPrimary ? "default" : "secondary"}>
                    {contact.isPrimary ? "Contacto Principal" : "Contacto"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.company?.taxId && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CIF/NIF</label>
                      <p>{contact.company.taxId}</p>
                    </div>
                  )}
                  
                  {contact.company?.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Teléfono empresa</label>
                      <p>{contact.company.phone}</p>
                    </div>
                  )}
                  
                  {contact.preferredContactMethod && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Método de contacto preferido</label>
                      <p>{contact.preferredContactMethod === 'EMAIL' ? 'Email' : 'Teléfono'}</p>
                    </div>
                  )}
                  
                  {contact.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Notas</label>
                      <p className="text-sm">{contact.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin empresas asociadas</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Esta persona no está asociada como contacto de ninguna empresa.
                Para vincularla a una empresa, es necesario crear la relación correspondiente.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="crm" className="mt-6 space-y-4">
        {hasLeadRoles ? (
          person.leadRoles.map((lead: any, index: number) => (
            <div key={lead.roleId || index} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información de Lead</CardTitle>
                  <CardDescription>
                    Estado: <Badge>{lead.status || 'NEW'}</Badge>
                    {lead.source && <> • Origen: {lead.source}</>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.estimatedValue && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Valor estimado</label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <p className="text-lg font-medium">{lead.estimatedValue.toFixed(2)} €</p>
                        </div>
                      </div>
                    )}
                    
                    {lead.assignedToUser && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Asignado a</label>
                        <p>{lead.assignedToUser.firstName} {lead.assignedToUser.lastName}</p>
                      </div>
                    )}
                  </div>
                  
                  {lead.interests && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Intereses</label>
                      <p className="text-sm">{lead.interests}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {lead.opportunities && lead.opportunities.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Oportunidades ({lead.opportunities.length})
                  </h3>
                  
                  {lead.opportunities.map((opp: any) => (
                    <Card key={opp.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{opp.name}</CardTitle>
                          <Badge variant={getOpportunityVariant(opp.stage)}>
                            {getOpportunityStageLabel(opp.stage)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Valor estimado</label>
                            <p className="font-medium">{opp.estimatedValue?.toFixed(2) || '0.00'} €</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Probabilidad</label>
                            <p className="font-medium">{opp.probability || 0}%</p>
                          </div>
                          
                          {opp.estimatedCloseDate && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Cierre estimado</label>
                              <p>{new Date(opp.estimatedCloseDate).toLocaleDateString('es-ES')}</p>
                            </div>
                          )}
                        </div>
                        
                        {opp.notes && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">Notas</label>
                            <p className="text-sm text-muted-foreground">{opp.notes}</p>
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm">
                            Ver detalles
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin información CRM</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Esta persona no tiene un rol de lead o prospecto comercial.
                Para gestionar oportunidades de venta, es necesario asignar el rol correspondiente.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}

function getOpportunityVariant(stage: string): "default" | "secondary" | "destructive" | "outline" {
  switch (stage) {
    case 'WON':
      return 'default'
    case 'LOST':
      return 'destructive'
    case 'NEGOTIATION':
    case 'PROPOSAL':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getOpportunityStageLabel(stage: string): string {
  const stages: Record<string, string> = {
    'PROSPECTING': 'Prospección',
    'QUALIFICATION': 'Calificación',
    'PROPOSAL': 'Propuesta',
    'NEGOTIATION': 'Negociación',
    'WON': 'Ganada',
    'LOST': 'Perdida'
  }
  return stages[stage] || stage
}
