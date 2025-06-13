'use client'

import React, { useState, useEffect } from 'react'
import { use } from 'react'
import { Building2, Phone, Mail, Globe, MapPin, User, Users, TrendingUp, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Company {
  id: string
  fiscalName: string
  taxId: string
  address?: string
  city?: string
  postalCode?: string
  countryIsoCode?: string
  phone?: string
  email?: string
  website?: string
  notes?: string
}

interface PersonWithCompany {
  id: string
  firstName: string
  lastName: string
  functionalRoles?: Array<{
    roleType: string
    contactData?: {
      position?: string
      department?: string
      isPrimary: boolean
      preferredContactMethod?: string
      company?: Company
    }
  }>
}

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const personId = resolvedParams.id
  
  const [person, setPerson] = useState<PersonWithCompany | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [contactData, setContactData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [otherContacts, setOtherContacts] = useState<any[]>([])

  useEffect(() => {
    const loadPersonAndCompany = async () => {
      try {
        const response = await fetch(`/api/persons/${personId}`)
        if (!response.ok) throw new Error('Error al cargar persona')
        
        const data = await response.json()
        setPerson(data)
        
        // Extraer información de empresa del rol CONTACT
        const contactRole = data.functionalRoles?.find((role: any) => role.roleType === 'CONTACT')
        if (contactRole?.contactData) {
          setContactData(contactRole.contactData)
          if (contactRole.contactData.company) {
            setCompany(contactRole.contactData.company)
            // Aquí podrías cargar otros contactos de la misma empresa
            loadOtherContacts(contactRole.contactData.company.id)
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    const loadOtherContacts = async (companyId: string) => {
      try {
        // Esta API necesitaría ser implementada
        // const response = await fetch(`/api/companies/${companyId}/contacts`)
        // const data = await response.json()
        // setOtherContacts(data.filter((c: any) => c.id !== personId))
      } catch (error) {
        console.error('Error cargando otros contactos:', error)
      }
    }

    loadPersonAndCompany()
  }, [personId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Cargando información de empresa...</p>
      </div>
    )
  }

  const hasContactRole = person?.functionalRoles?.some(role => role.roleType === 'CONTACT')

  if (!hasContactRole) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Esta persona no tiene el rol de Contacto activo.</p>
            <p className="text-sm text-gray-400">
              Para asociar a una empresa, primero debe activarse el rol de Contacto en los datos de la persona.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Esta persona no está asociada a ninguna empresa.</p>
            <Button variant="outline">Asociar a empresa</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Información de Empresa</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Empresa asociada a {person?.firstName} {person?.lastName}
        </p>
      </div>

      {/* Datos de la empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de la Empresa
            </CardTitle>
            <Button variant="outline" size="sm">Editar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nombre Fiscal</label>
              <p className="mt-1 text-lg font-semibold">{company.fiscalName}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">CIF/NIF</label>
              <p className="mt-1">{company.taxId}</p>
            </div>
            
            {company.address && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Dirección</label>
                <div className="mt-1 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p>{company.address}</p>
                    {(company.city || company.postalCode) && (
                      <p>{company.postalCode} {company.city}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {company.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500">Teléfono</label>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p>{company.phone}</p>
                </div>
              </div>
            )}
            
            {company.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                    {company.email}
                  </a>
                </div>
              </div>
            )}
            
            {company.website && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sitio Web</label>
                <div className="mt-1 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {company.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Notas</label>
              <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {company.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información como Contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactData.position && (
              <div>
                <label className="text-sm font-medium text-gray-500">Cargo</label>
                <p className="mt-1">{contactData.position}</p>
              </div>
            )}
            
            {contactData.department && (
              <div>
                <label className="text-sm font-medium text-gray-500">Departamento</label>
                <p className="mt-1">{contactData.department}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">Contacto Principal</label>
              <div className="mt-1">
                {contactData.isPrimary ? (
                  <Badge variant="default">Sí</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </div>
            </div>
            
            {contactData.preferredContactMethod && (
              <div>
                <label className="text-sm font-medium text-gray-500">Método de Contacto Preferido</label>
                <p className="mt-1">{contactData.preferredContactMethod}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Otros contactos de la empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Otros Contactos de la Empresa
            </CardTitle>
            <Button variant="outline" size="sm">Ver todos</Button>
          </div>
        </CardHeader>
        <CardContent>
          {otherContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay otros contactos registrados para esta empresa
            </p>
          ) : (
            <div className="space-y-3">
              {otherContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                    <p className="text-sm text-gray-500">{contact.position || 'Sin cargo'}</p>
                  </div>
                  <Button variant="ghost" size="sm">Ver perfil</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enlaces rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Enlaces Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start">
              <Building2 className="h-4 w-4 mr-2" />
              Ver perfil completo de empresa
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              Oportunidades de la empresa
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Facturas y pagos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
